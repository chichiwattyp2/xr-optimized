// apiClient.js
class EnhancedAPIClient {
    constructor() {
        this.baseURL = '/api';
        this.requestQueue = [];
        this.isProcessing = false;
        this.rateLimitDelay = 1000; // ms between requests
        this.lastRequestTime = 0;
    }
    
    async makeRequest(endpoint, options = {}, retries = 3) {
        const requestConfig = {
            url: `${this.baseURL}${endpoint}`,
            options: {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            },
            retries,
            timestamp: Date.now()
        };
        
        return this.enqueueRequest(requestConfig);
    }
    
    async enqueueRequest(requestConfig) {
        return new Promise((resolve, reject) => {
            this.requestQueue.push({ ...requestConfig, resolve, reject });
            this.processQueue();
        });
    }
    
    async processQueue() {
        if (this.isProcessing || this.requestQueue.length === 0) return;
        
        this.isProcessing = true;
        
        while (this.requestQueue.length > 0) {
            const request = this.requestQueue.shift();
            
            // Rate limiting
            const timeSinceLastRequest = Date.now() - this.lastRequestTime;
            if (timeSinceLastRequest < this.rateLimitDelay) {
                await new Promise(resolve => 
                    setTimeout(resolve, this.rateLimitDelay - timeSinceLastRequest)
                );
            }
            
            try {
                const response = await this.executeRequest(request);
                request.resolve(response);
                this.lastRequestTime = Date.now();
            } catch (error) {
                request.reject(error);
            }
        }
        
        this.isProcessing = false;
    }
    
    async executeRequest(request) {
        let lastError;
        
        for (let attempt = 0; attempt <= request.retries; attempt++) {
            try {
                const response = await fetch(request.url, request.options);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                return await response.json();
            } catch (error) {
                lastError = error;
                
                if (attempt < request.retries) {
                    // Exponential backoff: 1s, 2s, 4s
                    const delay = Math.pow(2, attempt) * 1000;
                    console.log(`Request failed, retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        throw new Error(`Request failed after ${request.retries + 1} attempts: ${lastError.message}`);
    }
    
    // Streaming chat with enhanced error handling
    async *streamChat(messages) {
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ messages })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            
            while (true) {
                const { done, value } = await reader.read();
                
                if (done) break;
                
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') return;
                        
                        try {
                            const parsed = JSON.parse(data);
                            yield parsed;
                        } catch (e) {
                            console.warn('Failed to parse SSE data:', data);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Streaming error:', error);
            throw error;
        }
    }
}

// Usage
const apiClient = new EnhancedAPIClient();
