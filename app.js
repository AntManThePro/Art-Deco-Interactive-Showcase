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
// True 3D square-base pyramid with teal panels, copper trim, interior shelves,
// chrome rods, mosaic accents, gold finial, and black decorative stand —
// matching the actual Twisted Genius product.
// ─────────────────────────────────────────────────────────────────────────────

const TEAL        = '#00B5AD';
const TEAL_DARK   = '#007A75';
const TEAL_LIGHT  = '#4DD9D2';
const COPPER      = '#B87333';
const COPPER_LITE = '#D4955A';
const GOLD        = '#D4AF37';
const CHROME      = '#C0C8D0';
const CHROME_DARK = '#8A9199';
const MOSAIC_1    = '#A8D8D4';
const MOSAIC_2    = '#E0E4E0';
const STAND_COLOR = '#1A1008';
const STAND_INLAY = '#6B4226';

// Pyramid geometry (model-space coordinates)
// True square-base pyramid: apex at top-center, 4 base corners form a square
const APEX_Y    = -170;
const BASE_Y    =   50;
const HALF_BASE =  130; // half-width of the square base (used for both x and z)

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

// Interior shelf Y positions — 4 shelves dividing the pyramid interior
const SHELF_YS = [
    APEX_Y + 50,   // Tier 1 shelf (peak area)
    APEX_Y + 100,  // Tier 2 shelf
    APEX_Y + 150,  // Tier 3 shelf
    BASE_Y - 10,   // Tier 4 shelf (bottom)
];

// Helper: lerp X extent at a given Y along the pyramid slope
function slopeX(y) {
    const t = (y - APEX_Y) / (BASE_Y - APEX_Y);
    return HALF_BASE * t;
}

// Helper: fill & stroke a projected polygon
function drawFace(verts3D, fillColor, strokeColor, lineWidth) {
    const pts = verts3D.map(v => project3D(v.x, v.y, v.z));
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    if (fillColor) { ctx.fillStyle = fillColor; ctx.fill(); }
    if (strokeColor) { ctx.strokeStyle = strokeColor; ctx.lineWidth = lineWidth || 1; ctx.stroke(); }
}

// Helper: draw a projected line
function drawEdge(a, b, color, width) {
    const pa = project3D(a.x, a.y, a.z);
    const pb = project3D(b.x, b.y, b.z);
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = width || 1;
    ctx.stroke();
}

// Draw mosaic tile squares along an edge
function drawMosaicStrip(y, z, xFrom, xTo, tileCount) {
    const tileW = (xTo - xFrom) / tileCount;
    for (let i = 0; i < tileCount; i++) {
        const x0 = xFrom + i * tileW;
        const col = i % 2 === 0 ? MOSAIC_1 : MOSAIC_2;
        drawFace(
            [
                { x: x0,          y: y,      z },
                { x: x0 + tileW,  y: y,      z },
                { x: x0 + tileW,  y: y + 6,  z },
                { x: x0,          y: y + 6,  z },
            ],
            col, COPPER, 0.5
        );
    }
}

// Draw interior chrome rods (bracelet / necklace holders)
function drawRods(shelfY, count, z) {
    const halfW = slopeX(shelfY) * 0.7;
    const rodSpacing = (halfW * 2) / (count + 1);
    for (let i = 1; i <= count; i++) {
        const rx = -halfW + i * rodSpacing;
        const topY = shelfY - 22;
        const botY = shelfY - 2;
        // Cylindrical rod (simple rectangle in projection)
        drawFace(
            [
                { x: rx - 3, y: topY, z },
                { x: rx + 3, y: topY, z },
                { x: rx + 3, y: botY, z },
                { x: rx - 3, y: botY, z },
            ],
            CHROME, CHROME_DARK, 0.5
        );
        // Highlight stripe
        drawEdge(
            { x: rx, y: topY + 1, z },
            { x: rx, y: botY - 1, z },
            '#E8EEF0', 1
        );
    }
}

