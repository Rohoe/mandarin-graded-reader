import { supabase } from './supabase';

export async function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  });
}

export async function signInWithApple() {
  return supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: { redirectTo: window.location.origin },
  });
}

export async function signOut() {
  return supabase.auth.signOut();
}

// Pushes all metadata (syllabi, progress, vocab, etc.) — excludes readers.
// Readers are pushed individually via pushReaderToCloud when generated.
export async function pushToCloud(state) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { error } = await supabase.from('user_data').upsert({
    user_id:            user.id,
    syllabi:            state.syllabi,
    syllabus_progress:  state.syllabusProgress,
    standalone_readers: state.standaloneReaders,
    learned_vocabulary: state.learnedVocabulary,
    exported_words:     [...state.exportedWords],
    updated_at:         new Date().toISOString(),
  });
  if (error) throw error;
}

// Serialize concurrent reader pushes to prevent read-modify-write races.
let _readerSyncQueue = Promise.resolve();

// Merges a single newly-generated reader into the cloud row (read-then-write).
export function pushReaderToCloud(lessonKey, readerData) {
  _readerSyncQueue = _readerSyncQueue.then(() => _pushReaderToCloudImpl(lessonKey, readerData)).catch(() => {});
  return _readerSyncQueue;
}

async function _pushReaderToCloudImpl(lessonKey, readerData) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { data } = await supabase
    .from('user_data')
    .select('generated_readers')
    .eq('user_id', user.id)
    .single();
  const existing = data?.generated_readers ?? {};
  const { error } = await supabase.from('user_data').upsert({
    user_id:           user.id,
    generated_readers: { ...existing, [lessonKey]: readerData },
    updated_at:        new Date().toISOString(),
  });
  if (error) throw error;
}

export async function pullFromCloud() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { data, error } = await supabase
    .from('user_data')
    .select('*')
    .eq('user_id', user.id)
    .single();
  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no row found
  return data; // null if first sync
}

// Fetch just the reader keys from cloud (for eviction verification)
export async function fetchCloudReaderKeys() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('user_data')
    .select('generated_readers')
    .eq('user_id', user.id)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return new Set(); // no row
    throw error;
  }
  return new Set(Object.keys(data?.generated_readers ?? {}));
}

// Pull a single reader from cloud by lesson key
export async function pullReaderFromCloud(lessonKey) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('user_data')
    .select('generated_readers')
    .eq('user_id', user.id)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data?.generated_readers?.[lessonKey] ?? null;
}

