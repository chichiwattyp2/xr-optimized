#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { minify } = require("terser");
const htmlMinifier = require("html-minifier-terser");

class BuildOptimizer {
  constructor() {
    this.srcDir = ".";
    this.buildDir = "dist";
    this.startTime = Date.now();

    // Reset dist directory
    if (fs.existsSync(this.buildDir)) {
      fs.rmSync(this.buildDir, { recursive: true, force: true });
    }
    fs.mkdirSync(this.buildDir, { recursive: true });
  }

  async build() {
    console.log("🚀 Starting optimized build...");
    try {
      await this.optimizeHTML();
      await this.bundleJavaScript();
      this.copyAPIRoutes();
      this.copyStaticAssets();
      this.generateServiceWorker();

      const buildTime = (Date.now() - this.startTime) / 1000;
      console.log(`✅ Build completed in ${buildTime}s`);
    } catch (err) {
      console.error("❌ Build failed:", err);
      process.exit(1);
    }
  }

  async optimizeHTML() {
    console.log("📝 Optimizing HTML files...");
    const htmlFiles = fs.readdirSync(this.srcDir).filter(f => f.endsWith(".html"));

    for (const file of htmlFiles) {
      let html = fs.readFileSync(path.join(this.srcDir, file), "utf8");
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

      // Inject bundle.min.js before </body>
      const injected = optimized.replace(
        /<\/body>/i,
        `  <script src="/bundle.min.js"></script>\n</body>`
      );

      fs.writeFileSync(path.join(this.buildDir, file), injected);
      console.log(`   ✔ ${file}`);
    }
  }

  async bundleJavaScript() {
    console.log("⚡ Bundling JavaScript...");

    // Collect optimization scripts first
    const optimizationsDir = path.join(this.srcDir, "src", "optimizations");
    let bundle = "";

    if (fs.existsSync(optimizationsDir)) {
      const optFiles = fs.readdirSync(optimizationsDir).filter(f => f.endsWith(".js"));
      for (const file of optFiles) {
        const filePath = path.join(optimizationsDir, file);
        bundle += `\n// ---- optimizations/${file} ----\n` + fs.readFileSync(filePath, "utf8");
      }
    }

    // Then collect main app scripts
    const jsFiles = ["client.js", "index.js", "sheets.js"];
    for (const file of jsFiles) {
      const filePath = path.join(this.srcDir, file);
      if (fs.existsSync(filePath)) {
        bundle += `\n// ---- ${file} ----\n` + fs.readFileSync(filePath, "utf8");
      }
    }

    if (bundle.trim() === "") return;

    const minified = await minify(bundle, {
      compress: { dead_code: true, drop_debugger: true },
      mangle: { reserved: ["AFRAME"] },
      format: { comments: false }
    });

    fs.writeFileSync(path.join(this.buildDir, "bundle.min.js"), minified.code);
    console.log("   ✔ bundle.min.js");
  }

  copyAPIRoutes() {
    console.log("📁 Copying API routes...");
    const apiSrc = path.join(this.srcDir, "api");
    const apiDest = path.join(this.buildDir, "api");
    if (fs.existsSync(apiSrc)) {
      this.copyRecursive(apiSrc, apiDest);
    }
  }

  copyStaticAssets() {
    console.log("🖼️ Copying static assets...");
    const dirs = ["assets", "css", "gemini-ui", "js", "spotify", "tests"];

    dirs.forEach(dir => {
      const src = path.join(this.srcDir, dir);
      if (fs.existsSync(src)) {
        this.copyRecursive(src, path.join(this.buildDir, dir));
      }
    });

    // Copy favicon and misc root files
    const miscFiles = ["favicon.ico", "lookbook-xr-override.css"];
    miscFiles.forEach(file => {
      const src = path.join(this.srcDir, file);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, path.join(this.buildDir, file));
      }
    });
  }

  generateServiceWorker() {
    console.log("⚙️ Generating service worker...");
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
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.map(k => k !== CACHE_NAME && caches.delete(k)))
  ));
});`;
    fs.writeFileSync(path.join(this.buildDir, "sw.js"), sw);
  }

  copyRecursive(src, dest) {
    const stats = fs.statSync(src);
    if (stats.isDirectory()) {
      fs.mkdirSync(dest, { recursive: true });
      fs.readdirSync(src).forEach(child =>
        this.copyRecursive(path.join(src, child), path.join(dest, child))
      );
    } else {
      fs.copyFileSync(src, dest);
    }
  }
}

if (require.main === module) {
  new BuildOptimizer().build();
}

module.exports = BuildOptimizer;