// Draw gold finial at the apex (visible from multiple angles)
function drawFinial() {
    const fTop = APEX_Y - 18;
    const fBot = APEX_Y;
    // Draw finial from two perpendicular planes so it's visible from any angle
    [0, HALF_BASE * 0.04].forEach(fz => {
        // Small lantern body
        drawFace(
            [
                { x: -5, y: fBot, z: fz },
                { x:  5, y: fBot, z: fz },
                { x:  3, y: fTop + 8, z: fz },
                { x: -3, y: fTop + 8, z: fz },
            ],
            GOLD, COPPER, 1
        );
        // Pointed spire
        drawFace(
            [
                { x: -3, y: fTop + 8, z: fz },
                { x:  3, y: fTop + 8, z: fz },
                { x:  0, y: fTop, z: fz },
            ],
            GOLD, COPPER, 1
        );
    });
    // Cross-plane finial (perpendicular)
    [0].forEach(fx => {
        drawFace(
            [
                { x: fx, y: fBot, z: -5 },
                { x: fx, y: fBot, z:  5 },
                { x: fx, y: fTop + 8, z:  3 },
                { x: fx, y: fTop + 8, z: -3 },
            ],
            GOLD, COPPER, 1
        );
        drawFace(
            [
                { x: fx, y: fTop + 8, z: -3 },
                { x: fx, y: fTop + 8, z:  3 },
                { x: fx, y: fTop, z: 0 },
            ],
            GOLD, COPPER, 1
        );
    });
}

// Draw stand (black base with decorative 3D legs)
function drawStand() {
    const stTop   = BASE_Y;
    const stBot   = BASE_Y + 70;
    const stMid   = BASE_Y + 35;
    const legW    = 8;
    const legSpread = 60;
    const standDepth = HALF_BASE * 0.4;

    // Front legs
    // Left front leg
    drawFace(
        [
            { x: -50, y: stTop, z: -standDepth },
            { x: -50 + legW, y: stTop, z: -standDepth },
            { x: -legSpread + legW, y: stBot, z: -standDepth },
            { x: -legSpread, y: stBot, z: -standDepth },
        ],
        STAND_COLOR, STAND_INLAY, 1.5
    );
    // Right front leg
    drawFace(
        [
            { x: 50 - legW, y: stTop, z: -standDepth },
            { x: 50, y: stTop, z: -standDepth },
            { x: legSpread, y: stBot, z: -standDepth },
            { x: legSpread - legW, y: stBot, z: -standDepth },
        ],
        STAND_COLOR, STAND_INLAY, 1.5
    );
    // Back legs
    drawFace(
        [
            { x: -50, y: stTop, z: standDepth },
            { x: -50 + legW, y: stTop, z: standDepth },
            { x: -legSpread + legW, y: stBot, z: standDepth },
            { x: -legSpread, y: stBot, z: standDepth },
        ],
        STAND_COLOR, STAND_INLAY, 1.5
    );
    drawFace(
        [
            { x: 50 - legW, y: stTop, z: standDepth },
            { x: 50, y: stTop, z: standDepth },
            { x: legSpread, y: stBot, z: standDepth },
            { x: legSpread - legW, y: stBot, z: standDepth },
        ],
        STAND_COLOR, STAND_INLAY, 1.5
    );
    // Front cross bar
    drawFace(
        [
            { x: -40, y: stMid - 3, z: -standDepth },
            { x:  40, y: stMid - 3, z: -standDepth },
            { x:  40, y: stMid + 3, z: -standDepth },
            { x: -40, y: stMid + 3, z: -standDepth },
        ],
        STAND_COLOR, STAND_INLAY, 1
    );
    // Back cross bar
    drawFace(
        [
            { x: -40, y: stMid - 3, z: standDepth },
            { x:  40, y: stMid - 3, z: standDepth },
            { x:  40, y: stMid + 3, z: standDepth },
            { x: -40, y: stMid + 3, z: standDepth },
        ],
        STAND_COLOR, STAND_INLAY, 1
    );
    // Top platform (3D rectangle connecting front and back)
    drawFace(
        [
            { x: -55, y: stTop - 2, z: -standDepth },
            { x:  55, y: stTop - 2, z: -standDepth },
            { x:  55, y: stTop - 2, z:  standDepth },
            { x: -55, y: stTop - 2, z:  standDepth },
        ],
        STAND_COLOR, STAND_INLAY, 1
    );
    // Decorative curl at bottom of front legs
    [-legSpread + 4, legSpread - 4].forEach(cx => {
        const cp = project3D(cx, stBot, -standDepth);
        ctx.beginPath();
        ctx.arc(cp.x, cp.y, 5 * scale, 0, Math.PI * 2);
        ctx.fillStyle = STAND_INLAY;
        ctx.fill();
    });
}

