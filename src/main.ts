import './style.css';
import * as T from 'three';
import { createWorld } from './game/scene';
import { Balloons } from './game/balloons';
import { Player } from './game/player';
import { FollowCamera } from './game/camera';
import { SmokeSimulation } from './game/smoke';
import { loadSettings } from './game/settings';
import { VolumetricFog } from './rendering/fog';
import { Interface } from './ui/interface';
function boot() {
  const canvas=document.createElement('canvas');canvas.setAttribute('aria-label','Fogarena of Time — moonlit forest arena');
  const context=canvas.getContext('webgl2',{antialias:false,powerPreference:'high-performance'});
  if(!context)throw new Error('WebGL 2 is required. Please use a modern desktop browser with hardware acceleration enabled.');
  if(!context.getExtension('EXT_color_buffer_float'))throw new Error('Your GPU does not support the floating-point rendering needed by this volumetric atmosphere.');
  const renderer=new T.WebGLRenderer({canvas,context,antialias:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.outputColorSpace=T.LinearSRGBColorSpace;renderer.toneMapping=T.NoToneMapping;document.body.prepend(canvas);
  const world=createWorld(),player=new Player(world.scene),follow=new FollowCamera(),smoke=new SmokeSimulation();
  const balloons=new Balloons(world.scene);
  const settings=loadSettings();if(!hasSavedSettings()&&(navigator.hardwareConcurrency<=4||innerWidth<700))settings.quality=0;
  const fog=new VolumetricFog(renderer,smoke),keys=new Set<string>();
  let playing=false,time=0,dragging=false,wasHidden=false;
  const ui=new Interface(settings,{
    attack(){if(playing)player.sword.attack();},
    play(){playing=true;keys.clear();fog.invalidate();},pause(){playing=false;keys.clear();dragging=false;},
    restart(){player.reset();follow.reset(player.root.position);smoke.reset();balloons.reset();time=0;fog.invalidate();},changed(){resize();fog.invalidate();},
  });
  function resize(){renderer.setSize(innerWidth,innerHeight);follow.camera.aspect=innerWidth/innerHeight;follow.camera.updateProjectionMatrix();const size=renderer.getDrawingBufferSize(new T.Vector2());fog.resize(size.x,size.y,settings.quality);}
  addEventListener('resize',resize);resize();
  const handled=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','Escape']);
  addEventListener('keydown',e=>{
    if(e.code==='Escape'&&!e.repeat){e.preventDefault();ui.escape();return;}
    if(e.target instanceof HTMLInputElement||e.target instanceof HTMLSelectElement)return;
    if(handled.has(e.code))e.preventDefault();
    if(!playing)return;keys.add(e.code);if(e.code==='Space'&&!e.repeat)player.sword.attack();
  });
  addEventListener('keyup',e=>keys.delete(e.code));
  addEventListener('blur',()=>{keys.clear();dragging=false;if(playing)ui.pause();});
  document.addEventListener('visibilitychange',()=>{wasHidden=document.hidden;if(document.hidden&&playing)ui.pause();fog.invalidate();});
  canvas.addEventListener('pointerdown',e=>{if(playing){dragging=true;canvas.setPointerCapture(e.pointerId);}});
  canvas.addEventListener('pointermove',e=>{if(dragging&&playing)follow.rotate(e.movementX,e.movementY);});
  canvas.addEventListener('pointerup',()=>dragging=false);canvas.addEventListener('pointercancel',()=>dragging=false);canvas.addEventListener('contextmenu',e=>e.preventDefault());
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();ui.pause();showError('The graphics context was lost. Reload this page to restore the atmosphere.');});
  let previous=performance.now(),frames=0,fpsTime=previous,first=true;
  renderer.setAnimationLoop((now:number)=>{
    if(wasHidden){previous=now;return;}
    const dt=Math.max(0,Math.min((now-previous)/1000,.05));previous=now;time+=dt;
    player.update(dt,time,playing?keys:new Set(),follow.yaw,smoke,world.collision);
    balloons.update(dt,time,player.sword,smoke,playing);
    follow.update(dt,player.root.position,!playing,time);
    ui.updateAdventure(player.root.position.x,player.root.position.z,player.root.rotation.y,follow.yaw,player.sword.charge,smoke.vortices.filter(v=>time>=v.w&&time-v.w<4.8).length,balloons.popped);
    world.moonLight.position.copy(player.root.position).addScaledVector(new T.Vector3(-.42,.75,-.5).normalize(),40);world.moonLight.target.position.copy(player.root.position);
    fog.render(world.scene,follow.camera,time,settings,player.sword.attacking||smoke.hasWhirlwind(time)||smoke.hasFogBurst(time));
    if(first){ui.ready();first=false;}frames++;if(now-fpsTime>1000){ui.fps(Math.round(frames*1000/(now-fpsTime)));frames=0;fpsTime=now;}
    Object.assign(diagnostics,{playing,time,position:player.root.position.toArray(),attacking:player.sword.attacking,impulses:smoke.impulses.map(v=>v.toArray()),vortices:smoke.vortices.map(v=>v.toArray()),balloons:balloons.targets.map(t=>({position:t.center.toArray(),alive:t.mesh.visible})),popped:balloons.popped,fogBursts:smoke.fogBursts.map(b=>b.toArray()),settings:{...settings},frames:diagnostics.frames+1});
  });
}
const diagnostics={playing:false,time:0,position:[0,0,4],attacking:false,impulses:[] as number[][],vortices:[] as number[][],balloons:[] as {position:number[];alive:boolean}[],popped:0,fogBursts:[] as number[][],settings:{},frames:0};
Object.defineProperty(window,'__FOGARENA__',{value:diagnostics,writable:false});
function hasSavedSettings(){try{return !!localStorage.getItem('fogarena-settings');}catch{return false;}}
function showError(message:string){const el=document.createElement('div');el.className='error';const title=document.createElement('h1');title.textContent='Fogarena of Time';const p=document.createElement('p');p.textContent=message;el.append(title,p);document.body.append(el);}
try{boot();}catch(error){console.error(error);showError(error instanceof Error?error.message:String(error));}
