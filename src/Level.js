import * as THREE from 'three';
import { LevelGenerator } from './LevelGenerator.js';

export class Level {
    constructor(scene) {
        this.scene = scene;
        this.collidables = [];
        this.rooms = []; // Store generated rooms for spawning
        this.lights = []; // Store lights for flickering logic

        this.init();
    }

    update(dt) {
        // Flicker logic
        this.lights.forEach(l => {
            if (Math.random() > 0.9) {
                l.intensity = 0.8 + Math.random() * 0.4;
            }
        });
    }

    init() {
        // Generate Level
        // Size 100x100 (Expert Design: Larger Map)
        const gen = new LevelGenerator(100, 100);
        const data = gen.generate();
        this.rooms = data.rooms;

        // Floor
        const floorGeo = new THREE.PlaneGeometry(100, 100);
        const floorMat = new THREE.MeshStandardMaterial({
            color: 0x333333,
            side: THREE.DoubleSide
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -0.01; // Avoid Z-fighting with wall bottoms

        floor.receiveShadow = true;
        this.scene.add(floor);
        this.collidables.push(floor);

        // Ceiling (optional, but good for dungeon feel)
        const ceilingGeo = new THREE.PlaneGeometry(100, 100);
        const ceilingMat = new THREE.MeshStandardMaterial({ color: 0x222222, side: THREE.DoubleSide });
        const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.y = 4.01; // Avoid Z-fighting with wall tops
        ceiling.receiveShadow = true;
        this.scene.add(ceiling);


        // Walls
        // Use a shared geometry and material
        const wallGeo = new THREE.BoxGeometry(1, 4, 1);
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x884444 });

        data.walls.forEach(w => {
            const mesh = new THREE.Mesh(wallGeo, wallMat);
            // w structure: {x, z, width, depth} - from generator they are 1x1
            mesh.position.set(w.x, 2, w.z); // y=2 because height=4
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.scene.add(mesh);
            this.collidables.push(mesh);
        });

        // Lights
        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
        this.scene.add(ambientLight);

        // Add lights safely in rooms
        this.rooms.forEach((r, i) => {
            // Add a point light in the center of some rooms
            if (i % 2 === 0) {
                const colors = [0xffaa00, 0xff0000, 0x0088ff, 0x00ffff];
                const color = colors[Math.floor(Math.random() * colors.length)];
                const pl = new THREE.PointLight(color, 1, 15);
                pl.position.set(r.x + r.width / 2, 3, r.z + r.depth / 2);
                pl.castShadow = true;
                pl.shadow.bias = -0.001; // Reduce shadow acne

                // Add to lights for flickering
                this.lights.push(pl);

                this.scene.add(pl);
            }

            // Add Platforms in large rooms
            if (r.width > 20 && r.depth > 20 && i % 3 === 0) {
                const pfW = 10;
                const pfD = 10;
                const pfH = 1; // Platform height
                const pfY = 1.5; // Platform Surface Y

                const pfGeo = new THREE.BoxGeometry(pfW, pfH, pfD);
                const pfMat = new THREE.MeshStandardMaterial({ color: 0x555555 });
                const pf = new THREE.Mesh(pfGeo, pfMat);

                // Center logic: r.x + r.width/2
                pf.position.set(r.x + r.width / 2, pfY - pfH / 2, r.z + r.depth / 2);
                pf.castShadow = true;
                pf.receiveShadow = true;
                this.scene.add(pf);
                this.collidables.push(pf);

                // Add a simple "Stair" or Ramp
                const rampGeo = new THREE.BoxGeometry(4, pfY / 2, 4);
                const ramp = new THREE.Mesh(rampGeo, pfMat);
                // Place it next to platform
                ramp.position.set(pf.position.x - pfW / 2 - 2, pfY / 4, pf.position.z);
                ramp.castShadow = true;
                ramp.receiveShadow = true;
                this.scene.add(ramp);
                this.collidables.push(ramp);
            }
        });
    }

    getCollidables() {
        return this.collidables;
    }

    getSpawnPoint() {
        // Return a random point in a random room
        if (this.rooms.length === 0) return new THREE.Vector3(0, 2, 0);

        const r = this.rooms[Math.floor(Math.random() * this.rooms.length)];
        const x = r.x + r.width / 2;
        const z = r.z + r.depth / 2;
        return new THREE.Vector3(x, 2, z);
    }
}
