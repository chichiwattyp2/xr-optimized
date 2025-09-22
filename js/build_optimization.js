#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { minify } = require('terser');
const CleanCSS = require('clean-css');
const htmlMinifier = require('html-minifier-terser');

class BuildOptimizer {
    constructor() {
        this.buildDir = 'dist';
        this.publicDir = 'public';
        this.startTime = Date.now();
        
        // Ensure directories exist
        if (!fs.existsSync(this.buildDir)) {
            fs.mkdirSync(this.buildDir, { recursive: true });
        }
    }

    async build() {
        console.log('🚀 Starting optimized build...');
        
        try {
            // Copy and optimize HTML
            await this.optimizeHTML();
            
            // Bundle and optimize JavaScript
            await this.optimizeJavaScript();
            
            // Copy API routes (no optimization needed for serverless)
            await this.copyAPIRoutes();
            
            // Copy and optimize static assets
            await this.optimizeStaticAssets();
            
            // Generate service worker for caching
            await this.generateServiceWorker();
            
            // Update package.json and vercel.json
            await this.optimizeConfig();
            
            const buildTime = (Date.now() - this.startTime) / 1000;
            console.log(`✅ Build completed in ${buildTime}s`);
            
        } catch (error) {
            console.error('❌ Build failed:', error);
            process.exit(1);
        }
    }

    async optimizeHTML() {
        console.log('📝 Optimizing HTML...');
        
        const html = fs.readFileSync('index.html', 'utf8');
        
        const optimizedHtml = await htmlMinifier.minify(html, {
            removeComments: true,
            removeRedundantAttributes: true,
            removeScriptTypeAttributes: true,
            removeStyleLinkTypeAttributes: true,
            useShortDoctype: true,
            collapseWhitespace: true,
            minifyCSS: true,
            minifyJS: true
        });

        // Inject performance optimizations
        const performanceOptimizedHtml = this.injectPerformanceOptimizations(optimizedHtml);
        
        fs.writeFileSync(path.join(this.buildDir, 'index.html'), performanceOptimizedHtml);
    }

    injectPerformanceOptimizations(html) {
        // Add preload hints and optimize loading
        const optimizations = `
        <!-- Performance optimizations -->
        <link rel="preload" href="https://aframe.io/releases/1.4.0/aframe.min.js" as="script" crossorigin>
        <link rel="dns-prefetch" href="//api.openai.com">
        <link rel="preconnect" href="//api.openai.com" crossorigin>
        
        <!-- Service Worker Registration -->
        <script>
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                    .then(reg => console.log('SW registered'))
                    .catch(err => console.log('SW registration failed'));
            });
        }
        </script>`;
        
        return html.replace('<head>', `<head>${optimizations}`);
    }

    async optimizeJavaScript() {
        console.log('⚡ Optimizing JavaScript...');
        
        const clientJs = fs.readFileSync('client.js', 'utf8');
        
        // Add the optimization modules at the top
        const optimizedModules = `
// Performance optimizations
${fs.readFileSync('src/optimizations/chatPool.js', 'utf8')}
${fs.readFileSync('src/optimizations/voiceActivityDetector.js', 'utf8')}
${fs.readFileSync('src/optimizations/apiClient.js', 'utf8')}
${fs.readFileSync('src/optimizations/performanceMonitor.js', 'utf8')}

// Original client code with optimizations integrated
`;

        const combinedJs = optimizedModules + this.integrateOptimizations(clientJs);
        
        // Minify the combined JavaScript
        const minified = await minify(combinedJs, {
            compress: {
                dead_code: true,
                drop_console: false, // Keep console for debugging
                drop_debugger: true,
                pure_funcs: ['console.log']
            },
            mangle: {
                reserved: ['AFRAME'] // Preserve A-Frame globals
            },
            format: {
                comments: false
            }
        });

        if (minified.error) {
            throw new Error(`Minification failed: ${minified.error}`);
        }

        fs.writeFileSync(path.join(this.buildDir, 'client.min.js'), minified.code);
        
        // Create source map for debugging
        fs.writeFileSync(path.join(this.buildDir, 'client.min.js.map'), minified.map || '');
    }

