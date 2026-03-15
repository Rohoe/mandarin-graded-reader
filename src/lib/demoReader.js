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

/** Array of all demo readers for injection in buildInitialState */
export const DEMO_READERS = [
  { key: DEMO_READER_KEY, data: DEMO_READER_DATA },
  { key: DEMO_READER_EN_KEY, data: DEMO_READER_EN_DATA },
];

/** Set of all demo reader keys for fast lookup */
export const DEMO_READER_KEYS = new Set([DEMO_READER_KEY, DEMO_READER_EN_KEY]);
