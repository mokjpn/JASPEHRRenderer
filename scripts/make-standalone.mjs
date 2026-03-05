import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const distDir = path.resolve("dist");
const htmlPath = path.join(distDir, "index.html");
const standalonePath = path.join(distDir, "index.standalone.html");

const html = await readFile(htmlPath, "utf8");

const cssMatch = html.match(/<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/i);
const jsMatch = html.match(/<script[^>]*type=["']module["'][^>]*src=["']([^"']+)["'][^>]*><\/script>/i);

if (!jsMatch?.[1]) {
  throw new Error("Could not find module script in dist/index.html");
}

const jsFile = path.resolve(distDir, jsMatch[1]);
const jsCodeRaw = await readFile(jsFile, "utf8");
const jsBase64 = Buffer.from(jsCodeRaw, "utf8").toString("base64");

let transformed = html;

if (cssMatch?.[1]) {
  const cssFile = path.resolve(distDir, cssMatch[1]);
  const cssRaw = await readFile(cssFile, "utf8");
  const cssCode = cssRaw.replace(/<\/style/gi, "<\\/style");
  transformed = transformed.replace(cssMatch[0], `<style>\n${cssCode}\n</style>`);
}

const bootstrapScript = `<script type="module">\nimport "data:text/javascript;base64,${jsBase64}";\n</script>`;
transformed = transformed.replace(jsMatch[0], bootstrapScript);

await writeFile(standalonePath, transformed, "utf8");

console.log(`Standalone HTML generated: ${standalonePath}`);
