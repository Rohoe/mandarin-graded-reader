// Real-ish LLM output for testing the parser

export const zhReaderMarkdown = `### 1. Title
小猫的冒险
The Kitten's Adventure

### 2. Story
**小猫**很喜欢在公园里玩。每天早上，它都会**跑**到大树下面。

有一天，小猫看到一只**蝴蝶**。它很想**追**那只蝴蝶。小猫跑啊跑，跑到了一个新的地方。

"这里是哪里？"小猫**害怕**了。它不知道怎么回家。

一个小女孩看到了小猫。她**温柔**地说："别怕，我带你回家。"

### 3. Vocabulary List
**小猫** (xiǎo māo) — kitten
- **小猫**很喜欢在公园里玩。
- *The subject 小猫 is introduced at the beginning of the story as the main character.*
- 我家有一只**小猫**，非常可爱。
- *Here 小猫 is used with the measure word 只 for animals.*

**跑** (pǎo) — to run
- 它都会**跑**到大树下面。
- *The verb 跑 is followed by the directional complement 到 indicating arrival at a destination.*
- 他每天早上都去公园**跑**步。
- *跑步 is a compound word meaning "to jog," formed by adding 步 (step) to 跑.*

**蝴蝶** (hú dié) — butterfly
- 小猫看到一只**蝴蝶**。
- *蝴蝶 is used with the measure word 只, typical for insects and small animals.*
- 花园里有很多**蝴蝶**在飞。
- *This example shows 蝴蝶 in a location-subject-verb pattern.*

**追** (zhuī) — to chase
- 它很想**追**那只蝴蝶。
- *想 + verb expresses desire; 追 takes a direct object (那只蝴蝶).*
- 别**追**我！
- *A simple imperative using 别 (don't) + verb.*

**害怕** (hài pà) — to be scared
- 小猫**害怕**了。
- *害怕 + 了 indicates a change of state — the cat became scared.*
- 你不要**害怕**，这里很安全。
- *害怕 used as a predicate adjective meaning "afraid."*

**温柔** (wēn róu) — gentle
- 她**温柔**地说。
- *温柔 is used as an adverb with 地 to modify the verb 说.*
- 妈妈的声音很**温柔**。
- *Here 温柔 is a predicate adjective meaning "gentle."*

### 4. Comprehension Questions
1. 小猫每天早上做什么？
2. 小猫为什么害怕了？
3. 谁帮助了小猫？(Who helped the kitten?)

### 5. Anki Cards Data (JSON)
\`\`\`anki-json
[
  { "chinese": "小猫", "pinyin": "xiǎo māo", "english": "n. kitten", "example_story": "小猫很喜欢在公园里玩。", "usage_note_story": "The subject is introduced as the main character.", "example_extra": "我家有一只小猫。", "usage_note_extra": "Used with measure word 只 for animals." },
  { "chinese": "跑", "pinyin": "pǎo", "english": "v. to run", "example_story": "它都会跑到大树下面。", "usage_note_story": "跑 followed by directional complement 到.", "example_extra": "他每天早上都去公园跑步。", "usage_note_extra": "跑步 is a compound meaning to jog." },
  { "chinese": "蝴蝶", "pinyin": "hú dié", "english": "n. butterfly", "example_story": "小猫看到一只蝴蝶。", "usage_note_story": "Used with measure word 只 for small animals.", "example_extra": "花园里有很多蝴蝶在飞。", "usage_note_extra": "Location-subject-verb pattern." },
  { "chinese": "追", "pinyin": "zhuī", "english": "v. to chase", "example_story": "它很想追那只蝴蝶。", "usage_note_story": "想 + verb expresses desire.", "example_extra": "别追我！", "usage_note_extra": "Imperative with 别." },
  { "chinese": "害怕", "pinyin": "hài pà", "english": "adj. scared; to be afraid", "example_story": "小猫害怕了。", "usage_note_story": "害怕 + 了 indicates change of state.", "example_extra": "你不要害怕。", "usage_note_extra": "Used as predicate adjective." },
  { "chinese": "温柔", "pinyin": "wēn róu", "english": "adj. gentle", "example_story": "她温柔地说。", "usage_note_story": "Used as adverb with 地.", "example_extra": "妈妈的声音很温柔。", "usage_note_extra": "Predicate adjective meaning gentle." }
]
\`\`\`

### 6. Grammar Notes
**V + 到** (Directional complement) — Indicates that an action results in arrival at a destination.
- 它都会跑到大树下面。

**想 + V** (Desire pattern) — Expresses wanting to do something, with 很想 intensifying the desire.
- 它很想追那只蝴蝶。

**Adj + 了** (Change of state) — Adding 了 after an adjective indicates a new state or change.
- 小猫害怕了。
`;

