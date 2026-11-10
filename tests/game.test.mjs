import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
const compiled=await build({stdin:{contents:`export { Balloons } from './src/game/balloons'; export { Player } from './src/game/player'; export { SmokeSimulation } from './src/game/smoke'; export { loadSettings } from './src/game/settings';`,resolveDir:fileURLToPath(new URL('..',import.meta.url))},bundle:true,write:false,format:'esm',platform:'node'});
const {Balloons,Player,SmokeSimulation,loadSettings}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
// The bundle contains Three.js. Reuse the player's parent scene without relying on class identity across bundles.
function rig(){const smoke=new SmokeSimulation();const scene={add(){}};const player=new Player(scene);return{smoke,player};}
test('diagonal movement has the same speed as axial movement',()=>{
 const a=rig(),b=rig();
 a.player.update(.05,1,new Set(['KeyW']),0,a.smoke,[]);
 b.player.update(.05,1,new Set(['KeyW','KeyD']),0,b.smoke,[]);
 const distance=p=>Math.hypot(p.root.position.x,p.root.position.z-4);
 assert.ok(Math.abs(distance(a.player)-distance(b.player))<1e-8);
});
test('arena boundary and obstacle collisions keep the player outside solids',()=>{
 const {player,smoke}=rig();player.root.position.set(0,0,-23.9);
 player.update(.05,1,new Set(['KeyW']),0,smoke,[]);
 assert.ok(Math.hypot(player.root.position.x,player.root.position.z)<=24.00001);
 player.root.position.set(0,0,4);
 player.update(.05,2,new Set(['KeyW']),0,smoke,[{x:0,z:3,radius:.65}]);
 assert.ok(Math.hypot(player.root.position.x,player.root.position.z-3)>=1-1e-8);
});
test('sword alone creates a transient world-space fog wake and resets',()=>{
 const {player,smoke}=rig();player.sword.attack();
 for(let i=0;i<12;i++)player.update(.04,1+i*.04,new Set(),0,smoke,[]);
 const live=smoke.impulses.filter(v=>v.w>0);assert.ok(live.length>=3);assert.ok(live.every(v=>v.y>0));
 assert.ok(new Set(live.map(v=>v.x.toFixed(2))).size>1,'The blade should trace an arc');
 player.update(.3,2,new Set(),0,smoke,[]);assert.equal(player.sword.attacking,false);
 player.reset();smoke.reset();assert.equal(player.root.position.z,4);assert.ok(smoke.impulses.every(v=>v.w<0));
});
test('saved graphics settings are clamped and corrupt storage falls back safely',()=>{
 globalThis.localStorage={getItem:()=>JSON.stringify({density:99,wind:-9,turbulence:1,scattering:1,height:99,detail:2.7,quality:1.8})};
 const saved=loadSettings();assert.equal(saved.density,2.5);assert.equal(saved.wind,0);assert.equal(saved.height,8);assert.equal(saved.quality,2);assert.equal(saved.detail,3);
 globalThis.localStorage={getItem:()=>'{invalid'};assert.equal(loadSettings().density,.9);
 globalThis.localStorage={getItem(){throw new Error('Storage disabled');}};assert.equal(loadSettings().height,3.8);
});

test('one whirlwind per swing travels forward, expires, and clears on restart',()=>{
 const {player,smoke}=rig();player.root.rotation.y=Math.PI/2;
 player.sword.attack();
 for(let i=0;i<17;i++) {
   if(i===5)player.sword.attack(); // Repeated input during a swing cannot duplicate it.
   player.update(.04,1+i*.04,new Set(),0,smoke,[]);
 }
 const live=smoke.vortices.filter(v=>v.w>0);assert.equal(live.length,1);
 assert.ok(live[0].x < -2,'Spawn should follow the player facing direction');
 assert.ok(smoke.vortexDirections[0].x<-.99);
 assert.equal(smoke.hasWhirlwind(live[0].w+2),true);
 assert.equal(smoke.hasWhirlwind(live[0].w+4.9),false);
 player.sword.attack();
 for(let i=0;i<8;i++)player.update(.04,2+i*.04,new Set(),0,smoke,[]);
 assert.equal(smoke.vortices.filter(v=>v.w>0).length,2);
 smoke.reset();assert.equal(smoke.hasWhirlwind(3),false);
});

