// chatManager.js - Smart chat message management with streaming and persistence
class SmartChatManager {
    constructor(options = {}) {
        this.options = {
            maxMessages: options.maxMessages || 100,
            maxVisibleMessages: options.maxVisibleMessages || 20,
            persistHistory: options.persistHistory !== false,
            autoScroll: options.autoScroll !== false,
            typingAnimation: options.typingAnimation !== false,
            messageSpacing: options.messageSpacing || 0.6,
            fadeInDuration: options.fadeInDuration || 300,
            ...options
        };
        
        this.messages = [];
        this.visibleMessages = [];
        this.messagePool = null;
        this.apiClient = null;
        this.isStreaming = false;
        
        // UI elements
        this.chatContainer = null;
        this.inputElement = null;
        this.sendButton = null;
        
        // State management
        this.currentStreamingId = null;
        this.messageHistory = [];
        this.conversationContext = [];
        
        // Performance tracking
        this.stats = {
            totalMessages: 0,
            streamingMessages: 0,
            averageResponseTime: 0,
            lastResponseTime: 0
        };
        
        this.init();
    }
    
    async init() {
        // Wait for dependencies
        await this.waitForDependencies();
        
        // Initialize components
        this.messagePool = new ChatMessagePool();
        this.apiClient = window.apiClient || new EnhancedAPIClient();
        
        // Setup UI
        this.setupChatInterface();
        
        // Load persisted history
        if (this.options.persistHistory) {
            this.loadChatHistory();
        }
        
        console.log('SmartChatManager initialized');
    }
    
    async waitForDependencies() {
        const checkDependencies = () => {
            return window.ChatMessagePool && 
                   (window.apiClient || window.EnhancedAPIClient);
        };
        
        if (!checkDependencies()) {
            await new Promise(resolve => {
                const interval = setInterval(() => {
                    if (checkDependencies()) {
                        clearInterval(interval);
                        resolve();
                    }
                }, 100);
            });
        }
    }
    
    setupChatInterface() {
        // Create chat input if it doesn't exist
        this.setupChatInput();
        
        // Setup chat display container
        this.setupChatDisplay();
        
        // Setup event listeners
        this.setupEventListeners();
    }
    
    setupChatInput() {
        // Look for existing input or create new one
        this.inputElement = document.querySelector('#chat-input') || this.createChatInput();
        this.sendButton = document.querySelector('#chat-send') || this.createSendButton();
    }
    
    createChatInput() {
        const scene = document.querySelector('a-scene');
        if (!scene) return null;
        
        // Create input container
        const inputContainer = document.createElement('a-entity');
        inputContainer.setAttribute('id', 'chat-input-container');
        inputContainer.setAttribute('position', '0 -1.5 -2');
        
        // Background for input
        const inputBg = document.createElement('a-plane');
        inputBg.setAttribute('geometry', 'width: 4; height: 0.5');
        inputBg.setAttribute('material', {
            color: '#2a2a2a',
            opacity: 0.9,
            transparent: true
        });
        inputBg.setAttribute('position', '0 0 -0.01');
        
        // Text input (this would need VR keyboard integration)
        const inputText = document.createElement('a-text');
        inputText.setAttribute('id', 'chat-input');
        inputText.setAttribute('value', 'Type your message...');
        inputText.setAttribute('color', '#ffffff');
        inputText.setAttribute('position', '-1.8 0 0');
        inputText.setAttribute('width', 6);
        
        inputContainer.appendChild(inputBg);
        inputContainer.appendChild(inputText);
        scene.appendChild(inputContainer);
        
        return inputText;
    }
    
