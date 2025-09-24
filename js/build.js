// js/build.js
import fs from "fs";
import path from "path";
import { minify } from "terser";
import { minify as minifyHtml } from "html-minifier-terser";

const rootDir = process.cwd();
const distDir = path.join(rootDir, "dist");
const jsSrcDir = path.join(rootDir, "src", "optimizations");
const jsDistDir = path.join(distDir, "js");

// ensure dist and js folder exist
fs.mkdirSync(jsDistDir, { recursive: true });

console.log("🚀 Starting optimized build...");

// === HTML OPTIMIZATION ===
console.log("📝 Optimizing HTML files...");
const htmlFiles = fs
  .readdirSync(rootDir)
  .filter(f => f.endsWith(".html"));

for (const file of htmlFiles) {
  const inputPath = path.join(rootDir, file);
  const outputPath = path.join(distDir, file);

  const html = fs.readFileSync(inputPath, "utf-8");
  const minifiedHtml = await minifyHtml(html, {
    collapseWhitespace: true,
    removeComments: true,
    minifyJS: true,
    minifyCSS: true
  });

  fs.writeFileSync(outputPath, minifiedHtml, "utf-8");
  console.log(`   ✔ ${file}`);
}

// === JS OPTIMIZATION ===
console.log("⚡ Minifying JS files individually...");

const jsFiles = fs.readdirSync(jsSrcDir).filter(f => f.endsWith(".js"));

for (const file of jsFiles) {
  const inputPath = path.join(jsSrcDir, file);
  const outputPath = path.join(jsDistDir, file);

  try {
    const code = fs.readFileSync(inputPath, "utf-8");
    const minified = await minify(code, {
      ecma: 2020,
      compress: true,
      mangle: true
    });

    fs.writeFileSync(outputPath, minified.code, "utf-8");
    console.log(`   ✔ ${file}`);
  } catch (err) {
    console.error(`   ❌ Failed on ${file}:`, err.message);
  }
}

console.log("✅ Build finished.");
