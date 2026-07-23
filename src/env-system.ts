import {
  createSystem,
  World,
  Mesh,
  MeshStandardMaterial,
  Color,
  Group,
  SphereGeometry,
  AdditiveBlending,
  BufferGeometry,
  Float32BufferAttribute,
  PointsMaterial,
  Points,
  FogExp2,
} from '@iwsdk/core';

/**
 * Environment animation system: floating orbs, pulsing pillars, particles
 */
export class EnvSystem extends createSystem({}) {
  world!: World;
  orbs: { mesh: Mesh; baseY: number; phase: number; speed: number }[] = [];
  pillars: { mesh: Mesh; phase: number }[] = [];
  particles: Points | null = null;
  particlePositions: Float32Array | null = null;
  particleVelocities: Float32Array | null = null;
  time = 0;

  setRefs(refs: { world: World }) {
    this.world = refs.world;

    // Add fog for atmosphere
    this.world.scene.fog = new FogExp2(new Color('#000811').getHex(), 0.04);

    // Find and register existing orbs/pillars
    this.world.scene.traverse((child) => {
      if (child instanceof Mesh && child.geometry instanceof SphereGeometry) {
        const mat = child.material as MeshStandardMaterial;
        if (mat.emissiveIntensity && mat.emissiveIntensity > 1) {
          this.orbs.push({
            mesh: child,
            baseY: child.position.y,
            phase: Math.random() * Math.PI * 2,
            speed: 0.5 + Math.random() * 0.5,
          });
        }
      }
    });

    // Create floating particle field
    this.createParticles();
  }

  createParticles() {
    const count = 200;
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 16;
      positions[i * 3 + 1] = Math.random() * 4.5 + 0.3;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 16;
      velocities[i * 3] = (Math.random() - 0.5) * 0.02;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.01;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
    }

    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(positions, 3));

    const mat = new PointsMaterial({
      color: 0x00ffff,
      size: 0.03,
      transparent: true,
      opacity: 0.4,
      blending: AdditiveBlending,
      depthWrite: false,
    });

    this.particles = new Points(geo, mat);
    this.particlePositions = positions;
    this.particleVelocities = velocities;
    this.world.scene.add(this.particles);
  }

  update(delta: number) {
    this.time += delta;

    // Animate orbs: bobbing + slow drift
    for (const orb of this.orbs) {
      orb.mesh.position.y = orb.baseY + Math.sin(this.time * orb.speed + orb.phase) * 0.3;
      // Subtle color pulsing
      const mat = orb.mesh.material as MeshStandardMaterial;
      mat.emissiveIntensity = 0.8 + 0.4 * Math.sin(this.time * 2 + orb.phase);
      mat.opacity = 0.35 + 0.2 * Math.sin(this.time * 1.5 + orb.phase);
    }

    // Animate particles
    if (this.particlePositions && this.particleVelocities && this.particles) {
      const pos = this.particlePositions;
      const vel = this.particleVelocities;
      for (let i = 0; i < pos.length / 3; i++) {
        pos[i * 3] += vel[i * 3];
        pos[i * 3 + 1] += vel[i * 3 + 1];
        pos[i * 3 + 2] += vel[i * 3 + 2];

        // Wrap around bounds
        if (pos[i * 3] > 8) pos[i * 3] = -8;
        if (pos[i * 3] < -8) pos[i * 3] = 8;
        if (pos[i * 3 + 1] > 4.8) pos[i * 3 + 1] = 0.3;
        if (pos[i * 3 + 1] < 0.3) pos[i * 3 + 1] = 4.8;
        if (pos[i * 3 + 2] > 8) pos[i * 3 + 2] = -8;
        if (pos[i * 3 + 2] < -8) pos[i * 3 + 2] = 8;
      }
      this.particles.geometry.attributes.position.needsUpdate = true;

      // Pulse particle opacity
      const pmat = this.particles.material as PointsMaterial;
      pmat.opacity = 0.3 + 0.15 * Math.sin(this.time * 0.8);
    }
  }
}
