import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBufferedMarkdown } from './useBufferedMarkdown';

describe('useBufferedMarkdown', () => {
  it('returns null for null input', () => {
    const { result } = renderHook(() => useBufferedMarkdown(null));
    expect(result.current).toBe(null);
  });

  it('returns empty string for empty input', () => {
    const { result } = renderHook(() => useBufferedMarkdown(''));
    expect(result.current).toBe('');
  });

  it('renders a header', async () => {
    const { result } = renderHook(() => useBufferedMarkdown('### 1. Title', 0));
    await act(() => new Promise(r => setTimeout(r, 10)));
    const elements = result.current;
    expect(elements).toHaveLength(1);
    expect(elements[0].type).toBe('h3');
  });

  it('renders bold text in paragraphs', async () => {
    const { result } = renderHook(() => useBufferedMarkdown('Hello **world**', 0));
    await act(() => new Promise(r => setTimeout(r, 10)));
    const elements = result.current;
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
    const elements = result.current;
    // Should have two headers, no code block content
    const headers = elements.filter(e => e.type === 'h3');
    expect(headers).toHaveLength(2);
  });

  it('strips incomplete code fences at end of stream', async () => {
    const text = '### Story\nHello\n```vocab-json\n[{"a":"b"}';
    const { result } = renderHook(() => useBufferedMarkdown(text, 0));
    await act(() => new Promise(r => setTimeout(r, 10)));
    const elements = result.current;
    // Should have header and paragraph, no code content
    expect(elements.some(e => e.type === 'h3')).toBe(true);
    expect(elements.some(e => e.type === 'p')).toBe(true);
  });
});