// Simple hash function for conflict detection
function hashData(data) {
  const str = JSON.stringify({
    syllabi: data.syllabi,
    syllabusProgress: data.syllabusProgress,
    standaloneReaders: data.standaloneReaders,
    learnedVocabulary: data.learnedVocabulary,
    exportedWords: data.exportedWords,
  });
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

export function detectConflict(localState, cloudData) {
  if (!cloudData) return null; // No cloud data, no conflict

  const localHash = hashData({
    syllabi: localState.syllabi,
    syllabusProgress: localState.syllabusProgress,
    standaloneReaders: localState.standaloneReaders,
    learnedVocabulary: localState.learnedVocabulary,
    exportedWords: localState.exportedWords,
  });

  const cloudHash = hashData({
    syllabi: cloudData.syllabi,
    syllabusProgress: cloudData.syllabus_progress,
    standaloneReaders: cloudData.standalone_readers,
    learnedVocabulary: cloudData.learned_vocabulary,
    exportedWords: cloudData.exported_words,
  });

  if (localHash === cloudHash) return null; // Data is identical

  const cloudTs = new Date(cloudData.updated_at).getTime();
  const localTs = localState.lastModified;

  return {
    cloudNewer: cloudTs > localTs,
    cloudDate: new Date(cloudTs).toLocaleString(),
    localDate: new Date(localTs).toLocaleString(),
    cloudSyllabusCount: cloudData.syllabi?.length || 0,
    localSyllabusCount: localState.syllabi?.length || 0,
    cloudStandaloneCount: cloudData.standalone_readers?.length || 0,
    localStandaloneCount: localState.standaloneReaders?.length || 0,
    cloudVocabCount: Object.keys(cloudData.learned_vocabulary || {}).length,
    localVocabCount: Object.keys(localState.learnedVocabulary || {}).length,
  };
}

// Union-merge local state and cloud data. Returns cloud-row shaped data
// suitable for HYDRATE_FROM_CLOUD / MERGE_WITH_CLOUD.
export function mergeData(localState, cloudData) {
  // Syllabi: union by id
  const syllabusMap = new Map();
  for (const s of (cloudData.syllabi || [])) syllabusMap.set(s.id, s);
  for (const s of (localState.syllabi || [])) syllabusMap.set(s.id, s); // local wins on conflict
  const syllabi = [...syllabusMap.values()];

  // Standalone readers: union by key
  const standaloneMap = new Map();
  for (const r of (cloudData.standalone_readers || [])) standaloneMap.set(r.key, r);
  for (const r of (localState.standaloneReaders || [])) standaloneMap.set(r.key, r);
  const standalone_readers = [...standaloneMap.values()];

  // Syllabus progress: union by syllabus ID; merge completedLessons + max lessonIndex
  const syllabus_progress = { ...(cloudData.syllabus_progress || {}) };
  for (const [id, local] of Object.entries(localState.syllabusProgress || {})) {
    const cloud = syllabus_progress[id];
    if (!cloud) {
      syllabus_progress[id] = local;
    } else {
      const mergedCompleted = [...new Set([...(cloud.completedLessons || []), ...(local.completedLessons || [])])];
      syllabus_progress[id] = {
        lessonIndex: Math.max(cloud.lessonIndex || 0, local.lessonIndex || 0),
        completedLessons: mergedCompleted,
      };
    }
  }

  // Generated readers: union by lesson key; local wins (has user answers, grading)
  const generated_readers = {
    ...(cloudData.generated_readers || {}),
    ...(localState.generatedReaders || {}),
  };

  // Learned vocabulary: union by word; prefer newer dateAdded
  const learned_vocabulary = { ...(cloudData.learned_vocabulary || {}) };
  for (const [word, local] of Object.entries(localState.learnedVocabulary || {})) {
    const cloud = learned_vocabulary[word];
    if (!cloud) {
      learned_vocabulary[word] = local;
    } else {
      const localDate = local.dateAdded || 0;
      const cloudDate = cloud.dateAdded || 0;
      learned_vocabulary[word] = localDate >= cloudDate ? local : cloud;
    }
  }

  // Exported words: set union
  const cloudExported = Array.isArray(cloudData.exported_words) ? cloudData.exported_words : [];
  const localExported = localState.exportedWords instanceof Set
    ? [...localState.exportedWords]
    : Array.isArray(localState.exportedWords) ? localState.exportedWords : [];
  const exported_words = [...new Set([...cloudExported, ...localExported])];

  return {
    syllabi,
    syllabus_progress,
    standalone_readers,
    generated_readers,
    learned_vocabulary,
    exported_words,
    updated_at: new Date().toISOString(),
  };
}

// Push pre-merged data to cloud (includes generated_readers).
export async function pushMergedToCloud(mergedData) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { error } = await supabase.from('user_data').upsert({
    user_id:            user.id,
    syllabi:            mergedData.syllabi,
    syllabus_progress:  mergedData.syllabus_progress,
    standalone_readers: mergedData.standalone_readers,
    generated_readers:  mergedData.generated_readers,
    learned_vocabulary: mergedData.learned_vocabulary,
    exported_words:     mergedData.exported_words,
    updated_at:         mergedData.updated_at || new Date().toISOString(),
  });
  if (error) throw error;
}
