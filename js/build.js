import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { minify as minifyHTML } from 'html-minifier-terser';
import { minify as minifyJS } from 'terser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SOURCE_DIR = '.';
const BUILD_CACHE_DIR = '.build-cache';

// Create backup of original files
function backupFile(filePath) {
    const backupPath = path.join(BUILD_CACHE_DIR, filePath);
    const backupDir = path.dirname(backupPath);
    
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }
    
    if (fs.existsSync(filePath) && !fs.existsSync(backupPath)) {
        fs.copyFileSync(filePath, backupPath);
    }
}

// Get all HTML files from root directory
function getHTMLFiles() {
    const files = fs.readdirSync(SOURCE_DIR);
    return files.filter(file => file.endsWith('.html'));
}

// Get all JS files from js directory
function getJSFiles() {
    const jsDir = path.join(SOURCE_DIR, 'js');
    if (!fs.existsSync(jsDir)) {
        return [];
    }
    const files = fs.readdirSync(jsDir);
    return files.filter(file => 
        file.endsWith('.js') && 
        file !== 'build.js' && // Don't process the build script itself
        file !== 'build_optimization.js' // Don't process optimization scripts
    ).map(file => path.join('js', file));
}

// Optimize HTML file in place
async function optimizeHTML(filePath) {
    try {
        // Backup original
        backupFile(filePath);
        
        const content = fs.readFileSync(filePath, 'utf8');
        
        const optimized = await minifyHTML(content, {
            collapseWhitespace: true,
            removeComments: true,
            removeRedundantAttributes: true,
            removeEmptyAttributes: true,
            removeOptionalTags: false, // Keep structure intact for XR content
            minifyJS: true,
            minifyCSS: true,
            processConditionalComments: true,
            removeScriptTypeAttributes: true,
            removeStyleLinkTypeAttributes: true,
            useShortDoctype: true
        });
        
        // Write optimized content back to the same file
        fs.writeFileSync(filePath, optimized);
        console.log(`   ✔ ${path.basename(filePath)}`);
    } catch (error) {
        console.error(`   ✗ Error optimizing ${filePath}: ${error.message}`);
        // Leave the original file unchanged if optimization fails
    }
}

// Optimize JavaScript file in place
async function optimizeJS(filePath) {
    try {
        // Don't optimize API files
        if (filePath.startsWith('api/')) {
            console.log(`   ⚠ Skipping API file: ${path.basename(filePath)}`);
            return;
        }
        
        // Backup original
        backupFile(filePath);
        
        const content = fs.readFileSync(filePath, 'utf8');
        
        const result = await minifyJS(content, {
            compress: {
                drop_console: false, // Keep console logs for debugging
                drop_debugger: true,
                pure_funcs: ['console.debug'],
                passes: 2
            },
            mangle: {
                safari10: true,
                properties: false // Don't mangle property names
            },
            format: {
                comments: false,
                safari10: true
            }
        });
        
        // Write optimized content back to the same file
        fs.writeFileSync(filePath, result.code);
        console.log(`   ✔ ${path.basename(filePath)}`);
    } catch (error) {
        console.error(`   ✗ Error optimizing ${filePath}: ${error.message}`);
        // Leave the original file unchanged if optimization fails
    }
}

// Main build function
async function build() {
    console.log('🚀 Starting optimized build...');
    
    // Process HTML files
    console.log('📝 Optimizing HTML files...');
    const htmlFiles = getHTMLFiles();
    for (const file of htmlFiles) {
        await optimizeHTML(file);
    }
    
    // Process JS files
    console.log('⚡ Minifying JS files individually...');
    const jsFiles = getJSFiles();
    for (const file of jsFiles) {
        await optimizeJS(file);
    }
    
    console.log('✅ Build finished.');
    console.log('   Files have been optimized in place.');
    console.log('   Original files backed up to .build-cache/');
}

// Run build
build().catch(error => {
    console.error('❌ Build failed:', error);
    process.exit(1);
});
