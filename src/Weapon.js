import * as THREE from 'three';

export class Weapon {
    constructor(camera, scene, particleManager, decalManager, projectileManager) {
        this.camera = camera;
        this.scene = scene;
        this.particleManager = particleManager;
        this.decalManager = decalManager;
        this.projectileManager = projectileManager;
        this.raycaster = new THREE.Raycaster();

        // Weapon Definitions
        this.weapons = [
            { name: 'PISTOL', fireRate: 0.4, ammo: Infinity, type: 'HITSCAN', color: 0x888888, damage: 25 },
            { name: 'CHAINGUN', fireRate: 0.1, ammo: 200, type: 'HITSCAN', color: 0x444444, damage: 15 },
            { name: 'ROCKET', fireRate: 1.0, ammo: 20, type: 'PROJECTILE', projType: 'ROCKET', color: 0x445533, damage: 100 },
            { name: 'PLASMA', fireRate: 0.15, ammo: 100, type: 'PROJECTILE', projType: 'PLASMA', color: 0x00FFFF, damage: 25 },
            { name: 'LASER', fireRate: 1.5, ammo: 10, type: 'HITSCAN', rail: true, color: 0xFF00FF, damage: 1000 }
        ];

        this.currentIndex = 0;
        this.currentWeapon = this.weapons[0];

        this.canShoot = true;
        this.basePos = new THREE.Vector3(0.3, -0.3, -0.5);

        // Meshes for each weapon
        this.meshes = [];
        this.createWeaponMeshes();

        // Active Mesh
        this.mesh = this.meshes[0];
        this.mesh.visible = true;
        this.camera.add(this.mesh); // Add current only? Or add all and toggle opacity/visibility?
        // Easier to just manage one "active" mesh attached to camera.

        // Flash
        this.flash = new THREE.PointLight(0xffff00, 0, 10);
        this.flash.position.set(0, 0, -1);
        this.mesh.add(this.flash);

        // Input
        document.addEventListener('keydown', (e) => {
            if (e.key >= '1' && e.key <= '5') {
                this.switchWeapon(parseInt(e.key) - 1);
            }
        });
    }

    createWeaponMeshes() {
        // Reuse camera group?
        // Currently 'this.mesh' is attached to camera. 
        // Let's create a mesh for each weapon style.

        this.weapons.forEach(w => {
            let geo, mat;
            if (w.name === 'PISTOL') {
                geo = new THREE.BoxGeometry(0.1, 0.15, 0.3);
                mat = new THREE.MeshStandardMaterial({ color: w.color });
            } else if (w.name === 'CHAINGUN') {
                geo = new THREE.CylinderGeometry(0.05, 0.05, 0.6, 8);
                geo.rotateX(-Math.PI / 2);
                mat = new THREE.MeshStandardMaterial({ color: w.color });
            } else if (w.name === 'ROCKET') {
                geo = new THREE.BoxGeometry(0.2, 0.2, 0.8);
                mat = new THREE.MeshStandardMaterial({ color: w.color });
            } else if (w.name === 'PLASMA') {
                geo = new THREE.BoxGeometry(0.15, 0.15, 0.4);
                // Dual prong?
                mat = new THREE.MeshStandardMaterial({ color: w.color, emissive: 0x00ffff, emissiveIntensity: 0.5 });
            } else if (w.name === 'LASER') {
                geo = new THREE.BoxGeometry(0.3, 0.1, 0.6);
                mat = new THREE.MeshStandardMaterial({ color: w.color });
            }

            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.copy(this.basePos);
            mesh.visible = false;
            this.meshes.push(mesh);
        });
    }

    switchWeapon(index) {
        if (index < 0 || index >= this.weapons.length) return;

        // Swap Mesh
        this.mesh.remove(this.flash);
        this.camera.remove(this.mesh);

        this.currentIndex = index;
        this.currentWeapon = this.weapons[index];
        this.mesh = this.meshes[index];
        this.mesh.visible = true;

        this.camera.add(this.mesh);
        this.mesh.add(this.flash);

        // Reset state
        this.canShoot = true;
        this.mesh.position.copy(this.basePos); // Reset recoil

        console.log("Switched to " + this.currentWeapon.name);
    }

