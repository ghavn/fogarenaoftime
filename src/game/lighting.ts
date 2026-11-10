import * as THREE from 'three';
export const moonDirection = new THREE.Vector3(-.42, .75, -.5).normalize();
export function setupLighting(scene: THREE.Scene) {
  scene.add(new THREE.HemisphereLight(0xb1cfce, 0x17221c, .65));
  const moon = new THREE.DirectionalLight(0xc3e5e6, 2.1);
  moon.position.copy(moonDirection).multiplyScalar(30);
  moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048);
  Object.assign(moon.shadow.camera, { left: -32, right: 32, top: 32, bottom: -32, near: 1, far: 100 });
  moon.shadow.bias = -.0003; moon.shadow.normalBias = .04; moon.shadow.radius = 3;
  scene.add(moon, moon.target);
  const fill = new THREE.DirectionalLight(0x819f75, .6); fill.position.set(6, 8, 12); scene.add(fill);
  return moon;
}
