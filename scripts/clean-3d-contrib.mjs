import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const dir = "profile-3d-contrib";

function cleanSvg(content) {
  const lastSvgClose = content.lastIndexOf("</svg>");
  if (lastSvgClose === -1) return content;

  // Locate the end of the background <rect> tag
  const rectMatch = content.match(/<rect[^>]*class=["']fill-bg["'][^>]*><\/rect>|<rect[^>]*width=["']1280["'][^>]*><\/rect>/);
  if (!rectMatch) return content;

  const afterBgIndex = content.indexOf(rectMatch[0]) + rectMatch[0].length;
  const prefix = content.slice(0, afterBgIndex);
  const body = content.slice(afterBgIndex, lastSvgClose);
  const suffix = "</svg>";

  // Extract all top-level <g> tags
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

  // If we found the expected 4 groups:
  // Tag 0: 3D Contribution Calendar (KEEP)
  // Tag 1: Radar chart of contributions (REMOVE)
  // Tag 2: Language pie chart (REMOVE)
  // Tag 3: Stats text (contributions, stars, forks, period)
  if (tags.length >= 1) {
    let newBody = tags[0];

    // Preserve the subtle period date if present in Tag 3
    if (tags.length >= 4) {
      const dateMatch = tags[3].match(/<text[^>]*\d{4}-\d{2}-\d{2}\s*\/\s*\d{4}-\d{2}-\d{2}<\/text>/);
      if (dateMatch) {
        newBody += `<g>${dateMatch[0]}</g>`;
      }
    }

    return prefix + newBody + suffix;
  }

  return content;
}

async function main() {
  try {
    const files = await readdir(dir);
    for (const file of files) {
      if (!file.endsWith(".svg")) continue;
      const filePath = join(dir, file);
      const original = await readFile(filePath, "utf8");
      const cleaned = cleanSvg(original);
      if (cleaned !== original) {
        await writeFile(filePath, cleaned, "utf8");
        console.log(`Limpou ${file} (removidos radar, linguagens e estatísticas redundantes)`);
      }
    }
  } catch (err) {
    console.error("Erro ao limpar SVGs 3D:", err);
    process.exit(1);
  }
}

await main();
