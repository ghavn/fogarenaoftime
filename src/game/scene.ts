import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { setupLighting } from './lighting';
export const ARENA_RADIUS = 24;
export function groundHeight(x: number, z: number) { return -.12 + Math.sin(x*.19)*Math.sin(z*.16)*.22; }
function rng(seed: number) { return () => { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; return (seed >>> 0) / 4294967296; }; }
export function createWorld() {
  const scene = new T.Scene(); scene.background = new T.Color('#1b3035');
  const moonLight = setupLighting(scene);
  const random = rng(8147);
  const stone = new T.MeshStandardMaterial({ color: '#3c4743', roughness: .95, flatShading: true });
  const bark = new T.MeshStandardMaterial({ color: '#23302a', roughness: 1, flatShading: true });
  const leaf = new T.MeshStandardMaterial({ color: '#213b31', roughness: 1, flatShading: true });
  const groundGeo = new T.PlaneGeometry(180, 180, 110, 110); groundGeo.rotateX(-Math.PI/2);
  const pos = groundGeo.attributes.position;
  const colors = [];
  for(let i=0; i<pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i); pos.setY(i, groundHeight(x,z));
    const c = new T.Color().setRGB(.065+random()*.025,.095+random()*.035,.075+random()*.025);
    colors.push(c.r,c.g,c.b);
  }
  groundGeo.setAttribute('color', new T.Float32BufferAttribute(colors,3)); groundGeo.computeVertexNormals();
  const ground = new T.Mesh(groundGeo,new T.MeshStandardMaterial({ vertexColors:true,roughness:.97 }));
  ground.receiveShadow = true; scene.add(ground);
  // Broken concentric paving gives the fog readable distance cues.
  for(let i=0;i<72;i++) {
    const a=i/72*Math.PI*2, r=9.2;
    if(random()<.11) continue;
    const slab=new T.Mesh(new T.BoxGeometry(.7,.12,.6),stone);
    slab.position.set(Math.sin(a)*r,groundHeight(Math.sin(a)*r,Math.cos(a)*r)+.01,Math.cos(a)*r);
    slab.rotation.y=a+random()*.15; slab.receiveShadow=true; scene.add(slab);
  }
  const collision: { x:number; z:number; radius:number }[] = [];
  for(let i=0;i<155;i++) {
    const angle=random()*Math.PI*2, radius=15+random()*65;
    const x=Math.sin(angle)*radius,z=Math.cos(angle)*radius;
    const height=6+random()*11, trunk=new T.Mesh(new T.CylinderGeometry(.15,.35,height,6),bark);
    trunk.position.set(x,groundHeight(x,z)+height*.5,z); trunk.castShadow=true; scene.add(trunk);
    if(radius<28) collision.push({ x,z,radius:.65 });
    for(let j=0;j<3;j++) {
      const b = new T.Mesh(new T.ConeGeometry((3-j*.65)*(height/10),height*.48,7),leaf);
      b.position.set(x,trunk.position.y+height*(.08+j*.18),z); b.castShadow=true; scene.add(b);
    }
    // Bare low branches visible below the canopy.
    for(let j=0;j<2;j++) {
      const branch = new T.Mesh(new T.CylinderGeometry(.035,.12,2.2,5),bark);
      branch.position.set(x+.55,2.8+j*2,z); branch.rotation.z=-.9-j*.3; scene.add(branch);
    }
  }
  for(let i=0;i<55;i++) {
    const a=random()*Math.PI*2,r=11+random()*35,x=Math.sin(a)*r,z=Math.cos(a)*r;
    const rock=new T.Mesh(new T.DodecahedronGeometry(1,0),stone);
    const scale=.4+random()*1.4;
    rock.position.set(x,groundHeight(x,z)+scale*.2,z); rock.scale.set(scale,scale*.65,scale*.8);
    rock.rotation.set(random(),random()*6,random()); rock.castShadow=true; rock.receiveShadow=true; scene.add(rock);
    if(r<27) collision.push({x,z,radius:scale*.85});
  }
  const runeMat=new T.MeshStandardMaterial({color:0x7cb69d,emissive:0x64a58c,emissiveIntensity:1.4,roughness:.6});
  // An ancient, incomplete gateway is the arena's landmark.
  for(const side of [-1,1]) {
    const pillar=new T.Mesh(new T.BoxGeometry(1.25,6.4,1.5),stone);
    pillar.position.set(side*4,3.1,-13); pillar.rotation.z=side*-.04; pillar.castShadow=true; scene.add(pillar);
    collision.push({x:side*4,z:-13,radius:1.1});
    for(let j=0;j<5;j++) {
      const rune=new T.Mesh(new T.BoxGeometry(.055,.2,.025),runeMat);
      rune.position.set(side*4,1.4+j*.68,-12.235); rune.rotation.z=j%2?.5:-.5; scene.add(rune);
    }
  }
  const lintel=new T.Mesh(new T.BoxGeometry(9.6,.8,1.5),stone); lintel.position.set(0,6.5,-13); lintel.rotation.z=.035; lintel.castShadow=true; scene.add(lintel);
  const gateGlow = new T.PointLight(0x8acdb9,7,14,2); gateGlow.position.set(0,3,-12);scene.add(gateGlow);
  const moon=new T.Mesh(new T.SphereGeometry(3,32,24),new T.MeshBasicMaterial({color:0xd4e1d5}));
  moon.position.set(-17,12,-62);scene.add(moon);
  const starsGeometry=new T.BufferGeometry(),stars=[];
  for(let i=0;i<180;i++) stars.push((random()-.5)*180,25+random()*60,-55-random()*45);
  starsGeometry.setAttribute('position',new T.Float32BufferAttribute(stars,3));
  scene.add(new T.Points(starsGeometry,new T.PointsMaterial({color:0xa6bbb5,size:.1,transparent:true,opacity:.55})));
  // Tiny ground-cover clusters, geometry rather than alpha sprites.
  const grassGeo = new T.ConeGeometry(.027,.3,3);
  const grassMat = new T.MeshStandardMaterial({color:0x364a37,roughness:1});
  const grass = new T.InstancedMesh(grassGeo,grassMat,1000); const dummy=new T.Object3D();
  for(let i=0;i<1000;i++) {
    const x=(random()-.5)*65,z=(random()-.5)*65;
    dummy.position.set(x,groundHeight(x,z)+.1,z);dummy.rotation.set((random()-.5)*.5,random()*6,(random()-.5)*.5);
    dummy.scale.setScalar(.5+random());dummy.updateMatrix();grass.setMatrixAt(i,dummy.matrix);
  }
  scene.add(grass);
  // The scenery never moves: merge shared materials to avoid hundreds of draw calls.
  // Fog remains an independent world-space volume over this geometry.
  scene.updateMatrixWorld(true);
  for(const material of [stone,bark,leaf,runeMat]) {
    const objects=scene.children.filter((o):o is T.Mesh => o instanceof T.Mesh && o.material===material);
    const geometries=objects.map(o=>{
      const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();
      return g.applyMatrix4(o.matrixWorld);
    });
    const geometry=mergeGeometries(geometries);
    if(geometry) {
      const combined=new T.Mesh(geometry,material);
      combined.castShadow=objects.some(o=>o.castShadow);combined.receiveShadow=objects.some(o=>o.receiveShadow);
      for(const object of objects){scene.remove(object);object.geometry.dispose();}
      scene.add(combined);
    }
    geometries.forEach(g=>g.dispose());
  }
  return { scene, collision, moonLight };
}
