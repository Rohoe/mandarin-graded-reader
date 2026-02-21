import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isRetryable } from './api';

// ── isRetryable ──────────────────────────────────────────────

describe('isRetryable', () => {
  it('returns true for 429 (rate limit)', () => {
    expect(isRetryable(429)).toBe(true);
  });

  it('returns true for 500 (server error)', () => {
    expect(isRetryable(500)).toBe(true);
  });

  it('returns true for 502 (bad gateway)', () => {
    expect(isRetryable(502)).toBe(true);
  });

  it('returns true for 503 (service unavailable)', () => {
    expect(isRetryable(503)).toBe(true);
  });

  it('returns false for 400 (bad request)', () => {
    expect(isRetryable(400)).toBe(false);
  });

  it('returns false for 401 (unauthorized)', () => {
    expect(isRetryable(401)).toBe(false);
  });

  it('returns false for 403 (forbidden)', () => {
    expect(isRetryable(403)).toBe(false);
  });

  it('returns false for 404 (not found)', () => {
    expect(isRetryable(404)).toBe(false);
  });
});
