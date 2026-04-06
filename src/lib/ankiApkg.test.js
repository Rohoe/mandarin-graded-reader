import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Database
const mockRun = vi.fn();
const mockExport = vi.fn(() => new Uint8Array([1, 2, 3]));
const mockClose = vi.fn();
const mockPrepare = vi.fn(() => ({
  bind: vi.fn(),
  step: vi.fn(),
  free: vi.fn(),
}));

const MockDatabase = vi.fn(function () {
  this.run = mockRun;
  this.export = mockExport;
  this.close = mockClose;
  this.prepare = mockPrepare;
});

vi.mock('sql.js', () => ({
  default: vi.fn(async () => ({ Database: MockDatabase })),
}));

vi.mock('fflate', () => ({
  zipSync: vi.fn((files) => new Uint8Array([0x50, 0x4b])),
  strToU8: vi.fn((str) => new TextEncoder().encode(str)),
}));

const { generateApkgBlob } = await import('./ankiApkg.js');
const { zipSync } = await import('fflate');
const initSqlJs = (await import('sql.js')).default;

describe('generateApkgBlob', () => {
  beforeEach(() => {
    mockRun.mockClear();
    mockExport.mockClear();
    mockClose.mockClear();
    mockPrepare.mockClear();
    MockDatabase.mockClear();
    zipSync.mockClear();
  });

  const sampleCards = [
    {
      target: '你好',
      romanization: 'nǐ hǎo',
      translation: 'hello',
      examples: '<div>你好世界</div>',
      tags: 'greeting',
      hint: '__ __',
    },
    {
      target: '谢谢',
      romanization: 'xiè xiè',
      translation: 'thank you',
      examples: '<div>谢谢你</div>',
      tags: 'polite',
      hint: '__ __',
    },
  ];

  it('returns a Blob', async () => {
    const result = await generateApkgBlob(sampleCards, 'Test Deck');
    expect(result).toBeInstanceOf(Blob);
  });

  it('returns a Blob with correct type', async () => {
    const result = await generateApkgBlob(sampleCards, 'Test Deck');
    expect(result.type).toBe('application/zip');
  });

  it('creates expected SQLite tables', async () => {
    await generateApkgBlob(sampleCards, 'Test Deck');

    const runCalls = mockRun.mock.calls.map(([sql]) => sql);
    expect(runCalls.some((sql) => sql.includes('CREATE TABLE col'))).toBe(true);
    expect(runCalls.some((sql) => sql.includes('CREATE TABLE notes'))).toBe(true);
    expect(runCalls.some((sql) => sql.includes('CREATE TABLE cards'))).toBe(true);
    expect(runCalls.some((sql) => sql.includes('CREATE TABLE revlog'))).toBe(true);
    expect(runCalls.some((sql) => sql.includes('CREATE TABLE graves'))).toBe(true);
  });

  it('card count matches input — 1 col insert + 3 prepare calls per card', async () => {
    await generateApkgBlob(sampleCards, 'Test Deck');

    // runWithParams uses db.prepare for each parameterized insert:
    // 1 col insert + per card: 1 note + 2 cards (forward + reverse) = 3 per card
    const expectedPrepareCount = 1 + sampleCards.length * 3;
    expect(mockPrepare).toHaveBeenCalledTimes(expectedPrepareCount);
  });

  it('handles empty cards array', async () => {
    mockPrepare.mockClear();
    const result = await generateApkgBlob([], 'Empty Deck');

    expect(result).toBeInstanceOf(Blob);
    // Only the col insert — no note or card inserts
    expect(mockPrepare).toHaveBeenCalledTimes(1);
  });

  it('includes media JSON in zip', async () => {
    await generateApkgBlob(sampleCards, 'Test Deck');

    const zipArg = zipSync.mock.calls[0][0];
    expect(zipArg).toHaveProperty('media');
  });

  it('includes collection.anki2 in zip', async () => {
    await generateApkgBlob(sampleCards, 'Test Deck');

    const zipArg = zipSync.mock.calls[0][0];
    expect(zipArg).toHaveProperty('collection.anki2');
  });

  it('calls db.close() after export', async () => {
    await generateApkgBlob(sampleCards, 'Test Deck');

    expect(mockExport).toHaveBeenCalled();
    expect(mockClose).toHaveBeenCalled();

    // close must be called after export
    const exportOrder = mockExport.mock.invocationCallOrder[0];
    const closeOrder = mockClose.mock.invocationCallOrder[0];
    expect(closeOrder).toBeGreaterThan(exportOrder);
  });

  it('includes romanization in card fields', async () => {
    await generateApkgBlob(sampleCards, 'Test Deck');

    // The note INSERT is the second prepare call (first is col insert)
    // Check that the flds parameter contains the romanization
    const noteInsertCalls = mockPrepare.mock.calls.filter(([sql]) =>
      sql.includes('INSERT INTO notes'),
    );
    expect(noteInsertCalls.length).toBe(sampleCards.length);

    // Each note bind receives params where flds (index 6) contains the romanization
    for (let i = 0; i < noteInsertCalls.length; i++) {
      const stmtMock = mockPrepare.mock.results[
        // col insert is index 0, then per card: note at 1+i*3, forward card at 2+i*3, reverse card at 3+i*3
        1 + i * 3
      ].value;
      const bindArgs = stmtMock.bind.mock.calls[0][0];
      // flds is param index 6 (0-based), contains field-separator-joined fields
      const flds = bindArgs[6];
      expect(flds).toContain(sampleCards[i].romanization);
    }
  });
});

describe('getSql caching', () => {
  it('reuses sql.js promise across multiple calls (initSqlJs called only once)', async () => {
    // generateApkgBlob has already been called multiple times above,
    // each call invokes getSql(). The singleton should mean initSqlJs
    // was called exactly once across the entire test suite.
    await generateApkgBlob([], 'Deck A');
    await generateApkgBlob([], 'Deck B');

    expect(initSqlJs).toHaveBeenCalledTimes(1);
  });
});
