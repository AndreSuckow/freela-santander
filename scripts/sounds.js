// Audio Configuration
const AUDIO_CONFIG = {
    src: 'screens/assetsGeral/trilha-sonora.wav',
    volume: 0.03,
    startAtScreen: 1, // Em qual tela o áudio deve começar
    loop: true,
    loopDelay: 30000, // Tempo em ms para reiniciar após terminar (30 segundos)
};

class SoundManager {
    constructor() {
        if (window.soundManagerInstance) {
            console.log('🚫 SoundManager já existe - retornando instância existente');
            return window.soundManagerInstance;
        }

        this.audio = new Audio();
        this.audio.src = AUDIO_CONFIG.src;
        this.audio.volume = AUDIO_CONFIG.volume;
        this.isPlaying = false;
        this.audioId = Math.random().toString(36).substring(7);
        this.lastStartAttempt = 0;
        console.log(`[Sound ${this.audioId}] 🎵 SoundManager inicializado com config:`, AUDIO_CONFIG);
        this.setupEventListeners();

        window.soundManagerInstance = this;
        return this;
    }

    setupEventListeners() {
        this.audio.addEventListener('play', () => {
            console.log(`[Sound ${this.audioId}] ▶️ Áudio começou a tocar em:`, this.audio.currentTime.toFixed(2));
            this.isPlaying = true;
        });

        this.audio.addEventListener('timeupdate', () => {
            if (Math.floor(this.audio.currentTime) % 5 === 0 && this.audio.currentTime > 0) {
                console.log(`[Sound ${this.audioId}] 🎵 Tocando em:`, this.audio.currentTime.toFixed(2));
            }
        });

        this.audio.addEventListener('ended', () => {
            console.log(`[Sound ${this.audioId}] ⏹️ Áudio terminou`);
            this.isPlaying = false;
            
            if (AUDIO_CONFIG.loop && currentSectionIndex >= AUDIO_CONFIG.startAtScreen) {
                console.log(`[Sound ${this.audioId}] ⏳ Aguardando ${AUDIO_CONFIG.loopDelay/1000}s para reiniciar...`);
                setTimeout(() => {
                    if (currentSectionIndex >= AUDIO_CONFIG.startAtScreen) {
                        console.log(`[Sound ${this.audioId}] 🔄 Tentando reiniciar após delay`);
                        this.play();
                    }
                }, AUDIO_CONFIG.loopDelay);
            }
        });

        this.audio.addEventListener('pause', () => {
            console.log(`[Sound ${this.audioId}] ⏸️ Áudio pausado em:`, this.audio.currentTime.toFixed(2));
            this.isPlaying = false;
        });

        this.audio.addEventListener('error', (e) => {
            console.error(`[Sound ${this.audioId}] ❌ Erro no áudio:`, e.target.error);
            this.isPlaying = false;
        });
    }

    play() {
        // Evita múltiplas tentativas em um curto período
        const now = Date.now();
        if (now - this.lastStartAttempt < 1000) {
            console.log(`[Sound ${this.audioId}] 🚫 Tentativa muito rápida de iniciar áudio`);
            return;
        }
        this.lastStartAttempt = now;

        // Verifica se já está tocando
        if (this.isPlaying) {
            console.log(`[Sound ${this.audioId}] ℹ️ Áudio já está tocando em:`, this.audio.currentTime.toFixed(2));
            return;
        }

        // Verifica se o áudio está pronto
        if (this.audio.readyState < 3) {
            console.log(`[Sound ${this.audioId}] ⏳ Áudio ainda não está pronto`);
            return;
        }

        console.log(`[Sound ${this.audioId}] 🎯 Tentando tocar áudio...`);
        
        // Para qualquer outra instância que esteja tocando
        if (window.currentPlayingAudio && window.currentPlayingAudio !== this.audio) {
            console.warn(`[Sound ${this.audioId}] ⚠️ Parando outra instância de áudio`);
            window.currentPlayingAudio.pause();
            window.currentPlayingAudio.currentTime = 0;
        }

        // Reseta o áudio se já estava tocando antes
        if (this.audio.currentTime > 0) {
            this.audio.currentTime = 0;
        }

        this.audio.play()
            .then(() => {
                window.currentPlayingAudio = this.audio;
                console.log(`[Sound ${this.audioId}] ✨ Áudio iniciado com sucesso`);
            })
            .catch(error => {
                console.error(`[Sound ${this.audioId}] ❌ Erro ao tocar áudio:`, error);
                this.isPlaying = false;
            });
    }

    stop() {
        if (this.isPlaying) {
            console.log(`[Sound ${this.audioId}] 🛑 Parando áudio em:`, this.audio.currentTime.toFixed(2));
            this.audio.pause();
            this.audio.currentTime = 0;
            this.isPlaying = false;
            if (window.currentPlayingAudio === this.audio) {
                window.currentPlayingAudio = null;
            }
        }
    }

    // Método para atualizar configurações em tempo real
    updateConfig(newConfig) {
        const updates = { ...AUDIO_CONFIG, ...newConfig };
        
        this.audio.src = updates.src;
        this.audio.volume = updates.volume;
        
        console.log(`[Sound ${this.audioId}] 🔄 Configurações atualizadas:`, updates);
        
        // Se estiver tocando, reinicia com as novas configurações
        const wasPlaying = this.isPlaying;
        if (wasPlaying) {
            this.stop();
            this.play();
        }
    }
}

// Track current playing audio globally
window.currentPlayingAudio = null;

// Create global instance
const soundManager = new SoundManager();

// Function to be called when navigation occurs
function handleScreenChange(screenIndex) {
    console.log(`[Navigation] 🔄 Tela alterada para ${screenIndex + 1}`);
    
    // Ensure we're using the singleton instance
    const manager = window.soundManagerInstance || soundManager;
    
    if (screenIndex >= AUDIO_CONFIG.startAtScreen) {
        console.log(`[Navigation] 🎵 Verificando áudio para tela ${screenIndex + 1}`);
        manager.play();
    } else {
        console.log(`[Navigation] 🔇 Parando áudio para tela ${screenIndex + 1}`);
        manager.stop();
    }
}

// Export for global access
window.soundManager = soundManager;
window.handleScreenChange = handleScreenChange;
window.AUDIO_CONFIG = AUDIO_CONFIG;