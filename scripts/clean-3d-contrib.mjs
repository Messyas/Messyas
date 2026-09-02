import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { THEME_CONFIG } from "./theme-config.mjs";

const dir = "profile-3d-contrib";

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const num = parseInt(full, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function rgbToString(rgb) {
  return `rgb(${Math.round(Math.min(255, Math.max(0, rgb.r)))}, ${Math.round(Math.min(255, Math.max(0, rgb.g)))}, ${Math.round(Math.min(255, Math.max(0, rgb.b)))})`;
}

function shade(rgb, factor) {
  return {
    r: rgb.r * factor,
    g: rgb.g * factor,
    b: rgb.b * factor,
  };
}

function generateCss(config) {
  const css = [];
  css.push(`* { font-family: "Ubuntu", "Helvetica", "Arial", sans-serif; }`);
  css.push(`.fill-fg { fill: #ECE6F0; }`);
  css.push(`.stroke-fg { stroke: #ECE6F0; }`);
  css.push(`.fill-bg { fill: ${config.backgroundColor}; }`);
  css.push(`.stroke-bg { stroke: ${config.backgroundColor}; }`);
  css.push(`.fill-strong { fill: #FF2A5F; }`);
  css.push(`.fill-weak { fill: #A855F7; }`);
  css.push(`.stroke-weak { stroke: #3D105B; }`);

  const faceFactors = {
    top: 1.0,
    left: 0.83,
    right: 0.68,
  };

  const brightnessScale = {
    0: 0.45,
    1: 0.65,
    2: 0.85,
    3: 1.05,
    4: 1.25,
  };

  const isAnimated = config.gradientMode === "animated";
  const stops = config.gradientStops;

  for (let level = 0; level <= 4; level++) {
    const levelBaseColor = hexToRgb(config.levels[`level${level}`]);

    for (const [face, factor] of Object.entries(faceFactors)) {
      const className = `rb-l${level}-${face}`;

      if (isAnimated && (level > 0 || config.animateEmptyDays)) {
        css.push(`.${className} { animation: ${className} ${config.animationDuration} linear infinite; }`);

        const keyframeStops = stops.map((hex, i) => {
          const pct = ((i / (stops.length - 1)) * 100).toFixed(2);
          const baseColor = hexToRgb(hex);
          const shaded = shade(baseColor, brightnessScale[level] * factor);
          return `${pct}%{fill:${rgbToString(shaded)}}`;
        }).join("");

        css.push(`@keyframes ${className} { ${keyframeStops} }`);
      } else {
        const shaded = shade(levelBaseColor, factor);
        css.push(`.${className} { fill: ${rgbToString(shaded)}; }`);
      }
    }
  }

  return css.join("\n");
}

function cleanAndThemeSvg(content) {
  const lastSvgClose = content.lastIndexOf("</svg>");
  if (lastSvgClose === -1) return content;

  // 1. Localizar final do <rect> de fundo
  const rectMatch = content.match(/<rect[^>]*class=["']fill-bg["'][^>]*><\/rect>|<rect[^>]*width=["']1280["'][^>]*><\/rect>/);
  if (!rectMatch) return content;

  const afterBgIndex = content.indexOf(rectMatch[0]) + rectMatch[0].length;
  let prefix = content.slice(0, afterBgIndex);
  const body = content.slice(afterBgIndex, lastSvgClose);
  const suffix = "</svg>";

  // 2. Substituir CSS <style>...</style> pelas novas regras e keyframes do tema
  const newCss = generateCss(THEME_CONFIG);
  if (prefix.includes("<style>")) {
    prefix = prefix.replace(/<style>[\s\S]*?<\/style>/, `<style>\n${newCss}\n</style>`);
  }

  // 3. Atualizar cor de fundo do <rect>
  prefix = prefix.replace(
    /<rect\b([^>]*)>/,
    `<rect x="0" y="0" width="1280" height="850" fill="${THEME_CONFIG.backgroundColor}">`
  );

  // 4. Extrair tags <g> de nível superior
  let depth = 0;
  const tags = [];
  let start = 0;

  for (let i = 0; i < body.length; i++) {
    if (body.startsWith("<g", i) && (body[i + 2] === " " || body[i + 2] === ">")) {
      if (depth === 0) start = i;
      depth++;
    } else if (body.startsWith("</g>", i)) {
      depth--;
      if (depth === 0) {
        tags.push(body.slice(start, i + 4));
      }
    }
  }

  // Tag 0 é o gráfico 3D de contribuições
  // Tag 1 (radar), Tag 2 (linguagens) e Tag 3 (estatísticas redundantes) são removidas
  let newBody = "";
  if (tags.length >= 1) {
    newBody = tags[0];

    // Opcional: manter data do período se presente
    if (tags.length >= 4) {
      const dateMatch = tags[3].match(/<text[^>]*\d{4}-\d{2}-\d{2}\s*\/\s*\d{4}-\d{2}-\d{2}<\/text>/);
      if (dateMatch) {
        newBody += `<g>${dateMatch[0]}</g>`;
      }
    }
  } else {
    newBody = body;
  }

  // 5. Remover tags <animate attributeName="fill"> antigas para evitar conflito com o CSS
  newBody = newBody.replace(/<animate attributeName="fill"[^>]*><\/animate>/g, "");

  // 6. Remover atributos fill="..." fixos em rects que usam classes rb-l...
  newBody = newBody.replace(/(<rect[^>]*class="rb-l[^"]*")[^>]*fill="[^"]*"/g, "$1");

  return prefix + newBody + suffix;
}

async function main() {
  try {
    const files = await readdir(dir);
    for (const file of files) {
      if (!file.endsWith(".svg")) continue;
      const filePath = join(dir, file);
      const original = await readFile(filePath, "utf8");
      const cleaned = cleanAndThemeSvg(original);
      await writeFile(filePath, cleaned, "utf8");
      console.log(`Processado ${file}: aplicado tema customizado em CSS.`);
    }
  } catch (err) {
    console.error("Erro ao processar SVGs 3D:", err);
    process.exit(1);
  }
}

await main();
