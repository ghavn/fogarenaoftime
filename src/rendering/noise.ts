import { Data3DTexture, RedFormat, LinearFilter, RepeatWrapping } from 'three';
// A procedurally generated scalar lattice, not an image of smoke. Hardware trilinear
// interpolation replaces eight expensive hash evaluations for every 3D noise sample.
export function createNoiseVolume() {
  const size=64,data=new Uint8Array(size*size*size);let seed=72891;
  for(let i=0;i<data.length;i++) {seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;data[i]=(seed>>>0)>>>24;}
  const texture=new Data3DTexture(data,size,size,size);
  texture.format=RedFormat;texture.minFilter=LinearFilter;texture.magFilter=LinearFilter;
  texture.wrapS=RepeatWrapping;texture.wrapT=RepeatWrapping;texture.wrapR=RepeatWrapping;
  texture.unpackAlignment=1;texture.needsUpdate=true;return texture;
}
export const noiseGLSL = /* glsl */`
uniform highp sampler3D uNoiseVolume;
float noise3(vec3 p) {
  vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return texture(uNoiseVolume,(i+f+.5)/64.).r;
}
float fbm(vec3 p) {
  float sum=0.0, amplitude=.55;
  for(int i=0;i<4;i++) {
    if(i>=uDetail) break;
    sum += amplitude*noise3(p); p = p*2.07 + vec3(7.3,1.7,4.1); amplitude *= .48;
  }
  return sum;
}
`;
