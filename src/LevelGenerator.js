

export class LevelGenerator {
    constructor(width, depth, seed = 12345) {
        this.width = width;
        this.depth = depth;
        this.walls = []; // { x, z, width, depth }
        this.rooms = []; // { x, z, width, depth }
        this.corridors = [];
        this.minRoomSize = 15;
        this.rng = new SeededRandom(seed);
    }

    generate() {
        this.walls = [];
        this.rooms = [];
        this.corridors = [];

        // Root leaf representing the whole map
        const root = new Leaf(0, 0, this.width, this.depth, this.rng);
        const leafs = [root];

        let didSplit = true;
        // We can split up to some number of times or until no more splits can happen
        while (didSplit) {
            didSplit = false;
            for (const leaf of leafs) {
                if (!leaf.leftChild && !leaf.rightChild) { // if not already split
                    if (leaf.width > this.minRoomSize * 2 || leaf.depth > this.minRoomSize * 2) {
                        if (leaf.split(this.minRoomSize)) { // attempt split
                            leafs.push(leaf.leftChild);
                            leafs.push(leaf.rightChild);
                            didSplit = true;
                        }
                    }
                }
            }
        }

        // Create rooms in the leaves
        root.createRooms(this);

        // Fill walls
        // We will represent the map as a grid or just logical blocking?
        // Let's take a subtraction approach: Start with solid, carve out rooms/corridors
        // Or additive: Start with empty, only place walls around bounds?
        // Quake style is usually "void" is empty, walls define structure.
        // Actually, for a dungeon, "solid" universe is easier: carved rooms.
        // But for this simple FPS, let's do:
        // 1. Generate Room Rects
        // 2. Generate Corridor Rects
        // 3. Any space NOT in a room or corridor, AND adjacent to one, is a wall?
        // Or simpler: Just place walls around the perimeter of every room/corridor?
        // No, that makes double walls.

        // Let's use a Grid for wall generation to keep it simple and robust.
        const scale = 2; // 1 unit in our logic = 2 units in world, or just 1:1
        // Let's Stick to 1:1 logic for simplicity, scaling happens at Mesh creation.

        // Initialize grid
        const gridW = Math.ceil(this.width);
        const gridD = Math.ceil(this.depth);
        const grid = new Array(gridW * gridD).fill(1); // 1 = Wall, 0 = Empty

        const setEmpty = (x, z, w, d) => {
            const startX = Math.floor(x + this.width / 2);
            const startZ = Math.floor(z + this.depth / 2);
            const endX = startX + w;
            const endZ = startZ + d;

            for (let i = startX; i < endX; i++) {
                for (let j = startZ; j < endZ; j++) {
                    if (i >= 0 && i < gridW && j >= 0 && j < gridD) {
                        grid[j * gridW + i] = 0;
                    }
                }
            }
        };

        // Carve rooms
        this.rooms.forEach(r => {
            setEmpty(r.x, r.z, r.width, r.depth);

            // Add internal pillars if architecturally required
            if (r.hasPillars) {
                // Grid pattern for pillars
                // Start a bit inside
                const pillarSpacing = 6;

                // World space to grid space logic is a bit implicit here.
                // r.x, r.z are centered coords. 
                // We need to iterate relative to room corner and place walls back into grid.
                // Actually, easiest is just to NOT clear the grid at pillar spots? 
                // No, we already cleared the whole room. We need to set them back to 1 (Wall).

                const startX = Math.floor(r.x + this.width / 2);
                const startZ = Math.floor(r.z + this.depth / 2);

                for (let px = 4; px < r.width - 4; px += pillarSpacing) {
                    for (let pz = 4; pz < r.depth - 4; pz += pillarSpacing) {
                        // Don't block the absolute center (spawn point often)
                        const cx = r.width / 2;
                        const cz = r.depth / 2;
                        if (Math.abs(px - cx) < 4 && Math.abs(pz - cz) < 4) continue;

                        const gx = startX + px;
                        const gz = startZ + pz;
                        if (gx >= 0 && gx < gridW && gz >= 0 && gz < gridD) {
                            grid[gz * gridW + gx] = 1;
                        }
                    }
                }
            }
        });

        // Connectivity/Corridors would be stored in the BSP tree logic actually.
        // The Leaf.createRooms typically makes a room inside the leaf, 
        // and we need to connect sibling leaves with corridors.

        // Let's traverse tree to build corridors
        this.generateCorridors(root);

        this.corridors.forEach(c => {
            setEmpty(c.x, c.z, c.width, c.depth);
        });


        // Now generate wall rectangles from the grid (simple run-length encoding style or just blocks)
        // For efficiency, let's just create raw blocks first, optimization later if needed.
        // Actually, simple "For each '1' in grid that touches a '0', make a wall"
        // Or just "For each '1', make a wall block" -> might be too many meshes.
        // Optimization: Combine adjacent horizontal walls.

        for (let z = 0; z < gridD; z++) {
            for (let x = 0; x < gridW; x++) {
                if (grid[z * gridW + x] === 1) {
                    // Check if this wall manages to actually border an empty space? 
                    // Optimization: Remove internal walls that the player can never see.
                    // (i.e. if all 4 neighbors are walls, it's invisible)
                    const neighbors = [
                        this.getGrid(grid, x + 1, z, gridW, gridD),
                        this.getGrid(grid, x - 1, z, gridW, gridD),
                        this.getGrid(grid, x, z + 1, gridW, gridD),
                        this.getGrid(grid, x, z - 1, gridW, gridD)
                    ];

                    if (neighbors.some(n => n === 0)) {
                        // Build a wall
                        this.walls.push({
                            x: x - this.width / 2 + 0.5,
                            z: z - this.depth / 2 + 0.5,
                            width: 1,
                            depth: 1
                        });
                    }
                }
            }
        }

        return {
            walls: this.walls,
            rooms: this.rooms
        };
    }

