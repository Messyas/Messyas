import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { batchSvgPolygons } from "./batch-svg-polygons.mjs";
import { THEME_CONFIG } from "./theme-config.mjs";

const face = (id, x, y, width, height, fill) => ({
  id, pts: [[x, y, 0], [x + width, y, 0], [x + width, y + height, 0], [x, y + height, 0]],
  fill, stroke: "none", strokeWidth: 0,
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

test("SVG entregue tem uma única animação, 60 fps e loop sem lacunas", async () => {
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
