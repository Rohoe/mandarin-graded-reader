import { load, save } from './storageHelpers';

const KEYS = {
  CLOUD_LAST_SYNCED: 'gradedReader_cloudLastSynced',
};

export function loadCloudLastSynced() {
  return load(KEYS.CLOUD_LAST_SYNCED, null);
}

export function saveCloudLastSynced(ts) {
  save(KEYS.CLOUD_LAST_SYNCED, ts);
}

export function loadLastModified() {
  return load('gradedReader_lastModified', null);
}

export function saveLastModified(ts) {
  save('gradedReader_lastModified', ts);
}
