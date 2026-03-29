/**
 * Hardcoded demo readers for first-run onboarding.
 * Chinese demo: HSK 2 level, ~400 characters.
 * English demo: CEFR A2 level, ~300 words, with Chinese native language.
 */

export const DEMO_READER_KEY = 'standalone_demo';
export const DEMO_READER_EN_KEY = 'standalone_demo_en';

export const DEMO_READER_DATA = {
  raw: '',
  titleZh: '小猫找朋友',
  titleEn: 'The Kitten Finds a Friend',
  story: '**小明**家有一只**小猫**。小猫很**可爱**，它的名字叫**花花**。\n\n花花每天都在家里**睡觉**。它**喜欢**在**沙发**上睡觉，也喜欢在**窗户**旁边睡觉。小明觉得花花太**无聊**了。\n\n有一天，小明带花花去**公园**。公园里有很多**小朋友**在**玩**。花花看见一只**小狗**，它**很想**和小狗一起玩。\n\n小狗也很**友好**。它们一起**跑**，一起玩。花花**非常**开心。从那天**以后**，小明每天都带花花去公园**找**小狗玩。\n\n花花**终于**有了一个好**朋友**。',
  vocabulary: [
    { target: '小猫', chinese: '小猫', romanization: 'xiǎo māo', pinyin: 'xiǎo māo', translation: 'kitten', english: 'kitten', exampleStory: '小明家有一只**小猫**。', exampleStoryTranslation: 'Xiao Ming\'s family has a kitten.', exampleExtra: '我想养一只**小猫**。', exampleExtraTranslation: 'I want to raise a kitten.', usageNoteStory: '', usageNoteExtra: '' },
    { target: '可爱', chinese: '可爱', romanization: 'kě ài', pinyin: 'kě ài', translation: 'cute; adorable', english: 'cute; adorable', exampleStory: '小猫很**可爱**。', exampleStoryTranslation: 'The kitten is very cute.', exampleExtra: '这个孩子真**可爱**！', exampleExtraTranslation: 'This child is really cute!', usageNoteStory: '', usageNoteExtra: '' },
    { target: '睡觉', chinese: '睡觉', romanization: 'shuì jiào', pinyin: 'shuì jiào', translation: 'to sleep', english: 'to sleep', exampleStory: '花花每天都在家里**睡觉**。', exampleStoryTranslation: 'Huahua sleeps at home every day.', exampleExtra: '我每天十点**睡觉**。', exampleExtraTranslation: 'I sleep at 10 o\'clock every day.', usageNoteStory: '', usageNoteExtra: '' },
    { target: '公园', chinese: '公园', romanization: 'gōng yuán', pinyin: 'gōng yuán', translation: 'park', english: 'park', exampleStory: '小明带花花去**公园**。', exampleStoryTranslation: 'Xiao Ming took Huahua to the park.', exampleExtra: '我们周末去**公园**吧。', exampleExtraTranslation: 'Let\'s go to the park this weekend.', usageNoteStory: '', usageNoteExtra: '' },
    { target: '友好', chinese: '友好', romanization: 'yǒu hǎo', pinyin: 'yǒu hǎo', translation: 'friendly', english: 'friendly', exampleStory: '小狗也很**友好**。', exampleStoryTranslation: 'The puppy was also very friendly.', exampleExtra: '他对每个人都很**友好**。', exampleExtraTranslation: 'He is friendly to everyone.', usageNoteStory: '', usageNoteExtra: '' },
    { target: '朋友', chinese: '朋友', romanization: 'péng you', pinyin: 'péng you', translation: 'friend', english: 'friend', exampleStory: '花花**终于**有了一个好**朋友**。', exampleStoryTranslation: 'Huahua finally has a good friend.', exampleExtra: '她是我最好的**朋友**。', exampleExtraTranslation: 'She is my best friend.', usageNoteStory: '', usageNoteExtra: '' },
  ],
  questions: [
    { text: '花花喜欢在哪里睡觉？', translation: 'Where does Huahua like to sleep?' },
    { text: '小明带花花去了什么地方？', translation: 'Where did Xiao Ming take Huahua?' },
    { text: '花花在公园里看见了谁？', translation: 'Who did Huahua see in the park?' },
  ],
  ankiJson: [
    { chinese: '小猫', pinyin: 'xiǎo māo', english: 'kitten', example_story: '小明家有一只小猫。', example_story_translation: 'Xiao Ming\'s family has a kitten.', example_extra: '我想养一只小猫。', example_extra_translation: 'I want to raise a kitten.', usage_note_story: '', usage_note_extra: '' },
    { chinese: '可爱', pinyin: 'kě ài', english: 'cute; adorable', example_story: '小猫很可爱。', example_story_translation: 'The kitten is very cute.', example_extra: '这个孩子真可爱！', example_extra_translation: 'This child is really cute!', usage_note_story: '', usage_note_extra: '' },
    { chinese: '睡觉', pinyin: 'shuì jiào', english: 'to sleep', example_story: '花花每天都在家里睡觉。', example_story_translation: 'Huahua sleeps at home every day.', example_extra: '我每天十点睡觉。', example_extra_translation: 'I sleep at 10 o\'clock every day.', usage_note_story: '', usage_note_extra: '' },
    { chinese: '公园', pinyin: 'gōng yuán', english: 'park', example_story: '小明带花花去公园。', example_story_translation: 'Xiao Ming took Huahua to the park.', example_extra: '我们周末去公园吧。', example_extra_translation: 'Let\'s go to the park this weekend.', usage_note_story: '', usage_note_extra: '' },
    { chinese: '友好', pinyin: 'yǒu hǎo', english: 'friendly', example_story: '小狗也很友好。', example_story_translation: 'The puppy was also very friendly.', example_extra: '他对每个人都很友好。', example_extra_translation: 'He is friendly to everyone.', usage_note_story: '', usage_note_extra: '' },
    { chinese: '朋友', pinyin: 'péng you', english: 'friend', example_story: '花花终于有了一个好朋友。', example_story_translation: 'Huahua finally has a good friend.', example_extra: '她是我最好的朋友。', example_extra_translation: 'She is my best friend.', usage_note_story: '', usage_note_extra: '' },
  ],
  grammarNotes: [
    { pattern: '在…上', label: 'Location with 在...上', explanation: 'Use 在 + place + 上 to indicate doing something "on" a surface or location.', example: '它喜欢在沙发上睡觉。' },
    { pattern: '从…以后', label: 'From...onwards', explanation: 'Use 从 + time/event + 以后 to express "from that point on" or "since then".', example: '从那天以后，小明每天都带花花去公园。' },
    { pattern: '终于', label: 'Finally / at last', explanation: 'Used before a verb to express that something has happened after a long wait or effort.', example: '花花终于有了一个好朋友。' },
  ],
  parseError: null,
  topic: 'The Kitten Finds a Friend (Sample)',
  level: 2,
  langId: 'zh',
  lessonKey: 'standalone_demo',
};

