import * as THREE from 'three';
import { Player } from './Player.js';
import { Level } from './Level.js';
import { Weapon } from './Weapon.js';
import { Enemy } from './Enemy.js';
import { Pickup } from './Pickup.js';

export class Game {
    constructor() {
        this.container = document.querySelector('#app') || document.body;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x111111);
        this.scene.fog = new THREE.Fog(0x111111, 0, 100);

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

        this.renderer = new THREE.WebGLRenderer({ antialias: false }); // False for retro feel
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.container.appendChild(this.renderer.domElement);

        this.clock = new THREE.Clock();

        this.player = new Player(this.camera, this.container);
        this.level = new Level(this.scene);

        this.weapon = new Weapon(this.camera, this.scene);
        this.camera.add(this.weapon.mesh); // Ensure gun is in scene graph via camera
        this.scene.add(this.camera); // Camera must be in scene for children to render if not implicitly done (often is, but good practice)

        this.enemies = [];
        // Spawn some enemies
        for (let i = 0; i < 5; i++) {
            const pos = new THREE.Vector3(
                (Math.random() - 0.5) * 50,
                2,
                (Math.random() - 0.5) * 50
            );
            this.enemies.push(new Enemy(this.scene, pos));
        }

        this.pickups = [];
        // Spawn Pickups
        for (let i = 0; i < 5; i++) {
            const pos = new THREE.Vector3(
                (Math.random() - 0.5) * 50,
                1,
                (Math.random() - 0.5) * 50
            );
            const type = Math.random() > 0.5 ? 'HEALTH' : 'AMMO';
            this.pickups.push(new Pickup(this.scene, type, pos));
        }

        // Pass shoot callback to player or handle input globally.
        // Let's hook up click to shoot in update or Player.
        this.container.addEventListener('mousedown', () => {
            if (this.player.controls.isLocked) {
                this.weapon.shoot(this.enemies.filter(e => e.alive));
            }
        });


        window.addEventListener('resize', this.onWindowResize.bind(this));

        // UI Elements
        this.uiHealth = document.getElementById('health-val');
        this.uiAmmo = document.getElementById('ammo-val');
        this.uiGameOver = document.getElementById('game-over');
        this.btnRestart = document.getElementById('restart-btn');

        this.btnRestart.addEventListener('click', () => {
            window.location.reload();
        });
    }

    start() {
        this.renderer.setAnimationLoop(this.update.bind(this));
    }

    update() {
        const dt = this.clock.getDelta();

        if (this.player.isDead) {
            this.uiGameOver.style.display = 'flex';
            this.player.controls.unlock();
            return;
        }

        this.player.update(dt, this.level.getCollidables(), this.enemies);
        this.weapon.update(dt);

        this.enemies.forEach(e => e.update(dt, this.player.camera.position, this.player));
        // Cleanup dead enemies
        this.enemies = this.enemies.filter(e => e.alive);

        // Update Pickups
        this.pickups.forEach(p => {
            p.update(dt);
            if (p.alive) {
                const dist = p.mesh.position.distanceTo(this.player.camera.position);
                if (dist < 2.0) {
                    // Collision
                    let collected = false;
                    if (p.type === 'HEALTH' && this.player.health < this.player.maxHealth) {
                        this.player.heal(25);
                        collected = true;
                    } else if (p.type === 'AMMO') {
                        this.weapon.addAmmo(10);
                        collected = true;
                    }

                    if (collected) {
                        p.alive = false;
                        this.scene.remove(p.mesh);
                    }
                }
            }
        });
        this.pickups = this.pickups.filter(p => p.alive);

        // Update UI
        this.uiHealth.innerText = Math.ceil(this.player.health);
        this.uiAmmo.innerText = this.weapon.ammo;

        this.renderer.render(this.scene, this.camera);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}
