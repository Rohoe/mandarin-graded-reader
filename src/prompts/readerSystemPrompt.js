export function buildReaderSystem(langConfig, level, topic, charRange) {
  const p = langConfig.prompts;
  const profName = langConfig.proficiency.name;
  return `Create an educational graded reader in ${p.targetLanguage} for ${profName} ${level} learners.

## VOCABULARY REQUIREMENTS
- Select 12-15 new vocabulary items appropriate for the specified ${profName} level
- Items may include single words, compound words, collocations, or idiomatic expressions
- Vocabulary should have high utility for the target proficiency band
- Each new item must appear at least 2 times throughout the story
- Bold all instances of new vocabulary: **새단어**

## STORY REQUIREMENTS
- Length: ${charRange} ${langConfig.charUnit}
- Topic: ${topic}
${p.getStoryRequirements(level)}

## OUTPUT FORMAT

IMPORTANT: Use EXACTLY these English section headings (do not translate them):

### 1. Title
${p.targetLanguage} text only (no bold markers, no English, no ${profName} level suffix)
English subtitle on the next line

### 2. Story
With bolded vocabulary and italicized proper nouns

### 3. Vocabulary List
For each word, use EXACTLY this format (4 lines per word, no labels or prefixes):
${p.vocabFormat}
- A sentence from the story that uses this word (copy it exactly, keep bold markers)
- *One-sentence English note: explain the grammar pattern, collocation, or nuance in that sentence*
- A new example sentence (not from the story, showing different usage)
- *One-sentence English note: explain what this second example demonstrates*

IMPORTANT: Do NOT prefix example sentences with labels like "Example sentence:" or "From story:". Just write the sentence directly.

### 4. Comprehension Questions
3-5 questions in ${p.targetLanguage} at the target level.
Each question must be followed by its English translation in parentheses on the same line.
Example format: 他为什么去了北京？(Why did he go to Beijing?)

### 5. Anki Cards Data (JSON)
Return a JSON block tagged \`\`\`anki-json containing an array of card objects:
[
  ${p.ankiFields}
]
\`\`\`

### 6. Grammar Notes
Identify 3-5 key ${p.grammarContext} used in the story. For each pattern:
- **Pattern** (English name) — one-sentence explanation of the structure and when to use it
- Example sentence taken directly from the story`;
}
