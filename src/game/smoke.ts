import { Vector3, Vector4 } from 'three';
// A small ring buffer of world-space analytic impulses, consumed directly by the GPU density field.
export class SmokeSimulation {
  readonly impulses = Array.from({ length: 8 }, () => new Vector4(0, -100, 0, -100));
  readonly impulseStrengths = new Float32Array(8);
  readonly vortices = Array.from({ length: 8 }, () => new Vector4(0, -100, 0, -100));
  readonly vortexDirections = Array.from({ length: 8 }, () => new Vector3());
  readonly fogBursts = Array.from({ length: 8 }, () => new Vector4(0, -100, 0, -100));
  private nextBurst = 0;
  releaseFog(position: Vector3, time: number) {
    this.fogBursts[this.nextBurst].set(position.x, position.y, position.z, time);
    this.nextBurst = (this.nextBurst + 1) % this.fogBursts.length;
  }
  hasFogBurst(time: number) { return this.fogBursts.some(b => time >= b.w && time-b.w < 9); }
  private nextVortex = 0;
  private next = 0;
  spawnWhirlwind(position: Vector3, direction: Vector3, time: number) {
    this.vortices[this.nextVortex].set(position.x, position.y, position.z, time);
    this.vortexDirections[this.nextVortex].copy(direction).setY(0).normalize();
    this.nextVortex = (this.nextVortex + 1) % this.vortices.length;
  }
  hasWhirlwind(time: number) {
    return this.vortices.some(v => time >= v.w && time - v.w < 4.8);
  }
  private lastTrail = 0;
  disturb(position: Vector3, time: number, strength = 1) {
    this.impulses[this.next].set(position.x, position.y, position.z, time);
    this.impulseStrengths[this.next] = Math.max(0, Math.min(1, strength));
    // Negative ages identify empty slots; impulse radius/strength stays predictable for the shader.
    this.next = (this.next + 1) % this.impulses.length;
  }
  trail(position: Vector3, time: number) {
    if (time - this.lastTrail > .32) {
      this.disturb(position.clone().add(new Vector3(0, .15, 0)), time, .28);
      this.lastTrail = time;
    }
  }
  reset() {
    this.impulses.forEach(v => v.set(0, -100, 0, -100));
    this.impulseStrengths.fill(0);
    this.fogBursts.forEach(b => b.set(0, -100, 0, -100));
    this.vortices.forEach(v => v.set(0, -100, 0, -100));
    this.vortexDirections.forEach(v => v.set(0, 0, 0));
    this.next = this.nextVortex = this.nextBurst = 0; this.lastTrail = 0;
  }
}
