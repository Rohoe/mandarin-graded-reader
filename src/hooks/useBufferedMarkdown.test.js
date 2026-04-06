import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBufferedMarkdown } from './useBufferedMarkdown';

describe('useBufferedMarkdown', () => {
  it('returns null rendered for null input', () => {
    const { result } = renderHook(() => useBufferedMarkdown(null));
    expect(result.current.rendered).toBe(null);
    expect(result.current.partialVocab).toEqual([]);
  });

  it('returns empty string rendered for empty input', () => {
    const { result } = renderHook(() => useBufferedMarkdown(''));
    expect(result.current.rendered).toBe('');
    expect(result.current.partialVocab).toEqual([]);
  });

  it('renders a header', async () => {
    const { result } = renderHook(() => useBufferedMarkdown('### 1. Title', 0));
    await act(() => new Promise(r => setTimeout(r, 10)));
    const elements = result.current.rendered;
    expect(elements).toHaveLength(1);
    expect(elements[0].type).toBe('h3');
  });

  it('renders bold text in paragraphs', async () => {
    const { result } = renderHook(() => useBufferedMarkdown('Hello **world**', 0));
    await act(() => new Promise(r => setTimeout(r, 10)));
    const elements = result.current.rendered;
    expect(elements).toHaveLength(1);
    expect(elements[0].type).toBe('p');
    // paragraph children should include a <strong> element
    const children = elements[0].props.children;
    const hasStrong = Array.isArray(children) && children.some(c => c?.type === 'strong');
    expect(hasStrong).toBe(true);
  });

  it('strips code fences', async () => {
    const text = '### Vocab\n```vocab-json\n[{"a":"b"}]\n```\n### Next';
    const { result } = renderHook(() => useBufferedMarkdown(text, 0));
    await act(() => new Promise(r => setTimeout(r, 10)));
    const elements = result.current.rendered;
    // Should have two headers, no code block content
    const headers = elements.filter(e => e.type === 'h3');
    expect(headers).toHaveLength(2);
  });

  it('strips incomplete code fences at end of stream', async () => {
    const text = '### Story\nHello\n```vocab-json\n[{"a":"b"}';
    const { result } = renderHook(() => useBufferedMarkdown(text, 0));
    await act(() => new Promise(r => setTimeout(r, 10)));
    const elements = result.current.rendered;
    // Should have header and paragraph, no code content
    expect(elements.some(e => e.type === 'h3')).toBe(true);
    expect(elements.some(e => e.type === 'p')).toBe(true);
  });

  describe('partialVocab extraction', () => {
    it('returns empty array when no vocab-json fence', () => {
      const { result } = renderHook(() => useBufferedMarkdown('### Story\nHello world', 0));
      expect(result.current.partialVocab).toEqual([]);
    });

    it('extracts complete objects from partial vocab-json block', async () => {
      const text = '### Story\nHello\n```vocab-json\n[\n  { "target": "猫", "pinyin": "māo", "translation": "cat" },\n  { "target": "狗"';
      const { result } = renderHook(() => useBufferedMarkdown(text, 0));
      await act(() => new Promise(r => setTimeout(r, 10)));
      expect(result.current.partialVocab).toHaveLength(1);
      expect(result.current.partialVocab[0].target).toBe('猫');
    });

    it('extracts multiple complete objects', async () => {
      const text = '```vocab-json\n[\n  { "target": "猫", "translation": "cat" },\n  { "target": "狗", "translation": "dog" },\n  { "target": "鸟"';
      const { result } = renderHook(() => useBufferedMarkdown(text, 0));
      await act(() => new Promise(r => setTimeout(r, 10)));
      expect(result.current.partialVocab).toHaveLength(2);
      expect(result.current.partialVocab[1].target).toBe('狗');
    });

    it('extracts all objects from a complete vocab-json block', async () => {
      const text = '```vocab-json\n[\n  { "target": "猫", "translation": "cat" },\n  { "target": "狗", "translation": "dog" }\n]\n```\n### Questions';
      const { result } = renderHook(() => useBufferedMarkdown(text, 0));
      await act(() => new Promise(r => setTimeout(r, 10)));
      expect(result.current.partialVocab).toHaveLength(2);
    });

    it('handles strings with escaped quotes', async () => {
      const text = '```vocab-json\n[\n  { "target": "说\\"话\\"", "translation": "to speak" }';
      const { result } = renderHook(() => useBufferedMarkdown(text, 0));
      await act(() => new Promise(r => setTimeout(r, 10)));
      expect(result.current.partialVocab).toHaveLength(1);
    });
  });
});
