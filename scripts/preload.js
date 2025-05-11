class AssetPreloader {
    constructor() {
        this.totalAssets = 0;
        this.loadedAssets = 0;
        this.assets = [];
        this.fileExtensions = ['.wav', '.mp3', '.mp4', 'ogg', '.jpg', '.jpeg', '.png', '.svg'];
        this.preloaderUI = null;
        this.loadingContainer = null;
        this.startButton = null;
        this.loadingText = null;
        this.segments = [];
        this.segmentWidth = 30; // Match the CSS width
        this.lastSegmentTime = 0;
    }

    async init() {
        this.createPreloaderUI();
        await this.scanAssets();
        await this.preloadAssets();
    }

    createPreloaderUI() {
        const template = `
            <div class="preloader">
                <div class="loading-container"></div>
                <div class="loading-text">Loading...</div>
                <button class="start-button" style="display: none;">Iniciar</button>
            </div>
        `;

        document.body.insertAdjacentHTML('afterbegin', template);

        this.preloaderUI = document.querySelector('.preloader');
        this.loadingContainer = document.querySelector('.loading-container');
        this.loadingText = document.querySelector('.loading-text');
        this.startButton = document.querySelector('.start-button');

        this.startButton.addEventListener('click', () => {
            this.preloaderUI.style.display = 'none';
            initCourse();
        });
    }


    createLoadingSegment(position) {
        const now = Date.now();
        // Ensure minimum time between segments
        if (now - this.lastSegmentTime < 200) return;
        
        const segment = document.createElement('div');
        segment.className = 'loading-segment';
        segment.style.left = `${position}px`;
        this.loadingContainer.appendChild(segment);
        
        // Force reflow to ensure animation plays
        segment.offsetHeight;
        
        // Remove segment after animation
        segment.addEventListener('animationend', () => {
            segment.remove();
        });

        this.lastSegmentTime = now;
        return segment;
    }

    async scanAssets() {
        // Lista manualmente os arquivos conhecidos no assetsGeral
        const knownAssets = ['screens/assetsGeral/trilha-sonora.wav'];
        this.assets.push(...knownAssets);
        
        // Escaneia as pastas das telas
        for (let i = 1; i <= 21; i++) {
            const folderPath = `screens/${i}`;
            try {
                if (i === 1) {
                    this.assets.push(`${folderPath}/bg.jpg`);
                }
            } catch (error) {
                console.log(`No assets found in ${folderPath}`);
            }
        }

        this.totalAssets = this.assets.length;
        console.log('Assets to preload:', this.assets);
    }

    updateProgress() {
        const progress = Math.round((this.loadedAssets / this.totalAssets) * 100);
        const containerWidth = this.loadingContainer.offsetWidth;
        const position = (progress / 100) * containerWidth;
        
        // Create new segment
        this.createLoadingSegment(position - this.segmentWidth);

        // Also create some additional segments for visual effect
        if (Math.random() > 0.7) {
            this.createLoadingSegment(position - this.segmentWidth * 2);
        }

        if (this.loadedAssets === this.totalAssets) {
            // Create final segments for completion effect
            const createFinalSegments = () => {
                for (let i = 0; i < 3; i++) {
                    setTimeout(() => {
                        this.createLoadingSegment(containerWidth - this.segmentWidth * (i + 1));
                    }, i * 200);
                }
            };

            createFinalSegments();
            
            // Start fade out sequence
            setTimeout(() => {
                // Fade out loading bar and text
                this.loadingContainer.classList.add('fade-out');
                this.loadingText.classList.add('fade-out');
                
                // After fade out is complete, show start button with fade in
                setTimeout(() => {
                    this.loadingContainer.style.display = 'none';
                    this.loadingText.style.display = 'none';
                    this.startButton.style.display = 'block';
                    
                    // Small delay to ensure display: block has taken effect
                    requestAnimationFrame(() => {
                        this.startButton.classList.add('fade-in');
                    });
                }, 800); // Match the CSS transition duration
            }, 1500); // Wait for final segments animation
        }
    }

    preloadAsset(url) {
        return new Promise((resolve, reject) => {
            const ext = url.toLowerCase().split('.').pop();
            
            if (['jpg', 'jpeg', 'png', 'svg'].includes(ext)) {
                const img = new Image();
                img.onload = () => {
                    this.loadedAssets++;
                    this.updateProgress();
                    resolve();
                };
                img.onerror = (error) => {
                    console.error(`Failed to load image: ${url}`, error);
                    this.loadedAssets++;
                    this.updateProgress();
                    resolve();
                };
                img.src = url;
            } else if (['wav', 'mp3'].includes(ext)) {
                const audio = new Audio();
                audio.oncanplaythrough = () => {
                    this.loadedAssets++;
                    this.updateProgress();
                    resolve();
                };
                audio.onerror = (error) => {
                    console.error(`Failed to load audio: ${url}`, error);
                    this.loadedAssets++;
                    this.updateProgress();
                    resolve();
                };
                audio.src = url;
            } else if (ext === 'mp4') {
                const video = document.createElement('video');
                video.oncanplaythrough = () => {
                    this.loadedAssets++;
                    this.updateProgress();
                    resolve();
                };
                video.onerror = (error) => {
                    console.error(`Failed to load video: ${url}`, error);
                    this.loadedAssets++;
                    this.updateProgress();
                    resolve();
                };
                video.src = url;
            }
        });
    }

    async preloadAssets() {
        const preloadPromises = this.assets.map(asset => this.preloadAsset(asset));
        await Promise.all(preloadPromises);
    }
}

// Initialize preloader
const preloader = new AssetPreloader();
document.addEventListener('DOMContentLoaded', () => preloader.init());