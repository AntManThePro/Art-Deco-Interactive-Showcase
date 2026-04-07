// ─────────────────────────────────────────────────────────────────────────────
// CANVAS SETUP
// ─────────────────────────────────────────────────────────────────────────────

const canvas = document.getElementById('pyramidCanvas');
const ctx = canvas.getContext('2d');

let canvasWidth = 0;
let canvasHeight = 0;

function resizeCanvas() {
    canvasWidth = canvas.offsetWidth;
    canvasHeight = canvas.offsetHeight;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    repositionSparkles();
}

window.addEventListener('resize', resizeCanvas);

// ─────────────────────────────────────────────────────────────────────────────
// SCENE STATE
// ─────────────────────────────────────────────────────────────────────────────

let rotation = { x: 0.5, y: 0.5 };
let scale = 1;
let isDragging = false;
let lastPointer = { x: 0, y: 0 };
let autoRotateEnabled = false;
let currentLayer = 1;

// ─────────────────────────────────────────────────────────────────────────────
// PYRAMID DATA
// Each tier: base = side length of the square base, tierHeight = vertical span,
//            color = fill color, apexY = Y position of the apex in model space
// ─────────────────────────────────────────────────────────────────────────────

const pyramidTiers = [
    { base: 80,  tierHeight: 60, color: '#B87333', apexY: -120 },
    { base: 140, tierHeight: 50, color: '#D4AF37', apexY: -60  },
    { base: 200, tierHeight: 50, color: '#008B8B', apexY: -10  },
    { base: 260, tierHeight: 40, color: '#A0522D', apexY:  40  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 3D → 2D PROJECTION PIPELINE
//
// Step 1 – Rotate around X axis (pitch): tilts the model forward / backward
// Step 2 – Rotate around Y axis (yaw):  spins the model left / right
// Step 3 – Perspective divide:           makes farther points appear smaller
// ─────────────────────────────────────────────────────────────────────────────

const PERSPECTIVE_DEPTH = 400;
const BRIGHTNESS_ACTIVE   = 1.4;
const BRIGHTNESS_INACTIVE = 0.75;

function project3D(px, py, pz) {
    const cosX = Math.cos(rotation.x);
    const sinX = Math.sin(rotation.x);
    const cosY = Math.cos(rotation.y);
    const sinY = Math.sin(rotation.y);

    // Step 1: rotate around X (pitch)
    const rotX_y =  py * cosX - pz * sinX;
    const rotX_z =  py * sinX + pz * cosX;

    // Step 2: rotate around Y (yaw)
    const rotY_x =  px * cosY + rotX_z * sinY;
    const rotY_z = -px * sinY + rotX_z * cosY;

    // Step 3: perspective divide — depth-based scale factor
    const perspScale = PERSPECTIVE_DEPTH / (PERSPECTIVE_DEPTH + rotY_z);

    return {
        x: canvasWidth  / 2 + rotY_x * perspScale * scale,
        y: canvasHeight / 2 + rotX_y * perspScale * scale,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// COLOR UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

function adjustBrightness(hexColor, factor) {
    const hex = hexColor.replace('#', '');
    const r = Math.min(255, Math.round(parseInt(hex.substr(0, 2), 16) * factor));
    const g = Math.min(255, Math.round(parseInt(hex.substr(2, 2), 16) * factor));
    const b = Math.min(255, Math.round(parseInt(hex.substr(4, 2), 16) * factor));
    return `rgb(${r},${g},${b})`;
}

// ─────────────────────────────────────────────────────────────────────────────
// PYRAMID RENDERER
// Each tier is drawn as a square-base pyramid with 4 triangular side faces
// plus 1 square bottom face.  Faces are painter-sorted by their average Z
// depth so farther faces render first (back-to-front).
// ─────────────────────────────────────────────────────────────────────────────

function drawPyramid() {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    pyramidTiers.forEach((tier, index) => {
        const half = tier.base / 2;
        const baseY = tier.apexY + tier.tierHeight;

        // 5 vertices: 4 base corners + 1 apex
        const verts3D = [
            { x: -half, y: baseY, z: -half }, // 0 – front-left
            { x:  half, y: baseY, z: -half }, // 1 – front-right
            { x:  half, y: baseY, z:  half }, // 2 – back-right
            { x: -half, y: baseY, z:  half }, // 3 – back-left
            { x:     0, y: tier.apexY, z: 0 }, // 4 – apex
        ];

        const verts2D = verts3D.map(v => project3D(v.x, v.y, v.z));

        // Each face carries its average Z (in model space after rotation)
        // so we can sort back-to-front for correct overlap.
        const faces = [
            { pts: [0, 1, 4], avgZ: (verts3D[0].z + verts3D[1].z + verts3D[4].z) / 3 }, // front
            { pts: [1, 2, 4], avgZ: (verts3D[1].z + verts3D[2].z + verts3D[4].z) / 3 }, // right
            { pts: [2, 3, 4], avgZ: (verts3D[2].z + verts3D[3].z + verts3D[4].z) / 3 }, // back
            { pts: [3, 0, 4], avgZ: (verts3D[3].z + verts3D[0].z + verts3D[4].z) / 3 }, // left
            { pts: [0, 1, 2, 3], avgZ: verts3D[0].z },                                    // base
        ];

        faces.sort((a, b) => a.avgZ - b.avgZ); // painter's algorithm: far → near

        const isActive = index === currentLayer - 1;

        faces.forEach(face => {
            ctx.beginPath();
            ctx.moveTo(verts2D[face.pts[0]].x, verts2D[face.pts[0]].y);
            for (let i = 1; i < face.pts.length; i++) {
                ctx.lineTo(verts2D[face.pts[i]].x, verts2D[face.pts[i]].y);
            }
            ctx.closePath();

            ctx.fillStyle = adjustBrightness(tier.color, isActive ? BRIGHTNESS_ACTIVE : BRIGHTNESS_INACTIVE);
            ctx.fill();
            ctx.strokeStyle = isActive ? '#FFD700' : '#111';
            ctx.lineWidth = isActive ? 1.5 : 0.8;
            ctx.stroke();
        });
    });

    drawSparkles();
}

// ─────────────────────────────────────────────────────────────────────────────
// SPARKLES
// ─────────────────────────────────────────────────────────────────────────────

// Sparkle array — populated after canvas is sized (see bottom of file)
const sparkles = [];

function createSparkle() {
    return {
        x:       Math.random() * canvasWidth,
        y:       Math.random() * canvasHeight,
        size:    Math.random() * 2 + 0.5,
        speed:   Math.random() * 0.6 + 0.2,
        opacity: Math.random() * 0.5 + 0.2,
    };
}

function repositionSparkles() {
    // Resize sparkles array to 40 entries, regenerating any that are out of bounds
    while (sparkles.length < 40) sparkles.push(createSparkle());
    sparkles.forEach(s => {
        s.x = Math.random() * canvasWidth;
        s.y = Math.random() * canvasHeight;
    });
}

function drawSparkles() {
    sparkles.forEach(s => {
        ctx.fillStyle = `rgba(212,175,55,${s.opacity})`;
        ctx.fillRect(s.x, s.y, s.size, s.size);
        s.y += s.speed;
        if (s.y > canvasHeight) {
            s.y = 0;
            s.x = Math.random() * canvasWidth;
        }
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// MOUSE INTERACTION
// ─────────────────────────────────────────────────────────────────────────────

canvas.addEventListener('mousedown', e => {
    isDragging = true;
    lastPointer = { x: e.clientX, y: e.clientY };
    canvas.style.cursor = 'grabbing';
});

canvas.addEventListener('mousemove', e => {
    if (!isDragging) return;
    const dx = e.clientX - lastPointer.x;
    const dy = e.clientY - lastPointer.y;
    rotation.y += dx * 0.01;
    rotation.x += dy * 0.01;
    lastPointer = { x: e.clientX, y: e.clientY };
});

canvas.addEventListener('mouseup',    () => { isDragging = false; canvas.style.cursor = 'grab'; });
canvas.addEventListener('mouseleave', () => { isDragging = false; canvas.style.cursor = 'grab'; });
canvas.style.cursor = 'grab';

canvas.addEventListener('wheel', e => {
    e.preventDefault();
    scale += e.deltaY * -0.001;
    scale = Math.max(0.5, Math.min(2.5, scale));
}, { passive: false });

// ─────────────────────────────────────────────────────────────────────────────
// TOUCH INTERACTION (pinch-to-zoom + drag)
// ─────────────────────────────────────────────────────────────────────────────

let lastTouchDist = 0;

canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    if (e.touches.length === 1) {
        isDragging = true;
        lastPointer = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
        isDragging = false;
        lastTouchDist = Math.hypot(
            e.touches[1].clientX - e.touches[0].clientX,
            e.touches[1].clientY - e.touches[0].clientY
        );
    }
}, { passive: false });

canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    if (e.touches.length === 1 && isDragging) {
        const dx = e.touches[0].clientX - lastPointer.x;
        const dy = e.touches[0].clientY - lastPointer.y;
        rotation.y += dx * 0.01;
        rotation.x += dy * 0.01;
        lastPointer = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
        const dist = Math.hypot(
            e.touches[1].clientX - e.touches[0].clientX,
            e.touches[1].clientY - e.touches[0].clientY
        );
        scale += (dist - lastTouchDist) * 0.005;
        scale = Math.max(0.5, Math.min(2.5, scale));
        lastTouchDist = dist;
    }
}, { passive: false });

canvas.addEventListener('touchend', () => { isDragging = false; });

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLS
// ─────────────────────────────────────────────────────────────────────────────

const autoRotateBtn = document.getElementById('autoRotate');

autoRotateBtn.addEventListener('click', () => {
    autoRotateEnabled = !autoRotateEnabled;
    autoRotateBtn.textContent = autoRotateEnabled ? 'Stop Rotation' : 'Auto Rotate';
    autoRotateBtn.classList.toggle('active', autoRotateEnabled);
});

document.getElementById('resetView').addEventListener('click', () => {
    rotation = { x: 0.5, y: 0.5 };
    scale = 1;
    autoRotateEnabled = false;
    autoRotateBtn.textContent = 'Auto Rotate';
    autoRotateBtn.classList.remove('active');
});

// ─────────────────────────────────────────────────────────────────────────────
// TIER EXPLORER — sync canvas highlight with panel selection
// ─────────────────────────────────────────────────────────────────────────────

document.querySelectorAll('.layer-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.layer-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        currentLayer = parseInt(btn.dataset.layer, 10);

        document.querySelectorAll('.layer-detail').forEach(d => d.classList.remove('active'));
        document.querySelector(`.layer-detail[data-layer="${currentLayer}"]`).classList.add('active');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ANIMATION LOOP
// ─────────────────────────────────────────────────────────────────────────────

function animate() {
    if (autoRotateEnabled) {
        rotation.y += 0.008;
    }
    drawPyramid();
    requestAnimationFrame(animate);
}

// Initialise canvas size first, then start rendering
resizeCanvas();
animate();