import { loadReader } from '../../lib/storage';
import { DEMO_READER_KEY } from '../../lib/demoReader';

export function readerReducer(state, action) {
  switch (action.type) {
    case 'ADD_STANDALONE_READER': {
      const withoutDemo = state.standaloneReaders.filter(r => !r.isDemo);
      const filteredReaders = { ...state.generatedReaders };
      if (withoutDemo.length !== state.standaloneReaders.length) delete filteredReaders[DEMO_READER_KEY];
      return { ...state, standaloneReaders: [action.payload, ...withoutDemo], generatedReaders: filteredReaders };
    }

    case 'UPDATE_STANDALONE_READER_META': {
      const { key, ...meta } = action.payload;
      return {
        ...state,
        standaloneReaders: state.standaloneReaders.map(r =>
          r.key === key ? { ...r, ...meta } : r
        ),
      };
    }

    case 'REMOVE_STANDALONE_READER': {
      const key = action.payload;
      const removedMeta = state.standaloneReaders.find(r => r.key === key);
      const removedReader = state.generatedReaders[key];
      const newList = state.standaloneReaders.filter(r => r.key !== key);
      const newReaders = { ...state.generatedReaders };
      delete newReaders[key];
      const newEvicted = new Set(state.evictedReaderKeys);
      newEvicted.delete(key);
      return {
        ...state, standaloneReaders: newList, generatedReaders: newReaders, evictedReaderKeys: newEvicted,
        _recentlyDeleted: { kind: 'standalone', meta: removedMeta, reader: removedReader, key },
      };
    }

    case 'UNDO_REMOVE_STANDALONE_READER': {
      const d = state._recentlyDeleted;
      if (!d || d.kind !== 'standalone' || !d.meta) return state;
      return {
        ...state,
        standaloneReaders: [d.meta, ...state.standaloneReaders],
        generatedReaders: d.reader ? { ...state.generatedReaders, [d.key]: d.reader } : state.generatedReaders,
        _recentlyDeleted: null,
      };
    }

    case 'SET_READER': {
      const { lessonKey, data } = action.payload;
      let newActivity = state.learningActivity;
      const prev = state.generatedReaders[lessonKey];
      if (data.gradingResults && (!prev || !prev.gradingResults)) {
        const score = data.gradingResults.overallScore ?? null;
        newActivity = [...newActivity, { type: 'quiz_graded', lessonKey, score, timestamp: Date.now() }];
      }
      if (data.story && (!prev || !prev.story)) {
        newActivity = [...newActivity, { type: 'reader_generated', lessonKey, timestamp: Date.now() }];
      }
      const newEvicted = state.evictedReaderKeys.has(lessonKey)
        ? new Set([...state.evictedReaderKeys].filter(k => k !== lessonKey))
        : state.evictedReaderKeys;
      return {
        ...state,
        generatedReaders: { ...state.generatedReaders, [lessonKey]: data },
        learningActivity: newActivity,
        evictedReaderKeys: newEvicted,
      };
    }

    case 'CLEAR_READER': {
      const key = action.payload;
      const newReaders = { ...state.generatedReaders };
      delete newReaders[key];
      return { ...state, generatedReaders: newReaders };
    }

    case 'LOAD_CACHED_READER': {
      const { lessonKey } = action.payload;
      const cached = loadReader(lessonKey);
      if (!cached) return state;
      return {
        ...state,
        generatedReaders: { ...state.generatedReaders, [lessonKey]: cached },
      };
    }

    case 'TOUCH_READER': {
      const { lessonKey } = action.payload;
      const existing = state.generatedReaders[lessonKey];
      if (!existing) return state;
      return {
        ...state,
        generatedReaders: {
          ...state.generatedReaders,
          [lessonKey]: { ...existing, lastOpenedAt: Date.now() },
        },
      };
    }

    case 'SET_QUOTA_WARNING':
      return { ...state, quotaWarning: action.payload };

    case 'ARCHIVE_STANDALONE_READER':
      return { ...state, standaloneReaders: state.standaloneReaders.map(r => r.key === action.payload ? { ...r, archived: true } : r) };

    case 'UNARCHIVE_STANDALONE_READER':
      return { ...state, standaloneReaders: state.standaloneReaders.map(r => r.key === action.payload ? { ...r, archived: false } : r) };

    case 'START_PENDING_READER':
      return { ...state, pendingReaders: { ...state.pendingReaders, [action.payload]: true } };

    case 'CLEAR_PENDING_READER': {
      const next = { ...state.pendingReaders };
      delete next[action.payload];
      return { ...state, pendingReaders: next };
    }

    case 'SET_EVICTED_READER_KEYS':
      return { ...state, evictedReaderKeys: action.payload };

    case 'RESTORE_EVICTED_READER': {
      const { lessonKey, data } = action.payload;
      const newEvicted = new Set(state.evictedReaderKeys);
      newEvicted.delete(lessonKey);
      return {
        ...state,
        generatedReaders: { ...state.generatedReaders, [lessonKey]: data },
        evictedReaderKeys: newEvicted,
      };
    }

    default:
      return undefined;
  }
}
