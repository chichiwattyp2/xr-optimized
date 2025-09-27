import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { minify as minifyHTML } from 'html-minifier-terser';
import { minify as minifyJS } from 'terser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration for Build Output API v3
const OUTPUT_DIR = '.vercel/output';
const STATIC_DIR = path.join(OUTPUT_DIR, 'static');
const SOURCE_DIR = '.';

// Ensure directory exists
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
    ensureDirectoryExists(STATIC_DIR);
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

// Copy and optimize static directories
function copyStaticDirectories() {
    const staticDirs = ['css', 'images', 'assets', 'fonts', 'models', 'textures'];
    
    staticDirs.forEach(dir => {
        const sourcePath = path.join(SOURCE_DIR, dir);
        const destPath = path.join(STATIC_DIR, dir);
        
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

// Optimize HTML file and copy to static directory
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
        
        const outputPath = path.join(STATIC_DIR, path.basename(filePath));
        fs.writeFileSync(outputPath, optimized);
        console.log(`   ✔ ${path.basename(filePath)}`);
    } catch (error) {
        console.error(`   ✗ Error optimizing ${filePath}: ${error.message}`);
        // Copy the original file if optimization fails
        const outputPath = path.join(STATIC_DIR, path.basename(filePath));
        fs.copyFileSync(filePath, outputPath);
    }
}

// Optimize JavaScript file and copy to static directory
async function optimizeJS(filePath) {
    try {
        // Don't optimize API files
        if (filePath.startsWith('api/')) {
            return;
        }
        
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
        
        const outputPath = path.join(STATIC_DIR, filePath);
        ensureDirectoryExists(path.dirname(outputPath));
        fs.writeFileSync(outputPath, result.code);
        console.log(`   ✔ ${path.basename(filePath)}`);
    } catch (error) {
        console.error(`   ✗ Error optimizing ${filePath}: ${error.message}`);
        // Copy the original file if optimization fails
        const outputPath = path.join(STATIC_DIR, filePath);
        ensureDirectoryExists(path.dirname(outputPath));
        fs.copyFileSync(filePath, outputPath);
    }
}

// Copy other important files to static directory
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
            const destPath = path.join(STATIC_DIR, file);
            if (fs.statSync(sourcePath).isDirectory()) {
                copyDirectory(sourcePath, destPath);
            } else {
                fs.copyFileSync(sourcePath, destPath);
            }
            console.log(`   ✔ Copied ${file}`);
        }
    });
}

// Create Build Output API configuration
function createBuildConfig() {
    const config = {
        version: 3,
        routes: [
            // Serve static files with proper headers
            {
                src: "^/(.*)\\.(js|css|jpg|jpeg|png|gif|svg|ico|woff|woff2|ttf|eot)$",
                headers: {
                    "cache-control": "public, max-age=31536000, immutable"
                }
            },
            // Clean URLs - serve HTML files without extension
            { handle: "filesystem" }
        ]
    };
    
    const configPath = path.join(OUTPUT_DIR, 'config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log('   ✔ Created config.json');
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
    console.log('⚡ Minifying JS files...');
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
    
    // Create Build Output API config
    console.log('⚙️ Creating Build Output API configuration...');
    createBuildConfig();
    
    console.log('✅ Build finished. Output directory: .vercel/output/');
}

// Run build
build().catch(error => {
    console.error('❌ Build failed:', error);
    process.exit(1);
});
