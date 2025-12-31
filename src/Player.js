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
        this.jump = false;

        // Player collider parameters
        this.radius = 0.5;
        this.eyeHeight = 1.6; // Eyes are 1.6 units above feet
        this.height = 1.8;
        this.isGrounded = false;

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
        this.onKeyDown = (event) => {
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
                case 'Space':
                    if (this.isGrounded) this.velocity.y = 5.0; // Jump force
                    break;
            }
        };

        this.onKeyUp = (event) => {
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

        document.addEventListener('keydown', this.onKeyDown);
        document.addEventListener('keyup', this.onKeyUp);
    }

    dispose() {
        document.removeEventListener('keydown', this.onKeyDown);
        document.removeEventListener('keyup', this.onKeyUp);
        this.controls.unlock();
        this.controls.dispose();
    }

    update(dt, collidables, enemies) {
        if (!this.controls.isLocked) return;

        // Friction
        this.velocity.x -= this.velocity.x * 10.0 * dt;
        this.velocity.z -= this.velocity.z * 10.0 * dt;
        this.velocity.y -= 9.8 * dt; // Gravity

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
        // Apply movement
        this.controls.moveRight(-this.velocity.x * dt);
        this.controls.moveForward(-this.velocity.z * dt);
        this.camera.position.y += this.velocity.y * dt; // Apply vertical velocity directly

        // Collision Check
        this.checkCollisions(collidables);
        if (enemies) {
            // Extract meshes for collision check
            const enemyMeshes = enemies.map(e => e.mesh);
            this.checkCollisions(enemyMeshes);
        }

        // Fallback for falling out of world
        if (this.camera.position.y < -10) {
            this.health = 0;
            this.isDead = true;
        }
    }

    checkCollisions(objects) {
        if (!objects || objects.length === 0) return;

        this.isGrounded = false;

        // Sphere center is at feet + radius. (Camera is at feet + eyeHeight)
        // Offset = eyeHeight - radius
        const offset = this.eyeHeight - this.radius;
        const playerPos = this.camera.position.clone();
        playerPos.y -= offset;

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
                        pushVector.set(0, 1, 0); // Default push up
                    }

                    // Apply correction to camera
                    this.camera.position.addScaledVector(pushVector, penetrationDepth);

                    // Kill velocity in that direction (optional, but feels better)
                    // Project velocity onto pushVector and subtract parallel component if moving into it
                    const velocityProjected = this.velocity.clone().projectOnVector(pushVector);
                    if (velocityProjected.dot(pushVector) < 0) { // Moving towards collider
                        this.velocity.sub(velocityProjected);
                    }

                    // Ground check
                    if (pushVector.y > 0.5) {
                        this.isGrounded = true;
                    }
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
