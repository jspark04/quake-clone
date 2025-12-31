import * as THREE from 'three';

export class Pickup {
    constructor(scene, type, position) {
        this.scene = scene;
        this.type = type; // 'HEALTH' or 'AMMO'
        this.alive = true;
        this.position = position;

        let color = 0xffffff;
        if (type === 'HEALTH') color = 0x00ff00;
        if (type === 'AMMO') color = 0xffff00;

        // Simple box or sphere
        const geo = type === 'HEALTH' ? new THREE.BoxGeometry(0.5, 0.5, 0.5) : new THREE.SphereGeometry(0.3);
        const mat = new THREE.MeshBasicMaterial({ color: color, wireframe: true });
        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.position.copy(position);

        this.scene.add(this.mesh);
    }

    update(dt) {
        if (!this.alive) return;

        // Animate
        this.mesh.rotation.y += dt;
        this.mesh.rotation.x += dt * 0.5;
    }
}
