import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prepareExport, generateAnkiExport } from './anki';

// Mock ankiApkg module
vi.mock('./ankiApkg', () => ({
  generateApkgBlob: vi.fn(),
}));

const sampleAnkiJson = [
  { chinese: '小猫', pinyin: 'xiǎo māo', english: 'n. kitten', example_story: '小猫很可爱。', usage_note_story: 'A noun.', example_extra: '', usage_note_extra: '' },
  { chinese: '跑', pinyin: 'pǎo', english: 'v. to run', example_story: '他在跑。', usage_note_story: 'A verb.', example_extra: '', usage_note_extra: '' },
  { chinese: '蝴蝶', pinyin: 'hú dié', english: 'n. butterfly', example_story: '蝴蝶飞。', usage_note_story: 'A noun.', example_extra: '', usage_note_extra: '' },
];

const koAnkiJson = [
  { korean: '고양이', romanization: 'go-yang-i', english: 'n. cat', example_story: '고양이가 있어요.', usage_note_story: 'Subject.', example_extra: '', usage_note_extra: '' },
];

// ── prepareExport ────────────────────────────────────────────

describe('prepareExport', () => {
  it('exports all cards when none are already exported', () => {
    const { toExport, skipped } = prepareExport(sampleAnkiJson, new Set(), 'zh');
    expect(toExport.length).toBe(3);
    expect(skipped.length).toBe(0);
  });

  it('skips already exported words', () => {
    const { toExport, skipped } = prepareExport(sampleAnkiJson, new Set(['小猫', '跑']), 'zh');
    expect(toExport.length).toBe(1);
    expect(skipped.length).toBe(2);
    expect(toExport[0].chinese).toBe('蝴蝶');
  });

  it('skips all when everything is exported', () => {
    const { toExport, skipped } = prepareExport(sampleAnkiJson, new Set(['小猫', '跑', '蝴蝶']), 'zh');
    expect(toExport.length).toBe(0);
    expect(skipped.length).toBe(3);
  });

  it('uses Korean field for Korean cards', () => {
    const { toExport } = prepareExport(koAnkiJson, new Set(), 'ko');
    expect(toExport.length).toBe(1);
  });

  it('skips Korean words correctly', () => {
    const { toExport, skipped } = prepareExport(koAnkiJson, new Set(['고양이']), 'ko');
    expect(toExport.length).toBe(0);
    expect(skipped.length).toBe(1);
  });

  it('skips cards with no target word', () => {
    const cards = [{ english: 'test', pinyin: 'test' }];
    const { toExport } = prepareExport(cards, new Set(), 'zh');
    expect(toExport.length).toBe(0);
  });
});

// ── generateAnkiExport ──────────────────────────────────────

describe('generateAnkiExport', () => {
  it('generates tab-separated content', () => {
    const result = generateAnkiExport(sampleAnkiJson, 'Cats', 2, new Set(), { langId: 'zh' });
    expect(result.content).toBeTruthy();
    const lines = result.content.split('\n');
    expect(lines.length).toBe(3);
    // Each line should have 5 tab-separated columns
    lines.forEach(line => {
      expect(line.split('\t').length).toBe(5);
    });
  });

  it('returns null content when all words already exported', () => {
    const result = generateAnkiExport(sampleAnkiJson, 'Cats', 2, new Set(['小猫', '跑', '蝴蝶']), { langId: 'zh' });
    expect(result.content).toBeNull();
    expect(result.stats.exported).toBe(0);
    expect(result.stats.skipped).toBe(3);
  });

  it('includes correct stats', () => {
    const result = generateAnkiExport(sampleAnkiJson, 'Cats', 2, new Set(['小猫']), { langId: 'zh' });
    expect(result.stats.exported).toBe(2);
    expect(result.stats.skipped).toBe(1);
  });

  it('generates correct filename with HSK tag', () => {
    const result = generateAnkiExport(sampleAnkiJson, 'Cats', 3, new Set(), { langId: 'zh' });
    expect(result.filename).toMatch(/^anki_cards_Cats_HSK3_\d{4}-\d{2}-\d{2}\.txt$/);
  });

  it('generates correct filename with TOPIK tag for Korean', () => {
    const result = generateAnkiExport(koAnkiJson, 'Food', 2, new Set(), { langId: 'ko' });
    expect(result.filename).toMatch(/^anki_cards_Food_TOPIK2_\d{4}-\d{2}-\d{2}\.txt$/);
  });

  it('returns exportedChinese set with exported words', () => {
    const result = generateAnkiExport(sampleAnkiJson, 'Cats', 2, new Set(), { langId: 'zh' });
    expect(result.exportedChinese).toBeInstanceOf(Set);
    expect(result.exportedChinese.has('小猫')).toBe(true);
    expect(result.exportedChinese.has('跑')).toBe(true);
  });

  it('includes grammar notes when provided', () => {
    const grammarNotes = [
      { pattern: 'V + 到', label: 'Directional', explanation: 'Movement to destination.', example: '跑到大树下面。' },
    ];
    const result = generateAnkiExport(sampleAnkiJson, 'Cats', 2, new Set(), { langId: 'zh', grammarNotes });
    expect(result.stats.exported).toBe(4); // 3 vocab + 1 grammar
    // Grammar card should have Grammar tag
    const lines = result.content.split('\n');
    const grammarLine = lines.find(l => l.includes('Grammar'));
    expect(grammarLine).toBeTruthy();
    expect(grammarLine).toContain('V + 到');
  });

  it('sanitizes tabs and newlines in content', () => {
    const cards = [
      { chinese: '测试', pinyin: 'cè\tshì', english: 'test\ndef', example_story: 'example', usage_note_story: 'note', example_extra: '', usage_note_extra: '' },
    ];
    const result = generateAnkiExport(cards, 'Test', 1, new Set(), { langId: 'zh' });
    const lines = result.content.split('\n');
    // After sanitization, should still have exactly 5 columns
    expect(lines[0].split('\t').length).toBe(5);
    // Tabs in fields become spaces, newlines become <br>
    expect(lines[0]).toContain('cè shì');
    expect(lines[0]).toContain('test<br>def');
  });

  it('uses forceAll to export even already-exported words', () => {
    const result = generateAnkiExport(sampleAnkiJson, 'Cats', 2, new Set(['小猫']), { langId: 'zh', forceAll: true });
    expect(result.stats.exported).toBe(3);
    expect(result.stats.skipped).toBe(0);
  });

  it('sanitizes topic for filename', () => {
    const result = generateAnkiExport(sampleAnkiJson, 'Cats & Dogs / Pets', 2, new Set(), { langId: 'zh' });
    expect(result.filename).not.toContain('/');
    expect(result.filename).not.toContain(' ');
  });
});
