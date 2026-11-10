import * as T from 'three';
import { noiseGLSL, createNoiseVolume } from './noise';
import { moonDirection } from '../game/lighting';
import { qualityLevels, type GraphicsSettings } from '../game/settings';
import type { SmokeSimulation } from '../game/smoke';
const vertex = `varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;
const fragment = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform sampler2D uDepth;
uniform mat4 uInvProjection, uCameraWorld;
uniform vec3 uCamera, uSun;
uniform float uTime,uDensity,uWind,uTurbulence,uScattering,uHeight,uFrame;
uniform int uSteps,uDetail;
uniform vec4 uFogBursts[8];
uniform vec4 uImpulses[8];
uniform float uImpulseStrengths[8];
uniform vec4 uVortices[8];
uniform vec3 uVortexDirections[8];
${noiseGLSL}
vec2 density(vec3 p) {
  // A soft intake grows into a bent, widening plume. Rotation and lift act on
  // the same density coordinates as the ambient fog, so the two flow together.
  vec3 advected=p;
  float spiralDensity=0., clearing=1.;
  for(int i=0;i<8;i++) {
    float age=uTime-uVortices[i].w;
    if(age>=0. && age<4.8) {
      float birth=smoothstep(0.,.55,age);
      float decay=smoothstep(2.4,4.8,age);
      float life=birth*(1.-decay);
      vec3 center=uVortices[i].xyz+uVortexDirections[i]*(1.9*(1.-exp(-age*.5)));
      center.xz+=vec2(.14,.07)*uWind*age;
      vec3 local=p-center;
      float h=local.y;
      float crown=1.1+3.2*smoothstep(0.,1.1,age)+decay*.8;
      if(h < -.3 || h > crown+.8 || dot(local.xz,local.xz)>20.) continue;
      // Wind bends the crown; a slower precession keeps the funnel from looking rigid.
      local.xz-=h*h*.035*(uVortexDirections[i].xz+vec2(.5,.25)*uWind);
      local.xz-=vec2(sin(age*1.5+h*.9),cos(age*1.3+h*.7))*.1*max(h,0.);
      float radius=.3+max(h,0.)*.24+decay*.55;
      float radial=length(local.xz);
      float vertical=smoothstep(-.18,.2,h)*(1.-smoothstep(crown*.64,crown,h));
      float reach=exp(-radial*radial/(radius*radius*4.))*vertical*life;
      float rotation=(age*4.2-h*.8)*reach;
      float c=cos(rotation),s=sin(rotation);
      advected.xz+=mat2(c,-s,s,c)*local.xz-local.xz;
      advected.y-=min(age,2.8)*1.15*reach;
      float angle=atan(local.z,local.x);
      float helix=angle*2.-h*(4.4-decay)+age*7.5;
      // Flow-aligned noise frays the sheets without boiling randomly each frame.
      vec3 flow=vec3(local.x*c-local.z*s,h-age*.9,local.x*s+local.z*c);
      float billow=noise3(flow*2.1+vec3(float(i)*13.7));
      float wisps=noise3(flow*5.3+billow);
      float width=.22+max(h,0.)*.065+decay*.2;
      float edge=radial-radius-(billow-.5)*(.3+.15*uTurbulence);
      float shell=exp(-edge*edge/(width*width));
      float ribbons=smoothstep(.12,.9,.5+.5*sin(helix+(billow-.5)*2.));
      float erosion=smoothstep(decay*.55,.85,.4*billow+.6*wisps);
      spiralDensity+=shell*(.2+.8*ribbons)*erosion*vertical*life*.95*uDensity;
      // A broad rolling skirt draws ground mist toward the narrower updraft.
      float skirt=exp(-pow((radial-(.65+birth*.65+age*.12))/.6,2.))
        *exp(-pow((h-.18)/.35,2.));
      spiralDensity+=skirt*(.4+.6*billow)*life*.1*uDensity;
      clearing*=1.-.78*exp(-radial*radial/max(.01,radius*radius*.7))*vertical*life;
    }
  }
  float height = exp(-max(p.y+.15,0.)/uHeight);
  vec3 q=advected*.19-vec3(uTime*.032*uWind,0.,uTime*.019*uWind);
  vec3 warp=vec3(noise3(q*.64+vec3(0,uTime*.013,0)),noise3(q*.64+12.7),noise3(q*.64+31.4))-.5;
  q += warp*uTurbulence*2.5;
  q.y += sin(q.x*.8+uTime*.08)*.3*uTurbulence;
  float banks=fbm(q*1.25);
  float wisps=noise3(q*5.3+warp*3.-vec3(0,uTime*.06,0));
  float field=smoothstep(.35,.65,banks)*1.25;
  float ground=exp(-max(p.y,0.)*2.1)*(.22+.7*wisps);
  float d=(field*height+ground)*uDensity*.115;
  for(int i=0;i<8;i++) {
    float age=uTime-uImpulses[i].w;
    if(age>=0.&&age<3.) {
      vec3 center=uImpulses[i].xyz+vec3(age*.2*uWind,age*.23,age*.08*uWind);
      float strength=uImpulseStrengths[i];
      float radius=.35+strength*.25+age*.42;
      vec3 offset=(p-center)*vec3(1.,1.3,1.);
      float dist=length(offset);
      float life=smoothstep(0.,.09,age)*(1.-smoothstep(.7,3.,age))*exp(-age*.65);
      d *= 1.-.8*exp(-dist*dist/(radius*radius))*life*strength;
      float curl=noise3(offset*2.8+vec3(age*.7,-age*1.1,age*.4));
      float wake=exp(-pow((dist-radius-(curl-.5)*.4)*2.6,2.));
      d+=wake*life*.05*strength*smoothstep(.25,.75,curl)*uDensity;
    }
  }
  float releasedFog=0.;
  for(int i=0;i<8;i++) {
    float age=uTime-uFogBursts[i].w;
    if(age>=0. && age<9.) {
      float radius=.4+1.9*(1.-exp(-age*.65));
      vec3 center=uFogBursts[i].xyz+vec3(.24*uWind*age,.3*age/(1.+age*.15),.12*uWind*age);
      // Use the vortex-backtraced coordinates so whirlwinds pick up the new smoke.
      vec3 local=(advected-center)/vec3(radius,radius*.85,radius);
      float distanceToCloud=length(local);
      if(distanceToCloud>1.65)continue;
      float billow=noise3(local*3.1+vec3(0.,-age*.35,0.));
      float edge=distanceToCloud+(billow-.5)*.55;
      float cloud=1.-smoothstep(.25,1.25,edge);
      float life=smoothstep(0.,.12,age)*(1.-smoothstep(3.,9.,age));
      releasedFog+=cloud*(.6+.4*noise3(local*6.7-age*.12))*life*.75*uDensity/(1.+age*.22);
    }
  }
  return vec2(max((d+releasedFog)*clearing+spiralDensity,0.),spiralDensity);
}
// Low-frequency extinction is sufficient along secondary moon rays.
// Avoid repeating the expensive impulse and fine-wisp work for each light sample.
float shadowDensity(vec3 p) {
  vec3 q=p*.19-vec3(uTime*.032*uWind,0.,uTime*.019*uWind);
  float bank=noise3(q*1.25)*.7+noise3(q*2.59+7.3)*.2;
  return (smoothstep(.3,.68,bank)*exp(-max(p.y,0.)/uHeight)
    +exp(-max(p.y,0.)*2.)*.4)*uDensity*.115;
}
float phaseHG(float cosine,float g) {return (1.-g*g)/(12.56637*pow(max(.01,1.+g*g-2.*g*cosine),1.5));}
void main() {
  float depth=texture2D(uDepth,vUv).x;
  vec4 endpoint=uInvProjection*vec4(vUv*2.-1.,depth*2.-1.,1.);endpoint/=endpoint.w;
  vec3 world=(uCameraWorld*endpoint).xyz;
  vec3 ray=normalize(world-uCamera);
  float distanceToSurface=min(length(world-uCamera),85.);
  
  // Interleaved gradient noise plus a low-discrepancy temporal sequence.
  float jitter=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715)))+mod(uFrame,64.)*.61803398875);
  float transmittance=1.;vec3 scattered=vec3(0.);
  float phase=phaseHG(dot(ray,uSun),.48);
  for(int i=0;i<96;i++) {
    if(i>=uSteps||transmittance<.015) break;
    // Spend more samples in the nearby smoke where thin curls need definition.
    float start=pow(float(i)/float(uSteps),1.55)*distanceToSurface;
    float end=pow(float(i+1)/float(uSteps),1.55)*distanceToSurface;
    float segment=end-start;
    vec3 p=uCamera+ray*mix(start,end,jitter);
    vec2 medium=density(p);
    float d=medium.x;
    if(d<.0005)continue;
    float optical=shadowDensity(p+uSun*1.5)*1.5+shadowDensity(p+uSun*4.)*2.5+shadowDensity(p+uSun*8.)*4.;
    float shadow=exp(-optical*1.3);
    vec3 canopy=p+uSun*((14.-p.y)/max(.1,uSun.y));
    float shafts=smoothstep(.32,.72,noise3(vec3(canopy.x*.24,2.4,canopy.z*.24)));
    vec3 ambient=mix(vec3(.035,.065,.07),vec3(.14,.21,.22),clamp(p.y/12.,0.,1.));
    vec3 moon=vec3(.36,.55,.58)*(phase*5.+.24)*shadow*(.25+shafts*.75)*uScattering;
    float portal=exp(-length((p-vec3(0,2,-12))*vec3(.28,.4,.28)));
    vec3 light=ambient+moon+vec3(.12,.29,.2)*portal;
    // Swirling sheets catch more soft moonlight along their curved edges.
    light+=vec3(.12,.2,.19)*smoothstep(.02,.3,medium.y)*shadow*uScattering;
    float extinction=exp(-d*segment);
    scattered+=transmittance*(1.-extinction)*light;transmittance*=extinction;
  }
  gl_FragColor=vec4(scattered,transmittance);
}
`;
const temporalFragment=/* glsl */`
varying vec2 vUv;
uniform sampler2D uCurrent,uHistory,uDepth,uOldDepth;
uniform mat4 uInvProjection,uCameraWorld,uPrevViewProjection;
uniform vec2 uTexel;uniform float uHistoryWeight;
void main(){
  vec4 current=texture2D(uCurrent,vUv);
  float depth=texture2D(uDepth,vUv).r;
  vec4 p=uInvProjection*vec4(vUv*2.-1.,depth*2.-1.,1.);p/=p.w;
  vec4 previous=uPrevViewProjection*uCameraWorld*p;
  vec3 ndc=previous.xyz/previous.w;vec2 historyUV=ndc.xy*.5+.5;
  float valid=step(0.,historyUV.x)*step(historyUV.x,1.)*step(0.,historyUV.y)*step(historyUV.y,1.)*step(0.,previous.w);
  float oldDepth=texture2D(uOldDepth,historyUV).r;
  valid*=1.-step(.002,abs(oldDepth-(ndc.z*.5+.5)));
  vec4 low=current,high=current;
  for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++){
    vec4 c=texture2D(uCurrent,vUv+vec2(float(x),float(y))*uTexel);low=min(low,c);high=max(high,c);
  }
  vec4 history=clamp(texture2D(uHistory,historyUV),low,high);
  gl_FragColor=mix(current,history,uHistoryWeight*valid);
}
`;
const compositeFragment=/* glsl */`
varying vec2 vUv;uniform sampler2D uScene,uFog,uDepth;
uniform vec2 uFogSize;uniform float uNear,uFar,uTime;
float linearDepth(float d){return 2.*uNear*uFar/(uFar+uNear-(d*2.-1.)*(uFar-uNear));}
void main(){
  float d=linearDepth(texture2D(uDepth,vUv).r);
  vec2 base=floor(vUv*uFogSize-.5);vec4 fog=vec4(0.);float sum=0.;
  for(int x=0;x<2;x++)for(int y=0;y<2;y++){
    vec2 uv=(base+vec2(float(x),float(y))+.5)/uFogSize;
    float other=linearDepth(texture2D(uDepth,uv).r);
    vec2 delta=abs(uv-vUv)*uFogSize;
    float w=max(.001,(1.-delta.x)*(1.-delta.y))*exp(-abs(d-other)*2.);
    fog+=texture2D(uFog,uv)*w;sum+=w;
  }
  fog=sum>.00001?fog/sum:texture2D(uFog,vUv);
  vec3 color=texture2D(uScene,vUv).rgb*fog.a+fog.rgb;
  color*=.9;color=color/(color+vec3(.65));color=pow(color,vec3(1./2.2));
  color*=1.-.28*pow(length((vUv-.5)*vec2(1.,.8)),1.4);
  float grain=fract(sin(dot(gl_FragCoord.xy+fract(uTime),vec2(12.9898,78.233)))*43758.5453)-.5;
  gl_FragColor=vec4(color+grain*.006,1.);
}
`;
export class VolumetricFog {
  private sceneTarget:T.WebGLRenderTarget;private raw:T.WebGLRenderTarget;private histories:T.WebGLRenderTarget[];private oldDepth:T.WebGLRenderTarget;
  private screenScene=new T.Scene();private screenCamera=new T.OrthographicCamera(-1,1,1,-1,0,1);private quad:T.Mesh;
  private fogMaterial:T.ShaderMaterial;private temporal:T.ShaderMaterial;private composite:T.ShaderMaterial;private copyDepth:T.ShaderMaterial;
  private noiseVolume=createNoiseVolume();
  private previousVP=new T.Matrix4();private frame=0;private historyIndex=0;private historyValid=false;
  private width=1;private height=1;private quality=-1;
  constructor(private renderer:T.WebGLRenderer,smoke:SmokeSimulation) {
    this.sceneTarget=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthTexture:new T.DepthTexture(1,1,T.UnsignedIntType)});
    const options={type:T.HalfFloatType,depthBuffer:false,minFilter:T.LinearFilter,magFilter:T.LinearFilter};
    this.raw=new T.WebGLRenderTarget(1,1,options);this.histories=[new T.WebGLRenderTarget(1,1,options),new T.WebGLRenderTarget(1,1,options)];
    this.oldDepth=new T.WebGLRenderTarget(1,1,{...options,type:T.FloatType,minFilter:T.NearestFilter,magFilter:T.NearestFilter});
    const uniforms={uNoiseVolume:{value:this.noiseVolume},uDepth:{value:this.sceneTarget.depthTexture},uInvProjection:{value:new T.Matrix4()},uCameraWorld:{value:new T.Matrix4()},uCamera:{value:new T.Vector3()},uSun:{value:moonDirection},uTime:{value:0},uDensity:{value:1},uWind:{value:1},uTurbulence:{value:1},uScattering:{value:1},uHeight:{value:4},uSteps:{value:64},uDetail:{value:3},uFrame:{value:0},uFogBursts:{value:smoke.fogBursts},uImpulses:{value:smoke.impulses},uImpulseStrengths:{value:smoke.impulseStrengths},uVortices:{value:smoke.vortices},uVortexDirections:{value:smoke.vortexDirections}};
    this.fogMaterial=new T.ShaderMaterial({vertexShader:vertex,fragmentShader:fragment,uniforms,depthTest:false,depthWrite:false});
    this.temporal=new T.ShaderMaterial({vertexShader:vertex,fragmentShader:temporalFragment,depthTest:false,depthWrite:false,uniforms:{uCurrent:{value:this.raw.texture},uHistory:{value:this.histories[0].texture},uDepth:uniforms.uDepth,uOldDepth:{value:this.oldDepth.texture},uInvProjection:uniforms.uInvProjection,uCameraWorld:uniforms.uCameraWorld,uPrevViewProjection:{value:this.previousVP},uTexel:{value:new T.Vector2(1,1)},uHistoryWeight:{value:0}}});
    this.composite=new T.ShaderMaterial({vertexShader:vertex,fragmentShader:compositeFragment,depthTest:false,depthWrite:false,uniforms:{uScene:{value:this.sceneTarget.texture},uFog:{value:this.raw.texture},uDepth:uniforms.uDepth,uFogSize:{value:new T.Vector2(1,1)},uNear:{value:.1},uFar:{value:130},uTime:{value:0}}});
    this.copyDepth=new T.ShaderMaterial({vertexShader:vertex,fragmentShader:'varying vec2 vUv;uniform sampler2D uDepth;void main(){gl_FragColor=vec4(texture2D(uDepth,vUv).rrr,1.);}',uniforms:{uDepth:uniforms.uDepth},depthTest:false,depthWrite:false});
    this.quad=new T.Mesh(new T.PlaneGeometry(2,2),this.fogMaterial);this.quad.frustumCulled=false;this.screenScene.add(this.quad);
  }
  resize(width:number,height:number,quality:number) {
    if(width===this.width&&height===this.height&&quality===this.quality)return;
    this.width=width;this.height=height;this.quality=quality;
    const q=qualityLevels[quality],fw=Math.max(1,Math.round(width*q.scale)),fh=Math.max(1,Math.round(height*q.scale));
    this.sceneTarget.setSize(width,height);this.raw.setSize(fw,fh);this.histories.forEach(t=>t.setSize(fw,fh));this.oldDepth.setSize(width,height);
    this.composite.uniforms.uFogSize.value.set(fw,fh);this.temporal.uniforms.uTexel.value.set(1/fw,1/fh);this.historyValid=false;
  }
  invalidate(){this.historyValid=false;}
  render(scene:T.Scene,camera:T.PerspectiveCamera,time:number,s:GraphicsSettings,activeSwing:boolean) {
    const u=this.fogMaterial.uniforms;
    u.uInvProjection.value.copy(camera.projectionMatrixInverse);u.uCameraWorld.value.copy(camera.matrixWorld);u.uCamera.value.copy(camera.position);
    u.uTime.value=time;u.uFrame.value=this.frame++;u.uDensity.value=s.density;u.uWind.value=s.wind;u.uTurbulence.value=s.turbulence;u.uScattering.value=s.scattering;u.uHeight.value=s.height;u.uDetail.value=s.detail;u.uSteps.value=Math.min(96,qualityLevels[s.quality].steps+(activeSwing?16:0));
    const r=this.renderer;r.setRenderTarget(this.sceneTarget);r.render(scene,camera);
    this.quad.material=this.fogMaterial;r.setRenderTarget(this.raw);r.render(this.screenScene,this.screenCamera);
    const read=this.histories[this.historyIndex],write=this.histories[1-this.historyIndex];
    this.temporal.uniforms.uHistory.value=read.texture;this.temporal.uniforms.uHistoryWeight.value=this.historyValid?(activeSwing?.58:.82):0;
    this.quad.material=this.temporal;r.setRenderTarget(write);r.render(this.screenScene,this.screenCamera);
    this.composite.uniforms.uFog.value=write.texture;this.composite.uniforms.uTime.value=time;
    this.quad.material=this.composite;r.setRenderTarget(null);r.render(this.screenScene,this.screenCamera);
    this.quad.material=this.copyDepth;r.setRenderTarget(this.oldDepth);r.render(this.screenScene,this.screenCamera);r.setRenderTarget(null);
    this.previousVP.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);this.historyIndex=1-this.historyIndex;this.historyValid=true;
  }
  dispose(){this.noiseVolume.dispose();this.sceneTarget.dispose();this.raw.dispose();this.histories.forEach(t=>t.dispose());this.oldDepth.dispose();this.fogMaterial.dispose();this.temporal.dispose();this.composite.dispose();this.copyDepth.dispose();this.quad.geometry.dispose();}
}