function drawPyramid() {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    const cosX = Math.cos(rotation.x);
    const sinX = Math.sin(rotation.x);
    const cosY = Math.cos(rotation.y);
    const sinY = Math.sin(rotation.y);

    // ── 5 vertices of a true square-base pyramid ──
    const apex = { x: 0, y: APEX_Y, z: 0 };
    const bl   = { x: -HALF_BASE, y: BASE_Y, z: -HALF_BASE }; // front-left
    const br   = { x:  HALF_BASE, y: BASE_Y, z: -HALF_BASE }; // front-right
    const tr   = { x:  HALF_BASE, y: BASE_Y, z:  HALF_BASE }; // back-right
    const tl   = { x: -HALF_BASE, y: BASE_Y, z:  HALF_BASE }; // back-left

    // Helper: compute average rotated-Z for a set of verts (for depth sorting)
    function avgRotZ(verts) {
        let sum = 0;
        verts.forEach(v => {
            const rz0 = v.y * sinX + v.z * cosX;
            sum += -v.x * sinY + rz0 * cosY;
        });
        return sum / verts.length;
    }

    // ── Build the 5 faces ──
    const faceList = [
        { verts: [apex, bl, br], color: TEAL,       label: 'front' },  // front
        { verts: [apex, br, tr], color: TEAL_DARK,   label: 'right' },  // right
        { verts: [apex, tr, tl], color: TEAL,        label: 'back'  },  // back
        { verts: [apex, tl, bl], color: TEAL_DARK,   label: 'left'  },  // left
        { verts: [bl, br, tr, tl], color: '#0A0A0A', label: 'bottom' }, // base
    ];

    // Depth-sort far → near (painter's algorithm)
    faceList.forEach(f => { f.avgZ = avgRotZ(f.verts); });
    faceList.sort((a, b) => a.avgZ - b.avgZ);

    // ── Draw each face ──
    faceList.forEach(f => {
        const isFront = f.label === 'front';
        let fillColor = f.color;

        // Tint the active-tier face slightly brighter
        if (f.label !== 'bottom') {
            // Determine which tier region the "front" face is in
            // (we shade all opaque faces the same, interior detail only on front)
        }

        if (isFront) {
            // Semi-transparent so interior is visible
            fillColor = 'rgba(0, 181, 173, 0.22)';
        }

        drawFace(f.verts, fillColor, COPPER, 2.5);

        // ── Interior detail on the front face ──
        if (isFront) {
            // Place interior elements on a plane slightly behind the front face
            const izFront = -HALF_BASE * 0.35;

            SHELF_YS.forEach((sy, idx) => {
                const shelfHalf = slopeX(sy) * 0.85;
                const isActive  = (idx + 1) === currentLayer;

                // Shelf platform (3D rectangle in interior plane)
                const shelfColor = isActive ? '#FFD700' : 'rgba(180,180,180,0.4)';
                drawFace(
                    [
                        { x: -shelfHalf, y: sy,     z: izFront },
                        { x:  shelfHalf, y: sy,     z: izFront },
                        { x:  shelfHalf, y: sy + 4, z: izFront },
                        { x: -shelfHalf, y: sy + 4, z: izFront },
                    ],
                    shelfColor, COPPER_LITE, 1
                );

                // Chrome rods on shelf
                const rodCount = Math.max(2, 2 + idx);
                drawRods(sy, rodCount, izFront);

                // Mosaic tiles beneath shelf
                if (idx < SHELF_YS.length - 1) {
                    drawMosaicStrip(sy + 5, izFront, -shelfHalf * 0.3, shelfHalf * 0.3, 4 + idx);
                }
            });

            // Central vertical spine
            drawEdge(
                { x: 0, y: APEX_Y + 30, z: izFront },
                { x: 0, y: BASE_Y - 5,  z: izFront },
                COPPER, 2
            );
        }
    });

    // ── Copper trim along all edges ──
    const corners = [bl, br, tr, tl];
    corners.forEach(c => drawEdge(apex, c, COPPER, 2.5));
    for (let i = 0; i < 4; i++) drawEdge(corners[i], corners[(i + 1) % 4], COPPER, 2.5);

    // ── Gold finial at the apex ──
    drawFinial();

    // ── Black decorative stand underneath ──
    drawStand();

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