    getGrid(grid, x, z, w, d) {
        if (x < 0 || x >= w || z < 0 || z >= d) return 1; // Out of bounds is wall
        return grid[z * w + x];
    }

    generateCorridors(leaf) {
        if (leaf.leftChild && leaf.rightChild) {
            const l = leaf.leftChild;
            const r = leaf.rightChild;

            // Connect these two centers
            const p1 = l.getCenter();
            const p2 = r.getCenter();

            // Create a corridor
            // Easiest: L-shape
            // Or since BSP splits axis aligned, just a straight line often works if aligned

            if (p1.x === p2.x) {
                // Vertical
                this.corridors.push({
                    x: p1.x - 2, // width 4 corridor (offset 2)
                    z: Math.min(p1.z, p2.z),
                    width: 4,
                    depth: Math.abs(p1.z - p2.z)
                });
            } else if (p1.z === p2.z) {
                // Horizontal
                this.corridors.push({
                    x: Math.min(p1.x, p2.x),
                    z: p1.z - 2,
                    width: Math.abs(p1.x - p2.x),
                    depth: 4
                });
            } else {
                // L-Shape
                // 1. Horizontal from p1.x to p2.x at p1.z
                this.corridors.push({
                    x: Math.min(p1.x, p2.x),
                    z: p1.z - 2,
                    width: Math.abs(p1.x - p2.x) + 4, // overlap a bit
                    depth: 4
                });
                // 2. Vertical from p1.z to p2.z at p2.x
                this.corridors.push({
                    x: p2.x - 2,
                    z: Math.min(p1.z, p2.z),
                    width: 4,
                    depth: Math.abs(p1.z - p2.z)
                });
            }

            this.generateCorridors(l);
            this.generateCorridors(r);
        }
    }
}

class SeededRandom {
    constructor(seed) {
        this.seed = seed % 2147483647;
        if (this.seed <= 0) this.seed += 2147483646;
    }

