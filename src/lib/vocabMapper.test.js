import { describe, it, expect } from 'vitest';
import { mapReaderVocabulary } from './vocabMapper';

describe('mapReaderVocabulary', () => {
  describe('vocabulary branch', () => {
    it('maps all example fields from vocabulary', () => {
      const reader = {
        vocabulary: [{
          target: '猫', romanization: 'māo', translation: 'cat',
          exampleStory: '我有一只猫。',
          exampleStoryTranslation: 'I have a cat.',
          exampleExtra: '猫很可爱。',
          exampleExtraTranslation: 'Cats are cute.',
        }],
      };
      const result = mapReaderVocabulary(reader, 'zh');
      expect(result[0].exampleSentence).toBe('我有一只猫。');
      expect(result[0].exampleSentenceTranslation).toBe('I have a cat.');
      expect(result[0].exampleExtra).toBe('猫很可爱。');
      expect(result[0].exampleExtraTranslation).toBe('Cats are cute.');
      expect(result[0].langId).toBe('zh');
    });

    it('defaults missing example fields to empty strings', () => {
      const reader = {
        vocabulary: [{ target: '猫', translation: 'cat' }],
      };
      const result = mapReaderVocabulary(reader, 'zh');
      expect(result[0].exampleSentence).toBe('');
      expect(result[0].exampleSentenceTranslation).toBe('');
      expect(result[0].exampleExtra).toBe('');
      expect(result[0].exampleExtraTranslation).toBe('');
    });
  });

  describe('ankiJson branch', () => {
    it('maps all example fields from ankiJson', () => {
      const reader = {
        ankiJson: [{
          target: '고양이', romanization: 'goyangi', translation: 'cat',
          exampleStory: '고양이가 있어요.',
          exampleStoryTranslation: 'There is a cat.',
          exampleExtra: '고양이는 귀여워요.',
          exampleExtraTranslation: 'Cats are cute.',
        }],
      };
      const result = mapReaderVocabulary(reader, 'ko');
      expect(result[0].exampleSentence).toBe('고양이가 있어요.');
      expect(result[0].exampleSentenceTranslation).toBe('There is a cat.');
      expect(result[0].exampleExtra).toBe('고양이는 귀여워요.');
      expect(result[0].exampleExtraTranslation).toBe('Cats are cute.');
    });

    it('defaults missing example fields to empty strings', () => {
      const reader = {
        ankiJson: [{ target: '고양이', translation: 'cat' }],
      };
      const result = mapReaderVocabulary(reader, 'ko');
      expect(result[0].exampleSentence).toBe('');
      expect(result[0].exampleSentenceTranslation).toBe('');
      expect(result[0].exampleExtra).toBe('');
      expect(result[0].exampleExtraTranslation).toBe('');
    });
  });

  it('returns null when reader has no vocabulary or ankiJson', () => {
    expect(mapReaderVocabulary({}, 'zh')).toBeNull();
    expect(mapReaderVocabulary({ vocabulary: [] }, 'zh')).toBeNull();
    expect(mapReaderVocabulary(null, 'zh')).toBeNull();
  });
});
