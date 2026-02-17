import { useState, useEffect } from 'react';
import { useAppSelector } from '../context/useAppSelector';
import { getProvider } from '../lib/providers';
import './GenerationProgress.css';

function buildPhases(type, providerName) {
  const connectLabel = `Connecting to ${providerName}…`;
  if (type === 'syllabus') {
    return [
      { pct: 20, label: connectLabel,                     ms: 800  },
      { pct: 55, label: 'Designing lesson structure…',    ms: 3500 },
      { pct: 85, label: 'Writing lesson descriptions…',   ms: 3000 },
      { pct: 97, label: 'Almost done…',                   ms: 60000 },
    ];
  }
  return [
    { pct: 12, label: connectLabel,                       ms: 1200 },
    { pct: 38, label: 'Writing your story…',              ms: 7000 },
    { pct: 62, label: 'Building vocabulary list…',        ms: 6000 },
    { pct: 78, label: 'Adding comprehension questions…',  ms: 4000 },
    { pct: 92, label: 'Preparing Anki cards…',            ms: 4000 },
    { pct: 98, label: 'Almost done…',                     ms: 60000 },
  ];
}

export default function GenerationProgress({ type = 'reader' }) {
  const activeProvider = useAppSelector(s => s.activeProvider);
  const providerDef = getProvider(activeProvider);
  // Use short display name (e.g. "Anthropic" not "Anthropic (Claude)")
  const providerName = providerDef.name.split(' (')[0];
  const phases = buildPhases(type, providerName);

  const [phaseIdx, setPhaseIdx] = useState(0);
  const [pct, setPct]           = useState(0);

  // Kick off first phase immediately, then advance on timers
  useEffect(() => {
    let idx = 0;

    function advance() {
      if (idx >= phases.length) return;
      setPct(phases[idx].pct);
      setPhaseIdx(idx);
      const delay = phases[idx].ms;
      idx += 1;
      if (idx < phases.length) {
        setTimeout(advance, delay);
      }
    }

    // Small initial delay so the bar visibly starts from 0
    const t = setTimeout(advance, 80);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const label = phases[phaseIdx]?.label ?? 'Working…';

  return (
    <div className="gen-progress">
      <div className="gen-progress__bar-track">
        <div
          className="gen-progress__bar-fill"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="gen-progress__label">{label}</p>
    </div>
  );
}
