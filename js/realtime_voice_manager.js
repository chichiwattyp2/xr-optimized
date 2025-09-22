// realtimeVoiceManager.js - Enhanced OpenAI Realtime API integration
class RealtimeVoiceManager {
    constructor(options = {}) {
        this.options = {
            model: options.model || 'gpt-4o-realtime-preview',
            voice: options.voice || 'alloy',
            inputAudioFormat: options.inputAudioFormat || 'pcm16',
            outputAudioFormat: options.outputAudioFormat || 'pcm16',
            sampleRate: options.sampleRate || 24000,
            autoStart: options.autoStart || false,
            vadEnabled: options.vadEnabled !== false,
            vadThreshold: options.vadThreshold || 0.02,
            maxReconnectAttempts: options.maxReconnectAttempts || 5,
            reconnectDelay: options.reconnectDelay || 1000,
            ...options
        };
        
        // Connection state
        this.ws = null;
        this.isConnected = false;
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.sessionId = null;
        
        // Audio handling
        this.audioContext = null;
        this.mediaStream = null;
        this.audioProcessor = null;
        this.audioQueue = [];
        this.isRecording = false;
        this.isPlaying = false;
        
        // Voice Activity Detection
        this.vadDetector = null;
        this.voiceDetected = false;
        
        // State management
        this.currentResponse = null;
        this.pendingAudio = [];
        this.conversationId = null;
        
        // Performance tracking
        this.stats = {
            connections: 0,
            reconnections: 0,
            audioChunksReceived: 0,
            audioChunksSent: 0,
            averageLatency: 0,
            lastLatency: 0,
            errors: 0
        };
        
        // Event callbacks
        this.callbacks = {
            onConnected: () => {},
            onDisconnected: () => {},
            onAudioReceived: () => {},
            onTranscriptReceived: () => {},
            onError: () => {},
            onVoiceActivityChange: () => {}
        };
        
        // Initialize if auto-start is enabled
        if (this.options.autoStart) {
            this.init();
        }
    }
    
    async init() {
        console.log('Initializing RealtimeVoiceManager...');
        
        try {
            await this.setupAudioContext();
            await this.setupMediaStream();
            
            if (this.options.vadEnabled) {
                await this.setupVoiceActivityDetection();
            }
            
            console.log('RealtimeVoiceManager initialized');
        } catch (error) {
            console.error('Failed to initialize RealtimeVoiceManager:', error);
            this.callbacks.onError(error);
            throw error;
        }
    }
    
