import { describe, it, expect } from 'vitest';
import { parseReaderResponse, parseStorySegments, normalizeStructuredReader } from './parser';
import { zhReaderMarkdown, koReaderMarkdown, yueReaderMarkdown, malformedMarkdown, emptyResponse, structuredReaderJson } from '../test/fixtures/sampleReaderMarkdown';

// ── parseReaderResponse ──────────────────────────────────────

describe('parseReaderResponse', () => {
  describe('Chinese (zh)', () => {
    it('extracts title correctly', () => {
      const result = parseReaderResponse(zhReaderMarkdown, 'zh');
      expect(result.titleZh).toBe('小猫的冒险');
      expect(result.titleEn).toBe("The Kitten's Adventure");
    });

    it('extracts story text', () => {
      const result = parseReaderResponse(zhReaderMarkdown, 'zh');
      expect(result.story).toContain('**小猫**很喜欢在公园里玩');
      expect(result.story).toContain('别怕，我带你回家');
    });

    it('extracts vocabulary items with correct fields', () => {
      const result = parseReaderResponse(zhReaderMarkdown, 'zh');
      expect(result.vocabulary.length).toBeGreaterThanOrEqual(5);
      const xiaomao = result.vocabulary.find(v => v.target === '小猫');
      expect(xiaomao).toBeTruthy();
      expect(xiaomao.romanization).toBe('xiǎo māo');
      expect(xiaomao.translation).toContain('kitten');
      // Legacy aliases
      expect(xiaomao.chinese).toBe('小猫');
      expect(xiaomao.pinyin).toBeTruthy();
    });

    it('extracts comprehension questions', () => {
      const result = parseReaderResponse(zhReaderMarkdown, 'zh');
      expect(result.questions.length).toBeGreaterThanOrEqual(2);
      expect(result.questions[0].text).toContain('小猫每天早上做什么');
    });

    it('parses question with trailing translation', () => {
      const result = parseReaderResponse(zhReaderMarkdown, 'zh');
      const q3 = result.questions.find(q => q.translation && q.translation.includes('Who helped'));
      expect(q3).toBeTruthy();
      expect(q3.text).toContain('谁帮助了小猫');
    });

    it('extracts anki JSON', () => {
      const result = parseReaderResponse(zhReaderMarkdown, 'zh');
      expect(result.ankiJson.length).toBeGreaterThanOrEqual(5);
      expect(result.ankiJson[0].chinese).toBe('小猫');
      expect(result.ankiJson[0].pinyin).toBe('xiǎo māo');
    });

    it('extracts grammar notes', () => {
      const result = parseReaderResponse(zhReaderMarkdown, 'zh');
      expect(result.grammarNotes.length).toBeGreaterThanOrEqual(2);
      const vdao = result.grammarNotes.find(n => n.pattern.includes('V + 到'));
      expect(vdao).toBeTruthy();
      expect(vdao.label).toContain('Directional complement');
      expect(vdao.example).toContain('跑到大树下面');
    });

    it('sets langId on result', () => {
      const result = parseReaderResponse(zhReaderMarkdown, 'zh');
      expect(result.langId).toBe('zh');
    });

    it('has no parse error', () => {
      const result = parseReaderResponse(zhReaderMarkdown, 'zh');
      expect(result.parseError).toBeNull();
    });

    it('enriches vocab with usage notes from anki block', () => {
      const result = parseReaderResponse(zhReaderMarkdown, 'zh');
      const pao = result.vocabulary.find(v => v.target === '跑');
      expect(pao).toBeTruthy();
      expect(pao.usageNoteStory).toBeTruthy();
    });

    it('extracts example sentences from vocab section', () => {
      const result = parseReaderResponse(zhReaderMarkdown, 'zh');
      const xiaomao = result.vocabulary.find(v => v.target === '小猫');
      expect(xiaomao.exampleStory).toBeTruthy();
      expect(xiaomao.exampleExtra).toBeTruthy();
    });
  });

  describe('Korean (ko)', () => {
    it('extracts Korean titles', () => {
      const result = parseReaderResponse(koReaderMarkdown, 'ko');
      expect(result.titleZh).toBe('고양이의 모험');
      expect(result.titleEn).toBe("The Cat's Adventure");
    });

    it('extracts Korean vocab with romanization field', () => {
      const result = parseReaderResponse(koReaderMarkdown, 'ko');
      expect(result.vocabulary.length).toBeGreaterThanOrEqual(2);
      const cat = result.vocabulary.find(v => v.target === '고양이');
      expect(cat).toBeTruthy();
      expect(cat.romanization).toBe('go-yang-i');
    });

    it('extracts Korean story', () => {
      const result = parseReaderResponse(koReaderMarkdown, 'ko');
      expect(result.story).toContain('**고양이**가 공원에서');
    });

    it('sets langId to ko', () => {
      const result = parseReaderResponse(koReaderMarkdown, 'ko');
      expect(result.langId).toBe('ko');
    });
  });

  describe('Cantonese (yue)', () => {
    it('extracts Cantonese titles', () => {
      const result = parseReaderResponse(yueReaderMarkdown, 'yue');
      expect(result.titleZh).toBe('貓仔嘅冒險');
      expect(result.titleEn).toBe("The Kitten's Adventure");
    });

    it('extracts Cantonese vocab with jyutping', () => {
      const result = parseReaderResponse(yueReaderMarkdown, 'yue');
      const cat = result.vocabulary.find(v => v.target === '貓仔');
      expect(cat).toBeTruthy();
      expect(cat.romanization).toBe('maau1 zai2');
    });
  });

  describe('Edge cases', () => {
    it('returns parse error for empty input', () => {
      const result = parseReaderResponse(emptyResponse, 'zh');
      expect(result.parseError).toBe('Empty response from API.');
      expect(result.vocabulary).toEqual([]);
      expect(result.story).toBe('');
    });

    it('returns parse error for null input', () => {
      const result = parseReaderResponse(null, 'zh');
      expect(result.parseError).toBe('Empty response from API.');
    });

    it('handles malformed markdown gracefully', () => {
      const result = parseReaderResponse(malformedMarkdown, 'zh');
      // Should not throw
      expect(result.raw).toBe(malformedMarkdown);
      expect(result.parseError).toBeNull();
    });

    it('defaults langId to zh when not specified', () => {
      const result = parseReaderResponse(zhReaderMarkdown);
      expect(result.langId).toBe('zh');
    });

    it('synthesizes vocabulary from ankiJson when vocab section is empty', () => {
      const md = `### 1. Title
测试
Test

### 2. Story
**测试**的故事。

### 3. Vocabulary List

### 4. Comprehension Questions
1. 这是什么？

### 5. Anki Cards Data (JSON)
\`\`\`anki-json
[{"chinese": "测试", "pinyin": "cè shì", "english": "n. test", "example_story": "测试的故事。", "usage_note_story": "Basic.", "example_extra": "", "usage_note_extra": ""}]
\`\`\`

### 6. Grammar Notes
`;
      const result = parseReaderResponse(md, 'zh');
      expect(result.vocabulary.length).toBe(1);
      expect(result.vocabulary[0].target).toBe('测试');
      expect(result.vocabulary[0].romanization).toBe('cè shì');
    });

    it('appends ankiJson words missing from vocab section', () => {
      const md = `### 1. Title
测试
Test

### 2. Story
**你好**世界。**再见**朋友。

### 3. Vocabulary List
**你好** (nǐ hǎo) — hello
- **你好**世界。
- *Basic greeting.*

### 4. Comprehension Questions
1. 什么？

### 5. Anki Cards Data (JSON)
\`\`\`anki-json
[
  {"chinese": "你好", "pinyin": "nǐ hǎo", "english": "hello", "example_story": "你好世界。", "usage_note_story": "Greeting.", "example_extra": "", "usage_note_extra": ""},
  {"chinese": "再见", "pinyin": "zài jiàn", "english": "goodbye", "example_story": "再见朋友。", "usage_note_story": "Farewell.", "example_extra": "", "usage_note_extra": ""}
]
\`\`\`

### 6. Grammar Notes
`;
      const result = parseReaderResponse(md, 'zh');
      const targets = result.vocabulary.map(v => v.target);
      expect(targets).toContain('你好');
      expect(targets).toContain('再见');
    });

    it('deduplicates vocabulary items', () => {
      const md = `### 1. Title
测试
Test

### 2. Story
**猫**很可爱。

### 3. Vocabulary List
**猫** (māo) — cat
- **猫**很可爱。
- *A simple noun.*

**猫** (māo) — cat
- **猫**很可爱。
- *Duplicate entry.*

### 4. Comprehension Questions
1. 什么？

### 5. Anki Cards Data (JSON)
\`\`\`anki-json
[{"chinese": "猫", "pinyin": "māo", "english": "cat", "example_story": "猫很可爱。", "usage_note_story": "Simple noun.", "example_extra": "", "usage_note_extra": ""}]
\`\`\`

### 6. Grammar Notes
`;
      const result = parseReaderResponse(md, 'zh');
      const catEntries = result.vocabulary.filter(v => v.target === '猫');
      expect(catEntries.length).toBe(1);
    });
  });
});

