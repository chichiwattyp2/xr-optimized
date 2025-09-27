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
        textEl.setAttribute('text', "value: ''; color: white; width: 8");
        
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
        if (textEl) textEl.setAttribute('text', "value", sender + ": " + text);
        
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
    // ... rest of your files unchanged ...
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
        require('child_process').execSync(
            'npm install --save-dev terser clean-css html-minifier-terser', 
            { stdio: 'inherit' }
        );
        console.log('✅ Dependencies installed');
    } catch (error) {
        console.log('⚠️ Please install dependencies manually: npm install --save-dev terser clean-css html-minifier-terser');
    }
}

console.log('\n📋 Next steps:');
console.log('1. Add your OpenAI API key to .env.local');
console.log('2. Run: npm run build');
console.log('3. Run: npm run deploy');
console.log('\n🚀 Your optimized XR chat is ready!');