export const DEMO_READER_EN_DATA = {
  raw: '',
  titleZh: 'A New School',
  titleEn: '新学校的第一天',
  story: '**Li Wei** came to America last month. Today is his **first day** at a new school. He feels **nervous** because he does not know anyone.\n\nThe school is very **big**. Li Wei looks at his **schedule** but he cannot find Room 204. A girl with a friendly smile walks up to him. "Are you **lost**?" she asks. "I\'m Sarah."\n\n"Yes, I need to find Room 204," Li Wei says. Sarah **laughs**. "That\'s my class too! Follow me."\n\nThey walk together through the **hallway**. Sarah asks Li Wei where he is from. He tells her about his **hometown** in China. Sarah thinks it sounds **interesting**. She has never been to China before.\n\nIn class, the **teacher** asks Li Wei to introduce himself. He is shy, but he stands up and says, "Hello, my name is Li Wei. I come from China. I like **reading** and basketball." The students **clap** for him.\n\nAt **lunch**, Sarah introduces Li Wei to her friends. They ask him many questions about China. Li Wei starts to feel **comfortable**. Maybe this new school is not so bad.\n\nAfter school, Li Wei calls his mother. "How was your first day?" she asks. Li Wei **smiles**. "I made a new **friend**," he says.',
  vocabulary: [
    { target: 'nervous', translation: '紧张的', exampleStory: 'He feels **nervous** because he does not know anyone.', exampleStoryTranslation: '他感到紧张，因为他不认识任何人。', exampleExtra: 'I always feel **nervous** before a test.', exampleExtraTranslation: '考试前我总是感到紧张。', usageNoteStory: '', usageNoteExtra: '' },
    { target: 'schedule', translation: '课程表', exampleStory: 'Li Wei looks at his **schedule** but he cannot find Room 204.', exampleStoryTranslation: '李伟看着他的课程表，但找不到204教室。', exampleExtra: 'My **schedule** is very busy today.', exampleExtraTranslation: '我今天的日程很忙。', usageNoteStory: '', usageNoteExtra: '' },
    { target: 'lost', translation: '迷路的', exampleStory: '"Are you **lost**?" she asks.', exampleStoryTranslation: '"你迷路了吗？"她问。', exampleExtra: 'We got **lost** in the big city.', exampleExtraTranslation: '我们在大城市里迷路了。', usageNoteStory: '', usageNoteExtra: '' },
    { target: 'hallway', translation: '走廊', exampleStory: 'They walk together through the **hallway**.', exampleStoryTranslation: '他们一起走过走廊。', exampleExtra: 'The **hallway** was full of students.', exampleExtraTranslation: '走廊里到处都是学生。', usageNoteStory: '', usageNoteExtra: '' },
    { target: 'comfortable', translation: '舒适的；自在的', exampleStory: 'Li Wei starts to feel **comfortable**.', exampleStoryTranslation: '李伟开始感到自在了。', exampleExtra: 'This chair is very **comfortable**.', exampleExtraTranslation: '这把椅子很舒服。', usageNoteStory: '', usageNoteExtra: '' },
    { target: 'friend', translation: '朋友', exampleStory: '"I made a new **friend**," he says.', exampleStoryTranslation: '"我交了一个新朋友，"他说。', exampleExtra: 'She is my best **friend**.', exampleExtraTranslation: '她是我最好的朋友。', usageNoteStory: '', usageNoteExtra: '' },
  ],
  questions: [
    { text: 'Why does Li Wei feel nervous?', translation: '李伟为什么感到紧张？' },
    { text: 'Who helps Li Wei find his classroom?', translation: '谁帮助李伟找到了教室？' },
    { text: 'What does Li Wei tell his mother after school?', translation: '放学后李伟对他妈妈说了什么？' },
  ],
  ankiJson: [
    { chinese: 'nervous', pinyin: '', english: '紧张的', example_story: 'He feels nervous because he does not know anyone.', example_story_translation: '他感到紧张，因为他不认识任何人。', example_extra: 'I always feel nervous before a test.', example_extra_translation: '考试前我总是感到紧张。', usage_note_story: '', usage_note_extra: '' },
    { chinese: 'schedule', pinyin: '', english: '课程表', example_story: 'Li Wei looks at his schedule but he cannot find Room 204.', example_story_translation: '李伟看着他的课程表，但找不到204教室。', example_extra: 'My schedule is very busy today.', example_extra_translation: '我今天的日程很忙。', usage_note_story: '', usage_note_extra: '' },
    { chinese: 'lost', pinyin: '', english: '迷路的', example_story: '"Are you lost?" she asks.', example_story_translation: '"你迷路了吗？"她问。', example_extra: 'We got lost in the big city.', example_extra_translation: '我们在大城市里迷路了。', usage_note_story: '', usage_note_extra: '' },
    { chinese: 'hallway', pinyin: '', english: '走廊', example_story: 'They walk together through the hallway.', example_story_translation: '他们一起走过走廊。', example_extra: 'The hallway was full of students.', example_extra_translation: '走廊里到处都是学生。', usage_note_story: '', usage_note_extra: '' },
    { chinese: 'comfortable', pinyin: '', english: '舒适的；自在的', example_story: 'Li Wei starts to feel comfortable.', example_story_translation: '李伟开始感到自在了。', example_extra: 'This chair is very comfortable.', example_extra_translation: '这把椅子很舒服。', usage_note_story: '', usage_note_extra: '' },
    { chinese: 'friend', pinyin: '', english: '朋友', example_story: '"I made a new friend," he says.', example_story_translation: '"我交了一个新朋友，"他说。', example_extra: 'She is my best friend.', example_extra_translation: '她是我最好的朋友。', usage_note_story: '', usage_note_extra: '' },
  ],
  grammarNotes: [
    { pattern: 'feels + adjective', label: 'Linking verb + adjective', explanation: 'Use "feel" + an adjective (not an adverb) to describe emotions or sensations.', example: 'He feels nervous because he does not know anyone.' },
    { pattern: 'asks someone to + verb', label: 'Ask someone to do something', explanation: 'Use "ask + person + to + base verb" to describe a request or instruction.', example: 'The teacher asks Li Wei to introduce himself.' },
    { pattern: 'starts to + verb', label: 'Start to do something', explanation: 'Use "start to + verb" or "start + verb-ing" to express the beginning of an action or feeling.', example: 'Li Wei starts to feel comfortable.' },
  ],
  parseError: null,
  topic: 'A New School (Sample)',
  level: 2,
  langId: 'en',
  nativeLang: 'zh',
  lessonKey: 'standalone_demo_en',
};

