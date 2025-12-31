import * as THREE from 'three';

export class Weapon {
    constructor(camera, scene) {
        this.camera = camera;
        this.scene = scene;
        this.raycaster = new THREE.Raycaster();

        // Setup a simple gun model (just a box attached to camera)
        const gunGeo = new THREE.BoxGeometry(0.2, 0.2, 1);
        const gunMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
        this.mesh = new THREE.Mesh(gunGeo, gunMat);

        // Attach to camera
        this.mesh.position.set(0.3, -0.3, -0.5);
        this.camera.add(this.mesh);

        this.canShoot = true;
        this.fireRate = 0.5; // seconds

        this.maxAmmo = 30;
        this.ammo = this.maxAmmo;

        // Muzzle flash light
        this.flash = new THREE.PointLight(0xffff00, 0, 10);
        this.flash.position.set(0, 0, -1);
        this.mesh.add(this.flash);
    }

    shoot(enemies) {
        if (!this.canShoot || this.ammo <= 0) return;

        this.canShoot = false;
        this.ammo--;

        // Visual effect
        this.flash.intensity = 2;
        setTimeout(() => this.flash.intensity = 0, 50);

        // Recoil
        this.mesh.position.z += 0.2;

        // Logic
        this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);

        // Get meshes from enemies
        const enemyMeshes = enemies.map(e => e.mesh);
        const intersects = this.raycaster.intersectObjects(enemyMeshes);

        if (intersects.length > 0) {
            const hit = intersects[0];
            const entity = hit.object.userData.entity;
            if (entity) {
                entity.takeDamage(100);
            }
        }

        // Cooldown
        setTimeout(() => {
            this.canShoot = true;
        }, this.fireRate * 1000);
    }

    update(dt) {
        // Return to position (recoil recovery)
        if (this.mesh.position.z > -0.5) {
            this.mesh.position.z -= dt * 1.0;
            if (this.mesh.position.z < -0.5) this.mesh.position.z = -0.5;
        }
    }

    addAmmo(amount) {
        this.ammo += amount;
        if (this.ammo > this.maxAmmo) {
            this.ammo = this.maxAmmo;
        }
    }
}
