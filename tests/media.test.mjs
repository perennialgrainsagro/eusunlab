import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { optimizeImage } from "../app/lib/media.ts";

test("image uploads reduce storage while preserving proportions, transparency, orientation, and animation", async () => {
  const source = await sharp({ create: { width: 2400, height: 1800, channels: 4, background: { r: 12, g: 110, b: 25, alpha: 0.4 } } }).png().toBuffer();
  const optimized = await optimizeImage(source);
  const metadata = await sharp(optimized.bytes).metadata();
  assert.equal(optimized.contentType, "image/webp");
  assert.ok(optimized.bytes.length < source.length);
  assert.deepEqual([metadata.width, metadata.height, metadata.hasAlpha], [1600, 1200, true]);
  const { data } = await sharp(optimized.bytes).raw().toBuffer({ resolveWithObject: true });
  assert.equal(data[3], 102, "Transparency survives compression.");

  const rotated = await sharp({ create: { width: 2000, height: 1000, channels: 3, background: "red" } }).jpeg().withMetadata({ orientation: 6 }).toBuffer();
  const oriented = await sharp((await optimizeImage(rotated)).bytes).metadata();
  assert.deepEqual([oriented.width, oriented.height], [800, 1600]);
  assert.equal(oriented.orientation, undefined, "Orientation is applied to pixels.");

  const tiny = Buffer.from("R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==", "base64");
  assert.deepEqual(await optimizeImage(tiny), { bytes: tiny, contentType: "image/gif" }, "Small images are not enlarged or replaced by larger files.");

  const animation = await sharp([
    { create: { width: 2000, height: 1000, channels: 4, background: "red" } },
    { create: { width: 2000, height: 1000, channels: 4, background: "blue" } },
  ], { join: { animated: true } }).gif({ loop: 2, delay: [80, 120] }).toBuffer();
  const animated = await sharp((await optimizeImage(animation)).bytes, { animated: true }).metadata();
  assert.deepEqual([animated.width, animated.pageHeight, animated.pages, animated.loop, animated.delay], [1600, 800, 2, 2, [80, 120]]);

  await assert.rejects(optimizeImage(Buffer.from("<svg onload='alert(1)'></svg>")), /Choose a JPEG/);
  await assert.rejects(optimizeImage(Buffer.from("89504e470d0a1a0a", "hex")), /Unable to process/);
  const tooLarge = await sharp({ create: { width: 7000, height: 6000, channels: 3, background: "white" } }).png().toBuffer();
  await assert.rejects(optimizeImage(tooLarge), /40 million total pixels/);
});