export const koReaderMarkdown = `### 1. Title
고양이의 모험
The Cat's Adventure

### 2. Story
**고양이**가 공원에서 놀고 있었어요. 매일 아침, 큰 나무 아래로 **달려**갔어요.

어느 날, 고양이가 **나비**를 봤어요. 나비를 **쫓고** 싶었어요.

### 3. Vocabulary List
**고양이** (go-yang-i) — cat
- **고양이**가 공원에서 놀고 있었어요.
- *고양이 is the subject marked with 가 particle.*
- 우리 집에 **고양이** 두 마리가 있어요.
- *Used with counter 마리 for animals.*

**달려** (dal-lyeo) — to run
- 큰 나무 아래로 **달려**갔어요.
- *달려가다 is a compound verb meaning to run toward somewhere.*
- 아이들이 운동장에서 **달려**요.
- *Simple present tense form.*

### 4. Comprehension Questions
1. 고양이가 매일 아침 어디에 갔어요?
2. 고양이가 무엇을 봤어요?

### 5. Anki Cards Data (JSON)
\`\`\`anki-json
[
  { "korean": "고양이", "romanization": "go-yang-i", "english": "n. cat", "example_story": "고양이가 공원에서 놀고 있었어요.", "usage_note_story": "Subject marked with 가.", "example_extra": "우리 집에 고양이 두 마리가 있어요.", "usage_note_extra": "Used with counter 마리." },
  { "korean": "달려", "romanization": "dal-lyeo", "english": "v. to run", "example_story": "큰 나무 아래로 달려갔어요.", "usage_note_story": "Compound verb 달려가다.", "example_extra": "아이들이 운동장에서 달려요.", "usage_note_extra": "Simple present tense." }
]
\`\`\`

### 6. Grammar Notes
**V + 고 있다** (Progressive) — Indicates an ongoing action, similar to English "-ing."
- 고양이가 공원에서 놀고 있었어요.

**V + 고 싶다** (Desire) — Expresses wanting to do something.
- 나비를 쫓고 싶었어요.
`;

export const yueReaderMarkdown = `### 1. Title
貓仔嘅冒險
The Kitten's Adventure

### 2. Story
**貓仔**好鍾意喺公園度玩。每日朝早，佢都會**走**去大樹下面。

有一日，貓仔見到一隻**蝴蝶**。佢好想**追**嗰隻蝴蝶。

### 3. Vocabulary List
**貓仔** (maau1 zai2) — kitten
- **貓仔**好鍾意喺公園度玩。
- *貓仔 uses the diminutive suffix 仔.*
- 我屋企有隻**貓仔**。
- *Used with measure word 隻.*

**走** (zau2) — to run
- 佢都會**走**去大樹下面。
- *走 in Cantonese means "to run" (not "to walk" as in Mandarin).*
- 佢**走**得好快。
- *走 with the degree complement 得好快.*

### 4. Comprehension Questions
1. 貓仔每日朝早做咩？
2. 貓仔見到咩？

### 5. Anki Cards Data (JSON)
\`\`\`anki-json
[
  { "chinese": "貓仔", "jyutping": "maau1 zai2", "english": "n. kitten", "example_story": "貓仔好鍾意喺公園度玩。", "usage_note_story": "Diminutive suffix 仔.", "example_extra": "我屋企有隻貓仔。", "usage_note_extra": "Used with measure word 隻." },
  { "chinese": "走", "jyutping": "zau2", "english": "v. to run", "example_story": "佢都會走去大樹下面。", "usage_note_story": "走 means to run in Cantonese.", "example_extra": "佢走得好快。", "usage_note_extra": "Degree complement 得好快." }
]
\`\`\`

### 6. Grammar Notes
**好 + Adj** (Degree adverb) — Cantonese uses 好 (not 很) to intensify adjectives.
- 貓仔好鍾意喺公園度玩。

**V + 去** (Directional) — Indicates movement away from the speaker.
- 佢都會走去大樹下面。
`;

export const malformedMarkdown = `Here is a story about a cat.

The cat went to the park. 小猫去了公园。它很开心。

Some vocabulary:
小猫 - kitten
公园 - park
`;

export const emptyResponse = '';

export const structuredReaderJson = {
  title_target: '小猫的冒险',
  title_en: "The Kitten's Adventure",
  story: '**小猫**很喜欢在公园里玩。它会**跑**到大树下面。',
  vocabulary: [
    {
      target: '小猫',
      romanization: 'xiǎo māo',
      english: 'n. kitten',
      example_story: '小猫很喜欢在公园里玩。',
      usage_note_story: 'Main character introduction.',
      example_extra: '我家有一只小猫。',
      usage_note_extra: 'With measure word 只.',
    },
    {
      target: '跑',
      romanization: 'pǎo',
      english: 'v. to run',
      example_story: '它会跑到大树下面。',
      usage_note_story: 'Directional complement 到.',
      example_extra: '他去公园跑步。',
      usage_note_extra: 'Compound verb 跑步.',
    },
  ],
  questions: [
    { text: '小猫喜欢做什么？' },
    { text: '小猫跑到哪里？' },
  ],
  grammar_notes: [
    {
      pattern: 'V + 到',
      label: 'Directional complement',
      explanation: 'Indicates arrival at a destination.',
      example: '它会跑到大树下面。',
    },
  ],
};
