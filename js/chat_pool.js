// chatPool.js - Efficient DOM element reuse for chat messages
class ChatMessagePool {
    constructor(initialSize = 10) {
        this.pool = [];
        this.activeMessages = new Map();
        this.scene = null;
        this.messageContainer = null;
        this.maxMessages = 50;
        
        // Initialize after DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }
    
    init() {
        this.scene = document.querySelector('a-scene');
        if (!this.scene) {
            console.warn('A-Frame scene not found, chat pool disabled');
            return;
        }
        
        // Create a container entity for all chat messages
        this.messageContainer = document.createElement('a-entity');
        this.messageContainer.setAttribute('id', 'chat-container');
        this.messageContainer.setAttribute('position', '0 0 0');
        this.scene.appendChild(this.messageContainer);
        
        // Pre-create pool elements
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(this.createElement());
        }
    }
    
    createElement() {
        if (!this.messageContainer) return null;
        
        const messageEl = document.createElement('a-entity');
        
        // Create background plane
        const background = document.createElement('a-plane');
        background.setAttribute('geometry', 'width: 4.5; height: 0.6');
        background.setAttribute('material', {
            color: '#1a1a1a',
            opacity: 0.8,
            transparent: true,
            shader: 'flat'
        });
        background.setAttribute('position', '0 0 -0.01');
        
        // Create text element
        const textEl = document.createElement('a-text');
        textEl.setAttribute('geometry', 'primitive: plane; width: 4; height: 0.5');
        textEl.setAttribute('text', {
            value: '',
            color: '#ffffff',
            align: 'left',
            width: 8,
            font: 'dejavu',
            shader: 'msdf'
        });
        textEl.setAttribute('position', '-2 0 0');
        
        messageEl.appendChild(background);
        messageEl.appendChild(textEl);
        messageEl.setAttribute('visible', false);
        messageEl.setAttribute('class', 'chat-message');
        
        this.messageContainer.appendChild(messageEl);
        return messageEl;
    }
    
    getMessage(id, text, sender = 'ai', position = '0 0 -2') {
        if (!this.messageContainer) return null;
        
        let element = this.pool.pop();
        if (!element) {
            element = this.createElement();
            if (!element) return null;
        }
        
        const textEl = element.querySelector('a-text');
        const backgroundEl = element.querySelector('a-plane');
        
        // Color coding for different senders
        const colors = {
            user: '#2563eb',
            ai: '#16a34a',
            system: '#dc2626'
        };
        
        // Update text content
        const displayText = `${sender === 'user' ? 'You' : 'AI'}: ${text}`;
        textEl.setAttribute('text', 'value', displayText);
        
        // Update background color
        backgroundEl.setAttribute('material', 'color', colors[sender] || '#1a1a1a');
        
        // Set position and make visible
        element.setAttribute('position', position);
        element.setAttribute('visible', true);
        
        // Add fade-in animation
        element.setAttribute('animation__fadein', {
            property: 'components.material.material.opacity',
            from: 0,
            to: 1,
            dur: 300,
            easing: 'easeInQuad'
        });
        
        this.activeMessages.set(id, element);
        return element;
    }
    
    updateMessage(id, newText) {
        const element = this.activeMessages.get(id);
        if (element) {
            const textEl = element.querySelector('a-text');
            textEl.setAttribute('text', 'value', newText);
        }
    }
    
    releaseMessage(id, animate = true) {
        const element = this.activeMessages.get(id);
        if (element) {
            if (animate) {
                // Fade out before releasing
                element.setAttribute('animation__fadeout', {
                    property: 'components.material.material.opacity',
                    from: 1,
                    to: 0,
                    dur: 200,
                    easing: 'easeOutQuad'
                });
                
                setTimeout(() => {
                    this.finalizeRelease(id, element);
                }, 200);
            } else {
                this.finalizeRelease(id, element);
            }
        }
    }
    
    finalizeRelease(id, element) {
        element.setAttribute('visible', false);
        element.removeAttribute('animation__fadein');
        element.removeAttribute('animation__fadeout');
        
        this.activeMessages.delete(id);
        this.pool.push(element);
    }
    
    cleanup() {
        // Auto-cleanup old messages
        if (this.activeMessages.size > this.maxMessages) {
            const sortedMessages = Array.from(this.activeMessages.keys())
                .slice(0, this.activeMessages.size - this.maxMessages);
            
            sortedMessages.forEach(id => this.releaseMessage(id, false));
        }
    }
    
    clear() {
        // Release all active messages
        const messageIds = Array.from(this.activeMessages.keys());
        messageIds.forEach(id => this.releaseMessage(id, false));
    }
    
    getActiveCount() {
        return this.activeMessages.size;
    }
    
    getPoolSize() {
        return this.pool.length;
    }
    
    // Get performance stats
    getStats() {
        return {
            active: this.getActiveCount(),
            pooled: this.getPoolSize(),
            total: this.getActiveCount() + this.getPoolSize()
        };
    }
}

// Auto-initialize global instance
if (typeof window !== 'undefined') {
    window.ChatMessagePool = ChatMessagePool;
}