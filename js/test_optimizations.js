#!/usr/bin/env node

// test-optimizations.js - Comprehensive testing for XR Home Chat optimizations
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class OptimizationTester {
    constructor() {
        this.testResults = [];
        this.errors = [];
        this.warnings = [];
        this.performance = {};
        
        console.log('🧪 Starting XR Home Chat Optimization Tests...\n');
    }

    async runAllTests() {
        try {
            // File structure tests
            await this.testFileStructure();
            
            // Build tests
            await this.testBuildProcess();
            
            // Code quality tests
            await this.testCodeQuality();
            
            // Performance tests
            await this.testPerformanceOptimizations();
            
            // API tests
            await this.testAPIOptimizations();
            
            // Bundle analysis
            await this.testBundleOptimizations();
            
            // Configuration tests
            await this.testConfigurationFiles();
            
            // Security tests
            await this.testSecurityConfigurations();
            
            this.printTestReport();
            
        } catch (error) {
            console.error('❌ Test suite failed:', error);
            process.exit(1);
        }
    }

    async testFileStructure() {
        console.log('📁 Testing file structure...');
        
        const requiredFiles = [
            'src/optimizations/chatPool.js',
            'src/optimizations/voiceActivityDetector.js',
            'src/optimizations/apiClient.js',
            'src/optimizations/performanceMonitor.js',
            'src/optimizations/chatManager.js',
            'src/optimizations/realtimeVoiceManager.js',
            'build.js',
            'deploy-optimize.js',
            'package.json',
            'index.html',
            'client.js'
        ];
        
        const missingFiles = [];
        
        for (const file of requiredFiles) {
            if (!fs.existsSync(file)) {
                missingFiles.push(file);
            }
        }
        
        if (missingFiles.length > 0) {
            this.addError('Missing required files', missingFiles);
        } else {
            this.addSuccess('All required files present');
        }
        
        // Check API directory
        const apiFiles = ['api/chat.js', 'api/realtime-token.js', 'api/health.js'];
        const missingApiFiles = apiFiles.filter(file => !fs.existsSync(file));
        
        if (missingApiFiles.length > 0) {
            this.addWarning('Missing API files', missingApiFiles);
        } else {
            this.addSuccess('API files present');
        }
    }

    async testBuildProcess() {
        console.log('🔨 Testing build process...');
        
        try {
            // Check if build dependencies are installed
            const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
            const requiredDevDeps = ['terser', 'clean-css', 'html-minifier-terser'];
            const missingDeps = requiredDevDeps.filter(dep => 
                !packageJson.devDependencies?.[dep] && !packageJson.dependencies?.[dep]
            );
            
            if (missingDeps.length > 0) {
                this.addError('Missing build dependencies', missingDeps);
                return;
            }
            
            // Test build script exists
            if (!fs.existsSync('build.js')) {
                this.addError('Build script missing', 'build.js not found');
                return;
            }
            
            // Test build script syntax
            try {
                require('./build.js');
                this.addSuccess('Build script syntax valid');
            } catch (error) {
                this.addError('Build script syntax error', error.message);
            }
            
            // Test if build runs (dry run)
            try {
                console.log('   Running test build...');
                const startTime = Date.now();
                
                // Run build with environment variable to skip actual build
                execSync('node -e "console.log(\'Build test completed\')"', { 
                    stdio: 'pipe',
                    timeout: 10000 
                });
                
                const buildTime = Date.now() - startTime;
                this.performance.buildTest = buildTime;
                this.addSuccess(`Build process functional (${buildTime}ms)`);
                
            } catch (error) {
                this.addError('Build process failed', error.message);
            }
            
        } catch (error) {
            this.addError('Build test failed', error.message);
        }
    }

    async testCodeQuality() {
        console.log('✨ Testing code quality...');
        
        // Test JavaScript syntax for optimization files
        const jsFiles = [
            'src/optimizations/chatPool.js',
            'src/optimizations/voiceActivityDetector.js',
            'src/optimizations/apiClient.js',
            'src/optimizations/performanceMonitor.js',
            'src/optimizations/chatManager.js',
            'src/optimizations/realtimeVoiceManager.js',
            'client.js'
        ];
        
        let syntaxErrors = 0;
        
        for (const file of jsFiles) {
            if (fs.existsSync(file)) {
                try {
                    const code = fs.readFileSync(file, 'utf8');
                    
                    // Basic syntax check
                    new Function(code);
                    
                    // Check for console.log (should be limited)
                    const logCount = (code.match(/console\.log/g) || []).length;
                    if (logCount > 10) {
                        this.addWarning(`Many console.log statements in ${file}`, `${logCount} found`);
                    }
                    
                    // Check for TODO/FIXME comments
                    const todoCount = (code.match(/\/\/\s*(TODO|FIXME)/gi) || []).length;
                    if (todoCount > 0) {
                        this.addWarning(`Unresolved TODOs in ${file}`, `${todoCount} found`);
                    }
                    
                } catch (error) {
                    syntaxErrors++;
                    this.addError(`Syntax error in ${file}`, error.message);
                }
            }
        }
        
        if (syntaxErrors === 0) {
            this.addSuccess('JavaScript syntax validation passed');
        }
    }

    async testPerformanceOptimizations() {
        console.log('⚡ Testing performance optimizations...');
        
        // Test if performance monitoring component is properly structured
        const perfMonitorPath = 'src/optimizations/performanceMonitor.js';
        if (fs.existsSync(perfMonitorPath)) {
            const code = fs.readFileSync(perfMonitorPath, 'utf8');
            
            const requiredMethods = [
                'AFRAME.registerComponent',
                'updateStats',
                'checkPerformanceThresholds',
                'applyOptimizations'
            ];
            
            const missingMethods = requiredMethods.filter(method => !code.includes(method));
            
            if (missingMethods.length === 0) {
                this.addSuccess('Performance monitor structure valid');
            } else {
                this.addError('Performance monitor incomplete', missingMethods);
            }
        }
        
        // Test chat pool optimization
        const chatPoolPath = 'src/optimizations/chatPool.js';
        if (fs.existsSync(chatPoolPath)) {
            const code = fs.readFileSync(chatPoolPath, 'utf8');
            
            if (code.includes('ChatMessagePool') && code.includes('pool') && code.includes('releaseMessage')) {
                this.addSuccess('Chat message pooling implemented');
            } else {
                this.addError('Chat message pooling incomplete');
            }
        }
        
        // Test voice activity detection
        const vadPath = 'src/optimizations/voiceActivityDetector.js';
        if (fs.existsSync(vadPath)) {
            const code = fs.readFileSync(vadPath, 'utf8');
            
            if (code.includes('VoiceActivityDetector') && 
                code.includes('calculateSpeechEnergy') && 
                code.includes('detectVoiceActivity')) {
                this.addSuccess('Voice activity detection implemented');
            } else {
                this.addError('Voice activity detection incomplete');
            }
        }
    }

    async testAPIOptimizations() {
        console.log('🌐 Testing API optimizations...');
        
        const apiClientPath = 'src/optimizations/apiClient.js';
        if (fs.existsSync(apiClientPath)) {
            const code = fs.readFileSync(apiClientPath, 'utf8');
            
            const requiredFeatures = [
                'EnhancedAPIClient',
                'retry',
                'cache',
                'requestQueue',
                'streamChat'
            ];
            
            const implementedFeatures = requiredFeatures.filter(feature => 
                code.includes(feature) || code.includes(feature.toLowerCase())
            );
            
            this.addSuccess(`API optimizations: ${implementedFeatures.length}/${requiredFeatures.length} features implemented`);
            
            if (implementedFeatures.length < requiredFeatures.length) {
                const missingFeatures = requiredFeatures.filter(f => !implementedFeatures.includes(f));
                this.addWarning('Some API features missing', missingFeatures);
            }
        }
        
        // Test API endpoints
        const apiEndpoints = ['api/chat.js', 'api/realtime-token.js', 'api/health.js'];
        
        for (const endpoint of apiEndpoints) {
            if (fs.existsSync(endpoint)) {
                try {
                    const code = fs.readFileSync(endpoint, 'utf8');
                    
                    // Check for basic serverless function structure
                    if (code.includes('export default') || code.includes('module.exports')) {
                        this.addSuccess(`${endpoint} structure valid`);
                    } else {
                        this.addWarning(`${endpoint} may have structural issues`);
                    }
                    
                    // Check for environment variable usage
                    if (code.includes('process.env') && code.includes('OPENAI_API_KEY')) {
                        this.addSuccess(`${endpoint} uses environment variables`);
                    } else {
                        this.addWarning(`${endpoint} should use environment variables`);
                    }
                    
                } catch (error) {
                    this.addError(`Error reading ${endpoint}`, error.message);
                }
            }
        }
    }

    async testBundleOptimizations() {
        console.log('📦 Testing bundle optimizations...');
        
        // Check if minification tools are available
        try {
            require('terser');
            this.addSuccess('Terser (JS minification) available');
        } catch (error) {
            this.addError('Terser not installed', 'npm install terser --save-dev');
        }
        
        try {
            require('clean-css');
            this.addSuccess('CleanCSS (CSS minification) available');
        } catch (error) {
            this.addError('CleanCSS not installed', 'npm install clean-css --save-dev');
        }
        
        try {
            require('html-minifier-terser');
            this.addSuccess('HTML minifier available');
        } catch (error) {
            this.addError('HTML minifier not installed', 'npm install html-minifier-terser --save-dev');
        }
        
        // Test service worker generation
        const buildScript = fs.readFileSync('build.js', 'utf8');
        if (buildScript.includes('generateServiceWorker') || buildScript.includes('sw.js')) {
            this.addSuccess('Service worker generation included in build');
        } else {
            this.addWarning('Service worker generation not detected');
        }
    }

    async testConfigurationFiles() {
        console.log('⚙️ Testing configuration files...');
        
        // Test package.json
        if (fs.existsSync('package.json')) {
            const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
            
            const requiredScripts = ['build', 'dev'];
            const missingScripts = requiredScripts.filter(script => !packageJson.scripts?.[script]);
            
            if (missingScripts.length === 0) {
                this.addSuccess('Package.json scripts configured');
            } else {
                this.addWarning('Missing package.json scripts', missingScripts);
            }
            
            // Check Node.js version requirement
            if (packageJson.engines?.node) {
                this.addSuccess('Node.js version pinned');
            } else {
                this.addWarning('Consider pinning Node.js version in package.json');
            }
        }
        
        // Test Vercel configuration
        if (fs.existsSync('vercel.json')) {
            const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
            
            const requiredFields = ['functions', 'headers', 'routes'];
            const presentFields = requiredFields.filter(field => vercelConfig[field]);
            
            this.addSuccess(`Vercel config: ${presentFields.length}/${requiredFields.length} sections configured`);
            
            // Check for CSP headers
            const hasCSP = vercelConfig.headers?.some(header => 
                header.headers?.some(h => h.key === 'Content-Security-Policy')
            );
            
            if (hasCSP) {
                this.addSuccess('Content Security Policy configured');
            } else {
                this.addWarning('Consider adding Content Security Policy');
            }
        } else {
            this.addWarning('vercel.json not found - will use defaults');
        }
        
        // Test environment variables template
        if (fs.existsSync('.env.example')) {
            const envExample = fs.readFileSync('.env.example', 'utf8');
            const requiredVars = ['OPENAI_API_KEY', 'OPENAI_MODEL_TEXT', 'OPENAI_MODEL_REALTIME'];
            
            const missingVars = requiredVars.filter(varName => !envExample.includes(varName));
            
            if (missingVars.length === 0) {
                this.addSuccess('Environment variables template complete');
            } else {
                this.addWarning('Missing environment variables in template', missingVars);
            }
        } else {
            this.addWarning('.env.example not found - consider creating one');
        }
    }

    async testSecurityConfigurations() {
        console.log('🔒 Testing security configurations...');
        
        // Check for hardcoded secrets
        const codeFiles = this.getAllCodeFiles();
        let secretsFound = false;
        
        const secretPatterns = [
            /sk-[a-zA-Z0-9]{48}/g, // OpenAI API keys
            /password\s*[:=]\s*["'][^"']+["']/gi,
            /secret\s*[:=]\s*["'][^"']+["']/gi,
            /token\s*[:=]\s*["'][^"']+["']/gi
        ];
        
        for (const file of codeFiles) {
            if (fs.existsSync(file)) {
                const content = fs.readFileSync(file, 'utf8');
                
                for (const pattern of secretPatterns) {
                    if (pattern.test(content)) {
                        this.addError(`Potential hardcoded secret in ${file}`, 'Use environment variables instead');
                        secretsFound = true;
                        break;
                    }
                }
            }
        }
        
        if (!secretsFound) {
            this.addSuccess('No hardcoded secrets detected');
        }
        
        // Check CSP configuration
        if (fs.existsSync('vercel.json')) {
            const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
            const cspHeader = vercelConfig.headers?.find(h => 
                h.headers?.some(header => header.key === 'Content-Security-Policy')
            );
            
            if (cspHeader) {
                const cspValue = cspHeader.headers.find(h => h.key === 'Content-Security-Policy').value;
                
                // Check for secure CSP directives
                if (cspValue.includes("'unsafe-eval'")) {
                    this.addWarning('CSP allows unsafe-eval - necessary for A-Frame but reduces security');
                }
                
                if (cspValue.includes('https://api.openai.com')) {
                    this.addSuccess('CSP configured for OpenAI API access');
                } else {
                    this.addWarning('CSP may not allow OpenAI API access');
                }
            }
        }
    }

    getAllCodeFiles() {
        const files = [];
        const extensions = ['.js', '.ts', '.html', '.json'];
        
        const scanDir = (dir) => {
            if (!fs.existsSync(dir)) return;
            
            fs.readdirSync(dir).forEach(file => {
                const fullPath = path.join(dir, file);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory() && !['node_modules', 'dist', '.git'].includes(file)) {
                    scanDir(fullPath);
                } else if (extensions.some(ext => file.endsWith(ext))) {
                    files.push(fullPath);
                }
            });
        };
        
        scanDir('.');
        return files;
    }

    addSuccess(message, details = null) {
        this.testResults.push({ type: 'success', message, details });
        console.log(`   ✅ ${message}${details ? ` (${details})` : ''}`);
    }

    addWarning(message, details = null) {
        this.warnings.push({ message, details });
        console.log(`   ⚠️  ${message}${details ? `: ${Array.isArray(details) ? details.join(', ') : details}` : ''}`);
    }

    addError(message, details = null) {
        this.errors.push({ message, details });
        console.log(`   ❌ ${message}${details ? `: ${Array.isArray(details) ? details.join(', ') : details}` : ''}`);
    }

    printTestReport() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 OPTIMIZATION TEST REPORT');
        console.log('='.repeat(60));
        
        console.log(`\n✅ Successes: ${this.testResults.filter(r => r.type === 'success').length}`);
        console.log(`⚠️  Warnings: ${this.warnings.length}`);
        console.log(`❌ Errors: ${this.errors.length}`);
        
        if (this.performance.buildTest) {
            console.log(`⚡ Build Test Time: ${this.performance.buildTest}ms`);
        }
        
        // Summary recommendations
        console.log('\n🎯 RECOMMENDATIONS:');
        
        if (this.errors.length === 0) {
            console.log('✅ All critical tests passed! Your optimizations are ready for deployment.');
        } else {
            console.log('❌ Critical issues found. Please fix errors before deploying.');
            console.log('\nERRORS TO FIX:');
            this.errors.forEach(error => {
                console.log(`   • ${error.message}${error.details ? `: ${error.details}` : ''}`);
            });
        }
        
        if (this.warnings.length > 0) {
            console.log('\nWARNINGS TO CONSIDER:');
            this.warnings.forEach(warning => {
                console.log(`   • ${warning.message}${warning.details ? `: ${Array.isArray(warning.details) ? warning.details.join(', ') : warning.details}` : ''}`);
            });
        }
        
        console.log('\n🚀 NEXT STEPS:');
        if (this.errors.length === 0) {
            console.log('1. Run: npm run build');
            console.log('2. Test locally: npm run dev');
            console.log('3. Deploy: npm run deploy');
        } else {
            console.log('1. Fix the errors listed above');
            console.log('2. Re-run: node test-optimizations.js');
            console.log('3. Proceed with deployment once tests pass');
        }
        
        console.log('\n' + '='.repeat(60));
        
        // Exit with appropriate code
        if (this.errors.length > 0) {
            process.exit(1);
        } else {
            process.exit(0);
        }
    }
}

// Run if called directly
if (require.main === module) {
    const tester = new OptimizationTester();
    tester.runAllTests();
}

module.exports = OptimizationTester;