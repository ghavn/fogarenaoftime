import * as T from 'three';
import { Sword } from './sword';
import { SmokeSimulation } from './smoke';
import { ARENA_RADIUS, groundHeight } from './scene';
export class Player {
  readonly root = new T.Group();
  private body = new T.Group();
  private legs: T.Group[] = [];
  private arms: T.Group[] = [];
  readonly sword: Sword;
  moving = false;
  private stride = 0;
  private gait = 0;
  private head = new T.Group();
  private eyes: T.Mesh[] = [];
  private capTail = new T.Group();
  private scarfTail = new T.Group();
  constructor(scene: T.Scene) {
    const skin=new T.MeshStandardMaterial({color:0xf2c99e,roughness:.83});
    const hair=new T.MeshStandardMaterial({color:0xe4bb50,roughness:.82});
    const hairLight=new T.MeshStandardMaterial({color:0xf4d477,roughness:.8});
    const trousers=new T.MeshStandardMaterial({color:0xd9cfb0,roughness:.95});
    const darkGreen=new T.MeshStandardMaterial({color:0x426d40,roughness:.9});
    const capGreen=new T.MeshStandardMaterial({color:0x4e843f,roughness:.9});
    const innerEar=new T.MeshStandardMaterial({color:0xdba88a,roughness:.9});
    const leather=new T.MeshStandardMaterial({color:0x64553b,roughness:.95});
    const cream=new T.MeshStandardMaterial({color:0xd6d9a2,roughness:.9});
    const eyeMat=new T.MeshStandardMaterial({color:0x254959,roughness:.25});
    const white=new T.MeshBasicMaterial({color:0xf3f6df});
    const blush=new T.MeshStandardMaterial({color:0xdfa18b,roughness:1});
    const mesh=(g:T.BufferGeometry,m:T.Material,p:T.Vector3,parent:T.Object3D=this.body)=>{
      const o=new T.Mesh(g,m);o.position.copy(p);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;
    };
    this.body.name='Guardian body';this.head.name='Guardian head';
    this.root.add(this.body);scene.add(this.root);
    mesh(new T.CapsuleGeometry(.27,.26,5,14),darkGreen,new T.Vector3(0,.94,0)).scale.z=.86;
    mesh(new T.SphereGeometry(.22,14,10),skin,new T.Vector3(0,1.16,-.025)).scale.set(1,.7,.8);
    mesh(new T.SphereGeometry(.2,14,10),cream,new T.Vector3(0,.98,-.19)).scale.set(.8,1,.4);
    this.head.position.set(0,1.52,0);this.body.add(this.head);
    mesh(new T.SphereGeometry(.41,24,18),skin,new T.Vector3(0,0,0),this.head).scale.set(1,1,.92);
    for(const side of [-1,1]) {
      const ear=mesh(new T.SphereGeometry(.17,12,10),skin,new T.Vector3(side*.4,.035,.005),this.head);
      ear.scale.set(1.05,.65,.5);ear.rotation.z=side*.3;
      const inner=mesh(new T.SphereGeometry(.09,10,8),innerEar,new T.Vector3(side*.44,.045,-.065),this.head);inner.scale.set(1,.55,.3);
      const eye=mesh(new T.SphereGeometry(.093,16,12),eyeMat,new T.Vector3(side*.145,.015,-.334),this.head);eye.scale.set(.86,1.2,.4);
      mesh(new T.SphereGeometry(.025,10,8),white,new T.Vector3(-.023,.028,-.09),eye);
      mesh(new T.SphereGeometry(.011,8,6),white,new T.Vector3(.021,-.024,-.093),eye);
      const cheek=mesh(new T.SphereGeometry(.071,12,8),blush,new T.Vector3(side*.245,-.1,-.295),this.head);cheek.scale.set(1,.4,.15);
      const brow=mesh(new T.CapsuleGeometry(.013,.064,3,8),hair,new T.Vector3(side*.15,.166,-.332),this.head);brow.rotation.z=side*1.25;
      this.eyes.push(eye);
    }
    mesh(new T.SphereGeometry(.042,12,10),skin,new T.Vector3(0,-.075,-.373),this.head).scale.set(1,.8,.8);
    const smileCurve=new T.QuadraticBezierCurve3(new T.Vector3(-.065,-.14,-.344),new T.Vector3(0,-.19,-.366),new T.Vector3(.065,-.14,-.344));
    mesh(new T.TubeGeometry(smileCurve,14,.009,5,false),eyeMat,new T.Vector3(),this.head);
    // Layered golden bangs frame the face beneath the familiar long green cap.
    const hairBack=mesh(new T.SphereGeometry(.418,24,14,0,Math.PI*2,0,Math.PI*.64),hair,new T.Vector3(0,.055,.055),this.head);
    hairBack.rotation.x=.2;
    for(const side of [-1,1]) {
      const sideburn=mesh(new T.CapsuleGeometry(.07,.2,4,10),hair,new T.Vector3(side*.325,-.015,-.185),this.head);
      sideburn.rotation.z=side*-.18;sideburn.scale.z=.65;
      const lock=mesh(new T.SphereGeometry(.085,14,10),hairLight,new T.Vector3(side*.27,.18,-.3),this.head);
      lock.rotation.z=side*.28;lock.scale.set(.8,1.6,.55);
    }
    for(let i=0;i<5;i++) {
      const x=(i-2)*.105;
      const bang=mesh(new T.SphereGeometry(.095,12,10),i%2?hair:hairLight,new T.Vector3(x,.25+Math.abs(x)*.12,-.285),this.head);
      bang.scale.set(.85,1.38,.58);bang.rotation.z=-.28+(i-2)*.13;
    }
    const cap=mesh(new T.SphereGeometry(.435,24,14,0,Math.PI*2,0,Math.PI*.42),capGreen,new T.Vector3(0,.14,.035),this.head);cap.rotation.x=.15;
    const brim=mesh(new T.TorusGeometry(.395,.035,8,28),capGreen,new T.Vector3(0,.265,.035),this.head);brim.rotation.x=Math.PI/2;
    this.capTail.position.set(0,.43,.12);this.head.add(this.capTail);this.capTail.name='Long green cap';
    // Tapered curved cloth tube: broad crown, softly drooping point behind the head.
    const centers=[new T.Vector3(0,-.06,-.04),new T.Vector3(0,.08,.14),new T.Vector3(.02,.1,.34),new T.Vector3(.04,.015,.55),new T.Vector3(.05,-.16,.71),new T.Vector3(.04,-.29,.77)];
    const curve=new T.CatmullRomCurve3(centers);
    const vertices:number[]=[],indices:number[]=[];
    const rings=22,sides=16;
    const frames=curve.computeFrenetFrames(rings,false);
    for(let ring=0;ring<=rings;ring++) {
      const t=ring/rings,center=curve.getPointAt(t),radius=.275*Math.pow(1-t,.85)+.005;
      for(let side=0;side<sides;side++) {
        const angle=side/sides*Math.PI*2;
        const v=center.clone().addScaledVector(frames.normals[ring],Math.cos(angle)*radius).addScaledVector(frames.binormals[ring],Math.sin(angle)*radius);
        vertices.push(v.x,v.y,v.z);
        if(ring<rings) {const a=ring*sides+side,b=ring*sides+(side+1)%sides,c=a+sides,d=b+sides;indices.push(a,b,c,b,d,c);}
      }
    }
    const capGeometry=new T.BufferGeometry();capGeometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));capGeometry.setIndex(indices);capGeometry.computeVertexNormals();
    mesh(capGeometry,capGreen,new T.Vector3(),this.capTail);
    const scarf=mesh(new T.TorusGeometry(.25,.045,8,20),cream,new T.Vector3(0,1.22,0));scarf.rotation.x=Math.PI/2;
    this.scarfTail.position.set(-.13,1.2,.16);this.body.add(this.scarfTail);
    mesh(new T.CapsuleGeometry(.07,.23,3,8),cream,new T.Vector3(0,-.12,.05),this.scarfTail).scale.z=.4;
    mesh(new T.CylinderGeometry(.279,.279,.075,16),leather,new T.Vector3(0,.8,0)).scale.z=.86;
    const buckle=mesh(new T.TorusGeometry(.048,.012,5,10),new T.MeshStandardMaterial({color:0xc9b775,metalness:.65,roughness:.45}),new T.Vector3(0,.8,-.247));buckle.scale.set(1,1.2,1);
    for(const side of [-1,1]) {
      const leg=new T.Group();leg.position.set(side*.15,.68,0);this.body.add(leg);this.legs.push(leg);
      mesh(new T.CapsuleGeometry(.115,.24,4,10),trousers,new T.Vector3(0,-.19,0),leg);
      mesh(new T.SphereGeometry(.14,14,10),leather,new T.Vector3(0,-.52,-.045),leg).scale.set(.94,.7,1.4);
      const arm=new T.Group();arm.name=side===1?'Sword arm':'Free arm';arm.position.set(side*.31,1.16,0);this.body.add(arm);this.arms.push(arm);
      mesh(new T.CapsuleGeometry(.1,.21,4,10),darkGreen,new T.Vector3(0,-.18,0),arm);
      mesh(new T.SphereGeometry(.112,12,10),skin,new T.Vector3(0,-.36,0),arm);
    }
    const hand=new T.Group();hand.position.set(0,-.36,-.01);this.arms[1].add(hand);
    this.sword=new Sword(hand);
    const rim=new T.PointLight(0xd2e7b0,1.6,3.5,2);rim.position.set(0,2,.7);this.root.add(rim);
    this.reset();
  }
  reset() {this.root.position.set(0,groundHeight(0,4),4);this.root.rotation.y=0;this.sword.reset();this.stride=0;this.gait=0;
    this.body.position.set(0,0,0);this.body.rotation.set(0,0,0);
    this.arms.forEach(a=>a.rotation.set(0,0,0));this.legs.forEach(l=>l.rotation.set(0,0,0));}
  update(dt:number,time:number,keys:Set<string>,cameraYaw:number,smoke:SmokeSimulation,collision:{x:number;z:number;radius:number}[]) {
    const x=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));
    const z=Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp'));
    const movement=new T.Vector3(x,0,z);this.moving=movement.lengthSq()>0;
    if(this.moving) {
      movement.normalize().applyAxisAngle(new T.Vector3(0,1,0),cameraYaw);
      const wanted=Math.atan2(-movement.x,-movement.z);
      this.root.rotation.y+=Math.atan2(Math.sin(wanted-this.root.rotation.y),Math.cos(wanted-this.root.rotation.y))*(1-Math.exp(-dt*14));
      const next=this.root.position.clone().addScaledVector(movement,dt*(this.sword.attacking?2.3:4.2));
      for(const c of collision) {
        const dx=next.x-c.x,dz=next.z-c.z,d=Math.hypot(dx,dz),r=c.radius+.35;
        if(d<r) {next.x=c.x+dx/Math.max(.001,d)*r;next.z=c.z+dz/Math.max(.001,d)*r;}
      }
      if(Math.hypot(next.x,next.z)>ARENA_RADIUS) {const f=ARENA_RADIUS/Math.hypot(next.x,next.z);next.x*=f;next.z*=f;}
      this.root.position.copy(next);smoke.trail(next,time);this.stride+=dt*9;
    }
    this.root.position.y=groundHeight(this.root.position.x,this.root.position.z);
    this.gait=T.MathUtils.damp(this.gait,this.moving?1:0,10,dt);
    const amplitude=.58*this.gait;
    const swingWeight=1-Math.sin(this.sword.charge*Math.PI)*.85;
    for(let i=0;i<2;i++) {
      const step=Math.sin(this.stride+i*Math.PI);
      this.legs[i].rotation.set(step*amplitude,0,(i===0?1:-1)*.035);
      this.arms[i].rotation.set(-.1-step*amplitude*.45*(i===1?swingWeight:1),0,i===0?.13:-.1);
    }
    this.body.position.y=Math.sin(time*2.2)*.014+Math.sin(this.stride*2)*.032*this.gait;
    this.body.rotation.x=-.055*this.gait;
    this.head.rotation.set(Math.sin(time*1.7)*.025,Math.sin(time*.9)*.035,-Math.sin(this.stride)*.025*this.gait);
    this.capTail.rotation.z=Math.sin(time*2.2)*.035+Math.sin(this.stride)*.075*this.gait;
    this.capTail.rotation.x=Math.sin(time*2.1)*.035-this.gait*.12;
    this.scarfTail.rotation.x=-.12-this.gait*.5+Math.sin(time*5)*(.06+.12*this.gait);
    const blinkPhase=time%4.7;
    const blink=1-.91*Math.exp(-Math.pow((blinkPhase-4.4)/.065,2));
    this.eyes.forEach(eye=>eye.scale.y=1.2*blink);
    this.sword.update(dt,time,smoke,this.arms[1],this.root);
  }
}
