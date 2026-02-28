import { describe, it, expect, vi, beforeEach } from 'vitest';
import { translateText } from './translate';

describe('translateText', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should use zh-CN for Mandarin', async () => {
    const mockResponse = [[[['hello', '你好']]]];
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    await translateText('你好', 'zh');
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('sl=zh-CN')
    );
  });

  it('should use yue for Cantonese', async () => {
    const mockResponse = [[[['hello', '你好']]]];
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    await translateText('你好', 'yue');
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('sl=yue')
    );
  });

  it('should use ko for Korean', async () => {
    const mockResponse = [[[['hello', '안녕']]]];
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    await translateText('안녕', 'ko');
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('sl=ko')
    );
  });

  it('should join multiple segments', async () => {
    const mockResponse = [[['Hello ', '你'], ['world', '好']]];
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await translateText('你好', 'zh');
    expect(result).toBe('Hello world');
  });

  it('should strip markdown before translating', async () => {
    const mockResponse = [[[['bold text', '**粗体**']]]];
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    await translateText('**粗体**', 'zh');
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining(encodeURIComponent('粗体'))
    );
  });

  it('should return empty string for empty input', async () => {
    const result = await translateText('', 'zh');
    expect(result).toBe('');
  });

  it('should throw on HTTP error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 429,
    });

    await expect(translateText('test', 'zh')).rejects.toThrow('Translation failed (429)');
  });

  it('should throw on unexpected response shape', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([null]),
    });

    await expect(translateText('test', 'zh')).rejects.toThrow('Unexpected translation response');
  });

  it('should default to zh-CN for unknown language', async () => {
    const mockResponse = [[[['test', 'test']]]];
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    await translateText('test', 'unknown');
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('sl=zh-CN')
    );
  });
});
