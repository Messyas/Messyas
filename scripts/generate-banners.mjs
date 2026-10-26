import { readFile, writeFile, mkdir } from "node:fs/promises";
import sharp from "sharp";
import { BANNER_CONFIG as config } from "./banner-config.mjs";
import { renderContourFrame } from "./topographic-field.mjs";
import { frameDelays } from "./generate-animation-webp.mjs";

const capsule = (section) => `![${section === "header" ? "Wavy header" : "Wavy footer"} in shades of purple, violet and metallic shadows](https://capsule-render.vercel.app/api?type=waving&color=${section === "header" ? "0:0D0814,25:3D105B,60:7928CA,85:A855F7,100:D8B4FE" : "0:D8B4FE,25:A855F7,55:7928CA,80:3D105B,100:0D0814"}&height=110&section=${section})`;
if (!["capsule", "topographic"].includes(config.mode)) throw new Error("Modo de banner inválido.");
if (config.mode === "topographic") {
  const { width, height, fps, durationSeconds } = config;
  const count = fps * durationSeconds;
  const pixels = Buffer.alloc(width * height * 4 * count);
  // Mesma função de campo do shader, calculada offline: dispensa GPU no Actions.
  for (let frame = 0; frame < count; frame++) {
    const phase = frame / count * Math.PI * 2;
    renderContourFrame(config, phase).copy(pixels, frame * width * height * 4);
    if ((frame + 1) % 60 === 0) console.log(`Banner: ${frame + 1}/${count} quadros.`);
  }
  await mkdir("assets", { recursive: true });
  await sharp(pixels.subarray(0, width * height * 4), { raw: { width, height, channels: 4 } }).png().toFile("assets/topographic-banner.png");
  const output = await sharp(pixels, { raw: { width, height: height * count, channels: 4, pageHeight: height }, limitInputPixels: false })
    .webp({ lossless: true, effort: 4, loop: 0, delay: frameDelays(count, durationSeconds * 1000) })
    .toFile("assets/topographic-banner.webp");
  console.log(`Banner: ${(output.size / 1e6).toFixed(2)} MB, ${count} quadros.`);
}
let readme = await readFile("README.md", "utf8");
for (const section of ["header", "footer"]) {
  const content = config.mode === "capsule" ? capsule(section) : `<picture><source media="(prefers-reduced-motion: reduce)" srcset="assets/topographic-banner.png" /><img width="100%" src="assets/topographic-banner.webp" alt="${section === "header" ? "Header" : "Footer"} with animated purple contour lines" /></picture>`;
  const block = `<!-- profile-banner:${section} -->\n${content}\n<!-- /profile-banner:${section} -->`;
  const marker = new RegExp(`<!-- profile-banner:${section} -->[\\s\\S]*?<!-- /profile-banner:${section} -->`);
  const original = new RegExp(`!\\[[^\\n]*\\]\\(https://capsule-render\\.vercel\\.app/api\\?[^\\n]*section=${section}\\)`);
  if (!marker.test(readme) && !original.test(readme)) throw new Error(`Banner ${section} não encontrado.`);
  readme = readme.replace(marker.test(readme) ? marker : original, block);
}
await writeFile("README.md", readme);