    createSendButton() {
        const container = document.querySelector('#chat-input-container');
        if (!container) return null;
        
        const sendBtn = document.createElement('a-box');
        sendBtn.setAttribute('id', 'chat-send');
        sendBtn.setAttribute('geometry', 'width: 0.5; height: 0.3; depth: 0.1');
        sendBtn.setAttribute('material', {
            color: '#4ade80',
            opacity: 0.8,
            transparent: true
        });
        sendBtn.setAttribute('position', '1.5 0 0.05');
        sendBtn.setAttribute('cursor-listener', '');
        
        const sendText = document.createElement('a-text');
        sendText.setAttribute('value', 'Send');
        sendText.setAttribute('color', '#000000');
        sendText.setAttribute('align', 'center');
        sendText.setAttribute('position', '0 0 0.05');
        sendText.setAttribute('width', 8);
        
        sendBtn.appendChild(sendText);
        container.appendChild(sendBtn);
        
        return sendBtn;
    }
    
    setupChatDisplay() {
        this.chatContainer = document.querySelector('#chat-container');
        if (!this.chatContainer) {
            // Chat container will be created by ChatMessagePool
            console.log('Chat container will be created by MessagePool');
        }
    }
    
    setupEventListeners() {
        if (this.sendButton) {
            this.sendButton.addEventListener('click', () => {
                this.handleSendMessage();
            });
        }
        
        // Listen for keyboard input (if available in VR context)
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                this.handleSendMessage();
            }
        });
        
        // Listen for voice input completion
        document.addEventListener('voice-input-complete', (event) => {
            this.handleVoiceMessage(event.detail.transcript);
        });
    }
    
    async handleSendMessage() {
        const inputText = this.getInputText();
        if (!inputText.trim()) return;
        
        // Clear input
        this.clearInput();
        
        // Add user message
        const userMessageId = this.addMessage(inputText, 'user');
        
        // Start streaming AI response
        await this.streamAIResponse(inputText);
    }
    
    async handleVoiceMessage(transcript) {
        if (!transcript?.trim()) return;
        
        // Add user message from voice
        const userMessageId = this.addMessage(`🎤 ${transcript}`, 'user');
        
        // Start streaming AI response
        await this.streamAIResponse(transcript);
    }
    
    getInputText() {
        if (this.inputElement) {
            return this.inputElement.getAttribute('value') || '';
        }
        return '';
    }
    
    clearInput() {
        if (this.inputElement) {
            this.inputElement.setAttribute('value', 'Type your message...');
        }
    }
    
    addMessage(text, sender = 'ai', options = {}) {
        const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const message = {
            id: messageId,
            text,
            sender,
            timestamp: Date.now(),
            streaming: options.streaming || false,
            position: this.calculateMessagePosition(),
            element: null,
            ...options
        };
        
        this.messages.push(message);
        this.stats.totalMessages++;
        
        if (options.streaming) {
            this.stats.streamingMessages++;
            this.currentStreamingId = messageId;
        }
        
        // Render message
        this.renderMessage(message);
        
        // Manage visible messages
        this.manageVisibleMessages();
        
        // Update conversation context
        this.updateConversationContext(message);
        
        // Persist if enabled
        if (this.options.persistHistory) {
            this.saveChatHistory();
        }
        
        return messageId;
    }
    
    calculateMessagePosition() {
        const messageCount = this.visibleMessages.length;
        const yOffset = 1.5 - (messageCount * this.options.messageSpacing);
        return `0 ${yOffset} -2`;
    }
    
    renderMessage(message) {
        if (!this.messagePool) {
            console.warn('MessagePool not available');
            return;
        }
        
        message.element = this.messagePool.getMessage(
            message.id,
            message.text,
            message.sender,
            message.position
        );
        
        // Add to visible messages
        this.visibleMessages.push(message);
        
        // Typing animation for streaming messages
        if (message.streaming && this.options.typingAnimation) {
            this.addTypingAnimation(message);
        }
        
        // Auto-scroll if enabled
        if (this.options.autoScroll) {
            this.scrollToLatest();
        }
    }
    
    addTypingAnimation(message) {
        if (!message.element) return;
        
        message.element.setAttribute('animation__typing', {
            property: 'scale',
            from: '0.8 0.8 0.8',
            to: '1 1 1',
            dur: this.options.fadeInDuration,
            easing: 'easeOutQuad'
        });
    }
    
    updateMessage(messageId, newText, options = {}) {
        const message = this.messages.find(m => m.id === messageId);
        if (!message) return false;
        
        message.text = newText;
        message.lastUpdated = Date.now();
        
        // Update the visual element
        if (this.messagePool) {
            this.messagePool.updateMessage(messageId, newText);
        }
        
        // Handle streaming completion
        if (options.complete && message.streaming) {
            message.streaming = false;
            this.currentStreamingId = null;
            
            // Remove typing animation
            if (message.element) {
                message.element.removeAttribute('animation__typing');
            }
        }
        
        return true;
    }
    
    async streamAIResponse(userMessage) {
        if (this.isStreaming) {
            console.warn('Already streaming a response');
            return;
        }
        
        this.isStreaming = true;
        const startTime = Date.now();
        
        // Prepare conversation context
        const messages = this.buildConversationContext(userMessage);
        
        // Create streaming message
        const aiMessageId = this.addMessage('', 'ai', { streaming: true });
        let fullResponse = '';
        
        try {
            // Stream the response
            for await (const chunk of this.apiClient.streamChat(messages)) {
                if (chunk.choices?.[0]?.delta?.content) {
                    fullResponse += chunk.choices[0].delta.content;
                    this.updateMessage(aiMessageId, fullResponse);
                }
                
                // Small delay for smooth animation
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            
            // Mark as complete
            this.updateMessage(aiMessageId, fullResponse, { complete: true });
            
            // Update response time stats
            const responseTime = Date.now() - startTime;
            this.updateResponseTimeStats(responseTime);
            
        } catch (error) {
            console.error('Streaming error:', error);
            const errorMessage = this.getErrorMessage(error);
            this.updateMessage(aiMessageId, errorMessage, { complete: true });
            
        } finally {
            this.isStreaming = false;
        }
    }
    
    buildConversationContext(newMessage) {
        // Build context from recent messages
        const contextMessages = [];
        
        // Add system message
        contextMessages.push({
            role: 'system',
            content: 'You are a helpful AI assistant in a VR environment. Keep responses concise but informative.'
        });
        
        // Add recent conversation history (last 10 messages)
        const recentMessages = this.messages
            .filter(m => !m.streaming)
            .slice(-10)
            .filter(m => m.sender !== 'system');
        
        recentMessages.forEach(msg => {
            contextMessages.push({
                role: msg.sender === 'user' ? 'user' : 'assistant',
                content: msg.text.replace('🎤 ', '') // Remove voice indicator
            });
        });
        
        // Add current message
        contextMessages.push({
            role: 'user',
            content: newMessage
        });
        
        return contextMessages;
    }
    
    getErrorMessage(error) {
        if (error.message.includes('401')) {
            return '🔑 API key error. Please check your OpenAI configuration.';
        } else if (error.message.includes('429')) {
            return '⏱️ Rate limit exceeded. Please try again in a moment.';
        } else if (error.message.includes('timeout')) {
            return '⏰ Request timed out. Please try again.';
        } else {
            return '❌ Sorry, there was an error processing your message. Please try again.';
        }
    }
    
    updateResponseTimeStats(responseTime) {
        this.stats.lastResponseTime = responseTime;
        
        // Update rolling average
        if (this.stats.averageResponseTime === 0) {
            this.stats.averageResponseTime = responseTime;
        } else {
            const alpha = 0.1; // Smoothing factor
            this.stats.averageResponseTime = 
                (alpha * responseTime) + ((1 - alpha) * this.stats.averageResponseTime);
        }
    }
    
    manageVisibleMessages() {
        // Remove excess visible messages
        while (this.visibleMessages.length > this.options.maxVisibleMessages) {
            const oldMessage = this.visibleMessages.shift();
            if (oldMessage && this.messagePool) {
                this.messagePool.releaseMessage(oldMessage.id);
            }
        }
        
        // Clean up old messages from memory
        while (this.messages.length > this.options.maxMessages) {
            this.messages.shift();
        }
        
        // Update positions of remaining messages
        this.updateMessagePositions();
    }
    
    updateMessagePositions() {
        this.visibleMessages.forEach((message, index) => {
            const yOffset = 1.5 - (index * this.options.messageSpacing);
            const newPosition = `0 ${yOffset} -2`;
            
            if (message.element) {
                message.element.setAttribute('position', newPosition);
            }
            message.position = newPosition;
        });
    }
    
    updateConversationContext(message) {
        this.conversationContext.push({
            role: message.sender === 'user' ? 'user' : 'assistant',
            content: message.text,
            timestamp: message.timestamp
        });
        
        // Keep context manageable
        if (this.conversationContext.length > 20) {
            this.conversationContext.shift();
        }
    }
    
    scrollToLatest() {
        // In VR, we might want to animate the camera or container
        // For now, we just ensure latest message is visible
        if (this.chatContainer && this.visibleMessages.length > 0) {
            const latestMessage = this.visibleMessages[this.visibleMessages.length - 1];
            // Could add smooth scrolling animation here
        }
    }
    
    // Persistence methods
    saveChatHistory() {
        try {
            const historyData = {
                messages: this.messages.slice(-50), // Keep last 50 messages
                timestamp: Date.now()
            };
            localStorage.setItem('xr-chat-history', JSON.stringify(historyData));
        } catch (error) {
            console.warn('Failed to save chat history:', error);
        }
    }
    
    loadChatHistory() {
        try {
            const saved = localStorage.getItem('xr-chat-history');
            if (saved) {
                const historyData = JSON.parse(saved);
                
                // Load messages that aren't too old (last 24 hours)
                const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
                if (historyData.timestamp > dayAgo) {
                    historyData.messages.forEach(msg => {
                        msg.streaming = false; // Don't restore streaming state
                        this.messages.push(msg);
                        this.renderMessage(msg);
                    });
                    
                    console.log(`Loaded ${historyData.messages.length} messages from history`);
                }
            }
        } catch (error) {
            console.warn('Failed to load chat history:', error);
        }
    }
    
    clearChatHistory() {
        // Clear visual messages
        this.visibleMessages.forEach(message => {
            if (this.messagePool) {
                this.messagePool.releaseMessage(message.id);
            }
        });
        
        // Clear data
        this.messages = [];
        this.visibleMessages = [];
        this.conversationContext = [];
        
        // Clear persistence
        localStorage.removeItem('xr-chat-history');
        
        console.log('Chat history cleared');
    }
    
    // Public API methods
    sendMessage(text, sender = 'user') {
        return this.addMessage(text, sender);
    }
    
    getStats() {
        return {
            ...this.stats,
            messageCount: this.messages.length,
            visibleCount: this.visibleMessages.length,
            isStreaming: this.isStreaming,
            averageResponseTimeFormatted: `${(this.stats.averageResponseTime / 1000).toFixed(1)}s`
        };
    }
    
    setOption(key, value) {
        if (this.options.hasOwnProperty(key)) {
            this.options[key] = value;
            console.log(`Option ${key} set to ${value}`);
        }
    }
    
    getMessages() {
        return [...this.messages];
    }
    
    getVisibleMessages() {
        return [...this.visibleMessages];
    }
    
    // Cleanup
    destroy() {
        if (this.options.persistHistory) {
            this.saveChatHistory();
        }
        
        this.clearChatHistory();
        
        if (this.messagePool) {
            this.messagePool.clear();
        }
        
        console.log('SmartChatManager destroyed');
    }
}

// Auto-initialize global instance
if (typeof window !== 'undefined') {
    window.SmartChatManager = SmartChatManager;
}