import * as THREE from 'three';

export class ParticleManager {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];

        // Geometric reuse
        this.boxGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        this.sparkMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        this.bloodMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    }

    createExplosion(position, color = 0xff0000, count = 10) {
        const mat = new THREE.MeshBasicMaterial({ color: color });
        for (let i = 0; i < count; i++) {
            const mesh = new THREE.Mesh(this.boxGeo, mat);
            mesh.position.copy(position);

            // Random velocity
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 5,
                (Math.random() - 0.5) * 5 + 2, // Upward bias
                (Math.random() - 0.5) * 5
            );

            this.particles.push({
                mesh: mesh,
                velocity: velocity,
                life: 1.0 // Seconds
            });
            this.scene.add(mesh);
        }
    }

    createHitSparks(position, normal, count = 5) {
        for (let i = 0; i < count; i++) {
            const mesh = new THREE.Mesh(this.boxGeo, this.sparkMat);
            mesh.position.copy(position);

            // Velocity reflected + spread
            const velocity = normal.clone().multiplyScalar(5);
            velocity.x += (Math.random() - 0.5) * 4;
            velocity.y += (Math.random() - 0.5) * 4;
            velocity.z += (Math.random() - 0.5) * 4;

            this.particles.push({
                mesh: mesh,
                velocity: velocity,
                life: 0.5
            });
            this.scene.add(mesh);
        }
    }

    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= dt;

            if (p.life <= 0) {
                this.scene.remove(p.mesh);
                // p.mesh.geometry.dispose(); // Shared geo, don't dispose
                if (p.mesh.material !== this.sparkMat && p.mesh.material !== this.bloodMat) {
                    p.mesh.material.dispose();
                }
                this.particles.splice(i, 1);
                continue;
            }

            // Physics
            p.velocity.y -= 9.8 * dt; // Gravity
            p.mesh.position.addScaledVector(p.velocity, dt);

            // Rotate
            p.mesh.rotation.x += p.velocity.z * dt;
            p.mesh.rotation.z -= p.velocity.x * dt;
        }
    }
}
