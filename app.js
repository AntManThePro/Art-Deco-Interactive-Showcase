// ==========================================
// 360 PRODUCT VIEWER
// ==========================================

class Product360Viewer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');
        this.rotation = 0;
        this.autoRotating = false;
        this.isDragging = false;
        this.lastX = 0;
        this.scale = 1;

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.render();
        this.setupControls();
    }

    setupEventListeners() {
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.startDrag(e));
        this.canvas.addEventListener('mousemove', (e) => this.drag(e));
        this.canvas.addEventListener('mouseup', () => this.endDrag());
        this.canvas.addEventListener('mouseleave', () => this.endDrag());

        // Touch events
        this.canvas.addEventListener('touchstart', (e) => this.startDrag(e.touches[0]));
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this.drag(e.touches[0]);
        });
        this.canvas.addEventListener('touchend', () => this.endDrag());

        // Zoom
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.scale += e.deltaY * -0.001;
            this.scale = Math.min(Math.max(0.5, this.scale), 2);
            this.render();
        });
    }

    startDrag(e) {
        this.isDragging = true;
        this.lastX = e.clientX;
        this.autoRotating = false;
    }

    drag(e) {
        if (!this.isDragging) return;
        
        const deltaX = e.clientX - this.lastX;
        this.rotation += deltaX * 0.01;
        this.lastX = e.clientX;
        this.render();
    }

    endDrag() {
        this.isDragging = false;
    }

    setupControls() {
        const rotateLeft = document.getElementById('rotateLeft');
        const rotateRight = document.getElementById('rotateRight');
        const autoRotate = document.getElementById('autoRotate');

        if (rotateLeft) {
            rotateLeft.addEventListener('click', () => {
                this.rotation -= 0.5;
                this.render();
            });
        }

        if (rotateRight) {
            rotateRight.addEventListener('click', () => {
                this.rotation += 0.5;
                this.render();
            });
        }

        if (autoRotate) {
            autoRotate.addEventListener('click', () => {
                this.autoRotating = !this.autoRotating;
                autoRotate.textContent = this.autoRotating ? 'Stop Rotation' : 'Auto Rotate';
                if (this.autoRotating) {
                    this.animate();
                }
            });
        }
    }

    animate() {
        if (!this.autoRotating) return;
        
        this.rotation += 0.02;
        this.render();
        requestAnimationFrame(() => this.animate());
    }

    render() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        const centerX = w / 2;
        const centerY = h / 2;

        // Clear canvas
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(0, 0, w, h);

        // Save context
        this.ctx.save();
        this.ctx.translate(centerX, centerY);
        this.ctx.scale(this.scale, this.scale);
        this.ctx.rotate(this.rotation);

        // Draw pyramid jewelry box (simplified 3D representation)
        this.drawPyramid();

        this.ctx.restore();
    }

    drawPyramid() {
        const colors = {
            copper: '#B87333',
            copperLight: '#D4915A',
            copperDark: '#8B5A2B',
            teal: '#008B8B',
            tealLight: '#20B2AA',
            gold: '#FFD700'
        };

        // Base (largest tier)
        this.drawTier(-120, 100, 240, 80, colors.copperDark, colors.copper);

        // Third tier
        this.drawTier(-90, 20, 180, 80, colors.copper, colors.copperLight);

        // Second tier
        this.drawTier(-60, -60, 120, 80, colors.teal, colors.tealLight);

        // Top tier
        this.drawTier(-30, -140, 60, 60, colors.gold, colors.copperLight);

        // Add decorative elements
        this.addGeometricDetails();
    }

    drawTier(x, y, width, height, color1, color2) {
        // Create gradient
        const gradient = this.ctx.createLinearGradient(x, y, x + width, y + height);
        gradient.addColorStop(0, color1);
        gradient.addColorStop(1, color2);

        // Draw tier
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(x, y, width, height);

        // Add border
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, width, height);

        // Add highlights
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x + 5, y + 5, width - 10, height - 10);
    }

    addGeometricDetails() {
        this.ctx.strokeStyle = '#FFD700';
        this.ctx.lineWidth = 2;
        
        // Art Deco geometric patterns
        for (let i = 0; i < 4; i++) {
            const angle = (Math.PI * 2 * i) / 4;
            const x = Math.cos(angle) * 80;
            const y = Math.sin(angle) * 80;
            
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.lineTo(x, y);
            this.ctx.stroke();
        }
    }
}

// ==========================================
// LAYER EXPLORER
// ==========================================

class LayerExplorer {
    constructor() {
        this.currentLayer = 0;
        this.totalLayers = 4;
        this.init();
    }

    init() {
        this.setupLayerClicks();
        this.setupNavigation();
    }

    setupLayerClicks() {
        const layers = document.querySelectorAll('.layer-piece');
        layers.forEach((layer, index) => {
            layer.addEventListener('click', () => this.goToLayer(index));
        });
    }

    setupNavigation() {
        const prevBtn = document.querySelector('[data-nav="prev"]');
        const nextBtn = document.querySelector('[data-nav="next"]');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                this.goToLayer((this.currentLayer - 1 + this.totalLayers) % this.totalLayers);
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.goToLayer((this.currentLayer + 1) % this.totalLayers);
            });
        }
    }

    goToLayer(index) {
        this.currentLayer = index;
        this.updateDisplay();
    }

    updateDisplay() {
        // Update layer pieces
        const layers = document.querySelectorAll('.layer-piece');
        layers.forEach((layer, index) => {
            layer.classList.toggle('active', index === this.currentLayer);
        });

        // Update detail cards
        const details = document.querySelectorAll('.detail-card');
        details.forEach((detail, index) => {
            detail.classList.toggle('active', index === this.currentLayer);
        });

        // Update indicators
        const dots = document.querySelectorAll('.dot');
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === this.currentLayer);
        });
    }
}

// ==========================================
// SCROLL ANIMATIONS
// ==========================================

class ScrollAnimations {
    constructor() {
        this.init();
    }

    init() {
        this.observeElements();
    }

    observeElements() {
        const options = {
            threshold: 0.2,
            rootMargin: '0px 0px -100px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, options);

        const elements = document.querySelectorAll('.feature-card, .spec-item');
        elements.forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(30px)';
            el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            observer.observe(el);
        });
    }
}

// ==========================================
// CTA BUTTON INTERACTION
// ==========================================

function setupCTA() {
    const ctaButton = document.querySelector('.cta-button');
    if (ctaButton) {
        ctaButton.addEventListener('click', () => {
            // Replace with actual e-commerce link
            alert('Reserve functionality - integrate with Squarespace Commerce or external checkout');
            // window.location.href = 'YOUR_CHECKOUT_URL';
        });
    }
}

// ==========================================
// INITIALIZE ON DOM LOAD
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // Initialize 360 viewer
    const viewer = new Product360Viewer('productCanvas');

    // Initialize layer explorer
    const explorer = new LayerExplorer();

    // Initialize scroll animations
    const scrollAnims = new ScrollAnimations();

    // Setup CTA
    setupCTA();

    console.log('🎨 Art Deco Interactive Showcase Initialized');
    console.log('✦ 360° Viewer: Ready');
    console.log('✦ Layer Explorer: Ready');
    console.log('✦ Animations: Active');
});