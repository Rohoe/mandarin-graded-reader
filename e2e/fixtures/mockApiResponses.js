// Canned API responses for e2e tests

export const syllabusResponse = JSON.stringify({
  summary: 'This syllabus covers Chinese food culture from street snacks to fine dining.',
  lessons: [
    { lesson_number: 1, title_zh: '街头小吃', title_en: 'Street Snacks', description: 'Introduction to popular Chinese street food.', vocabulary_focus: ['food', 'snacks', 'street'] },
    { lesson_number: 2, title_zh: '家常菜', title_en: 'Home Cooking', description: 'Learning about everyday Chinese home cooking.', vocabulary_focus: ['cooking', 'kitchen', 'ingredients'] },
  ],
});

export const readerResponse = `### 1. Title
街头小吃
Street Snacks

### 2. Story
**小明**每天都去街上买**小吃**。他最喜欢吃**包子**和**饺子**。

今天，小明看到一个新的小吃摊。那里卖**煎饼**。小明**尝**了一个煎饼。"真好吃！"他说。

### 3. Vocabulary List
**小吃** (xiǎo chī) — snacks
- **小明**每天都去街上买**小吃**。
- *小吃 refers to small dishes or street food.*
- 北京有很多好吃的**小吃**。
- *Used as a general noun for street food.*

**包子** (bāo zi) — steamed bun
- 他最喜欢吃**包子**和**饺子**。
- *包子 is a common breakfast food.*
- 这个**包子**是肉馅的。
- *Specifying the filling with 馅.*

### 4. Comprehension Questions
1. 小明每天做什么？
2. 小明今天尝了什么？

### 5. Anki Cards Data (JSON)
\`\`\`anki-json
[
  { "chinese": "小吃", "pinyin": "xiǎo chī", "english": "n. snack; street food", "example_story": "小明每天都去街上买小吃。", "usage_note_story": "General noun for street food.", "example_extra": "北京有很多好吃的小吃。", "usage_note_extra": "Common in food contexts." },
  { "chinese": "包子", "pinyin": "bāo zi", "english": "n. steamed bun", "example_story": "他最喜欢吃包子和饺子。", "usage_note_story": "Common breakfast food.", "example_extra": "这个包子是肉馅的。", "usage_note_extra": "Specifying filling." }
]
\`\`\`

### 6. Grammar Notes
**每天 + V** (Daily habit) — Indicates a habitual action done every day.
- 小明每天都去街上买小吃。
`;

export const gradingResponse = JSON.stringify({
  overallScore: '8/10',
  overallFeedback: 'Good job! You understood the main ideas well.',
  feedback: [
    { score: '4/5', feedback: 'Correct answer with good detail.', suggestedAnswer: '小明每天都去街上买小吃。' },
    { score: '4/5', feedback: 'Good understanding.', suggestedAnswer: '小明今天尝了一个煎饼。' },
  ],
});

// Anthropic API format wrappers
export function wrapAnthropicResponse(text) {
  return {
    content: [{ type: 'text', text }],
  };
}

export function wrapOpenAIResponse(text) {
  return {
    choices: [{ message: { content: text } }],
  };
}

export function wrapGeminiResponse(text) {
  return {
    candidates: [{ content: { parts: [{ text }] } }],
  };
}
