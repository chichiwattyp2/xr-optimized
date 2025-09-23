#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { minify } = require('terser');
const CleanCSS = require('clean-css');
const htmlMinifier = require('html-minifier-terser');

class BuildOptimizer {
  constructor() {
    this.startTime = Date.now();
  }

  async build() {
    console.log('🚀 Starting optimized build...');
    try {
      await this.optimizeHTML();
      await this.optimizeJavaScript();
      await this.generateServiceWorker();
      const buildTime = (Date.now() - this.startTime) / 1000;
      console.log(`✅ Build completed in ${buildTime}s`);
    } catch (err) {
      console.error('❌ Build failed:', err);
      process.exit(1);
    }
  }

  async optimizeHTML() {
    console.log('📝 Optimizing HTML files...');
    const htmlFiles = fs.readdirSync('.').filter(f => f.endsWith('.html'));

    for (const file of htmlFiles) {
      const html = fs.readFileSync(file, 'utf8');
      const optimized = await htmlMinifier.minify(html, {
        removeComments: true,
        removeRedundantAttributes: true,
        removeScriptTypeAttributes: true,
        removeStyleLinkTypeAttributes: true,
        useShortDoctype: true,
        collapseWhitespace: true,
        minifyCSS: true,
        minifyJS: true
      });

      fs.writeFileSync(file, optimized);
      console.log(`   ✔ Minified ${file}`);
    }
  }

  async optimizeJavaScript() {
    console.log('⚡ Bundling and minifying JavaScript...');
    const jsFiles = ['client.js', 'index.js', 'sheets.js'];
    let bundle = '';

    for (const file of jsFiles) {
      if (fs.existsSync(file)) {
        bundle += `\n// ---- ${file} ----\n` + fs.readFileSync(file, 'utf8');
      }
    }

    const minified = await minify(bundle, {
      compress: { dead_code: true, drop_debugger: true },
      mangle: { reserved: ['AFRAME'] },
      format: { comments: false }
    });

    fs.writeFileSync('bundle.min.js', minified.code);
    console.log('   ✔ Created bundle.min.js');
  }

  async generateServiceWorker() {
    console.log('⚙️ Generating Service Worker...');
    const sw = `
const CACHE_NAME = 'xr-optimized-v1';
const urlsToCache = [
  '/',
  '/bundle.min.js',
  'https://aframe.io/releases/1.4.0/aframe.min.js'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(urlsToCache)));
});
self.addEventListener('fetch', e => {
  if (e.request.url.includes('/api/')) return;
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(names =>
    Promise.all(names.map(n => n !== CACHE_NAME && caches.delete(n)))
  ));
});`;
    fs.writeFileSync('sw.js', sw);
    console.log('   ✔ sw.js created');
  }
}

if (require.main === module) {
  new BuildOptimizer().build();
}

module.exports = BuildOptimizer;
