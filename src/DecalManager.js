import * as THREE from 'three';

export class DecalManager {
    constructor(scene) {
        this.scene = scene;
        this.decals = [];
        this.maxDecals = 50;
        this.currentDecalIndex = 0;

        // Texture
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = 'rgba(0,0,0,0)'; // Transparent
        ctx.clearRect(0, 0, 64, 64);

        // Dark hole
        ctx.beginPath();
        ctx.arc(32, 32, 10, 0, Math.PI * 2);
        ctx.fillStyle = '#000000';
        ctx.fill();

        // Cracks/burnt edges
        ctx.strokeStyle = '#222222';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(32, 32);
        ctx.lineTo(10, 10);
        ctx.moveTo(32, 32);
        ctx.lineTo(54, 54);
        ctx.stroke();

        this.texture = new THREE.CanvasTexture(canvas);

        this.geometry = new THREE.PlaneGeometry(0.3, 0.3);
        this.material = new THREE.MeshBasicMaterial({
            map: this.texture,
            transparent: true,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -1, // Pull forward
            polygonOffsetUnits: -1
        });

        // Initialize pool
        for (let i = 0; i < this.maxDecals; i++) {
            const mesh = new THREE.Mesh(this.geometry, this.material);
            mesh.visible = false;
            this.scene.add(mesh);
            this.decals.push(mesh);
        }
    }

    spawnDecal(position, normal) {
        const mesh = this.decals[this.currentDecalIndex];
        mesh.visible = true;
        mesh.position.copy(position);

        // Orient to wall
        // Position + normal is where it "looks" at? No, lookAt normal? 
        // Plane normal is +Z. We want +Z to match the wall normal.
        const target = position.clone().add(normal);
        mesh.lookAt(target);

        this.currentDecalIndex = (this.currentDecalIndex + 1) % this.maxDecals;
    }
}