    next() {
        this.seed = (this.seed * 16807) % 2147483647;
        return (this.seed - 1) / 2147483646;
    }

    range(min, max) {
        return Math.floor(this.next() * (max - min + 1) + min);
    }
}

class Leaf {
    constructor(x, z, width, depth, rng) {
        this.x = x; // Center X of the leaf relative area?
        // Actually best to store Top-Left coordinates for rect arithmetic, but our generator uses centered math?
        // Let's use Top-Left logic for the Leaf (x, z) relative to -width/2, -depth/2 ?
        // Or just raw coords. Let's stick to Centered coords logic in Generator but maybe TopLeft here?
        // Let's do TopLeft relative to map origin (-width/2). 
        // wait, let's keep it simple: x,z are Top-Left corner coordinates in generated grid space (0 to totalWidth)
        this.x = x;
        this.z = z;
        this.width = width;
        this.depth = depth;
        this.rng = rng;

        this.leftChild = null;
        this.rightChild = null;
        this.room = null; // {x, y, w, h}
    }

    split(minSize) {
        if (this.leftChild || this.rightChild) return false; // already split

        // Determine direction of split
        // if width > 25% larger than height, split vertically
        // if height > 25% larger than width, split horizontally
        // otherwise random
        let splitH = this.rng.next() > 0.5;
        if (this.width > this.depth && this.width / this.depth >= 1.25) splitH = false;
        else if (this.depth > this.width && this.depth / this.width >= 1.25) splitH = true;

        const max = (splitH ? this.depth : this.width) - minSize;
        if (max <= minSize) return false; // area too small to split

        const split = this.rng.range(minSize, max);

        if (splitH) { // Horizontal split (cuts the Z axis)
            this.leftChild = new Leaf(this.x, this.z, this.width, split, this.rng);
            this.rightChild = new Leaf(this.x, this.z + split, this.width, this.depth - split, this.rng);
        } else { // Vertical split (cuts the X axis)
            this.leftChild = new Leaf(this.x, this.z, split, this.depth, this.rng);
            this.rightChild = new Leaf(this.x + split, this.z, this.width - split, this.depth, this.rng);
        }
        return true;
    }

    createRooms(generator) {
        if (this.leftChild || this.rightChild) {
            if (this.leftChild) this.leftChild.createRooms(generator);
            if (this.rightChild) this.rightChild.createRooms(generator);
        } else {
            // Expert Design: Maximize usage of space.
            // Instead of random small boxes, try to fill the leaf.
            // Leave a small padding (1 or 2 units) for walls.

            const padding = 2;
            // Ensure we don't go negative if leaf is tiny (shouldn't be due to minSize)
            const maxW = Math.max(this.width - padding * 2, 4);
            const maxD = Math.max(this.depth - padding * 2, 4);

            // Random variance but biased towards large
            // Size is between 70% and 100% of max
            const w = this.rng.range(Math.floor(maxW * 0.7), maxW);
            const d = this.rng.range(Math.floor(maxD * 0.7), maxD);

            // Center the room in the leaf
            const x = this.x + Math.floor((this.width - w) / 2);
            const z = this.z + Math.floor((this.depth - d) / 2);

            this.room = {
                x: x - generator.width / 2,
                z: z - generator.depth / 2,
                width: w,
                depth: d,
                hasPillars: (w > 20 && d > 20 && this.rng.next() > 0.3) // 70% chance of pillars in huge rooms
            };

            generator.rooms.push(this.room);
        }
    }

    getCenter() {
        if (this.room) {
            return { x: this.room.x + this.room.width / 2, z: this.room.z + this.room.depth / 2 };
        }
        if (this.leftChild && this.rightChild) {
            const lc = this.leftChild.getCenter();
            const rc = this.rightChild.getCenter();
            return { x: (lc.x + rc.x) / 2, z: (lc.z + rc.z) / 2 };
        }
        // Fallback
        return { x: 0, z: 0 };
    }
}
