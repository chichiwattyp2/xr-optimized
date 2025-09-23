// apiClient.js - Enhanced API client with retry logic and caching
class EnhancedAPIClient {
    constructor() {
        this.baseURL = '/api';
        this.requestQueue = [];
        this.isProcessing = false;
        this.rateLimitDelay = 1000; // ms between requests
        this.lastRequestTime = 0;
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        
        // Request statistics
        this.stats = {
            totalRequests: 0,
            failedRequests: 0,
            cacheHits: 0,
            averageResponseTime: 0
        };
        
        // Connection monitoring
        this.isOnline = navigator.onLine;
        this.setupConnectionMonitoring();
    }
    
    setupConnectionMonitoring() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('Connection restored, processing queued requests');
            this.processQueue();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.warn('Connection lost, requests will be queued');
        });
    }
    
    // Main request method with caching and retry logic
    async makeRequest(endpoint, options = {}, retries = 3) {
        const requestConfig = {
            url: `${this.baseURL}${endpoint}`,
            options: {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    ...options.headers
                },
                ...options
            },
            retries,
            timestamp: Date.now(),
            priority: options.priority || 'normal' // high, normal, low
        };
        
        // Check cache for GET requests or cached responses
        const cacheKey = this.generateCacheKey(requestConfig);
        if (options.method === 'GET' || options.cache) {
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                this.stats.cacheHits++;
                return cached;
            }
        }
        
        // Check if offline
        if (!this.isOnline) {
            console.warn('Offline: queuing request for later');
            return this.enqueueRequest(requestConfig);
        }
        
        return this.enqueueRequest(requestConfig);
    }
    
    generateCacheKey(requestConfig) {
        const key = JSON.stringify({
            url: requestConfig.url,
            method: requestConfig.options.method,
            body: requestConfig.options.body
        });
        return btoa(key).slice(0, 32); // Short hash for cache key
    }
    
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        if (cached) {
            this.cache.delete(key); // Expired
        }
        return null;
    }
    
    setCache(key, data) {
        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
        
        // Clean up old cache entries periodically
        if (this.cache.size > 100) {
            this.cleanupCache();
        }
    }
    
    cleanupCache() {
        const now = Date.now();
        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp > this.cacheTimeout) {
                this.cache.delete(key);
            }
        }
    }
    
    async enqueueRequest(requestConfig) {
        return new Promise((resolve, reject) => {
            const request = { 
                ...requestConfig, 
                resolve, 
                reject,
                enqueuedAt: Date.now()
            };
            
            // Priority queue: high priority requests go first
            if (requestConfig.priority === 'high') {
                this.requestQueue.unshift(request);
            } else {
                this.requestQueue.push(request);
            }
            
            this.processQueue();
        });
    }
    
    async processQueue() {
        if (this.isProcessing || this.requestQueue.length === 0 || !this.isOnline) {
            return;
        }
        
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
                const startTime = Date.now();
                const response = await this.executeRequest(request);
                const responseTime = Date.now() - startTime;
                
                // Update statistics
                this.updateStats(responseTime, true);
                
                // Cache successful responses if applicable
                const cacheKey = this.generateCacheKey(request);
                if (request.options.method === 'GET' || request.options.cache) {
                    this.setCache(cacheKey, response);
                }
                
                request.resolve(response);
                this.lastRequestTime = Date.now();
                
            } catch (error) {
                this.updateStats(Date.now() - request.enqueuedAt, false);
                request.reject(error);
            }
            
            // Small delay to prevent overwhelming the server
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        this.isProcessing = false;
    }
    
    async executeRequest(request) {
        let lastError;
        
        for (let attempt = 0; attempt <= request.retries; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
                
                const response = await fetch(request.url, {
                    ...request.options,
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
                }
                
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    return await response.json();
                } else {
                    return await response.text();
                }
                
            } catch (error) {
                lastError = error;
                
                // Don't retry on certain errors
                if (error.name === 'AbortError' || 
                    (error.message && error.message.includes('401'))) {
                    throw error;
                }
                
                if (attempt < request.retries) {
                    // Exponential backoff with jitter
                    const baseDelay = Math.pow(2, attempt) * 1000;
                    const jitter = Math.random() * 0.3 * baseDelay;
                    const delay = baseDelay + jitter;
                    
                    console.log(`Request failed (attempt ${attempt + 1}/${request.retries + 1}), retrying in ${Math.round(delay)}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        throw new Error(`Request failed after ${request.retries + 1} attempts: ${lastError.message}`);
    }
    
    // Streaming chat with enhanced error handling
    async *streamChat(messages, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout for streaming
        
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'text/stream',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({ 
                    messages,
                    stream: true,
                    ...options 
                }),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            if (!response.body) {
                throw new Error('Response body is null');
            }
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            
            try {
                while (true) {
                    const { done, value } = await reader.read();
                    
                    if (done) break;
                    
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';
                    
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const data = line.slice(6).trim();
                            if (data === '[DONE]') return;
                            
                            if (data) {
                                try {
                                    const parsed = JSON.parse(data);
                                    yield parsed;
                                } catch (e) {
                                    console.warn('Failed to parse SSE data:', data);
                                }
                            }
                        }
                    }
                }
            } finally {
                reader.releaseLock();
            }
            
        } catch (error) {
            clearTimeout(timeoutId);
            console.error('Streaming error:', error);
            
            if (error.name === 'AbortError') {
                throw new Error('Request timeout');
            }
            throw error;
        }
    }
    
    // Health check endpoint
    async healthCheck() {
        try {
            const response = await this.makeRequest('/health', {
                method: 'GET',
                cache: true
            }, 1);
            return response;
        } catch (error) {
            console.error('Health check failed:', error);
            return { status: 'error', error: error.message };
        }
    }
    
    // Get realtime token with caching
    async getRealtimeToken() {
        const cacheKey = 'realtime-token';
        const cached = this.getFromCache(cacheKey);
        
        if (cached && cached.expires_at && Date.now() < cached.expires_at - 60000) {
            return cached;
        }
        
        try {
            const response = await this.makeRequest('/realtime-token', {
                method: 'POST',
                priority: 'high'
            });
            
            // Cache token for most of its lifetime
            if (response.expires_in) {
                response.expires_at = Date.now() + (response.expires_in * 1000);
                this.setCache(cacheKey, response);
            }
            
            return response;
            
        } catch (error) {
            console.error('Failed to get realtime token:', error);
            throw error;
        }
    }
    
    updateStats(responseTime, success) {
        this.stats.totalRequests++;
        if (!success) {
            this.stats.failedRequests++;
        }
        
        // Update rolling average response time
        const alpha = 0.1; // Smoothing factor
        this.stats.averageResponseTime = this.stats.averageResponseTime === 0 
            ? responseTime 
            : (alpha * responseTime) + ((1 - alpha) * this.stats.averageResponseTime);
    }
    
    // Get performance statistics
    getStats() {
        const successRate = this.stats.totalRequests > 0 
            ? ((this.stats.totalRequests - this.stats.failedRequests) / this.stats.totalRequests * 100).toFixed(1)
            : '0';
            
        return {
            ...this.stats,
            successRate: `${successRate}%`,
            queueLength: this.requestQueue.length,
            cacheSize: this.cache.size,
            isOnline: this.isOnline
        };
    }
    
    // Clear cache
    clearCache() {
        this.cache.clear();
        console.log('API cache cleared');
    }
    
    // Set rate limit
    setRateLimit(delayMs) {
        this.rateLimitDelay = Math.max(100, delayMs);
        console.log(`Rate limit set to ${this.rateLimitDelay}ms`);
    }
    
    // Clear request queue (emergency use)
    clearQueue() {
        const queueLength = this.requestQueue.length;
        this.requestQueue.forEach(request => {
            request.reject(new Error('Request cancelled - queue cleared'));
        });
        this.requestQueue = [];
        console.log(`Cleared ${queueLength} queued requests`);
    }
}

// Auto-initialize global instance
if (typeof window !== 'undefined') {
    window.EnhancedAPIClient = EnhancedAPIClient;
    
    // Create global instance for easy access
    window.apiClient = new EnhancedAPIClient();
}