import * as THREE from 'three';

export class ProjectileManager {
    constructor(scene, particleManager) {
        this.scene = scene;
        this.particleManager = particleManager;
        this.projectiles = [];
        this.raycaster = new THREE.Raycaster();

        // Rocket Mesh
        const rocketGeo = new THREE.BoxGeometry(0.2, 0.2, 0.5);
        const rocketMat = new THREE.MeshStandardMaterial({ color: 0x555555 });
        this.rocketMeshProto = new THREE.Mesh(rocketGeo, rocketMat);

        // Plasma Mesh
        const plasmaGeo = new THREE.SphereGeometry(0.2);
        const plasmaMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
        this.plasmaMeshProto = new THREE.Mesh(plasmaGeo, plasmaMat);
    }

    spawnProjectile(type, position, direction, sourceEntity) {
        let mesh;
        let speed = 0;
        let damage = 0;
        let radius = 0;

        if (type === 'ROCKET') {
            mesh = this.rocketMeshProto.clone();
            speed = 60;
            damage = 100; // Direct hit
            radius = 5.0; // Splash radius
        } else if (type === 'PLASMA') {
            mesh = this.plasmaMeshProto.clone();
            speed = 40;
            damage = 25;
            radius = 0.5;
        }

        mesh.position.copy(position);

        // Orient mesh
        // For rocket, length is Z.
        mesh.lookAt(position.clone().add(direction));

        this.scene.add(mesh);

        this.projectiles.push({
            mesh,
            type,
            velocity: direction.clone().multiplyScalar(speed),
            damage,
            radius,
            source: sourceEntity,
            alive: true,
            life: 5.0 // Max lifetime
        });
    }

    update(dt, collidables, enemies, player) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];

            p.life -= dt;
            if (p.life <= 0) {
                this.destroyProjectile(p, i);
                continue;
            }

            // Movement and Collision in one step (Raycast to next position)
            const moveStep = p.velocity.clone().multiplyScalar(dt);
            const dist = moveStep.length();
            const direction = p.velocity.clone().normalize();

            this.raycaster.set(p.mesh.position, direction);
            this.raycaster.far = dist;

            // Check walls
            let hits = this.raycaster.intersectObjects(collidables); // Walls are children or array?
            // In Game.js, Level returns an array of collidables.

            // Check enemies
            const enemyMeshes = enemies.map(e => e.mesh);
            const enemyHits = this.raycaster.intersectObjects(enemyMeshes);

            // Using nearest hit
            let nearestHit = null;
            if (hits.length > 0) nearestHit = hits[0];
            if (enemyHits.length > 0) {
                if (!nearestHit || enemyHits[0].distance < nearestHit.distance) {
                    nearestHit = enemyHits[0];
                }
            }

            // Check player? Only if self-damage is allowed or enemy projectiles. 
            // Assuming player is immune to own projectiles for now or handle later.

            if (nearestHit) {
                // Collision!
                this.explode(p, nearestHit.point, nearestHit.face ? nearestHit.face.normal : new THREE.Vector3(0, 1, 0), enemies);
                this.destroyProjectile(p, i);
            } else {
                // Move
                p.mesh.position.add(moveStep);
            }
        }
    }

    destroyProjectile(p, index) {
        this.scene.remove(p.mesh);
        this.projectiles.splice(index, 1);
    }

    explode(p, point, normal, enemies) {
        if (p.type === 'ROCKET') {
            this.particleManager.createExplosion(point, 0xffaa00, 50); // Big explosion

            // Splash Damage
            enemies.forEach(e => {
                const d = e.mesh.position.distanceTo(point);
                if (d < p.radius) {
                    // Linear falloff
                    const dmg = p.damage * (1 - d / p.radius);
                    e.takeDamage(dmg);
                }
            });

        } else if (p.type === 'PLASMA') {
            this.particleManager.createExplosion(point, 0x00ffff, 10);
            // Direct Hit Logic handled via finding who we hit?
            // Actually, my splash logic above handles AoE.
            // Plasma is usually direct hit.
            // But lets just do small radius for simplicity or check direct hit object.

            // Simplest: Just reuse radius check with small radius (0.5)
            enemies.forEach(e => {
                if (e.mesh.position.distanceTo(point) < 2.0) { // Generous hit box
                    e.takeDamage(p.damage);
                }
            });
        }
    }
}
