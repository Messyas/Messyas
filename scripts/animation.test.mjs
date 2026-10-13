import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { batchSvgPolygons } from "./batch-svg-polygons.mjs";
import { THEME_CONFIG } from "./theme-config.mjs";
import sharp from "sharp";
import { frameDelays } from "./generate-animation-webp.mjs";
import { languageWaveColor, parseLanguagePalette } from "./language-wave.mjs";
import { generate3dRotationSvg, parseContributionDays } from "./generate-3d-rotate.mjs";

const face = (id, x, y, width, height, fill) => ({
  id, pts: [[x, y, 0], [x + width, y, 0], [x + width, y + height, 0], [x, y + height, 0]],
  fill, stroke: "none", strokeWidth: 0,
});

test("onda usa as cores do card, percorre as semanas e fecha sem salto de cor", async () => {
  const palette = parseLanguagePalette(await readFile("assets/github-overview-dark.svg", "utf8"));
  const settings = THEME_CONFIG.rotation3d.languageWave;
  const item = { w: 0, d: 0, level: 4 };
  assert.equal(languageWaveColor(item, 0, settings, palette).toUpperCase(), palette[0]);
  assert.equal(languageWaveColor(item, 1, settings, palette), languageWaveColor(item, 0, settings, palette));
  assert.notEqual(languageWaveColor(item, 0, settings, palette), languageWaveColor({ ...item, w: 26 }, 0, settings, palette));
  // O mesmo tom segue a onda: avança 53/4 semanas após 1/4 de volta.
  assert.equal(languageWaveColor({ ...item, w: 53 / 4 }, 0.25, settings, palette), languageWaveColor(item, 0, settings, palette));
  const rgb = (hex) => hex.slice(1).match(/../g).map((channel) => parseInt(channel, 16));
  for (let index = 0; index < 360; index++) {
    const previous = rgb(languageWaveColor(item, index / 360, settings, palette));
    const next = rgb(languageWaveColor(item, (index + 1) / 360, settings, palette));
    assert.ok(next.every((channel, axis) => Math.abs(channel - previous[axis]) <= 6));
  }
  const empty = rgb(languageWaveColor({ ...item, level: 0 }, 0, settings, palette));
  assert.ok(empty.every((channel, axis) => channel < rgb(palette[0])[axis]));
});

test("modo por atividade continua disponível e os dados sobrevivem à regeneração", () => {
  const days = [{ w: 0, d: 0, level: 4 }, { w: 1, d: 0, level: 0 }];
  const config = { ...THEME_CONFIG, rotation3d: { ...THEME_CONFIG.rotation3d, duration: "1s", fps: 2, colorMode: "activity" } };
  const activity = generate3dRotationSvg(days, config);
  const wave = generate3dRotationSvg(days, { ...config, rotation3d: { ...config.rotation3d, colorMode: "language-wave" } });
  assert.notEqual(activity, wave);
  assert.deepEqual(parseContributionDays(wave), days);
  assert.deepEqual(parseContributionDays(activity), days);
});

test("faces separadas podem ser agrupadas, mantendo a ordem das sobreposições", () => {
  const input = [face(0, 0, 0, 10, 10, "red"), face(1, 100, 0, 10, 10, "blue"), face(2, 0, 0, 10, 10, "red")];
  assert.deepEqual(batchSvgPolygons(input).map((p) => p.id), [0, 2, 1]);
  const overlapping = [face(0, 0, 0, 10, 10, "red"), face(1, 0, 0, 10, 10, "blue"), face(2, 0, 0, 10, 10, "red")];
  assert.deepEqual(batchSvgPolygons(overlapping).map((p) => p.id), [0, 1, 2]);
});

test("agrupamento preserva todas as faces e suas sobreposições em cenas variadas", () => {
  let seed = 42;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
  for (let scene = 0; scene < 30; scene++) {
    const polygons = Array.from({ length: 80 }, (_, id) => face(id, random() * 200, random() * 200, random() * 50, random() * 90, ["red", "blue", "green"][id % 3]));
    const output = batchSvgPolygons(polygons);
    assert.equal(new Set(output).size, polygons.length);
    const positions = new Map(output.map((polygon, index) => [polygon, index]));
    for (let i = 0; i < polygons.length; i++) {
      for (let j = i + 1; j < polygons.length; j++) {
        const a = polygons[i].pts, b = polygons[j].pts;
        if (a[0][0] <= b[1][0] + 4 && a[1][0] + 4 >= b[0][0] &&
            a[0][1] <= b[2][1] + 4 && a[2][1] + 4 >= b[0][1]) {
          assert.ok(positions.get(polygons[i]) < positions.get(polygons[j]));
        }
      }
    }
  }
});

test("SVG de origem tem uma única animação, 60 fps programados e loop sem lacunas", async () => {
  const svg = await readFile("profile-3d-contrib/profile-night-rainbow.svg", "utf8");
  assert.equal((svg.match(/<animate\b/g) ?? []).length, 1);
  assert.ok(!svg.includes("opacity:") && !svg.includes("@keyframes"));
  const references = /<animate[^>]*values="([^"]+)"/.exec(svg)[1].split(";");
  const times = /keyTimes="([^"]+)"/.exec(svg)[1].split(";").map(Number);
  const duration = Number.parseFloat(THEME_CONFIG.rotation3d.duration);
  const frames = duration * THEME_CONFIG.rotation3d.fps;
  assert.equal(frames, 360);
  assert.equal(times.length, frames + 1);
  assert.equal(references.length, times.length);
  for (let i = 0; i <= frames; i++) {
    assert.equal(references[i], `#rot-frame-${i % frames}`);
    assert.ok(Math.abs(times[i] - i / frames) < 1e-9);
    assert.ok(svg.includes(`id="rot-frame-${i % frames}"`));
  }
  assert.equal(times[0], 0);
  assert.equal(times.at(-1), 1);
  assert.equal(references[0], references.at(-1));
  assert.ok(svg.indexOf('<g id="rot-frame-0"') > svg.indexOf("<defs>"));
  assert.equal(svg, await readFile("profile-3d-contrib/profile-360-horizontal.svg", "utf8"));
});

test("tempos inteiros de WebP preservam 60 quadros por segundo sem acumular atraso", () => {
  const delays = frameDelays(360, 6000);
  assert.equal(delays.reduce((sum, delay) => sum + delay, 0), 6000);
  assert.ok(delays.every((delay) => delay === 16 || delay === 17));
  let elapsed = 0;
  for (let index = 0; index < delays.length; index++) {
    elapsed += delays[index];
    assert.ok(Math.abs(elapsed - (index + 1) * 1000 / 60) <= 0.5);
  }
});

test("README exibe WebP decodificável com 360 quadros, 6 segundos e loop infinito", async () => {
  const path = "profile-3d-contrib/contribution-timeline.webp";
  const metadata = await sharp(path, { animated: true }).metadata();
  assert.equal(metadata.format, "webp");
  assert.equal(metadata.width, 1000);
  assert.equal(metadata.pageHeight, 660);
  assert.equal(metadata.pages, 360);
  assert.equal(metadata.loop, 0);
  assert.deepEqual(metadata.delay, frameDelays(360, 6000));
  const readme = await readFile("README.md", "utf8");
  assert.ok(readme.includes(`width="100%" src="${path}"`));
  const frames = await Promise.all([0, 90, 180, 270].map((page) => sharp(path, { page, pages: 1 }).png().toBuffer()));
  assert.ok(frames.every((frame) => frame.length > 1000));
  for (let index = 1; index < frames.length; index++) assert.ok(!frames[0].equals(frames[index]));
});
