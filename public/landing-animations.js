/* ==========================================
   AUDIOFLOW LANDING ANIMATIONS
   ========================================== */

// Smooth scroll
function scrollToSection(id) {
    const element = document.getElementById(id);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function scrollToProcessor() {
    const processor = document.getElementById('processor');
    if (processor) {
        processor.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Sticky CTA visibility
const stickyCta = document.querySelector('.sticky-cta');
const processorSection = document.getElementById('processor');

if (stickyCta && processorSection) {
    window.addEventListener('scroll', () => {
        const processorRect = processorSection.getBoundingClientRect();
        const isProcessorVisible = processorRect.top <= window.innerHeight && processorRect.bottom >= 0;
        
        if (isProcessorVisible) {
            stickyCta.style.opacity = '0';
            stickyCta.style.pointerEvents = 'none';
        } else {
            stickyCta.style.opacity = '1';
            stickyCta.style.pointerEvents = 'all';
        }
    });
}

// Hero waveform animation
const canvas = document.getElementById('waveformCanvas');
if (canvas) {
    const ctx = canvas.getContext('2d');
    
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    let time = 0;
    function drawWaveform() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Multiple wave layers
        for (let layer = 0; layer < 5; layer++) {
            ctx.strokeStyle = `rgba(194, 140, 102, ${0.08 + layer * 0.02})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            
            for (let x = 0; x < canvas.width; x += 4) {
                const frequency = 0.008 + layer * 0.002;
                const amplitude = 25 + layer * 8;
                const phase = time * 0.5 + layer * 50;
                const y = canvas.height / 2 + Math.sin((x + phase) * frequency) * amplitude;
                
                if (x === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            
            ctx.stroke();
        }
        
        time += 1;
        requestAnimationFrame(drawWaveform);
    }
    
    drawWaveform();
}

// Mockup waveform
const mockupCanvas = document.getElementById('mockupWaveCanvas');
if (mockupCanvas) {
    const mockupCtx = mockupCanvas.getContext('2d');
    
    function drawMockupWave() {
        mockupCtx.clearRect(0, 0, mockupCanvas.width, mockupCanvas.height);
        
        // Create waveform bars
        const barCount = 120;
        const barWidth = mockupCanvas.width / barCount;
        
        for (let i = 0; i < barCount; i++) {
            const progress = i / barCount;
            
            // Create varying heights for natural waveform look
            const baseHeight = Math.sin(progress * Math.PI * 3) * 0.6 + 0.4;
            const randomness = Math.random() * 0.3;
            const height = (baseHeight + randomness) * mockupCanvas.height * 0.8;
            
            const x = i * barWidth;
            const y = (mockupCanvas.height - height) / 2;
            
            // Gradient based on position
            const alpha = progress < 0.45 ? 0.4 : 0.15;
            mockupCtx.fillStyle = `rgba(194, 140, 102, ${alpha})`;
            mockupCtx.fillRect(x, y, barWidth - 1, height);
        }
    }
    
    drawMockupWave();
}

// Effect cards wave animation on hover
const effectCards = document.querySelectorAll('.effect-card');
effectCards.forEach(card => {
    const waveCanvas = card.querySelector('.effect-wave');
    if (!waveCanvas) return;
    
    const ctx = waveCanvas.getContext('2d');
    const effect = card.dataset.effect;
    
    function drawEffectWave() {
        ctx.clearRect(0, 0, waveCanvas.width, waveCanvas.height);
        
        const barCount = 40;
        const barWidth = waveCanvas.width / barCount;
        
        for (let i = 0; i < barCount; i++) {
            let height;
            
            // Different wave patterns for different effects
            switch(effect) {
                case 'slowed':
                    height = Math.sin(i * 0.3) * 15 + 20;
                    break;
                case 'reverb':
                    height = Math.abs(Math.sin(i * 0.2) * Math.cos(i * 0.1)) * 30 + 10;
                    break;
                case 'daycore':
                    height = Math.sin(i * 0.25) * 18 + 18;
                    break;
                case 'nightcore':
                    height = Math.abs(Math.sin(i * 0.5)) * 25 + 15;
                    break;
                case '8d':
                    height = Math.sin(i * 0.4) * Math.cos(i * 0.2) * 20 + 20;
                    break;
                case 'vaporwave':
                    height = (Math.sin(i * 0.15) + Math.random() * 0.5) * 15 + 15;
                    break;
                default:
                    height = Math.random() * 30 + 10;
            }
            
            const x = i * barWidth;
            const y = (waveCanvas.height - height) / 2;
            
            ctx.fillStyle = 'rgba(194, 140, 102, 0.5)';
            ctx.fillRect(x, y, barWidth - 1, height);
        }
    }
    
    card.addEventListener('mouseenter', drawEffectWave);
});

// Example spectrum visualization
const spectrumCanvases = document.querySelectorAll('.spectrum-canvas');
spectrumCanvases.forEach((canvas, index) => {
    const ctx = canvas.getContext('2d');
    const isProcessed = canvas.classList.contains('processed');
    
    let animationId;
    let time = 0;
    
    function drawSpectrum() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const barCount = 60;
        const barWidth = canvas.width / barCount;
        
        for (let i = 0; i < barCount; i++) {
            const frequency = i / barCount;
            
            // Different spectrum for processed audio
            let height;
            if (isProcessed) {
                // More bass (left side) for slowed effect
                const bassBoost = Math.max(0, 1 - frequency * 2);
                height = (Math.sin(time * 0.05 + i * 0.2) * 0.5 + 0.5) * (30 + bassBoost * 20);
            } else {
                // Normal spectrum
                height = (Math.sin(time * 0.08 + i * 0.15) * 0.5 + 0.5) * 40;
            }
            
            const x = i * barWidth;
            const y = canvas.height - height;
            
            const gradient = ctx.createLinearGradient(x, y, x, canvas.height);
            if (isProcessed) {
                gradient.addColorStop(0, 'rgba(194, 140, 102, 0.6)');
                gradient.addColorStop(1, 'rgba(194, 140, 102, 0.2)');
            } else {
                gradient.addColorStop(0, 'rgba(194, 140, 102, 0.3)');
                gradient.addColorStop(1, 'rgba(194, 140, 102, 0.1)');
            }
            
            ctx.fillStyle = gradient;
            ctx.fillRect(x, y, barWidth - 1, height);
        }
        
        time += 1;
        animationId = requestAnimationFrame(drawSpectrum);
    }
    
    // Start animation when in viewport
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                drawSpectrum();
            } else {
                cancelAnimationFrame(animationId);
            }
        });
    });
    
    observer.observe(canvas);
});

// Parallax effect on scroll
const hero = document.querySelector('.hero-content');
if (hero) {
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const rate = scrolled * 0.5;
        hero.style.transform = `translateY(${rate}px)`;
    });
}

// Intersection observer for fade-in animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const fadeElements = document.querySelectorAll('.effect-card, .step, .example-card');
const fadeObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
            setTimeout(() => {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }, index * 100);
            fadeObserver.unobserve(entry.target);
        }
    });
}, observerOptions);

fadeElements.forEach(element => {
    element.style.opacity = '0';
    element.style.transform = 'translateY(20px)';
    element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    fadeObserver.observe(element);
});

// Knob interaction
const knobs = document.querySelectorAll('.knob-dial');
knobs.forEach(knob => {
    let rotation = 0;
    
    knob.addEventListener('mousedown', (e) => {
        const startY = e.clientY;
        const startRotation = rotation;
        
        function onMouseMove(e) {
            const deltaY = startY - e.clientY;
            rotation = startRotation + deltaY;
            rotation = Math.max(-135, Math.min(135, rotation));
            knob.style.transform = `rotate(${rotation}deg)`;
        }
        
        function onMouseUp() {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });
});

// Mockup play button animation
const mockupPlay = document.querySelector('.mockup-play');
if (mockupPlay) {
    let isPlaying = false;
    
    mockupPlay.addEventListener('click', () => {
        isPlaying = !isPlaying;
        
        if (isPlaying) {
            mockupPlay.innerHTML = `
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                </svg>
            `;
        } else {
            mockupPlay.innerHTML = `
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                </svg>
            `;
        }
    });
}

// Example vinyl play buttons
const examplePlays = document.querySelectorAll('.example-play');
examplePlays.forEach(btn => {
    btn.addEventListener('click', () => {
        const card = btn.closest('.example-card');
        const vinyl = card.querySelector('.vinyl-disc');
        const isPlaying = vinyl.style.animationPlayState === 'running';
        
        if (isPlaying) {
            vinyl.style.animationPlayState = 'paused';
            btn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                </svg>
            `;
        } else {
            vinyl.style.animationPlayState = 'running';
            btn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                </svg>
            `;
            
            // Reset other playing vinyls
            document.querySelectorAll('.vinyl-disc').forEach(otherVinyl => {
                if (otherVinyl !== vinyl) {
                    otherVinyl.style.animationPlayState = 'paused';
                }
            });
            
            document.querySelectorAll('.example-play').forEach(otherBtn => {
                if (otherBtn !== btn) {
                    otherBtn.innerHTML = `
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z"/>
                        </svg>
                    `;
                }
            });
        }
    });
});

// Load presets dynamically
async function loadPresets() {
    try {
        const response = await fetch('/api/presets');
        const presets = await response.json();
        
        const select = document.getElementById('presetSelect');
        if (select) {
            select.innerHTML = '<option value="">Selecione um preset</option>';
            presets.forEach(preset => {
                const option = document.createElement('option');
                option.value = preset.name;
                option.textContent = preset.name.toUpperCase();
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading presets:', error);
        const select = document.getElementById('presetSelect');
        if (select) {
            select.innerHTML = '<option value="">Erro ao carregar presets</option>';
        }
    }
}

// Process button handler
const processBtn = document.getElementById('processBtn');
if (processBtn) {
    processBtn.addEventListener('click', async () => {
        const urlInput = document.getElementById('youtubeUrl');
        const presetSelect = document.getElementById('presetSelect');
        const statusContainer = document.getElementById('statusContainer');
        const resultContainer = document.getElementById('resultContainer');
        
        const url = urlInput.value.trim();
        const preset = presetSelect.value;
        
        if (!url) {
            alert('Por favor, insira um URL do YouTube');
            return;
        }
        
        if (!preset) {
            alert('Por favor, selecione um preset');
            return;
        }
        
        // Show processing state
        processBtn.classList.add('processing');
        processBtn.disabled = true;
        statusContainer.style.display = 'block';
        resultContainer.style.display = 'none';
        
        try {
            const response = await fetch('/api/process', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url, preset }),
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Show result
                statusContainer.style.display = 'none';
                resultContainer.style.display = 'block';
                
                const audioPlayer = document.getElementById('audioPlayer');
                const downloadBtn = document.getElementById('downloadBtn');
                
                audioPlayer.src = data.audioUrl;
                downloadBtn.href = data.audioUrl;
                downloadBtn.download = data.filename || 'audio.mp3';
            } else {
                throw new Error(data.message || 'Erro ao processar áudio');
            }
        } catch (error) {
            console.error('Error processing audio:', error);
            alert('Erro ao processar áudio. Por favor, tente novamente.');
            statusContainer.style.display = 'none';
        } finally {
            processBtn.classList.remove('processing');
            processBtn.disabled = false;
        }
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadPresets();
    
    // Add smooth reveal on page load
    document.body.style.opacity = '0';
    setTimeout(() => {
        document.body.style.transition = 'opacity 0.6s ease';
        document.body.style.opacity = '1';
    }, 100);
});

console.log('🎵 AudioFlow Landing - Initialized');
