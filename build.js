#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { minify } = require('terser');
const CleanCSS = require('clean-css');
const htmlMinifier = require('html-minifier-terser');

class BuildOptimizer {
    constructor() {
        this.buildDir = 'dist';
        this.startTime = Date.now();
        
        if (!fs.existsSync(this.buildDir)) {
            fs.mkdirSync(this.buildDir, { recursive: true });
        }
    }

    async build() {
        console.log('🚀 Starting optimized build...');
        try {
            await this.optimizeHTML();
            await this.optimizeJavaScript();
            await this.copyAPIRoutes();
            await this.optimizeStaticAssets();
            await this.generateServiceWorker();
            await this.optimizeConfig();

            const buildTime = (Date.now() - this.startTime) / 1000;
            console.log(`✅ Build completed in ${buildTime}s`);
        } catch (err) {
            console.error('❌ Build failed:', err);
            process.exit(1);
        }
    }

    async optimizeHTML() {
        console.log('📝 Optimizing HTML files...');

        // Grab all .html files at root
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

            const perf = this.injectPerformanceOptimizations(optimized);
            fs.writeFileSync(path.join(this.buildDir, file), perf);
        }
    }

    injectPerformanceOptimizations(html) {
        const optimizations = `
        <!-- Performance optimizations -->
        <link rel="preload" href="https://aframe.io/releases/1.4.0/aframe.min.js" as="script" crossorigin>
        <link rel="dns-prefetch" href="//api.openai.com">
        <link rel="preconnect" href="//api.openai.com" crossorigin>
        <script>
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                    .then(() => console.log('SW registered'))
                    .catch(err => console.log('SW failed', err));
            });
        }
        </script>`;
        return html.replace('<head>', `<head>${optimizations}`);
    }

    async optimizeJavaScript() {
        console.log('⚡ Optimizing JavaScript...');

        const jsFiles = ['client.js', 'sheets.js', 'index.js'];
        let bundle = '';

        for (const file of jsFiles) {
            if (fs.existsSync(file)) {
                const code = fs.readFileSync(file, 'utf8');
                bundle += `\n// ---- ${file} ----\n` + code;
            }
        }

        const minified = await minify(bundle, {
            compress: { dead_code: true, drop_debugger: true },
            mangle: { reserved: ['AFRAME'] },
            format: { comments: false }
        });

        fs.writeFileSync(path.join(this.buildDir, 'bundle.min.js'), minified.code);
    }

    async copyAPIRoutes() {
        console.log('📁 Copying API routes...');
        const apiDest = path.join(this.buildDir, 'api');
        if (!fs.existsSync(apiDest)) fs.mkdirSync(apiDest, { recursive: true });

        fs.readdirSync('api').forEach(file => {
            fs.copyFileSync(path.join('api', file), path.join(apiDest, file));
        });
    }

    async optimizeStaticAssets() {
        console.log('🖼️ Optimizing static assets...');

        const copyDirs = ['assets', 'js'];
        for (const dir of copyDirs) {
            if (fs.existsSync(dir)) {
                this.copyRecursive(dir, path.join(this.buildDir, dir));
            }
        }
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
        fs.writeFileSync(path.join(this.buildDir, 'sw.js'), sw);
    }

    async optimizeConfig() {
        console.log('⚙️ Optimizing configuration...');
        const vercelConfig = {
            version: 2,
            builds: [
                { src: "dist/**/*.html", use: "@vercel/static" },
                { src: "dist/api/**/*.js", use: "@vercel/node" }
            ]
        };
        fs.writeFileSync(path.join(this.buildDir, 'vercel.json'), JSON.stringify(vercelConfig, null, 2));
    }

    copyRecursive(src, dest) {
        const stats = fs.statSync(src);
        if (stats.isDirectory()) {
            if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
            fs.readdirSync(src).forEach(child => {
                this.copyRecursive(path.join(src, child), path.join(dest, child));
            });
        } else {
            fs.copyFileSync(src, dest);
        }
    }
}

if (require.main === module) {
    new BuildOptimizer().build();
}

module.exports = BuildOptimizer;
