// Production build: node build.mjs  (requires: npm i -D esbuild purgecss)
import { build, transform } from "esbuild";
import { PurgeCSS } from "purgecss";
import fs from "node:fs";
const out = "frontend/dist";
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(`${out}/lazy`, { recursive: true });
const core = ["api","dom","state","ui","modals","auth","subjects","schedule","tasks"];
// Classic scripts share globals -> concatenate in load order, minify without renaming top-level names.
const js = core.map(n => fs.readFileSync(`frontend/js/${n}.js`, "utf8")).join("\n;\n");
fs.writeFileSync(`${out}/app.min.js`, (await transform(js, { minify: true, target: "es2020", charset: "utf8" })).code);
for (const f of fs.readdirSync("frontend/js/lazy")) {
  const src = fs.readFileSync(`frontend/js/lazy/${f}`, "utf8");
  fs.writeFileSync(`${out}/lazy/${f}`, (await transform(src, { minify: true, target: "es2020", charset: "utf8" })).code);
}
// Remove unused CSS (scan HTML + all JS, which builds markup dynamically), then minify.
const purged = await new PurgeCSS().purge({
  content: ["index.html", "frontend/js/**/*.js"],
  css: ["frontend/styles.css", "frontend/focus-mode.css"],
  safelist: { standard: [/^is-/, /^has-/, /active/, /open/, /show/, /hidden/, /visible/, /dragging/, /drag-/, /loading/, /error/, /success/, /selected/, /disabled/], greedy: [/data-theme/, /toast/, /modal/, /focus/] },
  keyframes: true, fontFace: true, variables: false,
});
const css = purged.map(p => p.css).join("\n");
fs.writeFileSync(`${out}/app.min.css`, (await transform(css, { loader: "css", minify: true, charset: "utf8" })).code);
for (const f of ["app.min.js", "app.min.css"]) console.log(f, fs.statSync(`${out}/${f}`).size);
