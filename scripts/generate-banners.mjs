import { readFile, writeFile, mkdir } from "node:fs/promises";
import sharp from "sharp";
import { BANNER_CONFIG as config } from "./banner-config.mjs";
import { contourField, smoothstep } from "./topographic-field.mjs";
import { frameDelays } from "./generate-animation-webp.mjs";

const capsule = (section) => `![${section === "header" ? "Cabeçalho" : "Rodapé"} ondulado em tons de roxo, violeta e sombras metálicas](https://capsule-render.vercel.app/api?type=waving&color=${section === "header" ? "0:0D0814,25:3D105B,60:7928CA,85:A855F7,100:D8B4FE" : "0:D8B4FE,25:A855F7,55:7928CA,80:3D105B,100:0D0814"}&height=110&section=${section})`;
if (!["capsule", "topographic"].includes(config.mode)) throw new Error("Modo de banner inválido.");
if (config.mode === "topographic") {
  const { width, height, fps, durationSeconds } = config;
  const count = fps * durationSeconds;
  const pixels = Buffer.alloc(width * height * 4 * count);
  const palette = config.colors.map((hex) => hex.slice(1).match(/../g).map((channel) => parseInt(channel, 16)));
  const background = config.background.slice(1).match(/../g).map((channel) => parseInt(channel, 16));
  // Mesma função de campo do shader, calculada offline: dispensa GPU no Actions.
  for (let frame = 0; frame < count; frame++) {
    const phase = frame / count * Math.PI * 2;
    for (let y = 0; y < height; y++) {
      const stY = (1 - (y + 0.5) / height) * 0.35;
      const fade = 1 - smoothstep(0.12, 0.35, stY);
      for (let x = 0; x < width; x++) {
        const stX = (x + 0.5) / width;
        const field = fade < 0.005 ? 0 : contourField(stX, stY, phase);
        const band = Math.abs(Math.sin(field * 12));
        const line = 1 - smoothstep(0.15, 0.4, band);
        const alpha = line * fade * (0.55 + 0.35 * smoothstep(0, 1, stX));
        const position = Math.min(1.999, stX * 2), index = Math.floor(position), mix = position - index;
        const offset = ((frame * height + y) * width + x) * 4;
        for (let channel = 0; channel < 3; channel++) {
          const color = palette[index][channel] * (1 - mix) + palette[index + 1][channel] * mix;
          pixels[offset + channel] = Math.round(background[channel] * (1 - alpha) + color * alpha);
        }
        pixels[offset + 3] = 255;
      }
    }
    if ((frame + 1) % 60 === 0) console.log(`Banner: ${frame + 1}/${count} quadros.`);
  }
  await mkdir("assets", { recursive: true });
  await sharp(pixels.subarray(0, width * height * 4), { raw: { width, height, channels: 4 } }).png().toFile("assets/topographic-banner.png");
  const output = await sharp(pixels, { raw: { width, height: height * count, channels: 4, pageHeight: height }, limitInputPixels: false })
    .webp({ quality: 65, minSize: true, smartSubsample: true, effort: 4, loop: 0, delay: frameDelays(count, durationSeconds * 1000) })
    .toFile("assets/topographic-banner.webp");
  console.log(`Banner: ${(output.size / 1e6).toFixed(2)} MB, ${count} quadros.`);
}
let readme = await readFile("README.md", "utf8");
for (const section of ["header", "footer"]) {
  const content = config.mode === "capsule" ? capsule(section) : `<picture><source media="(prefers-reduced-motion: reduce)" srcset="assets/topographic-banner.png" /><img width="100%" src="assets/topographic-banner.webp" alt="${section === "header" ? "Cabeçalho" : "Rodapé"} com curvas de nível roxas animadas" /></picture>`;
  const block = `<!-- profile-banner:${section} -->\n${content}\n<!-- /profile-banner:${section} -->`;
  const marker = new RegExp(`<!-- profile-banner:${section} -->[\\s\\S]*?<!-- /profile-banner:${section} -->`);
  const original = new RegExp(`!\\[[^\\n]*\\]\\(https://capsule-render\\.vercel\\.app/api\\?[^\\n]*section=${section}\\)`);
  if (!marker.test(readme) && !original.test(readme)) throw new Error(`Banner ${section} não encontrado.`);
  readme = readme.replace(marker.test(readme) ? marker : original, block);
}
await writeFile("README.md", readme);
