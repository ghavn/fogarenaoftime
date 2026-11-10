import * as T from 'three';
export class FollowCamera {
  readonly camera=new T.PerspectiveCamera(48,1,.1,130);
  yaw=0; pitch=.22; private target=new T.Vector3(0,1,0);
  constructor() {this.camera.position.set(0,4.8,13);}
  rotate(dx:number,dy:number) {this.yaw-=dx*.004;this.pitch=T.MathUtils.clamp(this.pitch+dy*.003,.12,.8);}
  update(dt:number,position:T.Vector3,menu:boolean,time:number) {
    const yaw=menu?-.23+Math.sin(time*.035)*.08:this.yaw;
    const distance=menu?14:8;
    const focus=position.clone().add(new T.Vector3(menu?-2.8:0,1.15,0));
    this.target.lerp(focus,1-Math.exp(-dt*5));
    const desired=this.target.clone().add(new T.Vector3(Math.sin(yaw)*distance,menu?2.7:1.2+Math.sin(this.pitch)*5,Math.cos(yaw)*distance));
    this.camera.position.lerp(desired,1-Math.exp(-dt*4));this.camera.lookAt(this.target);
    this.camera.updateMatrixWorld();
  }
  reset(position:T.Vector3) {this.yaw=0;this.target.copy(position).add(new T.Vector3(0,1.15,0));this.camera.position.copy(this.target).add(new T.Vector3(0,4,8));}
}
