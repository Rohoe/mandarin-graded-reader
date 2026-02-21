import { describe, it, expect } from 'vitest';
import { splitParagraphIntoSentences } from './sentenceSplitter';

describe('splitParagraphIntoSentences', () => {
  it('splits Chinese paragraph on 。！？ boundaries', () => {
    const para = '今天天气很好。我们去公园吧！你觉得怎么样？';
    const result = splitParagraphIntoSentences(para, 'zh');
    expect(result).toHaveLength(3);
    expect(result[0].plainText).toBe('今天天气很好。');
    expect(result[1].plainText).toBe('我们去公园吧！');
    expect(result[2].plainText).toBe('你觉得怎么样？');
  });

  it('splits on ；as sentence boundary for Chinese', () => {
    const para = '第一句话；第二句话。';
    const result = splitParagraphIntoSentences(para, 'zh');
    expect(result).toHaveLength(2);
    expect(result[0].plainText).toBe('第一句话；');
    expect(result[1].plainText).toBe('第二句话。');
  });

  it('splits Korean paragraph on . ! ? boundaries', () => {
    const para = '오늘 날씨가 좋아요. 공원에 갈까요? 네!';
    const result = splitParagraphIntoSentences(para, 'ko');
    expect(result).toHaveLength(3);
    expect(result[0].plainText).toBe('오늘 날씨가 좋아요.');
    expect(result[1].plainText).toBe(' 공원에 갈까요?');
    expect(result[2].plainText).toBe(' 네!');
  });

  it('preserves bold vocab words spanning sentence boundary', () => {
    const para = '我喜欢**苹果**。她喜欢**香蕉**。';
    const result = splitParagraphIntoSentences(para, 'zh');
    expect(result).toHaveLength(2);
    // First sentence should contain the bold segment
    expect(result[0].segments.some(s => s.type === 'bold' && s.content === '苹果')).toBe(true);
    expect(result[0].plainText).toBe('我喜欢苹果。');
    expect(result[1].segments.some(s => s.type === 'bold' && s.content === '香蕉')).toBe(true);
  });

  it('handles paragraph with no sentence-ending punctuation as single sentence', () => {
    const para = '这是一段没有句号的文本';
    const result = splitParagraphIntoSentences(para, 'zh');
    expect(result).toHaveLength(1);
    expect(result[0].plainText).toBe('这是一段没有句号的文本');
  });

  it('handles empty input', () => {
    expect(splitParagraphIntoSentences('', 'zh')).toEqual([]);
    expect(splitParagraphIntoSentences(null, 'zh')).toEqual([]);
  });

  it('handles Cantonese with same regex as Chinese', () => {
    const para = '你好！我係小明。';
    const result = splitParagraphIntoSentences(para, 'yue');
    expect(result).toHaveLength(2);
    expect(result[0].plainText).toBe('你好！');
    expect(result[1].plainText).toBe('我係小明。');
  });

  it('preserves italic segments', () => {
    const para = '*轻轻地*走过来。他说了一句话。';
    const result = splitParagraphIntoSentences(para, 'zh');
    expect(result).toHaveLength(2);
    expect(result[0].segments.some(s => s.type === 'italic' && s.content === '轻轻地')).toBe(true);
  });

  it('handles Korean with fullwidth punctuation', () => {
    const para = '안녕하세요。만나서 반갑습니다！';
    const result = splitParagraphIntoSentences(para, 'ko');
    expect(result).toHaveLength(2);
    expect(result[0].plainText).toBe('안녕하세요。');
    expect(result[1].plainText).toBe('만나서 반갑습니다！');
  });
});
