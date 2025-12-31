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

        // Stats
        this.maxHealth = 100;
        this.health = this.maxHealth;
        this.isDead = false;

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

    update(dt, collidables, enemies) {
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

        // Collision Check
        this.checkCollisions(collidables);
        if (enemies) {
            // Extract meshes for collision check
            const enemyMeshes = enemies.map(e => e.mesh);
            this.checkCollisions(enemyMeshes);
        }

        if (this.camera.position.y < 2) {
            this.velocity.y = 0;
            this.camera.position.y = 2;
        }
    }

    checkCollisions(objects) {
        if (!objects || objects.length === 0) return;

        const playerPos = this.camera.position;
        const playerRadius = this.radius;

        // Bounding Box for temp calculations
        const box = new THREE.Box3();
        const playerSphere = new THREE.Sphere(playerPos, playerRadius);

        for (const obj of objects) {
            if (!obj.geometry) continue;

            // Ensure bounding box is calculated
            if (!obj.geometry.boundingBox) obj.geometry.computeBoundingBox();

            box.copy(obj.geometry.boundingBox).applyMatrix4(obj.matrixWorld);

            if (box.intersectsSphere(playerSphere)) {
                // Determine the closest point on the box to the sphere center
                const closestPoint = new THREE.Vector3();
                box.clampPoint(playerPos, closestPoint);

                // Calculate the vector from the closest point to the sphere center
                const pushVector = new THREE.Vector3().subVectors(playerPos, closestPoint);
                const distance = pushVector.length();

                // If the distance is less than radius, we are colliding
                if (distance < playerRadius) {
                    // Resolve collision: push player out
                    const penetrationDepth = playerRadius - distance;

                    // Normalize push vector (handle zero-length vector case)
                    if (distance > 0) {
                        pushVector.normalize();
                    } else {
                        // If perfectly inside, push up or random horizontal? 
                        // Just push back along velocity inverse or arbitrary for now
                        pushVector.set(1, 0, 0);
                    }

                    // Apply correction
                    playerPos.addScaledVector(pushVector, penetrationDepth);

                    // Kill velocity in that direction (optional, but feels better)
                    // Project velocity onto pushVector and subtract parallel component if moving into it
                    // const velocityProjected = this.velocity.clone().projectOnVector(pushVector);
                    // if (velocityProjected.dot(pushVector) < 0) { // Moving towards collider
                    //      this.velocity.sub(velocityProjected);
                    // }
                }
            }
        }

    }
    takeDamage(amount) {
        if (this.isDead) return;

        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
            this.isDead = true;
            console.log("Player Died!"); // Placeholder for Game Over
        }
    }

    heal(amount) {
        if (this.isDead) return;
        this.health += amount;
        if (this.health > this.maxHealth) {
            this.health = this.maxHealth;
        }
    }
}
