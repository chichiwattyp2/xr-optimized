// voiceActivityDetector.js - Optimized voice activity detection
class VoiceActivityDetector {
    constructor(stream, options = {}) {
        this.stream = stream;
        
        // Configuration options
        this.config = {
            threshold: options.threshold || 0.01,
            smoothing: options.smoothing || 0.8,
            minSpeechFrames: options.minSpeechFrames || 5,
            minSilenceFrames: options.minSilenceFrames || 10,
            sampleRate: options.sampleRate || 16000,
            fftSize: options.fftSize || 512,
            frequencyRange: options.frequencyRange || [85, 3000] // Human speech range
        };
        
        // State tracking
        this.isActive = false;
        this.speechFrames = 0;
        this.silenceFrames = 0;
        this.monitoring = false;
        this.volumeHistory = new Array(10).fill(0);
        this.volumeIndex = 0;
        
        // Audio processing setup
        this.audioContext = null;
        this.analyser = null;
        this.source = null;
        this.dataArray = null;
        this.processor = null;
        
        // Callbacks
        this.callbacks = {
            onSpeechStart: () => {},
            onSpeechEnd: () => {},
            onVolumeChange: () => {},
            onError: () => {}
        };
        
        this.init();
    }
    
    async init() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: this.config.sampleRate,
                latencyHint: 'interactive'
            });
            
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = this.config.fftSize;
            this.analyser.smoothingTimeConstant = this.config.smoothing;
            this.analyser.minDecibels = -90;
            this.analyser.maxDecibels = -10;
            
            this.source = this.audioContext.createMediaStreamSource(this.stream);
            this.source.connect(this.analyser);
            
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            
            console.log('Voice Activity Detector initialized');
        } catch (error) {
            console.error('VAD initialization failed:', error);
            this.callbacks.onError(error);
        }
    }
    
    start() {
        if (!this.audioContext || !this.analyser) {
            console.warn('VAD not properly initialized');
            return false;
        }
        
        this.monitoring = true;
        this.monitor();
        console.log('Voice Activity Detection started');
        return true;
    }
    
    stop() {
        this.monitoring = false;
        
        if (this.processor) {
            this.processor.disconnect();
            this.processor = null;
        }
        
        console.log('Voice Activity Detection stopped');
    }
    
    monitor() {
        if (!this.monitoring) return;
        
        try {
            this.analyser.getByteFrequencyData(this.dataArray);
            
            // Calculate weighted RMS focusing on speech frequencies
            const speechEnergy = this.calculateSpeechEnergy();
            
            // Update volume history for smoothing
            this.volumeHistory[this.volumeIndex] = speechEnergy;
            this.volumeIndex = (this.volumeIndex + 1) % this.volumeHistory.length;
            
            // Get smoothed volume
            const smoothedVolume = this.volumeHistory.reduce((a, b) => a + b) / this.volumeHistory.length;
            
            this.callbacks.onVolumeChange(smoothedVolume);
            
            // Voice activity detection logic
            this.detectVoiceActivity(smoothedVolume);
            
        } catch (error) {
            console.error('VAD monitoring error:', error);
            this.callbacks.onError(error);
        }
        
        // Use RAF for smooth monitoring at ~60fps
        requestAnimationFrame(() => this.monitor());
    }
    
    calculateSpeechEnergy() {
        const nyquist = this.audioContext.sampleRate / 2;
        const binSize = nyquist / this.analyser.frequencyBinCount;
        
        // Find bins that correspond to speech frequencies
        const minBin = Math.floor(this.config.frequencyRange[0] / binSize);
        const maxBin = Math.ceil(this.config.frequencyRange[1] / binSize);
        
        let sum = 0;
        let count = 0;
        
        for (let i = minBin; i < Math.min(maxBin, this.dataArray.length); i++) {
            const normalizedValue = this.dataArray[i] / 255;
            sum += normalizedValue * normalizedValue;
            count++;
        }
        
        return count > 0 ? Math.sqrt(sum / count) : 0;
    }
    
    detectVoiceActivity(volume) {
        const isLoudEnough = volume > this.config.threshold;
        
        if (isLoudEnough) {
            this.speechFrames++;
            this.silenceFrames = 0;
            
            // Speech detected
            if (this.speechFrames >= this.config.minSpeechFrames && !this.isActive) {
                this.isActive = true;
                this.callbacks.onSpeechStart();
                console.log('Speech started');
            }
        } else {
            this.silenceFrames++;
            this.speechFrames = Math.max(0, this.speechFrames - 1); // Decay speech frames
            
            // Silence detected
            if (this.silenceFrames >= this.config.minSilenceFrames && this.isActive) {
                this.isActive = false;
                this.callbacks.onSpeechEnd();
                console.log('Speech ended');
            }
        }
    }
    
    // Event listener registration
    on(event, callback) {
        if (this.callbacks.hasOwnProperty(`on${event.charAt(0).toUpperCase() + event.slice(1)}`)) {
            this.callbacks[`on${event.charAt(0).toUpperCase() + event.slice(1)}`] = callback;
        } else {
            console.warn(`Unknown VAD event: ${event}`);
        }
    }
    
    // Adjust sensitivity dynamically
    setThreshold(threshold) {
        this.config.threshold = Math.max(0.001, Math.min(0.1, threshold));
        console.log(`VAD threshold set to ${this.config.threshold}`);
    }
    
    // Get current configuration
    getConfig() {
        return { ...this.config };
    }
    
    // Get current state
    getState() {
        return {
            isActive: this.isActive,
            isMonitoring: this.monitoring,
            speechFrames: this.speechFrames,
            silenceFrames: this.silenceFrames,
            currentVolume: this.volumeHistory[this.volumeIndex - 1] || 0,
            averageVolume: this.volumeHistory.reduce((a, b) => a + b) / this.volumeHistory.length
        };
    }
    
    // Calibration helper - finds optimal threshold
    async calibrate(durationMs = 5000) {
        console.log('Starting VAD calibration...');
        
        const samples = [];
        const originalCallback = this.callbacks.onVolumeChange;
        
        // Collect volume samples
        this.callbacks.onVolumeChange = (volume) => {
            samples.push(volume);
        };
        
        // Collect samples for specified duration
        await new Promise(resolve => setTimeout(resolve, durationMs));
        
        // Restore original callback
        this.callbacks.onVolumeChange = originalCallback;
        
        if (samples.length === 0) {
            console.warn('No samples collected during calibration');
            return this.config.threshold;
        }
        
        // Calculate statistics
        const sortedSamples = samples.sort((a, b) => a - b);
        const median = sortedSamples[Math.floor(sortedSamples.length / 2)];
        const p95 = sortedSamples[Math.floor(sortedSamples.length * 0.95)];
        
        // Set threshold to be above median but below 95th percentile
        const newThreshold = median + (p95 - median) * 0.3;
        
        this.setThreshold(newThreshold);
        
        console.log(`VAD calibration complete. New threshold: ${newThreshold.toFixed(4)}`);
        console.log(`Median volume: ${median.toFixed(4)}, 95th percentile: ${p95.toFixed(4)}`);
        
        return newThreshold;
    }
    
    // Clean up resources
    destroy() {
        this.stop();
        
        if (this.source) {
            this.source.disconnect();
            this.source = null;
        }
        
        if (this.analyser) {
            this.analyser.disconnect();
            this.analyser = null;
        }
        
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
            this.audioContext = null;
        }
        
        console.log('VAD destroyed');
    }
}

// Auto-initialize global class
if (typeof window !== 'undefined') {
    window.VoiceActivityDetector = VoiceActivityDetector;
}