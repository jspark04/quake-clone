import * as THREE from 'three';

export class Enemy {
    constructor(scene, position) {
        this.scene = scene;
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
        // Die effect
        setTimeout(() => {
            this.destroy();
        }, 200);
    }

    destroy() {
        this.scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
    }

    update(dt, playerPos) {
        if (!this.alive) return;

        // Simple look at player
        this.mesh.lookAt(playerPos.x, this.mesh.position.y, playerPos.z);

        // Maybe move towards player slowly?
        // vector to player
        // const dir = new THREE.Vector3().subVectors(playerPos, this.mesh.position).normalize();
        // this.mesh.position.addScaledVector(dir, dt * 2.0);
    }
}
