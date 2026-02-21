import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock sql.js — we can't load real WASM in jsdom, but we can verify
// that getSql() is called correctly and the DB interactions work.

const mockRun = vi.fn();
const mockExport = vi.fn(() => new Uint8Array([1, 2, 3]));
const mockClose = vi.fn();

class MockDatabase {
  constructor() { mockRun.mockClear(); mockExport.mockClear(); mockClose.mockClear(); }
  run(...args) { return mockRun(...args); }
  export() { return mockExport(); }
  close() { return mockClose(); }
}

const mockInitSqlJs = vi.fn(() => Promise.resolve({ Database: MockDatabase }));

vi.mock('sql.js', () => ({ default: mockInitSqlJs }));

// Mock fetch for WASM binary
const mockWasmBinary = new ArrayBuffer(8);
globalThis.fetch = vi.fn(() =>
  Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve(mockWasmBinary) })
);

// Mock crypto.subtle.digest for fieldChecksum
// jsdom provides crypto as a read-only getter, so we spy on the existing object.
vi.spyOn(crypto.subtle, 'digest').mockResolvedValue(new ArrayBuffer(20));

const { generateApkgBlob } = await import('./ankiApkg');

describe('generateApkgBlob', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initialises sql.js with wasmBinary fetched from /sql-wasm.wasm', async () => {
    await generateApkgBlob([{ target: '猫', romanization: 'māo', translation: 'cat', examples: '', tags: '' }], 'Test', 'zh');

    // fetch should have been called for the WASM binary
    expect(fetch).toHaveBeenCalledWith('/sql-wasm.wasm');

    // initSqlJs should receive the wasmBinary, NOT a locateFile function
    expect(mockInitSqlJs).toHaveBeenCalledWith({ wasmBinary: mockWasmBinary });
  });

  it('falls back to CDN when local WASM fetch fails', async () => {
    // Reset module cache to re-trigger getSql()
    vi.resetModules();

    class MockDB2 {
      run(...args) { return mockRun(...args); }
      export() { return mockExport(); }
      close() { return mockClose(); }
    }
    const mockInit2 = vi.fn(() => Promise.resolve({ Database: MockDB2 }));
    vi.doMock('sql.js', () => ({ default: mockInit2 }));

    const wasmBuf = new ArrayBuffer(8);
    let callCount = 0;
    globalThis.fetch = vi.fn(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve({ ok: false, status: 404 });
      return Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve(wasmBuf) });
    });

    // Re-mock crypto.subtle.digest after resetModules
    vi.spyOn(crypto.subtle, 'digest').mockResolvedValue(new ArrayBuffer(20));

    const mod = await import('./ankiApkg');
    await mod.generateApkgBlob([{ target: '猫', romanization: 'māo', translation: 'cat', examples: '', tags: '' }], 'Test', 'zh');

    // First call: local /sql-wasm.wasm (404), second: CDN
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(mockInit2).toHaveBeenCalledWith({ wasmBinary: wasmBuf });
  });

  it('creates correct SQLite tables and inserts cards', async () => {
    const cards = [
      { target: '猫', romanization: 'māo', translation: 'cat', examples: 'Example', tags: 'HSK1' },
      { target: '狗', romanization: 'gǒu', translation: 'dog', examples: '', tags: 'HSK1' },
    ];

    await generateApkgBlob(cards, 'TestDeck', 'zh');

    // Should create all required Anki tables
    const createCalls = mockRun.mock.calls.filter(c => typeof c[0] === 'string' && c[0].includes('CREATE TABLE'));
    const tableNames = createCalls.map(c => c[0].match(/CREATE TABLE (\w+)/)?.[1]);
    expect(tableNames).toContain('col');
    expect(tableNames).toContain('notes');
    expect(tableNames).toContain('cards');
    expect(tableNames).toContain('revlog');
    expect(tableNames).toContain('graves');

    // Should insert 1 col row + 2 notes + 2 cards = 5 INSERT calls
    const insertCalls = mockRun.mock.calls.filter(c => typeof c[0] === 'string' && c[0].includes('INSERT'));
    expect(insertCalls.length).toBe(5); // 1 col + 2 notes + 2 cards

    // DB should be exported and closed
    expect(mockExport).toHaveBeenCalled();
    expect(mockClose).toHaveBeenCalled();
  });

  it('returns a Blob with application/zip type', async () => {
    const blob = await generateApkgBlob(
      [{ target: '猫', romanization: 'māo', translation: 'cat', examples: '', tags: '' }],
      'Test', 'zh'
    );
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('application/zip');
  });
});
