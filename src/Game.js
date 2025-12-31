import * as THREE from 'three';
import { Player } from './Player.js';
import { Level } from './Level.js';
import { Weapon } from './Weapon.js';
import { Enemy } from './Enemy.js';
import { Pickup } from './Pickup.js';
import { ParticleManager } from './ParticleManager.js';
import { DecalManager } from './DecalManager.js';
import { ProjectileManager } from './ProjectileManager.js';

export class Game {
    constructor() {
        this.container = document.querySelector('#app') || document.body;

        // Cleanup existing canvas or content to prevent duplicates/HMR artifacts
        while (this.container.firstChild) {
            this.container.removeChild(this.container.firstChild);
        }

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x111111);
        this.scene.fog = new THREE.Fog(0x111111, 0, 100);

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

        this.renderer = new THREE.WebGLRenderer({ antialias: false }); // False for retro feel
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        this.clock = new THREE.Clock();
        this.particleManager = new ParticleManager(this.scene);
        this.decalManager = new DecalManager(this.scene);
        this.projectileManager = new ProjectileManager(this.scene, this.particleManager);

        this.level = new Level(this.scene);
        this.player = new Player(this.camera, this.container);

        // Set Player Spawn
        const startPos = this.level.getSpawnPoint();
        this.player.camera.position.copy(startPos);

        this.player.camera.position.copy(startPos);

        // Pass particle manager to weapon
        this.weapon = new Weapon(this.camera, this.scene, this.particleManager, this.decalManager, this.projectileManager);
        this.camera.add(this.weapon.mesh); // Ensure gun is in scene graph via camera
        this.scene.add(this.camera); // Camera must be in scene for children to render if not implicitly done (often is, but good practice)

        this.enemies = [];
        // Spawn some enemies
        for (let i = 0; i < 30; i++) {
            const pos = this.level.getSpawnPoint();
            this.enemies.push(new Enemy(this.scene, pos, this.particleManager));
        }

        this.pickups = [];
        // Spawn Pickups
        for (let i = 0; i < 5; i++) {
            const pos = this.level.getSpawnPoint();
            pos.y = 1; // Pickups are lower
            const type = Math.random() > 0.5 ? 'HEALTH' : 'AMMO';
            this.pickups.push(new Pickup(this.scene, type, pos));
        }

        // Pass shoot callback to player or handle input globally.
        // Let's hook up click to shoot in update or Player.
        // Input State
        this.isMouseDown = false;
        this.container.addEventListener('mousedown', () => { this.isMouseDown = true; });
        this.container.addEventListener('mouseup', () => { this.isMouseDown = false; });


        window.addEventListener('resize', this.onWindowResize.bind(this));

        // UI Elements
        this.uiHealth = document.getElementById('health-val');
        this.uiAmmo = document.getElementById('ammo-val');
        this.uiWeapon = document.getElementById('weapon-val');
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

        this.level.update(dt);
        if (this.isMouseDown && this.player.controls.isLocked) {
            this.weapon.shoot(this.enemies.filter(e => e.alive));
        }

        this.player.update(dt, this.level.getCollidables(), this.enemies);
        this.weapon.update(dt);
        this.particleManager.update(dt);
        this.projectileManager.update(dt, this.level.getCollidables(), this.enemies, this.player);

        this.enemies.forEach(e => e.update(dt, this.player.camera.position, this.player, this.level.getCollidables()));
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
        this.uiWeapon.innerText = this.weapon.currentWeapon.name;

        this.renderer.render(this.scene, this.camera);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    dispose() {
        this.renderer.setAnimationLoop(null);
        window.removeEventListener('resize', this.onWindowResize);

        if (this.player) {
            this.player.dispose();
        }

        // Cleanup DOM
        if (this.container.contains(this.renderer.domElement)) {
            this.container.removeChild(this.renderer.domElement);
        }

        // Optional: Dispose Three.js resources (geometries, materials) to prevent leaks
        // For a simple reload, letting GC handle unreachable objects is usually fine if root (renderer/scene) is cut.
    }
}
