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
  return `rgb(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)})`;
}

function shade(rgb, factor) {
  return {
    r: Math.min(255, Math.max(0, rgb.r * factor)),
    g: Math.min(255, Math.max(0, rgb.g * factor)),
    b: Math.min(255, Math.max(0, rgb.b * factor)),
  };
}

function interpolateRgb(c1, c2, t) {
  return {
    r: c1.r + (c2.r - c1.r) * t,
    g: c1.g + (c2.g - c1.g) * t,
    b: c1.b + (c2.b - c1.b) * t,
  };
}

function getSampledPalette(stops, count = 12) {
  const rgbs = stops.map(hexToRgb);
  const result = [];
  const segments = rgbs.length - 1;
  for (let i = 0; i < count; i++) {
    const progress = (i / count) * segments;
    const segIndex = Math.min(Math.floor(progress), segments - 1);
    const segT = progress - segIndex;
    result.push(interpolateRgb(rgbs[segIndex], rgbs[segIndex + 1], segT));
  }
  return result;
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

  // 2. Atualizar cor de fundo com a variável THEME_CONFIG.backgroundColor
  prefix = prefix.replace(
    /<rect\b([^>]*)>/,
    `<rect x="0" y="0" width="1280" height="850" fill="${THEME_CONFIG.backgroundColor}">`
  );

  // 3. Extrair tags <g> de nível superior
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
  // Tag 1 (radar), Tag 2 (linguagens) e Tag 3 (estatísticas redundantes) são descartadas
  let newBody = "";
  if (tags.length >= 1) {
    newBody = tags[0];

    // Opcional: manter apenas a data do período discreta se existir
    if (tags.length >= 4) {
      const dateMatch = tags[3].match(/<text[^>]*\d{4}-\d{2}-\d{2}\s*\/\s*\d{4}-\d{2}-\d{2}<\/text>/);
      if (dateMatch) {
        newBody += `<g>${dateMatch[0]}</g>`;
      }
    }
  } else {
    newBody = body;
  }

  // 4. Aplicar o gradiente / paleta customizada às barras 3D
  const palette = getSampledPalette(THEME_CONFIG.gradientStops, 12);
  const levelColors = {
    0: hexToRgb(THEME_CONFIG.levels.level0),
    1: hexToRgb(THEME_CONFIG.levels.level1),
    2: hexToRgb(THEME_CONFIG.levels.level2),
    3: hexToRgb(THEME_CONFIG.levels.level3),
    4: hexToRgb(THEME_CONFIG.levels.level4),
  };

  const brightnessScale = {
    0: 0.50,
    1: 0.70,
    2: 0.85,
    3: 1.05,
    4: 1.25,
  };

  const faceFactors = {
    top: 1.0,
    left: 0.83,
    right: 0.68,
  };

  const barRegex = /<g transform="translate\((\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\)">([\s\S]*?)<\/g>/g;

  newBody = newBody.replace(barRegex, (fullMatch, xStr, yStr, innerContent) => {
    const posX = parseFloat(xStr);

    // Identificar a altura a partir da face esquerda
    const leftFaceMatch = innerContent.match(/<rect[^>]*transform="skewY\(30\)[^"]*"[^>]*>/);
    let height = 2.6;
    if (leftFaceMatch) {
      const hMatch = leftFaceMatch[0].match(/height="([\d.]+)"/);
      if (hMatch) height = parseFloat(hMatch[1]);
    }

    let level = 0;
    if (height <= 2.6 && !innerContent.includes("animateTransform")) {
      level = 0;
    } else if (height < 10) {
      level = 1;
    } else if (height < 18) {
      level = 2;
    } else if (height < 26) {
      level = 3;
    } else {
      level = 4;
    }

    const isAnimate = THEME_CONFIG.gradientMode === "animated";
    const animateThisBar = isAnimate && (level > 0 || THEME_CONFIG.animateEmptyDays);
    const weekIndex = Math.round(posX / 20);

    // Substituir as cores em cada <rect> (top, left, right)
    const rectRegex = /<rect\b([^>]*)>([\s\S]*?)<\/rect>/g;

    const newInner = innerContent.replace(rectRegex, (rectMatch, attrs, innerRect) => {
      let face = "top";
      if (attrs.includes("skewY(30)")) {
        face = "left";
      } else if (attrs.includes("translate(18 10.39)")) {
        face = "right";
      }

      const factor = faceFactors[face];

      if (animateThisBar) {
        const shift = weekIndex % palette.length;
        const values = [];
        for (let i = 0; i <= palette.length; i++) {
          const idx = (i + shift) % palette.length;
          const shaded = shade(palette[idx], brightnessScale[level] * factor);
          values.push(rgbToString(shaded));
        }
        const animTag = `<animate attributeName="fill" values="${values.join(";")}" dur="${THEME_CONFIG.animationDuration}" repeatCount="indefinite"></animate>`;

        let newInnerRect = innerRect;
        if (newInnerRect.includes('attributeName="fill"')) {
          newInnerRect = newInnerRect.replace(/<animate attributeName="fill"[^>]*><\/animate>/, animTag);
        } else {
          newInnerRect = animTag + newInnerRect;
        }

        const cleanAttrs = attrs.replace(/\s*fill="[^"]*"/, "");
        return `<rect${cleanAttrs}>${newInnerRect}</rect>`;
      } else {
        const baseColor = levelColors[level];
        const shaded = shade(baseColor, factor);
        const fillAttr = `fill="${rgbToString(shaded)}"`;

        const cleanInnerRect = innerRect.replace(/<animate attributeName="fill"[^>]*><\/animate>/g, "");
        let cleanAttrs = attrs.replace(/\s*fill="[^"]*"/, "");
        cleanAttrs = `${cleanAttrs} ${fillAttr}`;

        return `<rect${cleanAttrs}>${cleanInnerRect}</rect>`;
      }
    });

    return `<g transform="translate(${xStr} ${yStr})">${newInner}</g>`;
  });

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
      console.log(`Processado ${file}: aplicado tema gradiente (${THEME_CONFIG.gradientMode}) e removidos elementos redundantes.`);
    }
  } catch (err) {
    console.error("Erro ao processar SVGs 3D:", err);
    process.exit(1);
  }
}

await main();
