#!/usr/bin/env node

// generate-optimizations.js - Creates all optimization files at once
const fs = require('fs');
const path = require('path');

console.log('🚀 Generating XR Home Chat optimization files...\n');

// Create directories
const dirs = [
    'src/optimizations',
    'dist',
    'api',
    '.github/workflows'
];

dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Created directory: ${dir}`);
    }
});

// File templates - Essential optimizations only for quick start
const files = {
    'src/optimizations/chatPool.js': `// Essential chat message pooling optimization
class ChatMessagePool {
    constructor(initialSize = 10) {
        this.pool = [];
        this.activeMessages = new Map();
        this.scene = document.querySelector('a-scene');
        
        // Pre-create elements
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(this.createElement());
        }
        
        console.log('💬 Chat message pooling enabled');
    }
    
    createElement() {
        const messageEl = document.createElement('a-entity');
        const textEl = document.createElement('a-text');
        const bgEl = document.createElement('a-plane');
        
        bgEl.setAttribute('geometry', 'width: 4; height: 0.6');
        bgEl.setAttribute('material', 'color: #1a1a1a; opacity: 0.8; transparent: true');
        textEl.setAttribute('text', 'value: ""; color: white; width: 8');
        
        messageEl.appendChild(bgEl);
        messageEl.appendChild(textEl);
        messageEl.setAttribute('visible', false);
        
        if (this.scene) this.scene.appendChild(messageEl);
        return messageEl;
    }
    
    getMessage(id, text, sender, position) {
        let element = this.pool.pop();
        if (!element) element = this.createElement();
        
        const textEl = element.querySelector('a-text');
        if (textEl) textEl.setAttribute('text', 'value', \`\${sender}: \${text}\`);
        
        element.setAttribute('position', position);
        element.setAttribute('visible', true);
        
        this.activeMessages.set(id, element);
        return element;
    }
    
    releaseMessage(id) {
        const element = this.activeMessages.get(id);
        if (element) {
            element.setAttribute('visible', false);
            this.activeMessages.delete(id);
            this.pool.push(element);
        }
    }
    
    cleanup() {
        if (this.activeMessages.size > 20) {
            const oldIds = Array.from(this.activeMessages.keys()).slice(0, 10);
            oldIds.forEach(id => this.releaseMessage(id));
        }
    }
}

window.ChatMessagePool = ChatMessagePool;`,

    'src/optimizations/apiClient.js': `// Essential API client with retry logic
class EnhancedAPIClient {
    constructor() {
        this.requestQueue = [];
        this.isProcessing = false;
        this.stats = { totalRequests: 0, failedRequests: 0 };
        console.log('🌐 Enhanced API client enabled');
    }
    
    async makeRequest(endpoint, options = {}, retries = 3) {
        this.stats.totalRequests++;
        let lastError;
        
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const response = await fetch(\`/api\${endpoint}\`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...options.headers
                    },
                    ...options
                });
                
                if (!response.ok) {
                    throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
                }
                
                return await response.json();
                
            } catch (error) {
                lastError = error;
                
                if (attempt < retries) {
                    const delay = Math.pow(2, attempt) * 1000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        this.stats.failedRequests++;
        throw new Error(\`Request failed after \${retries + 1} attempts: \${lastError.message}\`);
    }
    
    async *streamChat(messages) {
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages, stream: true })
            });
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\\n');
                buffer = lines.pop() || '';
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') return;
                        
                        try {
                            yield JSON.parse(data);
                        } catch (e) {
                            console.warn('Failed to parse SSE data');
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Streaming error:', error);
            throw error;
        }
    }
    
    getStats() {
        return { ...this.stats };
    }
}

window.EnhancedAPIClient = EnhancedAPIClient;
window.apiClient = new EnhancedAPIClient();`,

    'build.js': `#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { minify } = require('terser');

console.log('🚀 Building optimized XR Home Chat...');

// Create dist directory
if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist', { recursive: true });
}

// Copy and optimize HTML
const html = fs.readFileSync('index.html', 'utf8');
const optimizedHtml = html
    .replace(/\\s+/g, ' ')
    .replace(/<!--[\\s\\S]*?-->/g, '');

fs.writeFileSync('dist/index.html', optimizedHtml);

// Combine and minify JavaScript
const jsFiles = [
    'src/optimizations/chatPool.js',
    'src/optimizations/apiClient.js',
    'client.js'
];

let combinedJs = '';

jsFiles.forEach(file => {
    if (fs.existsSync(file)) {
        combinedJs += fs.readFileSync(file, 'utf8') + '\\n';
    }
});

// Add initialization code
combinedJs += \`
// Auto-initialize optimizations
document.addEventListener('DOMContentLoaded', () => {
    if (window.ChatMessagePool) {
        window.messagePool = new ChatMessagePool();
    }
    
    // Add performance monitoring to scene
    const scene = document.querySelector('a-scene');
    if (scene) {
        scene.addEventListener('loaded', () => {
            console.log('✅ XR optimizations active');
        });
    }
});
\`;

// Minify JavaScript
minify(combinedJs, {
    compress: {
        dead_code: true,
        drop_console: false
    },
    mangle: true
}).then(result => {
    fs.writeFileSync('dist/client.min.js', result.code);
    console.log('✅ JavaScript optimized and minified');
    
    // Update HTML to use minified JS
    const updatedHtml = optimizedHtml.replace(
        'client.js',
        'client.min.js'
    );
    fs.writeFileSync('dist/index.html', updatedHtml);
    
}).catch(error => {
    console.error('Minification failed:', error);
    // Fallback: copy unminified
    fs.writeFileSync('dist/client.js', combinedJs);
});

// Copy API files
if (fs.existsSync('api')) {
    const apiDir = path.join('dist', 'api');
    if (!fs.existsSync(apiDir)) {
        fs.mkdirSync(apiDir);
    }
    
    fs.readdirSync('api').forEach(file => {
        fs.copyFileSync(
            path.join('api', file),
            path.join(apiDir, file)
        );
    });
    console.log('✅ API files copied');
}

console.log('\\n🎉 Build complete! Files ready in dist/ directory');`,

    'package.json': `{
  "name": "xr-home-chat",
  "version": "1.0.0",
  "description": "XR Home Chat with performance optimizations",
  "main": "client.js",
  "scripts": {
    "dev": "vercel dev",
    "build": "node build.js",
    "build:production": "NODE_ENV=production node build.js",
    "deploy": "npm run build && vercel --prod",
    "test": "echo \\"Tests would run here\\"",
    "check-env": "node -e \\"console.log('Environment check:', process.env.OPENAI_API_KEY ? '✅ API key set' : '❌ API key missing')\\""
  },
  "dependencies": {
    "aframe": "^1.4.0"
  },
  "devDependencies": {
    "terser": "^5.24.0",
    "clean-css": "^5.3.2",
    "html-minifier-terser": "^7.2.0"
  },
  "keywords": ["vr", "ar", "webxr", "aframe", "openai"],
  "author": "",
  "license": "MIT"
}`,

    'vercel.json': `{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "functions": {
    "api/chat.js": {
      "maxDuration": 30
    },
    "api/realtime-token.js": {
      "maxDuration": 10
    },
    "api/health.js": {
      "maxDuration": 5
    }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Content-Security-Policy", 
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://aframe.io; connect-src 'self' https://api.openai.com wss://api.openai.com;"
        }
      ]
    }
  ]
}`,

    '.env.example': `# OpenAI API Configuration
OPENAI_API_KEY=sk-proj-your-key-here
OPENAI_MODEL_TEXT=gpt-4o-mini
OPENAI_MODEL_REALTIME=gpt-4o-realtime-preview

# Environment
NODE_ENV=production`,

    'README.md': `# 🚀 XR Home Chat - Optimized

VR/AR chat application with performance optimizations.

## Quick Start

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Set up environment:
   \`\`\`bash
   cp .env.example .env.local
   # Add your OpenAI API key
   \`\`\`

3. Build and deploy:
   \`\`\`bash
   npm run build
   npm run deploy
   \`\`\`

## Features

- ✅ Performance optimizations
- ✅ Chat message pooling  
- ✅ API retry logic
- ✅ Build optimization
- ✅ VR/AR support

## Commands

- \`npm run dev\` - Development server
- \`npm run build\` - Build for production
- \`npm run deploy\` - Deploy to Vercel
- \`npm run check-env\` - Check environment setup`
};

// Write all files
let createdCount = 0;
Object.entries(files).forEach(([filePath, content]) => {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filePath, content);
    console.log(`✅ Created: ${filePath}`);
    createdCount++;
});

console.log(`\n🎉 Generated ${createdCount} optimization files!\n`);

// Install dependencies if package.json doesn't exist or is basic
if (!fs.existsSync('package.json') || fs.readFileSync('package.json', 'utf8').length < 100) {
    console.log('📦 Installing dependencies...');
    try {
        require('child_process').execSync('npm install --save-dev terser clean-css html-minifier-terser', 
            { stdio: 'inherit' });
        console.log('✅ Dependencies installed');
    } catch (error) {
        console.log('⚠️ Please install dependencies manually: npm install --save-dev terser clean-css html-minifier-terser');
    }
}

console.log('\n📋 Next steps:');
console.log('1. Add your OpenAI API key to .env.local');
console.log('2. Run: npm run build');
console.log('3. Run: npm run deploy');
console.log('\n🚀 Your optimized XR chat is ready!');`