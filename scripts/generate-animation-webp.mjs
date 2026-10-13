import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import sharp from "sharp";
import { THEME_CONFIG } from "./theme-config.mjs";

export function frameDelays(frameCount, durationMs) {
  return Array.from({ length: frameCount }, (_, index) =>
    Math.round((index + 1) * durationMs / frameCount) - Math.round(index * durationMs / frameCount));
}

export async function generateAnimationWebp(input, output) {
  const svg = await readFile(input, "utf8");
  const frames = [...svg.matchAll(/<g id="rot-frame-(\d+)"[^>]*>[\s\S]*?<\/g>/g)];
  if (!frames.length || frames.some((frame, index) => Number(frame[1]) !== index)) {
    throw new Error("Os quadros do SVG devem formar uma sequência completa.");
  }
  // Rasteriza apenas um quadro por vez, sem entregar os demais ao renderizador.
  const template = svg
    .replace(/<defs>\s*<g id="rot-frame-0"[\s\S]*?<\/defs>/, "")
    .replace(/<use href="#rot-frame-0">[\s\S]*?<\/use>/, "<!--current-frame-->");
  if (!template.includes("<!--current-frame-->")) throw new Error("Referência da animação ausente.");
  const directory = await mkdtemp(join(tmpdir(), "messyas-webp-"));
  const files = [];
  const webp = THEME_CONFIG.rotation3d.webp ?? { width: 1000, quality: 90, effort: 4 };
  sharp.cache({ memory: 64, files: 20, items: 100 });
  try {
    for (let index = 0; index < frames.length; index++) {
      const file = join(directory, `${index}.png`);
      const frame = template.replace("<!--current-frame-->", frames[index][0]);
      await sharp(Buffer.from(frame)).resize({ width: webp.width }).png().toFile(file);
      files.push(file);
      if ((index + 1) % 60 === 0) console.log(`Rasterizados ${index + 1}/${frames.length} quadros.`);
    }
    const durationMs = Math.round(Number.parseFloat(THEME_CONFIG.rotation3d.duration) * 1000);
    const result = await sharp(files, { join: { animated: true } })
      .webp({ quality: webp.quality, effort: webp.effort, minSize: true, smartSubsample: true, loop: 0, delay: frameDelays(frames.length, durationMs) })
      .toFile(output);
    console.log(`WebP gerado: ${result.width}x${result.pageHeight}, ${result.pages} quadros, ${(result.size / 1e6).toFixed(2)} MB.`);
    return result;
  } finally {
    // O único diretório removido é o temporário criado por mkdtemp nesta chamada.
    if (dirname(resolve(directory)) !== resolve(tmpdir()) || !basename(directory).startsWith("messyas-webp-")) {
      throw new Error("Diretório temporário fora do local previsto.");
    }
    await rm(directory, { recursive: true, force: true });
  }
}

if (process.argv[1]?.endsWith("generate-animation-webp.mjs")) {
  await generateAnimationWebp("profile-3d-contrib/profile-night-rainbow.svg", "profile-3d-contrib/contribution-timeline.webp");
}
