import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { BANNER_CONFIG } from "./banner-config.mjs";
import { contourField } from "./topographic-field.mjs";

test("campo topográfico fecha a volta sem descontinuidade e evolui no tempo", () => {
  let moving = false;
  for (let x = 0; x < 1; x += 0.05) {
    for (let y = 0; y < 0.35; y += 0.05) {
      const initial = contourField(x, y, 0);
      assert.ok(Number.isFinite(initial));
      assert.ok(Math.abs(initial - contourField(x, y, Math.PI * 2)) < 1e-10);
      moving ||= Math.abs(initial - contourField(x, y, Math.PI / 2)) > 0.01;
    }
  }
  assert.ok(moving);
});

test("banner entregue preserva 60 fps, duração e seleção no README", async () => {
  const metadata = await sharp("assets/topographic-banner.webp", { animated: true }).metadata();
  assert.equal(metadata.width, BANNER_CONFIG.width);
  assert.equal(metadata.pageHeight, BANNER_CONFIG.height);
  assert.equal(metadata.pages, BANNER_CONFIG.fps * BANNER_CONFIG.durationSeconds);
  assert.equal(metadata.loop, 0);
  assert.equal(metadata.delay.reduce((sum, delay) => sum + delay, 0), BANNER_CONFIG.durationSeconds * 1000);
  assert.ok(metadata.delay.every((delay) => delay === 16 || delay === 17));
  const readme = await readFile("README.md", "utf8");
  if (BANNER_CONFIG.mode === "topographic") assert.equal((readme.match(/src="assets\/topographic-banner.webp"/g) ?? []).length, 2);
  const first = await sharp("assets/topographic-banner.webp", { page: 0, pages: 1 }).raw().toBuffer();
  const other = await sharp("assets/topographic-banner.webp", { page: 90, pages: 1 }).raw().toBuffer();
  assert.ok(!first.equals(other));
});
