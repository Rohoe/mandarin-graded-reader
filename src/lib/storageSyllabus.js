import { load, save, saveSyllabiFile } from './storageHelpers';

const KEYS = {
  SYLLABI: 'gradedReader_syllabi',
  SYLLABUS_PROGRESS: 'gradedReader_syllabusProgress',
  STANDALONE_READERS: 'gradedReader_standaloneReaders',
  LEARNING_PATHS: 'gradedReader_learningPaths',
};

export function loadSyllabi() {
  // Migration: convert old single-syllabus format if present
  const oldSyllabus = load('gradedReader_syllabus', null);
  if (oldSyllabus) {
    const oldIndex = load('gradedReader_lessonIndex', 0);
    const migrated = [{
      id:        'migrated_' + Date.now().toString(36),
      topic:     oldSyllabus.topic,
      level:     oldSyllabus.level,
      lessons:   oldSyllabus.lessons || [],
      createdAt: Date.now(),
    }];
    save(KEYS.SYLLABI, migrated);
    const progress = load(KEYS.SYLLABUS_PROGRESS, {});
    progress[migrated[0].id] = { lessonIndex: oldIndex, completedLessons: [] };
    save(KEYS.SYLLABUS_PROGRESS, progress);
    localStorage.removeItem('gradedReader_syllabus');
    localStorage.removeItem('gradedReader_lessonIndex');
    return migrated;
  }
  return load(KEYS.SYLLABI, []);
}

export function saveSyllabi(arr) {
  save(KEYS.SYLLABI, arr);
  saveSyllabiFile();
}

export function loadLearningPaths() {
  return load(KEYS.LEARNING_PATHS, []);
}

export function saveLearningPaths(arr) {
  save(KEYS.LEARNING_PATHS, arr);
}

export function loadSyllabusProgress() {
  return load(KEYS.SYLLABUS_PROGRESS, {});
}

export function saveSyllabusProgress(map) {
  save(KEYS.SYLLABUS_PROGRESS, map);
  saveSyllabiFile();
}

export function loadStandaloneReaders() {
  return load(KEYS.STANDALONE_READERS, []);
}

export function saveStandaloneReaders(arr) {
  save(KEYS.STANDALONE_READERS, arr);
  saveSyllabiFile();
}
