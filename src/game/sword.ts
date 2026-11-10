import * as T from 'three';
import { SmokeSimulation } from './smoke';

const DURATION = .62;
const ease = (t: number) => { t = T.MathUtils.clamp(t, 0, 1); return t*t*(3-2*t); };
const pose = (x: number, y: number, z: number) => new T.Quaternion().setFromEuler(new T.Euler(x,y,z));
// Anticipation, a fast diagonal cut, follow-through, and a soft recovery.
const shoulderPoses = [pose(0,0,0),pose(-.65,-.8,.95),pose(.6,.85,-.4),pose(.2,.4,-.15),pose(0,0,0)];
const wristPoses = [pose(-1.8,0,-.35),pose(.1,0,-.15),pose(-1.8,0,-.45),pose(-2,0,-.5),pose(-1.8,0,-.35)];
const timings = [0,.22,.53,.68,1];
const twists = [0,-.24,.3,.17,0];

export class Sword {
  readonly pivot = new T.Group();
  readonly tip = new T.Object3D();
  readonly glow: T.PointLight;
  private elapsed = DURATION;
  private nextImpulse = 0;
  private whirlwindSpawned = true;
  private readonly offset = new T.Quaternion();
  private readonly bladeBase = new T.Object3D();
  readonly cutSweep = { active:false, fromBase:new T.Vector3(), fromTip:new T.Vector3(), toBase:new T.Vector3(), toTip:new T.Vector3() };
  private readonly previousBase = new T.Vector3();
  private readonly previousTip = new T.Vector3();
  private previousTipValid = false;
  private readonly trailGeometry = new T.BufferGeometry();
  private readonly trailPositions = new Float32Array(9*6*3);
  private readonly trailColors = new Float32Array(9*6*4);
  private readonly trailMaterial = new T.MeshBasicMaterial({vertexColors:true,transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending});
  private readonly trail = new T.Mesh(this.trailGeometry,this.trailMaterial);
  private readonly samples: {base:T.Vector3;tip:T.Vector3;time:number}[] = [];

  get charge() { return Math.min(1,this.elapsed/DURATION); }
  get attacking() { return this.elapsed<DURATION; }

