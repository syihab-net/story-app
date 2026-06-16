const DATABASE_NAME = 'dicoding-story-db';
const DATABASE_VERSION = 1;
const STORE_NAME = 'saved-stories';

let databasePromise = null;

function openDatabase() {
  if (databasePromise) {
    return databasePromise;
  }

  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.addEventListener('upgradeneeded', () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    });

    request.addEventListener('success', () => resolve(request.result));
    request.addEventListener('error', () => reject(request.error || new Error('Unable to open IndexedDB.')));
  });

  return databasePromise;
}

async function withStore(mode, callback) {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    const request = callback(store);

    request.addEventListener('success', () => resolve(request.result));
    request.addEventListener('error', () => reject(request.error || new Error('IndexedDB request failed.')));
  });
}

export function getSavedStories() {
  return withStore('readonly', (store) => store.getAll());
}

export function getSavedStory(id) {
  return withStore('readonly', (store) => store.get(id));
}

export async function saveStory(story) {
  const record = {
    ...story,
    savedAt: new Date().toISOString(),
  };

  await withStore('readwrite', (store) => store.put(record));
  return record;
}

export function deleteSavedStory(id) {
  return withStore('readwrite', (store) => store.delete(id));
}
