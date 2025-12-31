import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

export class Player {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;

        this.controls = new PointerLockControls(camera, domElement);

        this.moveSpeed = 15.0;
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();

        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;

        // Player collider parameters
        this.radius = 0.5;

        this.initInput();

        // Initial position
        this.camera.position.set(0, 2, 0);

        // Click to capture
        this.domElement.addEventListener('click', () => {
            this.controls.lock();
        });
    }

    initInput() {
        const onKeyDown = (event) => {
            switch (event.code) {
                case 'ArrowUp':
                case 'KeyW':
                    this.moveForward = true;
                    break;
                case 'ArrowLeft':
                case 'KeyA':
                    this.moveLeft = true;
                    break;
                case 'ArrowDown':
                case 'KeyS':
                    this.moveBackward = true;
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    this.moveRight = true;
                    break;
            }
        };

        const onKeyUp = (event) => {
            switch (event.code) {
                case 'ArrowUp':
                case 'KeyW':
                    this.moveForward = false;
                    break;
                case 'ArrowLeft':
                case 'KeyA':
                    this.moveLeft = false;
                    break;
                case 'ArrowDown':
                case 'KeyS':
                    this.moveBackward = false;
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    this.moveRight = false;
                    break;
            }
        };

        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);
    }

    update(dt, collidables) {
        if (!this.controls.isLocked) return;

        // Friction
        this.velocity.x -= this.velocity.x * 10.0 * dt;
        this.velocity.z -= this.velocity.z * 10.0 * dt;

        // Input Direction
        this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
        this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
        this.direction.normalize(); // Ensure consistent speed in all directions

        if (this.moveForward || this.moveBackward) {
            this.velocity.z -= this.direction.z * 200.0 * dt; // Acceleration
        }
        if (this.moveLeft || this.moveRight) {
            this.velocity.x -= this.direction.x * 200.0 * dt;
        }

        // Apply movement
        this.controls.moveRight(-this.velocity.x * dt);
        this.controls.moveForward(-this.velocity.z * dt);

        // Simple collision check (very basic, preventing walking through the center height of boxes)
        // For a robust implementation, we'd need raycasting or AABB checks against the future position.
        // For this prototype, I'll rely on the visual "Quake" speed, and maybe simple bounding sphere check later.
        // Let's implement a quick raycast check for walls in movement direction if requested, 
        // but for now, let's get movement feeling good.

        // Prevent falling through floor
        if (this.camera.position.y < 2) {
            this.velocity.y = 0;
            this.camera.position.y = 2;
        }
    }
}
