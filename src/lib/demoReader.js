/**
 * Hardcoded demo reader for first-run onboarding.
 * HSK 2 level, ~400 characters, complete with vocab/questions/grammar.
 */

export const DEMO_READER_KEY = 'standalone_demo';

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
