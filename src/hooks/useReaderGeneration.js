import { useCallback, useContext, useRef, useEffect, useState } from 'react';
import { AppContext } from '../context/AppContext';
import { useAppDispatch } from '../context/useAppSelector';
import { actions } from '../context/actions';
import { generateReader, generateReaderStream } from '../lib/api';
import { parseReaderResponse, normalizeStructuredReader } from '../lib/parser';
import { getLang } from '../lib/languages';

export function useReaderGeneration(lessonKey, lessonMeta, reader, langId, isPending, llmConfig, learnedVocabulary, maxTokens, readerLength, useStructuredOutput = false) {
  const dispatch = useAppDispatch();
  const { pushGeneratedReader } = useContext(AppContext);
  const act = actions(dispatch);
  const abortRef = useRef(null);
  const [streamingText, setStreamingText] = useState(null);

  // Abort in-flight request on unmount
  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  const handleGenerate = useCallback(async () => {
    if (isPending) return;

    let topic, level, readerLangId;
    if (lessonMeta) {
      const metaLang = getLang(lessonMeta.langId || langId);
      const titleTarget = lessonMeta[metaLang.prompts.titleFieldKey] || lessonMeta.title_zh || lessonMeta.title_target;
      topic = titleTarget
        ? `${titleTarget} — ${lessonMeta.title_en || ''}: ${lessonMeta.description || ''}`
        : lessonMeta.topic || '';
      level = lessonMeta.level ?? 3;
      readerLangId = lessonMeta.langId || langId;
    } else if (reader) {
      topic = reader.topic || '';
      level = reader.level ?? 3;
      readerLangId = reader.langId || langId;
    } else {
      return;
    }

    // Abort any previous in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    act.startPendingReader(lessonKey);
    act.clearError();

    // Use streaming for Anthropic when not using structured output
    const useStreaming = llmConfig.provider === 'anthropic' && !useStructuredOutput;

    try {
      let raw;
      if (useStreaming) {
        let accumulated = '';
        setStreamingText('');
        const stream = generateReaderStream(llmConfig, topic, level, learnedVocabulary, readerLength, maxTokens, null, readerLangId, { signal: controller.signal });
        for await (const chunk of stream) {
          accumulated += chunk;
          setStreamingText(accumulated);
        }
        raw = accumulated;
        setStreamingText(null);
      } else {
        raw = await generateReader(llmConfig, topic, level, learnedVocabulary, readerLength, maxTokens, null, readerLangId, { signal: controller.signal, structured: useStructuredOutput });
      }

      const parsed = useStructuredOutput
        ? normalizeStructuredReader(raw, readerLangId)
        : parseReaderResponse(raw, readerLangId);
      if (parsed.parseWarnings?.length) {
        act.notify('warning', 'Some sections used fallback parsing');
      }
      pushGeneratedReader(lessonKey, { ...parsed, topic, level, langId: readerLangId, lessonKey });
      // Update sidebar metadata with generated titles so they persist across reloads
      if ((parsed.titleZh || parsed.titleEn) && lessonKey.startsWith('standalone_')) {
        act.updateStandaloneReaderMeta({ key: lessonKey, titleZh: parsed.titleZh, titleEn: parsed.titleEn });
      }
      act.notify('success', `Reader ready: ${lessonMeta?.title_en || topic}`);
    } catch (err) {
      setStreamingText(null);
      if (err.message?.includes('timed out') || err.name === 'AbortError') {
        act.notify('error', 'Request timed out after 60 seconds. Try again or switch to a faster provider.');
      } else {
        act.notify('error', `Generation failed: ${err.message.slice(0, 80)}`);
      }
    } finally {
      act.clearPendingReader(lessonKey);
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, [isPending, lessonKey, lessonMeta, reader, langId, llmConfig, learnedVocabulary, readerLength, maxTokens, useStructuredOutput, act, pushGeneratedReader]);

  return { handleGenerate, act, streamingText };
}