    integrateOptimizations(originalCode) {
        // Replace original implementations with optimized versions
        let optimizedCode = originalCode;
        
        // Replace simple API calls with enhanced client
        optimizedCode = optimizedCode.replace(
            /fetch\(['"](\/api\/[^'"]+)['"]/g,
            'apiClient.makeRequest("$1"'
        );
        
        // Add performance monitoring
        optimizedCode = `
        // Initialize optimizations
        const apiClient = new EnhancedAPIClient();
        const messagePool = new ChatMessagePool();
        const chatManager = new SmartChatManager();
        
        // Add performance monitoring to scene
        document.addEventListener('DOMContentLoaded', () => {
            const scene = document.querySelector('a-scene');
            if (scene) {
                scene.setAttribute('performance-monitor', 'showUI: false; updateInterval: 1000');
            }
        });
        
        ${optimizedCode}`;
        
        return optimizedCode;
    }

    async copyAPIRoutes() {
        console.log('📁 Copying API routes...');
        
        const apiDir = path.join(this.buildDir, 'api');
        if (!fs.existsSync(apiDir)) {
            fs.mkdirSync(apiDir, { recursive: true });
        }
        
        const apiFiles = ['chat.js', 'realtime-token.js', 'health.js'];
        
        for (const file of apiFiles) {
            const apiCode = fs.readFileSync(path.join('api', file), 'utf8');
            
            // Add basic optimization to API routes
            const optimizedApiCode = this.optimizeAPIRoute(apiCode);
            
            fs.writeFileSync(path.join(apiDir, file), optimizedApiCode);
        }
    }

    optimizeAPIRoute(code) {
        // Add caching headers and error handling improvements
        const cacheHeaders = `
        // Add caching and performance headers
        const headers = {
            'Cache-Control': 'public, max-age=0, s-maxage=86400',
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block',
            ...corsHeaders
        };`;
        
        return code.replace(
            /const corsHeaders = {[^}]+};/,
            `const corsHeaders = {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            };
            ${cacheHeaders}`
        );
    }

    async optimizeStaticAssets() {
        console.log('🖼️ Optimizing static assets...');
        
        // Create a public directory structure
        const publicDir = path.join(this.buildDir, 'public');
        if (!fs.existsSync(publicDir)) {
            fs.mkdirSync(publicDir, { recursive: true });
        }
        
        // Copy any static assets if they exist
        if (fs.existsSync('public')) {
            this.copyRecursive('public', publicDir);
        }
    }

    async generateServiceWorker() {
        console.log('⚙️ Generating Service Worker...');
        
        const swContent = `
const CACHE_NAME = 'xr-home-chat-v1.0.0';
const urlsToCache = [
    '/',
    '/client.min.js',
    'https://aframe.io/releases/1.4.0/aframe.min.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', event => {
    // Skip API calls and external requests
    if (event.request.url.includes('/api/') || 
        event.request.url.includes('openai.com')) {
        return;
    }
    
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Return cached version or fetch from network
                return response || fetch(event.request);
            }
        )
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});`;

        fs.writeFileSync(path.join(this.buildDir, 'sw.js'), swContent);
    }

    async optimizeConfig() {
        console.log('⚙️ Optimizing configuration...');
        
        // Enhanced vercel.json with optimizations
        const vercelConfig = {
            "version": 2,
            "builds": [
                {
                    "src": "dist/index.html",
                    "use": "@vercel/static"
                },
                {
                    "src": "dist/api/**/*.js",
                    "use": "@vercel/node"
                }
            ],
            "routes": [
                {
                    "src": "/sw.js",
                    "dest": "/dist/sw.js",
                    "headers": {
                        "Cache-Control": "public, max-age=0, must-revalidate"
                    }
                },
                {
                    "src": "/client.min.js",
                    "dest": "/dist/client.min.js",
                    "headers": {
                        "Cache-Control": "public, max-age=31536000, immutable"
                    }
                },
                {
                    "src": "/api/(.*)",
                    "dest": "/dist/api/$1"
                },
                {
                    "src": "/(.*)",
                    "dest": "/dist/index.html"
                }
            ],
            "headers": [
                {
                    "source": "/(.*)",
                    "headers": [
                        {
                            "key": "X-Content-Type-Options",
                            "value": "nosniff"
                        },
                        {
                            "key": "X-Frame-Options",
                            "value": "DENY"
                        },
                        {
                            "key": "X-XSS-Protection",
                            "value": "1; mode=block"
                        },
                        {
                            "key": "Content-Security-Policy",
                            "value": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://aframe.io https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.openai.com wss://api.openai.com; media-src 'self' blob:; worker-src 'self' blob:;"
                        }
                    ]
                }
            ],
            "functions": {
                "dist/api/chat.js": {
                    "maxDuration": 30
                },
                "dist/api/realtime-token.js": {
                    "maxDuration": 10
                }
            }
        };
        
        fs.writeFileSync(path.join(this.buildDir, 'vercel.json'), JSON.stringify(vercelConfig, null, 2));
        
        // Update package.json with build scripts
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        packageJson.scripts = {
            ...packageJson.scripts,
            "build": "node build.js",
            "build:analyze": "node build.js --analyze",
            "dev": "vercel dev",
            "deploy": "npm run build && vercel --prod"
        };
        
        packageJson.devDependencies = {
            ...packageJson.devDependencies,
            "terser": "^5.24.0",
            "clean-css": "^5.3.2",
            "html-minifier-terser": "^7.2.0"
        };
        
        fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
    }

    copyRecursive(src, dest) {
        const stats = fs.statSync(src);
        
        if (stats.isDirectory()) {
            if (!fs.existsSync(dest)) {
                fs.mkdirSync(dest, { recursive: true });
            }
            
            fs.readdirSync(src).forEach(child => {
                this.copyRecursive(path.join(src, child), path.join(dest, child));
            });
        } else {
            fs.copyFileSync(src, dest);
        }
    }
}

// Run the build
if (require.main === module) {
    const builder = new BuildOptimizer();
    builder.build();
}

module.exports = BuildOptimizer;