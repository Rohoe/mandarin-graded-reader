import { describe, it, expect, vi, beforeEach } from 'vitest';
import React, { createContext } from 'react';
import { renderHook, act } from '@testing-library/react';

// ── Mocks ────────────────────────────────────────────────────

const mockDispatch = vi.fn();
const mockPushGeneratedReader = vi.fn();
const mockAct = {
  startPendingReader: vi.fn(),
  clearPendingReader: vi.fn(),
  clearError: vi.fn(),
  notify: vi.fn(),
  updateStandaloneReaderMeta: vi.fn(),
};

vi.mock('../context/useAppSelector', () => ({
  useAppDispatch: () => mockDispatch,
}));

vi.mock('../context/actions', () => ({
  actions: () => mockAct,
}));

const mockGenerateReader = vi.fn();
const mockGenerateReaderStream = vi.fn();
vi.mock('../lib/api', () => ({
  generateReader: (...args) => mockGenerateReader(...args),
  generateReaderStream: (...args) => mockGenerateReaderStream(...args),
}));

const mockParseReaderResponse = vi.fn();
const mockNormalizeStructuredReader = vi.fn();
vi.mock('../lib/parser', () => ({
  parseReaderResponse: (...args) => mockParseReaderResponse(...args),
  normalizeStructuredReader: (...args) => mockNormalizeStructuredReader(...args),
}));

vi.mock('../lib/languages', () => ({
  getLang: () => ({ prompts: { titleFieldKey: 'title_zh' } }),
}));

// Mock AppContext with a real createContext — factory can use imports
vi.mock('../context/AppContext', async () => {
  const { createContext: cc } = await import('react');
  return { AppContext: cc(null) };
});

import { AppContext } from '../context/AppContext';
import { useReaderGeneration } from './useReaderGeneration';

// ── Helpers ──────────────────────────────────────────────────

function wrapper({ children }) {
  return React.createElement(
    AppContext.Provider,
    { value: { pushGeneratedReader: mockPushGeneratedReader } },
    children
  );
}

// Use openai provider by default so tests go through non-streaming generateReader path
const baseLlmConfig = { provider: 'openai', apiKey: 'test-key', model: 'test' };
const anthropicLlmConfig = { provider: 'anthropic', apiKey: 'test-key', model: 'test' };
const baseReader = { topic: 'cats', level: 2, langId: 'zh' };
const parsedResult = {
  titleZh: '小猫', titleEn: 'Kitten', story: 'Story text.',
  vocabulary: [], questions: [], grammarNotes: [], ankiJson: [],
  parseWarnings: [], parseError: null, langId: 'zh',
};

// ── Tests ────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockGenerateReader.mockResolvedValue('raw markdown');
  mockParseReaderResponse.mockReturnValue(parsedResult);
});

