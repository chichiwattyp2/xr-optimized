import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { minify as minifyHTML } from 'html-minifier-terser';
import { minify as minifyJS } from 'terser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const OUTPUT_DIR = 'public';
const SOURCE_DIR = '.';

// Ensure output directory exists
function ensureDirectoryExists(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

// Clean the output directory
function cleanOutputDirectory() {
    if (fs.existsSync(OUTPUT_DIR)) {
        fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
    }
    ensureDirectoryExists(OUTPUT_DIR);
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
        file !== 'build.js' // Don't process the build script itself
    ).map(file => path.join('js', file));
}

// Copy static directories (css, images, assets, etc.)
function copyStaticDirectories() {
    const staticDirs = ['css', 'images', 'assets', 'fonts', 'models', 'textures'];
    
    staticDirs.forEach(dir => {
        const sourcePath = path.join(SOURCE_DIR, dir);
        const destPath = path.join(OUTPUT_DIR, dir);
        
        if (fs.existsSync(sourcePath)) {
            copyDirectory(sourcePath, destPath);
            console.log(`   ✔ Copied ${dir} directory`);
        }
    });
}

// Recursively copy directory
function copyDirectory(source, destination) {
    ensureDirectoryExists(destination);
    
    const files = fs.readdirSync(source);
    
    files.forEach(file => {
        const sourcePath = path.join(source, file);
        const destPath = path.join(destination, file);
        
        if (fs.statSync(sourcePath).isDirectory()) {
            copyDirectory(sourcePath, destPath);
        } else {
            fs.copyFileSync(sourcePath, destPath);
        }
    });
}

// Optimize HTML file
async function optimizeHTML(filePath) {
    try {
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
        
        const outputPath = path.join(OUTPUT_DIR, path.basename(filePath));
        fs.writeFileSync(outputPath, optimized);
        console.log(`   ✔ ${path.basename(filePath)}`);
    } catch (error) {
        console.error(`   ✗ Error optimizing ${filePath}: ${error.message}`);
        // Copy the original file if optimization fails
        const outputPath = path.join(OUTPUT_DIR, path.basename(filePath));
        fs.copyFileSync(filePath, outputPath);
    }
}

// Optimize JavaScript file
async function optimizeJS(filePath) {
    try {
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
        
        const outputPath = path.join(OUTPUT_DIR, filePath);
        ensureDirectoryExists(path.dirname(outputPath));
        fs.writeFileSync(outputPath, result.code);
        console.log(`   ✔ ${path.basename(filePath)}`);
    } catch (error) {
        console.error(`   ✗ Error optimizing ${filePath}: ${error.message}`);
        // Copy the original file if optimization fails
        const outputPath = path.join(OUTPUT_DIR, filePath);
        ensureDirectoryExists(path.dirname(outputPath));
        fs.copyFileSync(filePath, outputPath);
    }
}

// Copy API directory (serverless functions)
function copyAPIDirectory() {
    const apiSource = path.join(SOURCE_DIR, 'api');
    
    if (fs.existsSync(apiSource)) {
        // Don't copy to public - API stays in root for Vercel
        console.log('   ℹ API directory will be handled by Vercel directly');
    }
}

// Copy other important files
function copyRootFiles() {
    const filesToCopy = [
        'favicon.ico',
        'robots.txt',
        'manifest.json',
        '.well-known'
    ];
    
    filesToCopy.forEach(file => {
        const sourcePath = path.join(SOURCE_DIR, file);
        if (fs.existsSync(sourcePath)) {
            const destPath = path.join(OUTPUT_DIR, file);
            if (fs.statSync(sourcePath).isDirectory()) {
                copyDirectory(sourcePath, destPath);
            } else {
                fs.copyFileSync(sourcePath, destPath);
            }
            console.log(`   ✔ Copied ${file}`);
        }
    });
}

// Main build function
async function build() {
    console.log('🚀 Starting optimized build...');
    
    // Clean and prepare output directory
    cleanOutputDirectory();
    
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
    
    // Copy static directories
    console.log('📁 Copying static assets...');
    copyStaticDirectories();
    
    // Copy root files
    console.log('📄 Copying root files...');
    copyRootFiles();
    
    console.log('✅ Build finished. Output directory: public/');
}

// Run build
build().catch(error => {
    console.error('❌ Build failed:', error);
    process.exit(1);
});