// ── parseStorySegments ──────────────────────────────────────

describe('parseStorySegments', () => {
  it('returns empty array for empty input', () => {
    expect(parseStorySegments('')).toEqual([]);
    expect(parseStorySegments(null)).toEqual([]);
  });

  it('splits bold markers', () => {
    const segments = parseStorySegments('你好**世界**再见');
    expect(segments).toEqual([
      { type: 'text', content: '你好' },
      { type: 'bold', content: '世界' },
      { type: 'text', content: '再见' },
    ]);
  });

  it('splits italic markers', () => {
    const segments = parseStorySegments('你好*世界*再见');
    expect(segments).toEqual([
      { type: 'text', content: '你好' },
      { type: 'italic', content: '世界' },
      { type: 'text', content: '再见' },
    ]);
  });

  it('handles mixed bold and italic', () => {
    const segments = parseStorySegments('**bold** and *italic*');
    const types = segments.map(s => s.type);
    expect(types).toContain('bold');
    expect(types).toContain('italic');
    expect(types).toContain('text');
  });

  it('handles plain text without markers', () => {
    const segments = parseStorySegments('plain text only');
    expect(segments).toEqual([{ type: 'text', content: 'plain text only' }]);
  });
});

// ── normalizeStructuredReader ────────────────────────────────

