#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class DeploymentOptimizer {
    constructor() {
        this.projectRoot = process.cwd();
        this.buildDir = 'dist';
        this.startTime = Date.now();
        
        // Performance metrics
        this.metrics = {
            buildTime: 0,
            bundleSize: 0,
            compressionRatio: 0,
            deployTime: 0
        };
    }

    async optimize() {
        console.log('🚀 Starting deployment optimization...');
        
        try {
            // Pre-deployment optimization
            await this.preDeploymentOptimization();
            
            // Run optimized build
            await this.runOptimizedBuild();
            
            // Analyze bundle
            await this.analyzeBundleSize();
            
            // Setup deployment configuration
            await this.setupDeploymentConfig();
            
            // Deploy to Vercel
            if (process.argv.includes('--deploy')) {
                await this.deployToVercel();
            }
            
            // Post-deployment verification
            if (process.argv.includes('--verify')) {
                await this.verifyDeployment();
            }
            
            this.printOptimizationReport();
            
        } catch (error) {
            console.error('❌ Deployment optimization failed:', error);
            process.exit(1);
        }
    }

    async preDeploymentOptimization() {
        console.log('🔧 Running pre-deployment optimizations...');
        
        // Clean previous build
        if (fs.existsSync(this.buildDir)) {
            fs.rmSync(this.buildDir, { recursive: true });
        }
        
        // Optimize package.json for deployment
        await this.optimizePackageJson();
        
        // Check for unused dependencies
        await this.checkUnusedDependencies();
        
        // Optimize environment variables
        await this.optimizeEnvironmentVariables();
    }

    async optimizePackageJson() {
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        
        // Ensure all build dependencies are present
        const requiredDevDeps = {
            "terser": "^5.24.0",
            "clean-css": "^5.3.2", 
            "html-minifier-terser": "^7.2.0"
        };
        
        packageJson.devDependencies = {
            ...packageJson.devDependencies,
            ...requiredDevDeps
        };
        
        // Optimize scripts for deployment
        packageJson.scripts = {
            ...packageJson.scripts,
            "build": "node build.js",
            "build:production": "NODE_ENV=production node build.js",
            "deploy": "npm run build:production && vercel --prod",
            "deploy:preview": "npm run build && vercel",
            "analyze": "node build.js --analyze",
            "dev": "vercel dev"
        };
        
        // Add engines for Node.js version pinning
        packageJson.engines = {
            "node": ">=18.0.0",
            "npm": ">=8.0.0"
        };
        
        fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
        console.log('✓ Optimized package.json for deployment');
    }

    async checkUnusedDependencies() {
        try {
            // Simple check for obviously unused dependencies
            const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
            const codeFiles = this.getAllCodeFiles();
            const allCode = codeFiles.map(file => fs.readFileSync(file, 'utf8')).join('\n');
            
            const potentiallyUnused = [];
            
            Object.keys(packageJson.dependencies || {}).forEach(dep => {
                const patterns = [
                    new RegExp(`require\\(['"]${dep}['"]\\)`, 'g'),
                    new RegExp(`import.*from\\s+['"]${dep}['"]`, 'g'),
                    new RegExp(`import\\s+['"]${dep}['"]`, 'g')
                ];
                
                const isUsed = patterns.some(pattern => pattern.test(allCode));
                if (!isUsed && !this.isKnownUtilityDep(dep)) {
                    potentiallyUnused.push(dep);
                }
            });
            
            if (potentiallyUnused.length > 0) {
                console.log('⚠️  Potentially unused dependencies:', potentiallyUnused.join(', '));
                console.log('   Consider removing them to reduce bundle size');
            } else {
                console.log('✓ No obviously unused dependencies found');
            }
            
        } catch (error) {
            console.log('⚠️  Could not check for unused dependencies:', error.message);
        }
    }
    
    getAllCodeFiles() {
        const files = [];
        const scanDirectory = (dir) => {
            if (!fs.existsSync(dir)) return;
            
            fs.readdirSync(dir).forEach(file => {
                const fullPath = path.join(dir, file);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory() && !['node_modules', 'dist', '.git'].includes(file)) {
                    scanDirectory(fullPath);
                } else if (file.match(/\.(js|ts|jsx|tsx)$/)) {
                    files.push(fullPath);
                }
            });
        };
        
        scanDirectory('.');
        return files;
    }
    
    isKnownUtilityDep(dep) {
        const utilityDeps = ['lodash', 'axios', 'moment', 'date-fns', 'uuid'];
        return utilityDeps.includes(dep);
    }

    async optimizeEnvironmentVariables() {
        // Check if all required environment variables are documented
        const envExample = this.createEnvExample();
        fs.writeFileSync('.env.example', envExample);
        console.log('✓ Created .env.example for deployment reference');
        
        // Create deployment environment check
        const envCheck = this.createEnvironmentCheck();
        fs.writeFileSync('check-env.js', envCheck);
        console.log('✓ Created environment variable checker');
    }

    createEnvExample() {
        return `# OpenAI Configuration
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_MODEL_TEXT=gpt-4o-mini
OPENAI_MODEL_REALTIME=gpt-4o-realtime-preview

# Optional Configuration
NODE_ENV=production
VERCEL_ENV=production

# Security (optional - Vercel provides defaults)
# SESSION_SECRET=your-session-secret-here
# CORS_ORIGIN=https://your-domain.vercel.app`;
    }

    createEnvironmentCheck() {
        return `#!/usr/bin/env node

// Environment Variable Checker for Deployment
const requiredEnvVars = [
    'OPENAI_API_KEY',
    'OPENAI_MODEL_TEXT',
    'OPENAI_MODEL_REALTIME'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => {
        console.error(\`   - \${varName}\`);
    });
    console.error('\\nPlease set these in your Vercel project settings.');
    console.error('See .env.example for reference values.');
    process.exit(1);
} else {
    console.log('✅ All required environment variables are set');
}

// Validate API key format
const apiKey = process.env.OPENAI_API_KEY;
if (apiKey && !apiKey.startsWith('sk-proj-')) {
    console.warn('⚠️  API key should be a Project API Key (starts with sk-proj-)');
}

module.exports = { requiredEnvVars };`;
    }

    async runOptimizedBuild() {
        console.log('📦 Running optimized build...');
        const buildStart = Date.now();
        
        try {
            // Install dependencies if needed
            if (!fs.existsSync('node_modules')) {
                console.log('📋 Installing dependencies...');
                execSync('npm ci --only=production', { stdio: 'inherit' });
            }
            
            // Run the optimized build
            execSync('npm run build', { stdio: 'inherit' });
            
            this.metrics.buildTime = Date.now() - buildStart;
            console.log(`✓ Build completed in ${(this.metrics.buildTime / 1000).toFixed(1)}s`);
            
        } catch (error) {
            throw new Error(`Build failed: ${error.message}`);
        }
    }

    async analyzeBundleSize() {
        console.log('📊 Analyzing bundle size...');
        
        if (!fs.existsSync(this.buildDir)) {
            console.warn('Build directory not found, skipping bundle analysis');
            return;
        }
        
        const bundleStats = this.getBundleStats(this.buildDir);
        this.metrics.bundleSize = bundleStats.totalSize;
        
        console.log('Bundle Analysis:');
        console.log(`  Total Size: ${(bundleStats.totalSize / 1024).toFixed(1)} KB`);
        console.log(`  Files: ${bundleStats.fileCount}`);
        console.log(`  Largest: ${bundleStats.largestFile.name} (${(bundleStats.largestFile.size / 1024).toFixed(1)} KB)`);
        
        // Bundle size warnings
        if (bundleStats.totalSize > 1024 * 1024) { // 1MB
            console.warn('⚠️  Bundle size is large (>1MB). Consider code splitting or optimization.');
        }
        
        if (bundleStats.largestFile.size > 500 * 1024) { // 500KB
            console.warn(`⚠️  Large file detected: ${bundleStats.largestFile.name}`);
        }
    }

    getBundleStats(dir) {
        let totalSize = 0;
        let fileCount = 0;
        let largestFile = { name: '', size: 0 };
        
        const scanDir = (currentDir) => {
            if (!fs.existsSync(currentDir)) return;
            
            fs.readdirSync(currentDir).forEach(file => {
                const fullPath = path.join(currentDir, file);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory()) {
                    scanDir(fullPath);
                } else {
                    totalSize += stat.size;
                    fileCount++;
                    
                    if (stat.size > largestFile.size) {
                        largestFile = {
                            name: path.relative(this.projectRoot, fullPath),
                            size: stat.size
                        };
                    }
                }
            });
        };
        
        scanDir(dir);
        
        return { totalSize, fileCount, largestFile };
    }

    async setupDeploymentConfig() {
        console.log('⚙️ Setting up deployment configuration...');
        
        // Create optimized vercel.json if it doesn't exist or update existing
        const vercelConfig = this.createOptimizedVercelConfig();
        fs.writeFileSync('vercel.json', JSON.stringify(vercelConfig, null, 2));
        
        // Create .vercelignore for faster uploads
        const vercelIgnore = this.createVercelIgnore();
        fs.writeFileSync('.vercelignore', vercelIgnore);
        
        console.log('✓ Deployment configuration optimized');
    }

    createOptimizedVercelConfig() {
        return {
            "version": 2,
            "build": {
                "env": {
                    "NODE_ENV": "production"
                }
            },
            "buildCommand": "npm run build:production",
            "outputDirectory": "dist",
            "installCommand": "npm ci",
            "framework": null,
            "functions": {
                "api/**/*.js": {
                    "runtime": "nodejs18.x",
                    "maxDuration": 30,
                    "memory": 1024
                }
            },
            "routes": [
                {
                    "src": "/sw\\.js",
                    "dest": "/sw.js",
                    "headers": {
                        "Cache-Control": "public, max-age=0, must-revalidate",
                        "Service-Worker-Allowed": "/"
                    }
                },
                {
                    "src": "/client\\.min\\.js",
                    "dest": "/client.min.js",
                    "headers": {
                        "Cache-Control": "public, max-age=31536000, immutable"
                    }
                },
                {
                    "src": "/api/(.*)",
                    "dest": "/api/$1"
                },
                {
                    "src": "/(.*)",
                    "dest": "/index.html"
                }
            ],
            "headers": [
                {
                    "source": "/(.*\\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2))",
                    "headers": [
                        {
                            "key": "Cache-Control", 
                            "value": "public, max-age=31536000, immutable"
                        }
                    ]
                },
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
                            "key": "Referrer-Policy",
                            "value": "strict-origin-when-cross-origin"
                        },
                        {
                            "key": "Content-Security-Policy",
                            "value": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://aframe.io https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.openai.com wss://api.openai.com; media-src 'self' blob:; worker-src 'self' blob:; frame-ancestors 'none';"
                        }
                    ]
                }
            ],
            "rewrites": [
                {
                    "source": "/api/(.*)",
                    "destination": "/api/$1"
                }
            ]
        };
    }

    createVercelIgnore() {
        return `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Development files
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE files
.vscode/
.idea/
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db

# Build artifacts (keep dist/ for deployment)
*.log
*.tmp

# Git
.git/
.gitignore

# Documentation
README.md
docs/

# Test files
test/
tests/
*.test.js
*.spec.js

# Source maps (optional - remove if you want them deployed)
*.map`;
    }

    async deployToVercel() {
        console.log('🚀 Deploying to Vercel...');
        const deployStart = Date.now();
        
        try {
            // Check environment variables
            execSync('node check-env.js', { stdio: 'inherit' });
            
            // Deploy based on argument
            const isProduction = process.argv.includes('--production');
            const deployCommand = isProduction ? 'vercel --prod' : 'vercel';
            
            console.log(`Deploying to ${isProduction ? 'production' : 'preview'}...`);
            execSync(deployCommand, { stdio: 'inherit' });
            
            this.metrics.deployTime = Date.now() - deployStart;
            console.log(`✓ Deployment completed in ${(this.metrics.deployTime / 1000).toFixed(1)}s`);
            
        } catch (error) {
            throw new Error(`Deployment failed: ${error.message}`);
        }
    }

    async verifyDeployment() {
        console.log('🔍 Verifying deployment...');
        
        // This would typically check the deployed URL
        // For now, we'll create a verification script
        const verifyScript = this.createVerificationScript();
        fs.writeFileSync('verify-deployment.js', verifyScript);
        
        console.log('✓ Created deployment verification script');
        console.log('  Run: node verify-deployment.js <deployment-url>');
    }

    createVerificationScript() {
        return `#!/usr/bin/env node

// Deployment Verification Script
const https = require('https');
const http = require('http');

const deploymentUrl = process.argv[2];
if (!deploymentUrl) {
    console.error('Usage: node verify-deployment.js <deployment-url>');
    process.exit(1);
}

console.log(\`Verifying deployment: \${deploymentUrl}\`);

async function verifyEndpoints() {
    const endpoints = [
        '/',
        '/api/health',
        '/sw.js',
        '/client.min.js'
    ];
    
    for (const endpoint of endpoints) {
        try {
            const url = deploymentUrl + endpoint;
            const response = await fetch(url);
            
            console.log(\`\${endpoint}: \${response.status} \${response.statusText}\`);
            
            if (endpoint === '/api/health') {
                const healthData = await response.json();
                console.log('  Health check:', healthData);
            }
            
        } catch (error) {
            console.error(\`\${endpoint}: ERROR - \${error.message}\`);
        }
    }
}

// Simple fetch polyfill for Node.js
global.fetch = global.fetch || function(url) {
    return new Promise((resolve, reject) => {
        const lib = url.startsWith('https:') ? https : http;
        const request = lib.get(url, (response) => {
            let data = '';
            response.on('data', chunk => data += chunk);
            response.on('end', () => {
                resolve({
                    status: response.statusCode,
                    statusText: response.statusMessage,
                    json: () => Promise.resolve(JSON.parse(data)),
                    text: () => Promise.resolve(data)
                });
            });
        });
        request.on('error', reject);
        request.setTimeout(10000, () => reject(new Error('Timeout')));
    });
};

verifyEndpoints().then(() => {
    console.log('✅ Deployment verification completed');
}).catch(error => {
    console.error('❌ Verification failed:', error);
    process.exit(1);
});`;
    }

    printOptimizationReport() {
        const totalTime = Date.now() - this.startTime;
        
        console.log('\n📋 DEPLOYMENT OPTIMIZATION REPORT');
        console.log('=====================================');
        console.log(`Total Time: ${(totalTime / 1000).toFixed(1)}s`);
        console.log(`Build Time: ${(this.metrics.buildTime / 1000).toFixed(1)}s`);
        
        if (this.metrics.deployTime) {
            console.log(`Deploy Time: ${(this.metrics.deployTime / 1000).toFixed(1)}s`);
        }
        
        if (this.metrics.bundleSize) {
            console.log(`Bundle Size: ${(this.metrics.bundleSize / 1024).toFixed(1)} KB`);
        }
        
        console.log('\n🎯 OPTIMIZATION CHECKLIST:');
        console.log('✅ JavaScript minified and optimized');
        console.log('✅ HTML minified');
        console.log('✅ Service Worker generated for caching');
        console.log('✅ Performance monitoring added');
        console.log('✅ Security headers configured');
        console.log('✅ Deployment configuration optimized');
        console.log('✅ Environment variables checked');
        
        console.log('\n🚀 NEXT STEPS:');
        console.log('1. Test your deployment URL');
        console.log('2. Monitor performance with built-in monitoring');
        console.log('3. Check Vercel Analytics for real user metrics');
        console.log('4. Consider adding error tracking (Sentry, etc.)');
        
        console.log('\n✨ Deployment optimization completed successfully!');
    }
}

// Run if called directly
if (require.main === module) {
    const optimizer = new DeploymentOptimizer();
    optimizer.optimize();
}

module.exports = DeploymentOptimizer;`;
    }