    async setupAudioContext() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
            sampleRate: this.options.sampleRate,
            latencyHint: 'interactive'
        });
        
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
        
        console.log(`Audio context initialized: ${this.audioContext.sampleRate}Hz`);
    }
    
    async setupMediaStream() {
        const constraints = {
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                sampleRate: this.options.sampleRate,
                channelCount: 1
            }
        };
        
        this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('Media stream acquired');
    }
    
    async setupVoiceActivityDetection() {
        if (!window.VoiceActivityDetector) {
            console.warn('VoiceActivityDetector not available, VAD disabled');
            this.options.vadEnabled = false;
            return;
        }
        
        this.vadDetector = new VoiceActivityDetector(this.mediaStream, {
            threshold: this.options.vadThreshold,
            minSpeechFrames: 3,
            minSilenceFrames: 10
        });
        
        this.vadDetector.on('speechStart', () => {
            this.voiceDetected = true;
            this.callbacks.onVoiceActivityChange(true);
            
            if (this.isConnected && !this.isRecording) {
                this.startRecording();
            }
        });
        
        this.vadDetector.on('speechEnd', () => {
            this.voiceDetected = false;
            this.callbacks.onVoiceActivityChange(false);
            
            if (this.isRecording) {
                setTimeout(() => {
                    if (!this.voiceDetected && this.isRecording) {
                        this.stopRecording();
                    }
                }, 1000); // Grace period
            }
        });
        
        console.log('Voice Activity Detection setup complete');
    }
    
    async connect() {
        if (this.isConnected || this.isConnecting) {
            console.warn('Already connected or connecting');
            return;
        }
        
        this.isConnecting = true;
        
        try {
            // Get ephemeral token
            const apiClient = window.apiClient || new (window.EnhancedAPIClient || class {
                async getRealtimeToken() {
                    const response = await fetch('/api/realtime-token', { method: 'POST' });
                    return await response.json();
                }
            })();
            
            const tokenData = await apiClient.getRealtimeToken();
            
            if (!tokenData.token) {
                throw new Error('Failed to get realtime token');
            }
            
            // Connect to OpenAI Realtime WebSocket
            await this.connectWebSocket(tokenData.token);
            
        } catch (error) {
            console.error('Connection failed:', error);
            this.isConnecting = false;
            this.callbacks.onError(error);
            
            if (this.reconnectAttempts < this.options.maxReconnectAttempts) {
                this.scheduleReconnect();
            }
            throw error;
        }
    }
    
    async connectWebSocket(token) {
        const wsUrl = `wss://api.openai.com/v1/realtime?model=${this.options.model}`;
        
        this.ws = new WebSocket(wsUrl, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'OpenAI-Beta': 'realtime=v1'
            }
        });
        
        this.setupWebSocketHandlers();
        
        // Wait for connection
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Connection timeout')), 10000);
            
            this.ws.onopen = () => {
                clearTimeout(timeout);
                resolve();
            };
            
            this.ws.onerror = (error) => {
                clearTimeout(timeout);
                reject(error);
            };
        });
    }
    
    setupWebSocketHandlers() {
        this.ws.onopen = () => {
            console.log('Connected to OpenAI Realtime API');
            this.isConnected = true;
            this.isConnecting = false;
            this.reconnectAttempts = 0;
            this.stats.connections++;
            
            // Initialize session
            this.initializeSession();
            
            // Start VAD if enabled
            if (this.vadDetector) {
                this.vadDetector.start();
            }
            
            this.callbacks.onConnected();
        };
        
        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this.handleRealtimeMessage(message);
            } catch (error) {
                console.error('Failed to parse WebSocket message:', error);
            }
        };
        
        this.ws.onclose = (event) => {
            console.log('Disconnected from OpenAI Realtime API', event.code, event.reason);
            this.handleDisconnection();
        };
        
        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.stats.errors++;
            this.callbacks.onError(error);
        };
    }
    
    initializeSession() {
        const sessionConfig = {
            type: 'session.update',
            session: {
                modalities: ['text', 'audio'],
                instructions: this.options.instructions || 
                    'You are a helpful AI assistant in a VR environment. Keep responses concise and engaging.',
                voice: this.options.voice,
                input_audio_format: this.options.inputAudioFormat,
                output_audio_format: this.options.outputAudioFormat,
                input_audio_transcription: {
                    model: 'whisper-1'
                },
                turn_detection: {
                    type: 'server_vad',
                    threshold: 0.5,
                    prefix_padding_ms: 300,
                    silence_duration_ms: 200
                }
            }
        };
        
        this.sendMessage(sessionConfig);
    }
    
    handleRealtimeMessage(message) {
        const startTime = performance.now();
        
        switch (message.type) {
            case 'session.created':
                this.sessionId = message.session.id;
                console.log('Session created:', this.sessionId);
                break;
                
            case 'session.updated':
                console.log('Session updated');
                break;
                
            case 'input_audio_buffer.speech_started':
                console.log('Speech detected by server');
                break;
                
            case 'input_audio_buffer.speech_stopped':
                console.log('Speech ended by server');
                break;
                
            case 'input_audio_buffer.committed':
                console.log('Audio buffer committed');
                this.commitAudioBuffer();
                break;
                
            case 'response.created':
                this.currentResponse = message.response;
                console.log('Response created:', message.response.id);
                break;
                
            case 'response.output_item.added':
                console.log('Output item added:', message.item.type);
                break;
                
            case 'response.audio.delta':
                this.handleAudioDelta(message);
                break;
                
            case 'response.audio_transcript.delta':
                this.handleTranscriptDelta(message);
                break;
                
            case 'response.done':
                this.handleResponseComplete(message);
                break;
                
            case 'error':
                console.error('Realtime API error:', message.error);
                this.callbacks.onError(new Error(message.error.message));
                break;
                
            default:
                console.log('Unhandled message type:', message.type);
        }
        
        // Update latency stats
        const latency = performance.now() - startTime;
        this.updateLatencyStats(latency);
    }
    
    handleAudioDelta(message) {
        if (message.delta) {
            this.stats.audioChunksReceived++;
            
            // Decode base64 audio data
            const audioData = atob(message.delta);
            const audioBuffer = new ArrayBuffer(audioData.length);
            const audioView = new Uint8Array(audioBuffer);
            
            for (let i = 0; i < audioData.length; i++) {
                audioView[i] = audioData.charCodeAt(i);
            }
            
            // Queue for playback
            this.queueAudioPlayback(audioBuffer);
            this.callbacks.onAudioReceived(audioBuffer);
        }
    }
    
    handleTranscriptDelta(message) {
        if (message.delta) {
            this.callbacks.onTranscriptReceived(message.delta);
        }
    }
    
    handleResponseComplete(message) {
        console.log('Response complete:', message.response);
        this.currentResponse = null;
        
        // Process any remaining audio
        this.flushAudioQueue();
    }
    
    async queueAudioPlayback(audioBuffer) {
        try {
            // Convert raw audio to AudioBuffer
            const pcm16Data = new Int16Array(audioBuffer);
            const audioBufferSource = this.audioContext.createBuffer(
                1, // mono
                pcm16Data.length,
                this.options.sampleRate
            );
            
            const channelData = audioBufferSource.getChannelData(0);
            for (let i = 0; i < pcm16Data.length; i++) {
                channelData[i] = pcm16Data[i] / 32768; // Convert to float
            }
            
            // Add to playback queue
            this.audioQueue.push(audioBufferSource);
            
            if (!this.isPlaying) {
                this.playAudioQueue();
            }
            
        } catch (error) {
            console.error('Audio playback error:', error);
        }
    }
    
    async playAudioQueue() {
        if (this.audioQueue.length === 0) {
            this.isPlaying = false;
            return;
        }
        
        this.isPlaying = true;
        const audioBuffer = this.audioQueue.shift();
        
        const source = this.audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.audioContext.destination);
        
        source.onended = () => {
            // Play next in queue
            this.playAudioQueue();
        };
        
        source.start(0);
    }
    
    flushAudioQueue() {
        // Force play any remaining audio
        while (this.audioQueue.length > 0) {
            this.playAudioQueue();
        }
    }
    
    startRecording() {
        if (!this.isConnected || this.isRecording) return;
        
        console.log('Starting audio recording');
        this.isRecording = true;
        
        // Setup audio processor
        this.audioProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);
        const source = this.audioContext.createMediaStreamSource(this.mediaStream);
        
        this.audioProcessor.onaudioprocess = (event) => {
            if (!this.isRecording) return;
            
            const audioData = event.inputBuffer.getChannelData(0);
            this.sendAudioChunk(audioData);
        };
        
        source.connect(this.audioProcessor);
        this.audioProcessor.connect(this.audioContext.destination);
    }
    
    stopRecording() {
        if (!this.isRecording) return;
        
        console.log('Stopping audio recording');
        this.isRecording = false;
        
        if (this.audioProcessor) {
            this.audioProcessor.disconnect();
            this.audioProcessor = null;
        }
        
        // Commit the audio buffer
        this.sendMessage({
            type: 'input_audio_buffer.commit'
        });
    }
    
    sendAudioChunk(audioData) {
        if (!this.isConnected) return;
        
        // Convert to PCM16
        const pcm16 = new Int16Array(audioData.length);
        for (let i = 0; i < audioData.length; i++) {
            pcm16[i] = Math.max(-32768, Math.min(32767, audioData[i] * 32768));
        }
        
        // Convert to base64
        const base64Audio = btoa(String.fromCharCode(...new Uint8Array(pcm16.buffer)));
        
        this.sendMessage({
            type: 'input_audio_buffer.append',
            audio: base64Audio
        });
        
        this.stats.audioChunksSent++;
    }
    
    commitAudioBuffer() {
        // Generate response after audio is committed
        this.sendMessage({
            type: 'response.create',
            response: {
                modalities: ['text', 'audio'],
                instructions: this.options.instructions
            }
        });
    }
    
    sendMessage(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            console.warn('WebSocket not ready, message not sent');
        }
    }
    
    handleDisconnection() {
        this.isConnected = false;
        this.isConnecting = false;
        this.sessionId = null;
        
        if (this.vadDetector) {
            this.vadDetector.stop();
        }
        
        if (this.audioProcessor) {
            this.audioProcessor.disconnect();
            this.audioProcessor = null;
        }
        
        this.isRecording = false;
        this.callbacks.onDisconnected();
        
        // Attempt reconnection if not intentionally disconnected
        if (this.reconnectAttempts < this.options.maxReconnectAttempts) {
            this.scheduleReconnect();
        }
    }
    
    scheduleReconnect() {
        this.reconnectAttempts++;
        this.stats.reconnections++;
        
        const delay = this.options.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
        
        setTimeout(() => {
            if (!this.isConnected) {
                this.connect().catch(error => {
                    console.error('Reconnection failed:', error);
                });
            }
        }, delay);
    }
    
    updateLatencyStats(latency) {
        this.stats.lastLatency = latency;
        
        if (this.stats.averageLatency === 0) {
            this.stats.averageLatency = latency;
        } else {
            const alpha = 0.1;
            this.stats.averageLatency = 
                (alpha * latency) + ((1 - alpha) * this.stats.averageLatency);
        }
    }
    
    // Public API
    async start() {
        if (!this.audioContext) {
            await this.init();
        }
        return this.connect();
    }
    
    async stop() {
        if (this.vadDetector) {
            this.vadDetector.stop();
        }
        
        if (this.isRecording) {
            this.stopRecording();
        }
        
        if (this.ws) {
            this.ws.close();
        }
        
        this.audioQueue = [];
        this.isPlaying = false;
    }
    
    on(event, callback) {
        const eventName = `on${event.charAt(0).toUpperCase() + event.slice(1)}`;
        if (this.callbacks[eventName]) {
            this.callbacks[eventName] = callback;
        } else {
            console.warn(`Unknown event: ${event}`);
        }
    }
    
    setVoiceActivityThreshold(threshold) {
        this.options.vadThreshold = threshold;
        if (this.vadDetector) {
            this.vadDetector.setThreshold(threshold);
        }
    }
    
    setInstructions(instructions) {
        this.options.instructions = instructions;
        
        if (this.isConnected) {
            this.sendMessage({
                type: 'session.update',
                session: {
                    instructions: instructions
                }
            });
        }
    }
    
    getStats() {
        return {
            ...this.stats,
            isConnected: this.isConnected,
            isRecording: this.isRecording,
            isPlaying: this.isPlaying,
            vadEnabled: this.options.vadEnabled,
            voiceDetected: this.voiceDetected,
            audioQueueLength: this.audioQueue.length,
            sessionId: this.sessionId,
            averageLatencyFormatted: `${this.stats.averageLatency.toFixed(1)}ms`
        };
    }
    
    getConnectionState() {
        return {
            connected: this.isConnected,
            connecting: this.isConnecting,
            reconnectAttempts: this.reconnectAttempts,
            sessionId: this.sessionId
        };
    }
    
    // Cleanup
    destroy() {
        this.stop();
        
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
        }
        
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
        }
        
        if (this.vadDetector) {
            this.vadDetector.destroy();
        }
        
        console.log('RealtimeVoiceManager destroyed');
    }
}

// Auto-initialize global class
if (typeof window !== 'undefined') {
    window.RealtimeVoiceManager = RealtimeVoiceManager;
    
    // Create global instance for easy access
    window.voiceManager = null;
    
    // Helper to initialize voice manager
    window.initVoiceManager = function(options = {}) {
        if (!window.voiceManager) {
            window.voiceManager = new RealtimeVoiceManager(options);
        }
        return window.voiceManager;
    };
}