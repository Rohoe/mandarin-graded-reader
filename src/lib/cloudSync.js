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

// Merges a single newly-generated reader into the cloud row (read-then-write).
export async function pushReaderToCloud(lessonKey, readerData) {
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
  };
}
