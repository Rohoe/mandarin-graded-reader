import { useCallback, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { useAppDispatch } from '../context/useAppSelector';
import { actions } from '../context/actions';
import { generateReader } from '../lib/api';
import { parseReaderResponse } from '../lib/parser';
import { getLang } from '../lib/languages';

export function useReaderGeneration(lessonKey, lessonMeta, reader, langId, isPending, apiKey, learnedVocabulary, maxTokens, readerLength) {
  const dispatch = useAppDispatch();
  const { pushGeneratedReader } = useContext(AppContext);
  const act = actions(dispatch);

  const handleGenerate = useCallback(async () => {
    if (isPending) return;

    let topic, level, readerLangId;
    if (lessonMeta) {
      const metaLang = getLang(lessonMeta.langId || langId);
      const titleTarget = lessonMeta[metaLang.prompts.titleFieldKey] || lessonMeta.title_zh || lessonMeta.title_target;
      topic = titleTarget
        ? `${titleTarget} — ${lessonMeta.title_en || ''}: ${lessonMeta.description || ''}`
        : lessonMeta.topic || '';
      level = lessonMeta.level || 3;
      readerLangId = lessonMeta.langId || langId;
    } else if (reader) {
      topic = reader.topic || '';
      level = reader.level || 3;
      readerLangId = reader.langId || langId;
    } else {
      return;
    }

    act.startPendingReader(lessonKey);
    act.clearError();
    try {
      const raw    = await generateReader(apiKey, topic, level, learnedVocabulary, readerLength, maxTokens, null, readerLangId);
      const parsed = parseReaderResponse(raw, readerLangId);
      pushGeneratedReader(lessonKey, { ...parsed, topic, level, langId: readerLangId, lessonKey });
      if (parsed.ankiJson?.length > 0) {
        act.addVocabulary(parsed.ankiJson.map(c => ({
          chinese: c.chinese, korean: c.korean, pinyin: c.pinyin, romanization: c.romanization, english: c.english, langId: readerLangId,
        })));
      }
      act.notify('success', `Reader ready: ${lessonMeta?.title_en || topic}`);
    } catch (err) {
      act.notify('error', `Generation failed: ${err.message.slice(0, 80)}`);
    } finally {
      act.clearPendingReader(lessonKey);
    }
  }, [isPending, lessonKey, lessonMeta, reader, langId, apiKey, learnedVocabulary, readerLength, maxTokens, act, pushGeneratedReader]);

  return { handleGenerate, act };
}
