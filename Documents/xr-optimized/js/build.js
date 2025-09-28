// build.js - Optimized build for XR Optimized + AR Studio
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { minify as minifyHTML } from 'html-minifier-terser';
import { minify as minifyJS } from 'terser';
import glob from 'glob';

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

// Get all HTML files recursively
function getHTMLFiles() {
  return glob.sync('**/*.html', {
    cwd: SOURCE_DIR,
    ignore: ['node_modules/**', '.vercel/**']
  });
}

// Get all JS files recursively (skip build scripts)
function getJSFiles() {
  return glob.sync('**/*.js', {
    cwd: SOURCE_DIR,
    ignore: [
      'node_modules/**',
      '.vercel/**',
      'js/build.js',
      'js/build_optimization.js'
    ]
  });
}

// Copy and optimize static directories
function copyStaticDirectories() {
  const staticDirs = [
    'css',
    'images',
    'assets',
    'fonts',
    'models',
    'textures',
    'ar-studio' // include AR Studio folder
  ];

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
      removeOptionalTags: false, // keep structure for XR content
      minifyJS: true,
      minifyCSS: true,
      processConditionalComments: true,
      removeScriptTypeAttributes: true,
      removeStyleLinkTypeAttributes: true,
      useShortDoctype: true
    });

    const outputPath = path.join(STATIC_DIR, filePath);
    ensureDirectoryExists(path.dirname(outputPath));
    fs.writeFileSync(outputPath, optimized);
    console.log(`   ✔ ${filePath}`);
  } catch (error) {
    console.error(`   ✗ Error optimizing ${filePath}: ${error.message}`);
    const outputPath = path.join(STATIC_DIR, filePath);
    ensureDirectoryExists(path.dirname(outputPath));
    fs.copyFileSync(filePath, outputPath);
  }
}

// Optimize JavaScript file and copy to static directory
async function optimizeJS(filePath) {
  try {
    if (filePath.startsWith('api/')) return; // skip API files

    const content = fs.readFileSync(filePath, 'utf8');

    const result = await minifyJS(content, {
      compress: {
        drop_console: false,
        drop_debugger: true,
        pure_funcs: ['console.debug'],
        passes: 2
      },
      mangle: {
        safari10: true,
        properties: false
      },
      format: {
        comments: false,
        safari10: true
      }
    });

    const outputPath = path.join(STATIC_DIR, filePath);
    ensureDirectoryExists(path.dirname(outputPath));
    fs.writeFileSync(outputPath, result.code);
    console.log(`   ✔ ${filePath}`);
  } catch (error) {
    console.error(`   ✗ Error optimizing ${filePath}: ${error.message}`);
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
        ensureDirectoryExists(path.dirname(destPath));
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
      {
        src: "^/(.*)\\.(js|css|jpg|jpeg|png|gif|svg|ico|woff|woff2|ttf|eot)$",
        headers: {
          "cache-control": "public, max-age=31536000, immutable"
        }
      },
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

  cleanOutputDirectory();

  console.log('📝 Optimizing HTML files...');
  const htmlFiles = getHTMLFiles();
  for (const file of htmlFiles) {
    await optimizeHTML(file);
  }

  console.log('⚡ Minifying JS files...');
  const jsFiles = getJSFiles();
  for (const file of jsFiles) {
    await optimizeJS(file);
  }

  console.log('📁 Copying static assets...');
  copyStaticDirectories();

  console.log('📄 Copying root files...');
  copyRootFiles();

  console.log('⚙️ Creating Build Output API configuration...');
  createBuildConfig();

  console.log('✅ Build finished. Output directory: .vercel/output/');
}

// Run build
build().catch(error => {
  console.error('❌ Build failed:', error);
  process.exit(1);
});
