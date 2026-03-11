import { describe, it, expect, vi, afterEach } from 'vitest';
import { createTimeoutController, parseJSONWithFallback } from './apiUtils';

// ── createTimeoutController ──────────────────────────────────

describe('createTimeoutController', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a signal and cleanup function', () => {
    const { signal, cleanup } = createTimeoutController();
    expect(signal).toBeInstanceOf(AbortSignal);
    expect(typeof cleanup).toBe('function');
    expect(signal.aborted).toBe(false);
    cleanup();
  });

  it('aborts on timeout', async () => {
    vi.useFakeTimers();
    const { signal, cleanup } = createTimeoutController(undefined, 100);
    expect(signal.aborted).toBe(false);
    vi.advanceTimersByTime(100);
    expect(signal.aborted).toBe(true);
    cleanup();
    vi.useRealTimers();
  });

  it('aborts when external signal is already aborted', () => {
    const external = AbortSignal.abort();
    const { signal, cleanup } = createTimeoutController(external, 60000);
    expect(signal.aborted).toBe(true);
    cleanup();
  });

  it('aborts when external signal fires', () => {
    const controller = new AbortController();
    const { signal, cleanup } = createTimeoutController(controller.signal, 60000);
    expect(signal.aborted).toBe(false);
    controller.abort();
    expect(signal.aborted).toBe(true);
    cleanup();
  });

  it('cleanup clears timeout so signal stays alive', async () => {
    vi.useFakeTimers();
    const { signal, cleanup } = createTimeoutController(undefined, 100);
    cleanup();
    vi.advanceTimersByTime(200);
    expect(signal.aborted).toBe(false);
    vi.useRealTimers();
  });
});

// ── parseJSONWithFallback ────────────────────────────────────

describe('parseJSONWithFallback', () => {
  it('parses clean JSON', () => {
    const obj = { a: 1 };
    expect(parseJSONWithFallback(JSON.stringify(obj), 'fail')).toEqual(obj);
  });

  it('parses JSON with whitespace', () => {
    expect(parseJSONWithFallback('  {"x":1}  ', 'fail')).toEqual({ x: 1 });
  });

  it('extracts JSON object from surrounding text', () => {
    const raw = 'Here is the result:\n{"summary":"test","lessons":[]}\nDone.';
    const result = parseJSONWithFallback(raw, 'fail');
    expect(result.summary).toBe('test');
  });

  it('extracts JSON array when no object is present', () => {
    const raw = 'Lessons:\n[1,2,3]\nEnd.';
    const result = parseJSONWithFallback(raw, 'fail');
    expect(result).toEqual([1, 2, 3]);
  });

  it('prefers longer match: object when object is bigger', () => {
    const raw = 'Here: {"summary":"test","lessons":[]} also []';
    const result = parseJSONWithFallback(raw, 'fail');
    expect(result).toEqual({ summary: 'test', lessons: [] });
  });

  it('prefers longer match: array when array wraps objects', () => {
    const raw = 'Lessons:\n[{"title":"L1"}]\nEnd.';
    const result = parseJSONWithFallback(raw, 'fail');
    expect(result).toEqual([{ title: 'L1' }]);
  });

  it('throws with custom message on complete failure', () => {
    expect(() => parseJSONWithFallback('not json at all', 'Custom error'))
      .toThrow('Custom error');
  });
});
