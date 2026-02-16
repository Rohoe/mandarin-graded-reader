import { useState, useEffect, useCallback, useRef } from 'react';

export function useTTS(langConfig, langId, ttsVoiceURI, ttsKoVoiceURI, ttsYueVoiceURI, setTtsVoice) {
  const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const [speakingKey, setSpeakingKey] = useState(null);
  const utteranceRef = useRef(null);
  const [voices, setVoices] = useState([]);

  function pickBestVoice(voiceList) {
    const priorityTests = langConfig.tts.priorityVoices;
    for (const test of priorityTests) {
      const match = voiceList.find(test);
      if (match) return match;
    }
    return voiceList[0] || null;
  }

  useEffect(() => {
    if (!ttsSupported) return;
    function loadVoices() {
      const filtered = window.speechSynthesis.getVoices().filter(v => langConfig.tts.langFilter.test(v.lang));
      setVoices(filtered);
      const activeVoiceURI = langId === 'yue' ? ttsYueVoiceURI : langId === 'ko' ? ttsKoVoiceURI : ttsVoiceURI;
      if (!activeVoiceURI && filtered.length > 0) {
        const best = pickBestVoice(filtered);
        if (best) setTtsVoice(langId, best.voiceURI);
      }
    }
    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ttsSupported, langId]);

  const speakText = useCallback((text, key) => {
    if (!ttsSupported) return;
    if (speakingKey === key) {
      window.speechSynthesis.cancel();
      setSpeakingKey(null);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const activeVoiceURI = langId === 'yue' ? ttsYueVoiceURI : langId === 'ko' ? ttsKoVoiceURI : ttsVoiceURI;
    const voice = voices.find(v => v.voiceURI === activeVoiceURI);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = langConfig.tts.defaultLang;
    }
    utterance.rate = langConfig.tts.defaultRate;
    utterance.onend = () => setSpeakingKey(null);
    utterance.onerror = () => setSpeakingKey(null);
    utteranceRef.current = utterance;
    setSpeakingKey(key);
    window.speechSynthesis.speak(utterance);
  }, [ttsSupported, speakingKey, voices, ttsVoiceURI, ttsKoVoiceURI, ttsYueVoiceURI, langId, langConfig.tts]);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel();
    setSpeakingKey(null);
  }, []);

  return { ttsSupported, speakingKey, speakText, stopSpeaking, setSpeakingKey };
}
