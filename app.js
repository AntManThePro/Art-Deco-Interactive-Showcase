const canvas = document.getElementById('pyramidCanvas');
const ctx = canvas.getContext('2d');

let width, height;
let rotation = { x: 0.5, y: 0.5 };
let scale = 1;
let isDragging = false;
let lastMouse = { x: 0, y: 0 };
let autoRotateEnabled = false;
let currentLayer = 1;

function resizeCanvas() {
    width = canvas.offsetWidth;
    height = canvas.offsetHeight;
    canvas.width = width;
    canvas.height = height;
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const pyramid = {
    tiers: [
        { base: 80, height: 60, color: '#B87333', y: -120 },
        { base: 140, height: 50, color: '#D4AF37', y: -60 },
        { base: 200, height: 50, color: '#008B8B', y: -10 },
        { base: 260, height: 40, color: '#A0522D', y: 40 }
    ]
};

function project3D(x, y, z) {
    const cosX = Math.cos(rotation.x);
    const sinX = Math.sin(rotation.x);
    const cosY = Math.cos(rotation.y);
    const sinY = Math.sin(rotation.y);
    
    let y1 = y * cosX - z * sinX;
    let z1 = y * sinX + z * cosX;
    let x1 = x * cosY + z1 * sinY;
    let z2 = -x * sinY + z1 * cosY;
    
    const perspective = 400 / (400 + z2);
    return {
        x: width / 2 + x1 * perspective * scale,
        y: height / 2 + y1 * perspective * scale
    };
}

function drawPyramid() {
    ctx.clearRect(0, 0, width, height);
    
    pyramid.tiers.forEach((tier, index) => {
        const { base, height, color, y } = tier;
        const halfBase = base / 2;
        
        const corners = [
            { x: -halfBase, y: y + height, z: -halfBase },
            { x: halfBase, y: y + height, z: -halfBase },
            { x: halfBase, y: y + height, z: halfBase },
            { x: -halfBase, y: y + height, z: halfBase },
            { x: 0, y: y, z: 0 }
        ];
        
        const projected = corners.map(c => project3D(c.x, c.y, c.z));
        
        const faces = [
            { points: [0, 1, 4], z: (corners[0].z + corners[1].z + corners[4].z) / 3 },
            { points: [1, 2, 4], z: (corners[1].z + corners[2].z + corners[4].z) / 3 },
            { points: [2, 3, 4], z: (corners[2].z + corners[3].z + corners[4].z) / 3 },
            { points: [3, 0, 4], z: (corners[3].z + corners[0].z + corners[4].z) / 3 },
            { points: [0, 1, 2, 3], z: corners[0].z }
        ];
        
        faces.sort((a, b) => a.z - b.z);
        
        faces.forEach(face => {
            ctx.beginPath();
            ctx.moveTo(projected[face.points[0]].x, projected[face.points[0]].y);
            face.points.forEach(p => {
                ctx.lineTo(projected[p].x, projected[p].y);
            });
            ctx.closePath();
            
            const brightness = index === currentLayer - 1 ? 1.2 : 0.8;
            ctx.fillStyle = adjustBrightness(color, brightness);
            ctx.fill();
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;
            ctx.stroke();
        });
    });
    
    drawSparkles();
}

function adjustBrightness(color, factor) {
    const hex = color.replace('#', '');
    const r = Math.min(255, parseInt(hex.substr(0, 2), 16) * factor);
    const g = Math.min(255, parseInt(hex.substr(2, 2), 16) * factor);
    const b = Math.min(255, parseInt(hex.substr(4, 2), 16) * factor);
    return `rgb(${r}, ${g}, ${b})`;
}

const sparkles = Array.from({ length: 30 }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    size: Math.random() * 2 + 1,
    speed: Math.random() * 0.5 + 0.2
}));

function drawSparkles() {
    sparkles.forEach(s => {
        ctx.fillStyle = 'rgba(212, 175, 55, 0.6)';
        ctx.fillRect(s.x, s.y, s.size, s.size);
        s.y += s.speed;
        if (s.y > height) s.y = 0;
    });
}

canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    lastMouse = { x: e.clientX, y: e.clientY };
});

canvas.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - lastMouse.x;
    const dy = e.clientY - lastMouse.y;
    rotation.y += dx * 0.01;
    rotation.x += dy * 0.01;
    lastMouse = { x: e.clientX, y: e.clientY };
});

canvas.addEventListener('mouseup', () => isDragging = false);
canvas.addEventListener('mouseleave', () => isDragging = false);

canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    scale += e.deltaY * -0.001;
    scale = Math.max(0.5, Math.min(2, scale));
});

document.getElementById('autoRotate').addEventListener('click', () => {
    autoRotateEnabled = !autoRotateEnabled;
});

document.getElementById('resetView').addEventListener('click', () => {
    rotation = { x: 0.5, y: 0.5 };
    scale = 1;
});

document.querySelectorAll('.layer-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.layer-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const layer = parseInt(btn.dataset.layer);
        currentLayer = layer;
        
        document.querySelectorAll('.layer-detail').forEach(d => d.classList.remove('active'));
        document.querySelector(`.layer-detail[data-layer="${layer}"]`).classList.add('active');
    });
});

function animate() {
    if (autoRotateEnabled) {
        rotation.y += 0.01;
    }
    drawPyramid();
    requestAnimationFrame(animate);
}

animate();