import { syllabusResponse, readerResponse, wrapAnthropicResponse, wrapOpenAIResponse, wrapGeminiResponse, buildAnthropicSSE } from '../fixtures/mockApiResponses.js';

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

/**
 * Intercepts Anthropic API calls and returns SSE streaming responses.
 * Returns an object with `requests` array so tests can inspect captured request bodies.
 */
export async function mockLLMStreamingApi(page) {
  const captured = { requests: [] };

  await page.route('**/api.anthropic.com/**', async (route) => {
    const postData = route.request().postData();
    const body = JSON.parse(postData || '{}');
    captured.requests.push(body);

    const sseBody = buildAnthropicSSE(readerResponse);
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: sseBody,
    });
  });

  return captured;
}

/**
 * Seeds localStorage with a complete standalone reader so tests can
 * navigate to it without generating one first.
 *
 * @param {import('@playwright/test').Page} page
 * @param {Object} [overrides]
 * @param {string} [overrides.key] - lesson key (default: 'standalone_test123')
 * @param {string} [overrides.topic] - topic name (default: 'Street food')
 * @param {Object} [overrides.learnedVocabulary] - vocabulary map to seed
 * @param {Object} [overrides.extraStorage] - additional localStorage entries
 */
export async function seedWithReader(page, overrides = {}) {
  const key = overrides.key || 'standalone_test123';
  const topic = overrides.topic || 'Street food';
  const level = overrides.level ?? 1;
  const langId = overrides.langId || 'zh';

  const readerData = {
    titleZh: '街头小吃',
    titleEn: 'Street Snacks',
    topic,
    level,
    langId,
    story: '**小明**每天都去街上买**小吃**。他最喜欢吃**包子**和**饺子**。\n\n今天，小明看到一个新的小吃摊。那里卖**煎饼**。小明**尝**了一个煎饼。"真好吃！"他说。',
    vocabulary: [
      { chinese: '小吃', pinyin: 'xiǎo chī', english: 'n. snack; street food' },
      { chinese: '包子', pinyin: 'bāo zi', english: 'n. steamed bun' },
      { chinese: '煎饼', pinyin: 'jiān bǐng', english: 'n. pancake' },
      { chinese: '饺子', pinyin: 'jiǎo zi', english: 'n. dumpling' },
      { chinese: '尝', pinyin: 'cháng', english: 'v. to taste' },
    ],
    questions: ['小明每天做什么？', '小明今天尝了什么？'],
    ankiCards: [
      { chinese: '小吃', pinyin: 'xiǎo chī', english: 'n. snack; street food', example_story: '小明每天都去街上买小吃。' },
      { chinese: '包子', pinyin: 'bāo zi', english: 'n. steamed bun', example_story: '他最喜欢吃包子和饺子。' },
    ],
    raw: readerResponse,
  };

  const standaloneReaders = [
    { key, topic, level, langId, createdAt: Date.now(), titleZh: '街头小吃', titleEn: 'Street Snacks' },
  ];

  const storageData = {
    'gradedReader_providerKeys': JSON.stringify({ anthropic: 'sk-test-key', openai: '', gemini: '', openai_compatible: '' }),
    'gradedReader_activeProvider': JSON.stringify('anthropic'),
    'gradedReader_standaloneReaders': JSON.stringify(standaloneReaders),
    [`gradedReader_reader_${key}`]: JSON.stringify(readerData),
    'gradedReader_readerIndex': JSON.stringify([key]),
    'gradedReader_lastSession': JSON.stringify({ standaloneKey: key }),
    ...(overrides.extraStorage || {}),
  };

  if (overrides.learnedVocabulary) {
    storageData['gradedReader_learnedVocabulary'] = JSON.stringify(overrides.learnedVocabulary);
  }

  await seedLocalStorage(page, storageData);
}
