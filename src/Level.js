import * as THREE from 'three';

export class Level {
    constructor(scene) {
        this.scene = scene;
        this.collidables = [];

        this.init();
    }

    init() {
        // Floor
        const floorGeo = new THREE.PlaneGeometry(100, 100);
        const floorMat = new THREE.MeshStandardMaterial({
            color: 0x333333,
            side: THREE.DoubleSide
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        this.scene.add(floor);
        // Floor is generally not something we crash into horizontally, but we need gravity collision.
        // For now simple FPS, we might hardcode floor height or add to collidables if we do advanced collision.

        // Walls
        const boxGeo = new THREE.BoxGeometry(4, 4, 4);
        const boxMat = new THREE.MeshStandardMaterial({ color: 0x884444 });

        for (let i = 0; i < 20; i++) {
            const mesh = new THREE.Mesh(boxGeo, boxMat);
            mesh.position.set(
                (Math.random() - 0.5) * 80,
                2,
                (Math.random() - 0.5) * 80
            );
            this.scene.add(mesh);
            this.collidables.push(mesh);
        }

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(10, 20, 10);
        this.scene.add(dirLight);

        // Some colored point lights for atmosphere
        const pLight = new THREE.PointLight(0xff0000, 1, 20);
        pLight.position.set(0, 5, 0);
        this.scene.add(pLight);
    }

    getCollidables() {
        return this.collidables;
    }
}
