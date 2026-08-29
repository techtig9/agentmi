import { test } from "node:test";
import assert from "node:assert/strict";
import { createBucket, tryConsume, type RateLimitConfig } from "../lib/rate-limit/token-bucket";

const CONFIG: RateLimitConfig = { capacity: 5, refillPerSecond: 1 };

test("a fresh bucket allows up to capacity requests immediately", () => {
  let bucket = createBucket(CONFIG, 0);
  for (let i = 0; i < 5; i++) {
    const { bucket: next, result } = tryConsume(bucket, CONFIG, 0);
    assert.equal(result.allowed, true, `request ${i + 1} should be allowed`);
    bucket = next;
  }
});

test("the request beyond capacity is denied with no time elapsed", () => {
  let bucket = createBucket(CONFIG, 0);
  for (let i = 0; i < 5; i++) {
    bucket = tryConsume(bucket, CONFIG, 0).bucket;
  }
  const { result } = tryConsume(bucket, CONFIG, 0);
  assert.equal(result.allowed, false);
  assert.equal(result.remaining, 0);
});

test("tokens refill linearly over time", () => {
  let bucket = createBucket(CONFIG, 0);
  // Drain all 5
  for (let i = 0; i < 5; i++) bucket = tryConsume(bucket, CONFIG, 0).bucket;

  // 3 seconds later, at 1/sec refill, should have 3 tokens back
  const { result } = tryConsume(bucket, CONFIG, 3000);
  assert.equal(result.allowed, true);
  assert.equal(result.remaining, 2); // 3 refilled, minus the 1 just consumed
});

test("refill never exceeds capacity even after a long gap", () => {
  let bucket = createBucket(CONFIG, 0);
  bucket = tryConsume(bucket, CONFIG, 0).bucket; // 4 left
  const { result } = tryConsume(bucket, CONFIG, 1_000_000); // huge gap
  assert.equal(result.remaining, 4); // capacity(5) - 1 just consumed, not more
});

test("retryAfterMs gives an accurate wait time when denied", () => {
  let bucket = createBucket(CONFIG, 0);
  for (let i = 0; i < 5; i++) bucket = tryConsume(bucket, CONFIG, 0).bucket;

  const { result } = tryConsume(bucket, CONFIG, 0);
  assert.equal(result.allowed, false);
  assert.equal(result.retryAfterMs, 1000); // need 1 token at 1/sec = 1000ms

  // Confirm the suggested wait actually works
  const retryResult = tryConsume(bucket, CONFIG, result.retryAfterMs);
  assert.equal(retryResult.result.allowed, true);
});

test("a higher-cost request can be denied even with some tokens available", () => {
  let bucket = createBucket(CONFIG, 0);
  bucket = tryConsume(bucket, CONFIG, 0, 3).bucket; // 2 left
  const { result } = tryConsume(bucket, CONFIG, 0, 3); // needs 3, only 2 available
  assert.equal(result.allowed, false);
});

test("two independent buckets don't affect each other", () => {
  const bucketA = createBucket(CONFIG, 0);
  const bucketB = createBucket(CONFIG, 0);
  const drainedA = tryConsume(bucketA, CONFIG, 0, 5).bucket;
  const stillFullB = tryConsume(bucketB, CONFIG, 0, 5);
  assert.equal(stillFullB.result.allowed, true);
});
