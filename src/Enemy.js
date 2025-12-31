import * as THREE from 'three';

export class Enemy {
    constructor(scene, position, particleManager) {
        this.scene = scene;
        this.particleManager = particleManager;
        this.alive = true;

        // Simple red 'demon' box
        const geo = new THREE.BoxGeometry(2, 4, 2);
        const mat = new THREE.MeshPhongMaterial({ color: 0xff0000 });
        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.position.copy(position);

        // Add to scene
        this.scene.add(this.mesh);

        // Make it identifiable for raycasting
        this.mesh.userData = { entity: this };
    }

    takeDamage(amount) {
        if (!this.alive) return;

        // Flash white
        this.mesh.material.color.setHex(0xffffff);
        setTimeout(() => {
            if (this.alive) this.mesh.material.color.setHex(0xff0000);
        }, 100);

        this.alive = false;

        // Particles
        if (this.particleManager) {
            this.particleManager.createExplosion(this.mesh.position, 0xff0000, 20);
        }

        // Die effect
        setTimeout(() => {
            this.destroy();
        }, 50);
    }

    destroy() {
        this.scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
    }

    update(dt, playerPos, playerEntity, collidables) {
        if (!this.alive) return;

        // Simple look at player
        this.mesh.lookAt(playerPos.x, this.mesh.position.y, playerPos.z);

        // Move towards player
        const dist = this.mesh.position.distanceTo(playerPos);
        if (dist > 2.0) {
            const dir = new THREE.Vector3().subVectors(playerPos, this.mesh.position).normalize();

            // Collision Check
            const ray = new THREE.Raycaster(this.mesh.position, dir, 0, 1.5); // Check short distance ahead
            if (collidables) {
                const hits = ray.intersectObjects(collidables);
                if (hits.length > 0) {
                    // Blocked
                    return;
                }
            }

            this.mesh.position.addScaledVector(dir, dt * 3.0);
        }

        // Attack
        if (dist < 2.5) {
            if (!this.lastAttackTime || (performance.now() - this.lastAttackTime > 1000)) {
                playerEntity.takeDamage(10);
                this.lastAttackTime = performance.now();
                // Visual feedback for attack?
            }
        }
    }
}
