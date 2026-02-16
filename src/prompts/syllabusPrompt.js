export function buildSyllabusPrompt(langConfig, topic, level, lessonCount) {
  const p = langConfig.prompts;
  return `You are a ${p.curriculumDesigner}. Generate a graded reader syllabus for the following parameters:

Topic: ${topic}
${langConfig.proficiency.name} Level: ${level}
Number of lessons: ${lessonCount}

Return a JSON object with exactly two keys:
- "summary": A 2-3 sentence overview (in English) of what the learner will cover across all lessons
- "lessons": an array of lesson objects, each with:
  - "lesson_number": integer (1-${lessonCount})
  - "${p.titleFieldKey}": ${p.titleInstruction}
  - "title_en": English lesson title
  - "description": One English sentence describing what the reader covers
  - "vocabulary_focus": 3-5 English keywords describing the vocabulary theme

Return ONLY valid JSON. No explanation, no markdown fences.`;
}
