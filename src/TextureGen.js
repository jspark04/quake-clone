import * as THREE from 'three';

export function createGridTexture(size = 512, divisions = 8, color1 = '#ffffff', color2 = '#000000') {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = color2;
    ctx.fillRect(0, 0, size, size);

    // Grid lines
    ctx.strokeStyle = color1;
    ctx.lineWidth = 4;

    // Draw Border
    ctx.strokeRect(0, 0, size, size);

    // Inner Grid? Maybe just a simple tile pattern.
    // Let's make a "Panel" look.
    const step = size; // Just one tile per texture usually, then repeat.

    // Grunge / Noise
    for (let i = 0; i < 1000; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
        const x = Math.random() * size;
        const y = Math.random() * size;
        const w = Math.random() * 50;
        const h = Math.random() * 50;
        ctx.fillRect(x, y, w, h);
    }

    // Emboss effect
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(0, 0, size, 4);
    ctx.fillRect(0, 0, 4, size);
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fillRect(0, size - 4, size, 4);
    ctx.fillRect(size - 4, 0, 4, size);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}

export function createCheckTexture(size = 512, divisions = 4, color1 = '#ffffff', color2 = '#000000') {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const step = size / divisions;

    for (let x = 0; x < divisions; x++) {
        for (let y = 0; y < divisions; y++) {
            ctx.fillStyle = (x + y) % 2 === 0 ? color1 : color2;
            ctx.fillRect(x * step, y * step, step, step);
        }
    }

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}
