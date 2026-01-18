// =============================
// 360° PRODUCT VIEWER
// =============================

const canvas = document.getElementById('viewer-canvas');
const ctx = canvas ? canvas.getContext('2d') : null;

if (canvas && ctx) {
    // Set canvas size
    function resizeCanvas() {
        const container = canvas.parentElement;
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        drawPyramid();
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Viewer state
    let rotation = 0;
    let autoRotating = true;
    let isDragging = false;
    let lastX = 0;
    let zoom = 1;
    
    // Draw 3D pyramid representation
    function drawPyramid() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const size = Math.min(canvas.width, canvas.height) * 0.4 * zoom;
        
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(rotation);
        
        // Draw pyramid layers with Art Deco styling
        const layers = [
            { width: size * 1.2, height: size * 0.3, color: '#B87333', y: size * 0.4 },
            { width: size * 0.9, height: size * 0.25, color: '#D4AF37', y: size * 0.15 },
            { width: size * 0.6, height: size * 0.2, color: '#008B8B', y: -size * 0.05 },
            { width: size * 0.3, height: size * 0.25, color: '#FFD700', y: -size * 0.3 }
        ];
        
        layers.forEach(layer => {
            // Draw 3D effect
            ctx.fillStyle = layer.color;
            ctx.beginPath();
            ctx.moveTo(-layer.width / 2, layer.y);
            ctx.lineTo(layer.width / 2, layer.y);
            ctx.lineTo(layer.width / 2, layer.y + layer.height);
            ctx.lineTo(-layer.width / 2, layer.y + layer.height);
            ctx.closePath();
            ctx.fill();
            
            // Add outline
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 3;
            ctx.stroke();
            
            // Add geometric Art Deco pattern
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 1;
            for (let i = 0; i < 5; i++) {
                const offset = (i - 2) * (layer.width / 10);
                ctx.beginPath();
                ctx.moveTo(offset, layer.y);
                ctx.lineTo(offset, layer.y + layer.height);
                ctx.stroke();
            }
        });
        
        ctx.restore();
        
        // Add sparkle effects
        drawSparkles(centerX, centerY, size);
    }
    
    function drawSparkles(x, y, size) {
        const sparkles = 8;
        const time = Date.now() * 0.001;
        
        for (let i = 0; i < sparkles; i++) {
            const angle = (i / sparkles) * Math.PI * 2 + time;
            const distance = size * 0.7;
            const sx = x + Math.cos(angle) * distance;
            const sy = y + Math.sin(angle) * distance;
            const sparkSize = 3 + Math.sin(time * 2 + i) * 2;
            
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.arc(sx, sy, sparkSize, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // Mouse/Touch controls
    canvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        lastX = e.clientX;
        autoRotating = false;
    });
    
    canvas.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const deltaX = e.clientX - lastX;
            rotation += deltaX * 0.01;
            lastX = e.clientX;
            drawPyramid();
        }
    });
    
    canvas.addEventListener('mouseup', () => {
        isDragging = false;
    });
    
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        zoom += e.deltaY * -0.001;
        zoom = Math.max(0.5, Math.min(2, zoom));
        drawPyramid();
    });
    
    // Control buttons
    document.getElementById('rotate-left')?.addEventListener('click', () => {
        rotation -= 0.5;
        drawPyramid();
    });
    
    document.getElementById('rotate-right')?.addEventListener('click', () => {
        rotation += 0.5;
        drawPyramid();
    });
    
    document.getElementById('auto-rotate')?.addEventListener('click', () => {
        autoRotating = !autoRotating;
    });
    
    // Auto-rotation animation
    function animate() {
        if (autoRotating && !isDragging) {
            rotation += 0.01;
            drawPyramid();
        }
        requestAnimationFrame(animate);
    }
    
    animate();
}

// =============================
// LAYER EXPLORER
// =============================

let currentLayer = 1;
const totalLayers = 4;

function updateLayerDisplay() {
    // Hide all layer info
    for (let i = 1; i <= totalLayers; i++) {
        const info = document.getElementById(`layer-${i}-info`);
        if (info) info.classList.add('hidden');
    }
    
    // Show current layer info
    const currentInfo = document.getElementById(`layer-${currentLayer}-info`);
    if (currentInfo) currentInfo.classList.remove('hidden');
    
    // Update pyramid visual
    document.querySelectorAll('.pyramid-layer').forEach(layer => {
        layer.classList.remove('active');
    });
    
    const activeLayer = document.querySelector(`[data-layer="${currentLayer}"]`);
    if (activeLayer) activeLayer.classList.add('active');
    
    // Update indicator
    const indicator = document.getElementById('layer-indicator');
    if (indicator) indicator.textContent = `Layer ${currentLayer} of ${totalLayers}`;
    
    // Update button states
    const prevBtn = document.getElementById('prev-layer');
    const nextBtn = document.getElementById('next-layer');
    
    if (prevBtn) prevBtn.disabled = currentLayer === 1;
    if (nextBtn) nextBtn.disabled = currentLayer === totalLayers;
}

// Layer navigation
document.getElementById('prev-layer')?.addEventListener('click', () => {
    if (currentLayer > 1) {
        currentLayer--;
        updateLayerDisplay();
    }
});

document.getElementById('next-layer')?.addEventListener('click', () => {
    if (currentLayer < totalLayers) {
        currentLayer++;
        updateLayerDisplay();
    }
});

// Click on pyramid layers
document.querySelectorAll('.pyramid-layer').forEach(layer => {
    layer.addEventListener('click', (e) => {
        const layerNum = parseInt(e.currentTarget.getAttribute('data-layer'));
        currentLayer = layerNum;
        updateLayerDisplay();
    });
});

// Initialize
updateLayerDisplay();

// =============================
// SCROLL & INTERACTION
// =============================

function scrollToViewer() {
    document.getElementById('viewer-section')?.scrollIntoView({ 
        behavior: 'smooth' 
    });
}

// Intersection Observer for animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, observerOptions);

document.querySelectorAll('.feature-card, .spec-item').forEach(el => {
    observer.observe(el);
});

// Console branding
console.log('%c🔶 Twisted Genius Art Deco Showcase 🔶', 
    'font-size: 20px; font-weight: bold; color: #B87333;');
console.log('%cInteractive showcase built with precision and passion', 
    'font-size: 12px; color: #008B8B;');
