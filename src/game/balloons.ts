import * as T from 'three';
import { groundHeight } from './scene';
import type { Sword } from './sword';
import type { SmokeSimulation } from './smoke';

const COLORS=[0xd6a471,0x9fbba1,0xb1a3c4,0xd5b970,0xc38c86,0x89b9b2,0xb9c17e,0x9bacc9];
const LOCATIONS=[[.65,3.05],[-1.6,1.3],[2.5,-.8],[-3.5,-3],[4.5,-5.8],[-5.7,-7.5],[1.7,-10],[-6.8,4.8]];
export class Balloons {
  readonly targets: {mesh:T.Group;anchor:T.Vector3;center:T.Vector3;poppedAt:number;respawnAt:number;phase:number}[]=[];
  popped=0;
  private readonly sphere=new T.SphereGeometry(.43,20,16);
  private readonly knot=new T.ConeGeometry(.065,.12,8);
  private readonly triangle=new T.Triangle();
  private readonly point=new T.Vector3();
  private readonly dummy=new T.Object3D();
  private readonly scraps:T.InstancedMesh;
  private readonly fragments=Array.from({length:48},()=>({position:new T.Vector3(),velocity:new T.Vector3(),born:-100,color:0xffffff,spin:0}));
  private nextFragment=0;

  constructor(scene:T.Scene) {
    const thread=new T.LineBasicMaterial({color:0xa7ad94,transparent:true,opacity:.65});
    LOCATIONS.forEach(([x,z],i)=>{
      const material=new T.MeshStandardMaterial({color:COLORS[i],roughness:.3,metalness:.08,emissive:COLORS[i],emissiveIntensity:.12});
      const mesh=new T.Group();mesh.name=`Mist balloon ${i+1}`;
      const globe=new T.Mesh(this.sphere,material);globe.scale.set(.95,1.13,.95);globe.castShadow=true;mesh.add(globe);
      const tie=new T.Mesh(this.knot,material);tie.position.y=-.51;mesh.add(tie);
      const string=new T.Line(new T.BufferGeometry().setFromPoints(new T.CatmullRomCurve3([
        new T.Vector3(0,-.5,0),new T.Vector3(.05,-.75,.025),new T.Vector3(-.025,-1,0),new T.Vector3(0,-1.16,0),
      ]).getPoints(16)),thread);mesh.add(string);
      scene.add(mesh);
      const anchor=new T.Vector3(x,groundHeight(x,z)+1.23,z);
      this.targets.push({mesh,anchor,center:anchor.clone(),poppedAt:-100,respawnAt:0,phase:i*1.73});
    });
    this.scraps=new T.InstancedMesh(new T.PlaneGeometry(.075,.13),new T.MeshStandardMaterial({side:T.DoubleSide,roughness:.7}),this.fragments.length);
    this.scraps.instanceMatrix.setUsage(T.DynamicDrawUsage);this.scraps.frustumCulled=false;scene.add(this.scraps);
    this.reset();
  }

  private intersects(sweep:Sword['cutSweep'],center:T.Vector3) {
    // Test the complete swept blade surface, not just the endpoint of this frame.
    for(const vertices of [[sweep.fromBase,sweep.fromTip,sweep.toTip],[sweep.fromBase,sweep.toTip,sweep.toBase]]) {
      this.triangle.set(vertices[0],vertices[1],vertices[2]).closestPointToPoint(center,this.point);
      if(this.point.distanceToSquared(center)<.5*.5)return true;
    }
    return false;
  }

  update(dt:number,time:number,sword:Sword,smoke:SmokeSimulation,canPop:boolean) {
    this.targets.forEach((target,i)=>{
      const alive=time>=target.respawnAt;
      target.mesh.visible=alive;
      if(!alive)return;
      const age=time-target.respawnAt;
      const inflate=target.respawnAt===0?1:T.MathUtils.smoothstep(age,0,.7);
      target.mesh.scale.setScalar(inflate);
      target.center.copy(target.anchor).add(new T.Vector3(Math.sin(time*.85+target.phase)*.065,Math.sin(time*1.3+target.phase)*.07,Math.cos(time*.7+target.phase)*.045));
      target.mesh.position.copy(target.center);target.mesh.rotation.z=Math.sin(time*.9+target.phase)*.055;
      if(canPop&&inflate>.7&&sword.cutSweep.active&&this.intersects(sword.cutSweep,target.center)) {
        target.poppedAt=time;target.respawnAt=time+10;target.mesh.visible=false;this.popped++;
        smoke.releaseFog(target.center,time);
        for(let n=0;n<9;n++) {
          const f=this.fragments[this.nextFragment];this.nextFragment=(this.nextFragment+1)%this.fragments.length;
          const angle=n/9*Math.PI*2;
          f.position.copy(target.center);f.velocity.set(Math.cos(angle)*(1.2+n%3*.2),.8+(n%4)*.45,Math.sin(angle)*1.4);
          f.born=time;f.color=COLORS[i];f.spin=angle;
        }
      }
    });
    this.fragments.forEach((f,i)=>{
      const age=time-f.born;
      if(age>=0&&age<1.3) {
        const drag=Math.exp(-Math.max(0,dt)*1.2);f.velocity.multiplyScalar(drag);f.velocity.y-=dt*2.1;f.position.addScaledVector(f.velocity,dt);
        this.dummy.position.copy(f.position);this.dummy.rotation.set(age*6+f.spin,age*4,age*5+f.spin);this.dummy.scale.setScalar(1-T.MathUtils.smoothstep(age,.5,1.3));
      } else this.dummy.scale.setScalar(0);
      this.dummy.updateMatrix();this.scraps.setMatrixAt(i,this.dummy.matrix);this.scraps.setColorAt(i,new T.Color(f.color));
    });
    this.scraps.instanceMatrix.needsUpdate=true;if(this.scraps.instanceColor)this.scraps.instanceColor.needsUpdate=true;
  }

  reset() {
    this.popped=0;this.nextFragment=0;
    this.targets.forEach(t=>{t.poppedAt=-100;t.respawnAt=0;t.mesh.visible=true;t.mesh.scale.setScalar(1);t.center.copy(t.anchor);t.mesh.position.copy(t.center);});
    this.fragments.forEach(f=>f.born=-100);
    this.dummy.scale.setScalar(0);this.dummy.updateMatrix();this.fragments.forEach((_,i)=>this.scraps.setMatrixAt(i,this.dummy.matrix));this.scraps.instanceMatrix.needsUpdate=true;
  }
}
