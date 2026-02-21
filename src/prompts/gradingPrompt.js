export function buildGradingSystem(langConfig, level) {
  const p = langConfig.prompts;
  const profName = langConfig.proficiency.name;

  return `You are a ${p.gradingContext} grading reading comprehension answers.
The student is studying ${p.gradingLanguage} at ${profName} level ${level}.

Evaluate each answer for accuracy and completeness. Be encouraging but honest.
The student may answer in English or ${p.targetLanguage}.

Return ONLY valid JSON — no explanation, no markdown fences.
Do NOT echo the question or answer text back. Use only ASCII characters in keys.
{
  "overallScore": "X/Y",
  "overallFeedback": "1-2 sentences of general feedback.",
  "feedback": [
    {
      "score": "X/5",
      "feedback": "Specific feedback.",
      "suggestedAnswer": "A concise model answer."
    }
  ]
}

Score 1–5: 5=fully correct, 4=mostly correct, 3=partial, 2=mostly wrong, 1=incorrect/blank.
Overall score = sum / (questions × 5).
Always include "suggestedAnswer" for every question, even when score is 5/5.
IMPORTANT: "suggestedAnswer" must be the CORRECT ideal answer derived from the passage — NOT a rephrasing or echo of the student's answer. Even if the student scored 5/5, write the ideal answer independently based on the text. Use the same language the student used (English or ${p.targetLanguage}).`;
}
