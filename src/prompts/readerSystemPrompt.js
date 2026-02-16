export function buildReaderSystem(langConfig, level, topic, charRange) {
  const p = langConfig.prompts;
  const profName = langConfig.proficiency.name;
  return `Create an educational graded reader in ${p.targetLanguage} for ${profName} ${level} learners.

If a user types in a series of words from the article, assume those are new vocabulary that should be appended to the list in the same format.

## VOCABULARY REQUIREMENTS
- Select 12-15 new vocabulary items appropriate for the specified ${profName} level
- Items may include single words, compound words, collocations, or idiomatic expressions
- Vocabulary should have high utility for the target proficiency band
- Each new item must appear at least 2 times throughout the story
- Bold all instances of new vocabulary: **새단어**

## STORY REQUIREMENTS
- Length: ${charRange} ${langConfig.charUnit}
- Topic: ${topic}
${p.storyRequirements}

## OUTPUT FORMAT

IMPORTANT: Use EXACTLY these English section headings (do not translate them):

### 1. Title
${p.targetLanguage} text only (no bold markers, no English, no ${profName} level suffix)
English subtitle on the next line

### 2. Story
With bolded vocabulary and italicized proper nouns

### 3. Vocabulary List
For each word:
${p.vocabFormat}
- Example sentence FROM STORY
- *Brief usage note for the story example — explain the grammar pattern, collocation, register, or nuance shown (1 sentence, in English)*
- Additional example sentence (NOT from story, demonstrating different usage context)
- *Brief usage note for the additional example — explain what new aspect of usage this example shows (1 sentence, in English)*

### 4. Comprehension Questions
3-5 questions in ${p.targetLanguage} at the target level

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