// ── Narrative demo syllabus (Silk Road, HSK 3, 3 lessons) ───

export const DEMO_NARRATIVE_SYLLABUS_ID = 'syllabus_demo_narrative';

export const DEMO_NARRATIVE_SYLLABUS = {
  id: DEMO_NARRATIVE_SYLLABUS_ID,
  topic: 'The Silk Road',
  level: 3,
  langId: 'zh',
  type: 'narrative',
  narrativeType: 'historical',
  isDemo: true,
  sourceMaterial: { title: 'The Silk Road', author: '', period: '138 BCE – 200 CE', description: '' },
  narrativeArc: {
    overview: 'Follow Zhang Qian\'s legendary journey westward from Chang\'an, opening the trade routes that would connect China to Central Asia, Persia, and Rome. Each chapter covers a pivotal moment in the birth of the Silk Road.',
    totalPlannedLessons: 3,
    characters: [
      { name: '张骞', role: 'Han dynasty explorer and diplomat', introduced_in: 1 },
      { name: '阿里', role: 'Central Asian merchant', introduced_in: 2 },
    ],
    settings: ['Chang\'an (Han capital)', 'Xiongnu territory', 'Fergana Valley'],
  },
  futureArc: null,
  summary: 'Follow Zhang Qian\'s legendary journey westward from Chang\'an, opening the trade routes that would connect China to Central Asia, Persia, and Rome.',
  lessons: [
    { lesson_number: 1, title_zh: '张骞出使西域', title_en: 'Zhang Qian\'s Mission West', description: 'Emperor Wu sends Zhang Qian on a dangerous diplomatic mission.', vocabulary_focus: ['diplomacy', 'journey', 'empire'], difficulty_hint: 'review', chapter_summary: 'In 138 BCE, Emperor Wu of Han sends the young diplomat Zhang Qian westward to find allies against the Xiongnu. Zhang Qian leaves Chang\'an with a small team, knowing the journey is dangerous.', characters: ['张骞'], setting: 'Chang\'an, 138 BCE', narrative_position: 'setup', continuity_notes: 'Year: 138 BCE. Emperor Wu seeks alliance with Yuezhi people against Xiongnu. Zhang Qian departs with about 100 men.' },
    { lesson_number: 2, title_zh: '被匈奴俘虏', title_en: 'Captured by the Xiongnu', description: 'Zhang Qian is captured and must survive years in captivity.', vocabulary_focus: ['captivity', 'survival', 'patience'], difficulty_hint: 'core', chapter_summary: 'Shortly after departing, Zhang Qian\'s team is captured by the Xiongnu. He is held captive for over ten years but never abandons his mission. He marries a Xiongnu woman and has a son.', characters: ['张骞'], setting: 'Xiongnu territory, 138–128 BCE', narrative_position: 'rising', continuity_notes: 'Captured soon after departure. Held ~10 years. Married a Xiongnu woman, had a son. Never revealed his mission to the Xiongnu.' },
    { lesson_number: 3, title_zh: '逃脱与发现', title_en: 'Escape and Discovery', description: 'Zhang Qian escapes and discovers the riches of Central Asia.', vocabulary_focus: ['trade goods', 'discovery', 'culture'], difficulty_hint: 'core', chapter_summary: 'Zhang Qian finally escapes the Xiongnu and reaches the Fergana Valley. He discovers grape wine, alfalfa, and heavenly horses. He meets Central Asian merchants and learns about trade routes stretching to Persia and Rome.', characters: ['张骞', '阿里'], setting: 'Fergana Valley (Dayuan), ~128 BCE', narrative_position: 'climax', continuity_notes: 'Escaped ~128 BCE. Reached Dayuan (Fergana). Discovered grapes, alfalfa, Ferghana horses. Learned of Parthia and Rome through merchants.' },
  ],
  suggestedTopics: ['Journey to the West', 'The Three Kingdoms Era', 'The Tang Dynasty Golden Age'],
  createdAt: 1700000000000,
};