describe('useReaderGeneration', () => {
  it('calls generateReader with correct params on handleGenerate', async () => {
    const { result } = renderHook(
      () => useReaderGeneration(
        'standalone_123', null, baseReader, 'zh', false,
        baseLlmConfig, {}, 2000, 300, false
      ),
      { wrapper }
    );

    await act(async () => { await result.current.handleGenerate(); });

    expect(mockGenerateReader).toHaveBeenCalledOnce();
    const args = mockGenerateReader.mock.calls[0];
    expect(args[0]).toBe(baseLlmConfig);
    expect(args[1]).toBe('cats');
    expect(args[2]).toBe(2);
    expect(args[7]).toBe('zh');
  });

  it('parses response and pushes generated reader on success', async () => {
    const { result } = renderHook(
      () => useReaderGeneration(
        'standalone_123', null, baseReader, 'zh', false,
        baseLlmConfig, {}, 2000, 300, false
      ),
      { wrapper }
    );

    await act(async () => { await result.current.handleGenerate(); });

    expect(mockParseReaderResponse).toHaveBeenCalledWith('raw markdown', 'zh');
    expect(mockPushGeneratedReader).toHaveBeenCalledOnce();
    const pushed = mockPushGeneratedReader.mock.calls[0];
    expect(pushed[0]).toBe('standalone_123');
    expect(pushed[1].topic).toBe('cats');
    expect(pushed[1].level).toBe(2);
    expect(pushed[1].langId).toBe('zh');
  });

  it('does nothing when isPending is true', async () => {
    const { result } = renderHook(
      () => useReaderGeneration(
        'standalone_123', null, baseReader, 'zh', true,
        baseLlmConfig, {}, 2000, 300, false
      ),
      { wrapper }
    );

    await act(async () => { await result.current.handleGenerate(); });

    expect(mockGenerateReader).not.toHaveBeenCalled();
  });

  it('does nothing when neither lessonMeta nor reader is provided', async () => {
    const { result } = renderHook(
      () => useReaderGeneration(
        'standalone_123', null, null, 'zh', false,
        baseLlmConfig, {}, 2000, 300, false
      ),
      { wrapper }
    );

    await act(async () => { await result.current.handleGenerate(); });

    expect(mockGenerateReader).not.toHaveBeenCalled();
  });

  it('uses normalizeStructuredReader when useStructuredOutput is true', async () => {
    mockNormalizeStructuredReader.mockReturnValue(parsedResult);
    const { result } = renderHook(
      () => useReaderGeneration(
        'standalone_123', null, baseReader, 'zh', false,
        baseLlmConfig, {}, 2000, 300, true
      ),
      { wrapper }
    );

    await act(async () => { await result.current.handleGenerate(); });

    expect(mockNormalizeStructuredReader).toHaveBeenCalledWith('raw markdown', 'zh');
    expect(mockParseReaderResponse).not.toHaveBeenCalled();
  });

  it('handles API error gracefully', async () => {
    mockGenerateReader.mockRejectedValue(new Error('API rate limit exceeded'));
    const { result } = renderHook(
      () => useReaderGeneration(
        'standalone_123', null, baseReader, 'zh', false,
        baseLlmConfig, {}, 2000, 300, false
      ),
      { wrapper }
    );

    await act(async () => { await result.current.handleGenerate(); });

    expect(mockPushGeneratedReader).not.toHaveBeenCalled();
    expect(mockAct.notify).toHaveBeenCalledWith('error', expect.stringContaining('API rate limit'));
  });

  it('handles timeout/abort error with specific message', async () => {
    const abortErr = new Error('timed out');
    abortErr.name = 'AbortError';
    mockGenerateReader.mockRejectedValue(abortErr);
    const { result } = renderHook(
      () => useReaderGeneration(
        'standalone_123', null, baseReader, 'zh', false,
        baseLlmConfig, {}, 2000, 300, false
      ),
      { wrapper }
    );

    await act(async () => { await result.current.handleGenerate(); });

    expect(mockPushGeneratedReader).not.toHaveBeenCalled();
    expect(mockAct.notify).toHaveBeenCalledWith('error', expect.stringContaining('timed out'));
  });

  it('uses lessonMeta when provided (over reader)', async () => {
    const lessonMeta = {
      title_zh: '我的课', title_en: 'My lesson',
      description: 'About cats', level: 4, langId: 'zh',
    };
    const { result } = renderHook(
      () => useReaderGeneration(
        'lesson_s1_0', lessonMeta, baseReader, 'zh', false,
        baseLlmConfig, {}, 2000, 300, false
      ),
      { wrapper }
    );

    await act(async () => { await result.current.handleGenerate(); });

    const args = mockGenerateReader.mock.calls[0];
    expect(args[1]).toContain('我的课');
    expect(args[2]).toBe(4);
  });

  it('aborts in-flight request on unmount', async () => {
    let rejectFn;
    mockGenerateReader.mockReturnValue(new Promise((_, reject) => { rejectFn = reject; }));

    const { result, unmount } = renderHook(
      () => useReaderGeneration(
        'standalone_123', null, baseReader, 'zh', false,
        baseLlmConfig, {}, 2000, 300, false
      ),
      { wrapper }
    );

    // Start generation (don't await)
    let genPromise;
    act(() => { genPromise = result.current.handleGenerate(); });

    unmount();

    // Reject the dangling promise and wait for it to settle
    rejectFn(new Error('aborted'));
    await genPromise;
  });

  it('uses streaming for Anthropic provider', async () => {
    // Create async generator mock
    async function* fakeStream() {
      yield 'Hello ';
      yield 'World';
    }
    mockGenerateReaderStream.mockReturnValue(fakeStream());

    const { result } = renderHook(
      () => useReaderGeneration(
        'standalone_123', null, baseReader, 'zh', false,
        anthropicLlmConfig, {}, 2000, 300, false
      ),
      { wrapper }
    );

    await act(async () => { await result.current.handleGenerate(); });

    expect(mockGenerateReaderStream).toHaveBeenCalledOnce();
    expect(mockGenerateReader).not.toHaveBeenCalled();
    expect(mockParseReaderResponse).toHaveBeenCalledWith('Hello World', 'zh');
  });

  it('clears pending reader even on error', async () => {
    mockGenerateReader.mockRejectedValue(new Error('fail'));
    const { result } = renderHook(
      () => useReaderGeneration(
        'standalone_123', null, baseReader, 'zh', false,
        baseLlmConfig, {}, 2000, 300, false
      ),
      { wrapper }
    );

    await act(async () => { await result.current.handleGenerate(); });

    expect(mockAct.clearPendingReader).toHaveBeenCalledWith('standalone_123');
  });
});