    shoot(enemies) {
        if (!this.canShoot) return;
        const w = this.currentWeapon;

        // Ammo check
        if (w.ammo !== Infinity && w.ammo <= 0) {
            // Click sound?
            return;
        }
        if (w.ammo !== Infinity) w.ammo--;

        this.canShoot = false;

        // Fire Effect
        this.flash.intensity = 2;
        this.flash.color.setHex(w.name === 'PLASMA' ? 0x00ffff : (w.name === 'LASER' ? 0xff00ff : 0xffff00));
        setTimeout(() => this.flash.intensity = 0, 50);

        // Recoil
        this.mesh.position.z += 0.2;

        // Logic
        if (w.type === 'HITSCAN') {
            this.handleHitscan(enemies, w);
        } else if (w.type === 'PROJECTILE') {
            this.handleProjectile(w);
        }

        // Cooldown
        setTimeout(() => {
            this.canShoot = true;
        }, w.fireRate * 1000);
    }

    handleProjectile(w) {
        // Spawn Projectile
        // Origin: Camera position + offset? 
        // Direction: Camera forward
        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);
        const origin = this.camera.position.clone().add(direction.clone().multiplyScalar(1.0)); // Spawn slightly ahead

        this.projectileManager.spawnProjectile(w.projType, origin, direction, 'player');
    }

    handleHitscan(enemies, w) {
        this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
        const allObjects = this.scene.children;
        const intersects = this.raycaster.intersectObjects(allObjects, true);

        // Filter self
        let hit = null;
        for (const i of intersects) {
            // Ignore gun, flash, player components (if any)
            if (i.object.uuid !== this.mesh.uuid && i.object.uuid !== this.flash.uuid) {
                hit = i;
                break;
            }
        }

        if (hit) {
            const entity = hit.object.userData.entity;

            // Beam Visual for Laser
            if (w.rail) {
                this.renderBeam(this.mesh.getWorldPosition(new THREE.Vector3()), hit.point);
            }

            if (entity) {
                entity.takeDamage(w.damage);
                if (this.particleManager) this.particleManager.createExplosion(hit.point, 0xff0000, 5); // Small blood hit
            } else {
                // Wall
                if (this.decalManager) this.decalManager.spawnDecal(hit.point, hit.face.normal);
                if (this.particleManager) this.particleManager.createHitSparks(hit.point, hit.face.normal);
            }
        } else if (w.rail) {
            // Miss beam
            const direction = new THREE.Vector3();
            this.camera.getWorldDirection(direction);
            const end = this.camera.position.clone().add(direction.multiplyScalar(100));
            this.renderBeam(this.mesh.getWorldPosition(new THREE.Vector3()), end);
        }
    }

    renderBeam(start, end) {
        // Simple cylinder or line
        // Line is faster
        const material = new THREE.LineBasicMaterial({
            color: 0xff00ff
        });
        const points = [];
        points.push(start); // Gun position (approx)
        points.push(end);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, material);
        this.scene.add(line);

        // Fade out
        setTimeout(() => {
            this.scene.remove(line);
            geometry.dispose();
            material.dispose();
        }, 100);
    }

    update(dt) {
        // Recoil Recovery
        if (this.mesh.position.z > this.basePos.z) {
            this.mesh.position.z -= dt * 1.0;
            if (this.mesh.position.z < this.basePos.z) this.mesh.position.z = this.basePos.z;
        }

        // Sway
        const time = performance.now() * 0.005;
        const swayY = Math.sin(time) * 0.002;
        this.mesh.position.y = this.basePos.y + swayY;
    }

    addAmmo(amount) {
        // Add to current weapon? or generic ammo?
        // Let's just add to current for now
        if (this.currentWeapon.ammo !== Infinity) {
            this.currentWeapon.ammo += amount;
        }
    }

    // Get ammo for UI
    get ammo() {
        return this.currentWeapon.ammo;
    }
}