const DEMO_NARRATIVE_READER_KEY = `lesson_${DEMO_NARRATIVE_SYLLABUS_ID}_0`;

export const DEMO_NARRATIVE_READER_DATA = {
  raw: '',
  titleZh: '张骞出使西域',
  titleEn: 'Zhang Qian\'s Mission West',
  story: '公元前138年，**汉武帝**坐在长安的**宫殿**里，看着地图。北方的**匈奴**一直是大汉的**威胁**。\n\n"我们需要**盟友**，"**皇帝**对大臣们说。"西边有一个叫**月氏**的民族，他们也是匈奴的**敌人**。谁愿意去找他们？"\n\n一个年轻的**官员**站了起来。他叫**张骞**，今年二十七岁。"我愿意去，"他说。所有人都看着他——这条路要经过匈奴的**领土**，非常**危险**。\n\n皇帝**点了点头**。"好。你需要什么？"\n\n"一百个人，还有一个**向导**，"张骞说。\n\n几天后，张骞带着他的**队伍**离开了长安。城门外，他回头看了一眼这座**繁华**的城市。他不知道什么时候能**回来**。\n\n路上，他的向导堂邑父对他说："过了**河西走廊**，就是匈奴的地方。我们要**小心**。"\n\n张骞握紧了手中的**符节**——这是皇帝给他的**使者**身份的**象征**。不管前面有什么困难，他都要完成这个**任务**。',
  vocabulary: [
    { target: '汉武帝', chinese: '汉武帝', romanization: 'Hàn Wǔ Dì', pinyin: 'Hàn Wǔ Dì', translation: 'Emperor Wu of Han', english: 'Emperor Wu of Han', exampleStory: '汉武帝坐在长安的宫殿里，看着地图。', exampleStoryTranslation: 'Emperor Wu sat in his palace in Chang\'an, looking at a map.', exampleExtra: '汉武帝是中国历史上最有名的皇帝之一。', exampleExtraTranslation: 'Emperor Wu is one of the most famous emperors in Chinese history.', usageNoteStory: 'Proper noun — the 7th emperor of the Han dynasty, reigned 141–87 BCE.', usageNoteExtra: '' },
    { target: '威胁', chinese: '威胁', romanization: 'wēi xié', pinyin: 'wēi xié', translation: 'threat; to threaten', english: 'threat; to threaten', exampleStory: '北方的匈奴一直是大汉的威胁。', exampleStoryTranslation: 'The Xiongnu in the north were always a threat to the Han.', exampleExtra: '污染是我们健康的一个威胁。', exampleExtraTranslation: 'Pollution is a threat to our health.', usageNoteStory: '', usageNoteExtra: '' },
    { target: '盟友', chinese: '盟友', romanization: 'méng yǒu', pinyin: 'méng yǒu', translation: 'ally; alliance partner', english: 'ally', exampleStory: '"我们需要盟友，"皇帝对大臣们说。', exampleStoryTranslation: '"We need allies," the emperor said to his ministers.', exampleExtra: '两个国家成了盟友。', exampleExtraTranslation: 'The two countries became allies.', usageNoteStory: '', usageNoteExtra: '' },
    { target: '危险', chinese: '危险', romanization: 'wēi xiǎn', pinyin: 'wēi xiǎn', translation: 'dangerous; danger', english: 'dangerous', exampleStory: '这条路要经过匈奴的领土，非常危险。', exampleStoryTranslation: 'This road passes through Xiongnu territory — very dangerous.', exampleExtra: '晚上一个人走路很危险。', exampleExtraTranslation: 'Walking alone at night is dangerous.', usageNoteStory: '', usageNoteExtra: '' },
    { target: '任务', chinese: '任务', romanization: 'rèn wu', pinyin: 'rèn wu', translation: 'mission; task', english: 'mission; task', exampleStory: '不管前面有什么困难，他都要完成这个任务。', exampleStoryTranslation: 'No matter what difficulties lay ahead, he had to complete this mission.', exampleExtra: '老师给我们一个新任务。', exampleExtraTranslation: 'The teacher gave us a new task.', usageNoteStory: '', usageNoteExtra: '' },
    { target: '象征', chinese: '象征', romanization: 'xiàng zhēng', pinyin: 'xiàng zhēng', translation: 'symbol; to symbolize', english: 'symbol', exampleStory: '这是皇帝给他的使者身份的象征。', exampleStoryTranslation: 'This was the symbol of his status as the emperor\'s envoy.', exampleExtra: '红色在中国是好运的象征。', exampleExtraTranslation: 'Red is a symbol of good luck in China.', usageNoteStory: '', usageNoteExtra: '' },
  ],
  questions: [
    { text: '汉武帝为什么要派人去西边？', translation: 'Why did Emperor Wu want to send someone west?' },
    { text: '张骞出发的时候带了多少人？', translation: 'How many people did Zhang Qian bring when he departed?' },
    { text: '符节代表什么？', translation: 'What does the jie (tally) represent?' },
  ],
  ankiJson: [],
  grammarNotes: [
    { pattern: '一直', label: 'Always / continuously', explanation: 'Placed before a verb to express that an action or state has been ongoing without interruption.', example: '北方的匈奴一直是大汉的威胁。' },
    { pattern: '不管…都…', label: 'No matter...all/still...', explanation: 'Use 不管 + condition + 都 + result to express "regardless of X, Y still happens".', example: '不管前面有什么困难，他都要完成这个任务。' },
    { pattern: '动词 + 了 + 动词 (sequential actions)', label: 'V了V — sequential actions', explanation: 'Repeating a verb pattern with 了 to describe two quick successive actions.', example: '皇帝点了点头。' },
  ],
  accuracyNotes: [
    { claim: 'Zhang Qian was sent west in 138 BCE by Emperor Wu', status: 'accurate', note: 'Historical records (Shiji by Sima Qian) confirm Zhang Qian departed around 138 BCE on Emperor Wu\'s orders.' },
    { claim: 'Zhang Qian brought about 100 men', status: 'accurate', note: 'The Shiji records that Zhang Qian set out with over 100 followers, including his guide Ganfu (堂邑父).' },
    { claim: 'The mission was to find the Yuezhi people', status: 'accurate', note: 'Emperor Wu sought an alliance with the Greater Yuezhi (大月氏) against the Xiongnu confederation.' },
  ],
  narrativeState: {
    runningSummary: 'In 138 BCE, Emperor Wu of Han sends the 27-year-old diplomat Zhang Qian westward with ~100 men to find the Yuezhi people as allies against the Xiongnu. Zhang Qian departs Chang\'an carrying the imperial tally (符节), knowing the route through the Hexi Corridor is extremely dangerous.',
    characterUpdates: 'Zhang Qian introduced as a brave young official willing to risk his life for the mission.',
  },
  parseError: null,
  topic: 'Zhang Qian\'s Mission West',
  level: 3,
  langId: 'zh',
  lessonKey: DEMO_NARRATIVE_READER_KEY,
};

/** Array of all demo readers for injection in buildInitialState */
export const DEMO_READERS = [
  { key: DEMO_READER_KEY, data: DEMO_READER_DATA },
  { key: DEMO_READER_EN_KEY, data: DEMO_READER_EN_DATA },
];

/** Demo narrative syllabus + its first lesson reader */
export const DEMO_NARRATIVE = {
  syllabus: DEMO_NARRATIVE_SYLLABUS,
  readerKey: DEMO_NARRATIVE_READER_KEY,
  readerData: DEMO_NARRATIVE_READER_DATA,
};

/** Set of all demo reader keys for fast lookup */
export const DEMO_READER_KEYS = new Set([DEMO_READER_KEY, DEMO_READER_EN_KEY, DEMO_NARRATIVE_READER_KEY]);