test('sword recovery returns continuously to the walking pose',()=>{
 const {player,smoke}=rig();player.sword.attack();
 for(let i=0;i<61;i++)player.update(.01,1+i*.01,new Set(),0,smoke,[]);
 const arm=player.root.getObjectByName('Sword arm');
 const beforeArm=arm.quaternion.clone(),beforeWrist=player.sword.pivot.quaternion.clone();
 player.update(.01,1.62,new Set(),0,smoke,[]);
 assert.equal(player.sword.attacking,false);
 assert.ok(beforeArm.angleTo(arm.quaternion)<.025,'No shoulder snap at the end of the cut');
 assert.ok(beforeWrist.angleTo(player.sword.pivot.quaternion)<.025,'No wrist snap at the end of the cut');
 player.update(.1,1.72,new Set(),0,smoke,[]);
 const rest=arm.quaternion.clone();player.sword.attack();player.update(.001,1.721,new Set(),0,smoke,[]);
 assert.ok(rest.angleTo(arm.quaternion)<.025,'The next wind-up should start at rest');
});

test('idle and restart never emit a phantom sword attack on an early animation timestamp',()=>{
 const {player,smoke}=rig();
 player.update(-.02,0,new Set(),0,smoke,[]);
 player.update(.04,.04,new Set(),0,smoke,[]);
 assert.equal(player.sword.charge,1);assert.equal(smoke.hasWhirlwind(.04),false);
 player.sword.attack();player.update(.3,.34,new Set(),0,smoke,[]);
 player.reset();smoke.reset();player.update(.04,.38,new Set(),0,smoke,[]);
 assert.equal(player.sword.charge,1);assert.equal(smoke.hasWhirlwind(.38),false);
});

test('balloons require a cutting blade hit, release fog once, and respawn',()=>{
 const {player,smoke}=rig();const balloons=new Balloons({add(){}});
 for(let i=0;i<10;i++) {player.update(.04,i*.04,new Set(),0,smoke,[]);balloons.update(.04,i*.04,player.sword,smoke,true);}
 assert.equal(balloons.popped,0);assert.equal(smoke.hasFogBurst(.4),false);
 player.sword.attack();
 for(let i=0;i<18;i++){const time=1+i*.04;player.update(.04,time,new Set(),0,smoke,[]);balloons.update(.04,time,player.sword,smoke,true);}
 assert.equal(balloons.popped,1,'The nearby balloon should be reached by the real blade arc');
 const popped=balloons.targets.find(t=>t.poppedAt>0);assert.ok(popped);assert.equal(popped.mesh.visible,false);
 const bursts=smoke.fogBursts.filter(b=>b.w>=0);assert.equal(bursts.length,1);
 assert.ok(Math.abs(bursts[0].x-popped.center.x)<.01);assert.ok(smoke.hasFogBurst(popped.poppedAt+2));
 assert.equal(smoke.hasFogBurst(popped.poppedAt+9.1),false);
 balloons.update(.01,popped.respawnAt+.8,player.sword,smoke,false);assert.equal(popped.mesh.visible,true);assert.equal(popped.mesh.scale.x,1);
 balloons.reset();smoke.reset();assert.equal(balloons.popped,0);assert.ok(balloons.targets.every(t=>t.mesh.visible));assert.equal(smoke.hasFogBurst(0),false);
});

test('balloons outside sword reach stay intact and menus suppress hits',()=>{
 const {player,smoke}=rig();const balloons=new Balloons({add(){}});
 balloons.targets.forEach(t=>t.anchor.x+=20);
 player.sword.attack();
 for(let i=0;i<18;i++){player.update(.04,1+i*.04,new Set(),0,smoke,[]);balloons.update(.04,1+i*.04,player.sword,smoke,true);}
 assert.equal(balloons.popped,0);
 balloons.targets.forEach(t=>t.anchor.x-=20);player.sword.attack();
 for(let i=0;i<18;i++){player.update(.04,2+i*.04,new Set(),0,smoke,[]);balloons.update(.04,2+i*.04,player.sword,smoke,false);}
 assert.equal(balloons.popped,0);assert.equal(smoke.fogBursts.filter(b=>b.w>=0).length,0);
});
