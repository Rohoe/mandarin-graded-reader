/**
 * Shared utility to extract vocabulary from a reader's vocabulary or ankiJson arrays.
 */
export function mapReaderVocabulary(reader, langId) {
  if (reader?.vocabulary?.length > 0) {
    return reader.vocabulary.map(v => ({
      target: v.target, romanization: v.romanization, translation: v.translation,
      chinese: v.chinese, korean: v.korean, pinyin: v.pinyin, english: v.english,
      langId,
      exampleSentence: v.exampleStory || '',
    }));
  }
  if (reader?.ankiJson?.length > 0) {
    return reader.ankiJson.map(c => ({
      target: c.target, romanization: c.romanization, translation: c.translation,
      chinese: c.chinese, korean: c.korean, pinyin: c.pinyin, english: c.english,
      langId,
      exampleSentence: c.exampleStory || '',
    }));
  }
  return null;
}