  constructor(hand: T.Group) {
    const silver=new T.MeshStandardMaterial({color:0xe1ece6,metalness:.65,roughness:.29,emissive:0x6a9384,emissiveIntensity:.18});
    const bronze=new T.MeshStandardMaterial({color:0xc1a968,metalness:.65,roughness:.4});
    // A small, tapered leaf blade suits the little forest guardian.
    const shape=new T.Shape();shape.moveTo(-.065,.16);shape.lineTo(-.09,.72);shape.lineTo(0,1.04);shape.lineTo(.09,.72);shape.lineTo(.065,.16);shape.closePath();
    const blade=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:.035,bevelEnabled:true,bevelThickness:.012,bevelSize:.012,bevelSegments:1,steps:1}),silver);
    blade.position.z=-.0175;blade.castShadow=true;
    const guard=new T.Mesh(new T.CapsuleGeometry(.04,.27,3,8),bronze);guard.rotation.z=Math.PI/2;guard.position.y=.16;
    const grip=new T.Mesh(new T.CylinderGeometry(.052,.052,.23,10),new T.MeshStandardMaterial({color:0x405a39,roughness:.8}));grip.position.y=.025;
    const pommel=new T.Mesh(new T.SphereGeometry(.068,10,8),bronze);pommel.position.y=-.11;
    this.pivot.add(blade,guard,grip,pommel);
    this.tip.position.y=1.04;this.bladeBase.position.y=.22;this.pivot.add(this.tip,this.bladeBase);
    hand.add(this.pivot);this.pivot.quaternion.copy(wristPoses[0]);
    this.glow=new T.PointLight(0xb8ead5,0,3);this.pivot.add(this.glow);
    this.trailGeometry.setAttribute('position',new T.BufferAttribute(this.trailPositions,3).setUsage(T.DynamicDrawUsage));
    this.trailGeometry.setAttribute('color',new T.BufferAttribute(this.trailColors,4).setUsage(T.DynamicDrawUsage));
    this.trailGeometry.setDrawRange(0,0);this.trail.frustumCulled=false;this.trail.renderOrder=1;this.trail.name='Sword swing ribbon';
  }

  attack() {
    if(!this.attacking) {this.elapsed=0;this.nextImpulse=0;this.whirlwindSpawned=false;this.previousTipValid=false;}
  }

  reset() {
    this.elapsed=DURATION;this.glow.intensity=0;this.previousTipValid=false;this.whirlwindSpawned=true;
    this.cutSweep.active=false;
    this.samples.length=0;this.trailGeometry.setDrawRange(0,0);this.pivot.quaternion.copy(wristPoses[0]);
  }

  update(dt:number,time:number,smoke:SmokeSimulation,arm:T.Group,player:T.Group) {
    const previous=this.elapsed;
    this.elapsed=Math.min(DURATION,this.elapsed+Math.max(0,dt));
    const t=this.charge;
    let segment=0;
    while(segment<3&&t>timings[segment+1])segment++;
    const blend=ease((t-timings[segment])/(timings[segment+1]-timings[segment]));
    this.offset.slerpQuaternions(shoulderPoses[segment],shoulderPoses[segment+1],blend);
    // Compose on top of the locomotion pose; both ends of the clip are identity.
    arm.quaternion.multiply(this.offset);
    this.pivot.quaternion.slerpQuaternions(wristPoses[segment],wristPoses[segment+1],blend);
    const torso=arm.parent;
    if(torso) {torso.rotation.y=T.MathUtils.lerp(twists[segment],twists[segment+1],blend);torso.rotation.z=-Math.sin(t*Math.PI)*.035;}
    const cutting=t>=.22&&t<=.68;
    this.glow.intensity=cutting?Math.sin((t-.22)/.46*Math.PI)*1.8:0;
    if(previous<DURATION&&this.elapsed>=DURATION*.3&&!this.whirlwindSpawned) {
      player.updateWorldMatrix(true,false);
      smoke.spawnWhirlwind(player.localToWorld(new T.Vector3(0,.08,-2.2)),new T.Vector3(0,0,-1).transformDirection(player.matrixWorld),time);
      this.whirlwindSpawned=true;
    }
    arm.updateWorldMatrix(true,true);
    const tip=this.tip.getWorldPosition(new T.Vector3());
    if(cutting&&this.elapsed>=this.nextImpulse) {
      // Fill gaps along the blade path even when a frame spans a large part of the cut.
      if(this.previousTipValid)smoke.disturb(this.previousTip.clone().lerp(tip,.5),time,.7);
      smoke.disturb(tip,time);this.nextImpulse=this.elapsed+.035;
    }
    const base=this.bladeBase.getWorldPosition(new T.Vector3());
    this.cutSweep.active=this.previousTipValid&&previous<DURATION*.68&&this.elapsed>=DURATION*.22;
    this.cutSweep.fromBase.copy(this.previousBase);this.cutSweep.fromTip.copy(this.previousTip);
    this.cutSweep.toBase.copy(base);this.cutSweep.toTip.copy(tip);
    this.previousBase.copy(base);this.previousTip.copy(tip);this.previousTipValid=true;
    if(cutting) {
      if(!this.trail.parent&&player.parent)player.parent.add(this.trail);
      this.samples.push({base:this.bladeBase.getWorldPosition(new T.Vector3()),tip:tip.clone(),time});
    }
    while(this.samples.length&&(time-this.samples[0].time>.13||this.samples.length>10))this.samples.shift();
    let vertex=0;
    for(let i=1;i<this.samples.length;i++) {
      const a=this.samples[i-1],b=this.samples[i];
      for(const [sample,point] of [[a,a.base],[a,a.tip],[b,b.tip],[a,a.base],[b,b.tip],[b,b.base]] as const) {
        this.trailPositions.set(point.toArray(),vertex*3);
        this.trailColors.set([.48,.8,.64,.22*Math.max(0,1-(time-sample.time)/.13)],vertex*4);vertex++;
      }
    }
    this.trailGeometry.setDrawRange(0,vertex);
    this.trailGeometry.attributes.position.needsUpdate=true;this.trailGeometry.attributes.color.needsUpdate=true;
  }
}
