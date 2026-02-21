import { syllabusResponse, readerResponse, wrapAnthropicResponse, wrapOpenAIResponse, wrapGeminiResponse } from '../fixtures/mockApiResponses.js';

/**
 * Seeds localStorage with initial app state before page load.
 */
export async function seedLocalStorage(page, overrides = {}) {
  const defaults = {
    'gradedReader_providerKeys': JSON.stringify({ anthropic: 'sk-test-key', openai: '', gemini: '', openai_compatible: '' }),
    'gradedReader_activeProvider': JSON.stringify('anthropic'),
  };
  const data = { ...defaults, ...overrides };

  await page.addInitScript((storageData) => {
    for (const [key, value] of Object.entries(storageData)) {
      localStorage.setItem(key, value);
    }
  }, data);
}

/**
 * Intercepts all LLM API calls and returns canned responses.
 */
export async function mockLLMApis(page, { syllabusBody, readerBody } = {}) {
  // Mock Anthropic
  await page.route('**/api.anthropic.com/**', async (route) => {
    const body = JSON.parse(route.request().postData() || '{}');
    const userMsg = body.messages?.[0]?.content || '';
    const isSyllabus = userMsg.includes('graded reader syllabus');

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(wrapAnthropicResponse(isSyllabus ? (syllabusBody || syllabusResponse) : (readerBody || readerResponse))),
    });
  });

  // Mock OpenAI
  await page.route('**/api.openai.com/**', async (route) => {
    const body = JSON.parse(route.request().postData() || '{}');
    const msgs = body.messages || [];
    const userMsg = msgs.find(m => m.role === 'user')?.content || '';
    const isSyllabus = userMsg.includes('graded reader syllabus');

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(wrapOpenAIResponse(isSyllabus ? (syllabusBody || syllabusResponse) : (readerBody || readerResponse))),
    });
  });

  // Mock Gemini
  await page.route('**/generativelanguage.googleapis.com/**', async (route) => {
    const body = JSON.parse(route.request().postData() || '{}');
    const userMsg = body.contents?.[0]?.parts?.[0]?.text || '';
    const isSyllabus = userMsg.includes('graded reader syllabus');

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(wrapGeminiResponse(isSyllabus ? (syllabusBody || syllabusResponse) : (readerBody || readerResponse))),
    });
  });
}