describe('normalizeStructuredReader', () => {
  it('converts JSON object to parser shape', () => {
    const result = normalizeStructuredReader(structuredReaderJson, 'zh');
    expect(result.titleZh).toBe('小猫的冒险');
    expect(result.titleEn).toBe("The Kitten's Adventure");
    expect(result.story).toContain('**小猫**');
    expect(result.vocabulary.length).toBe(2);
    expect(result.vocabulary[0].target).toBe('小猫');
    expect(result.vocabulary[0].translation).toBe('n. kitten');
    expect(result.questions.length).toBe(2);
    expect(result.grammarNotes.length).toBe(1);
    expect(result.parseError).toBeNull();
    expect(result.langId).toBe('zh');
  });

  it('converts JSON string to parser shape', () => {
    const result = normalizeStructuredReader(JSON.stringify(structuredReaderJson), 'zh');
    expect(result.titleZh).toBe('小猫的冒险');
    expect(result.vocabulary.length).toBe(2);
  });

  it('falls back to regex parser on invalid JSON string', () => {
    const result = normalizeStructuredReader(zhReaderMarkdown, 'zh');
    // Should fallback to parseReaderResponse and still extract content
    expect(result.titleZh).toBeTruthy();
    expect(result.story).toBeTruthy();
  });

  it('populates ankiJson from vocabulary', () => {
    const result = normalizeStructuredReader(structuredReaderJson, 'zh');
    expect(result.ankiJson.length).toBe(2);
    expect(result.ankiJson[0].chinese).toBe('小猫');
    expect(result.ankiJson[0].pinyin).toBe('xiǎo māo');
  });

  it('sets raw field correctly', () => {
    const result = normalizeStructuredReader(structuredReaderJson, 'zh');
    expect(result.raw).toBeTruthy();
    const parsed = JSON.parse(result.raw);
    expect(parsed.title_target).toBe('小猫的冒险');
  });

  it('handles empty vocabulary and questions', () => {
    const result = normalizeStructuredReader({ title_target: 'Test', title_en: 'Test', story: 'Story' }, 'zh');
    expect(result.vocabulary).toEqual([]);
    expect(result.questions).toEqual([]);
    expect(result.grammarNotes).toEqual([]);
  });

  it('defaults langId to zh', () => {
    const result = normalizeStructuredReader(structuredReaderJson);
    expect(result.langId).toBe('zh');
  });
});
