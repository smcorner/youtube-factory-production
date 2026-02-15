const DB = (() => {
  const DB_NAME = 'YouTubeFactory';
  const DB_VERSION = 2;
  let db = null;

  function open() {
    return new Promise((resolve, reject) => {
      if (db) return resolve(db);
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = (e) => {
        const d = e.target.result;

        if (!d.objectStoreNames.contains('channels')) {
          d.createObjectStore('channels', { keyPath: 'id', autoIncrement: true });
        }
        if (!d.objectStoreNames.contains('scripts')) {
          const s = d.createObjectStore('scripts', { keyPath: 'id', autoIncrement: true });
          s.createIndex('channelId', 'channelId', { unique: false });
          s.createIndex('status', 'status', { unique: false });
          s.createIndex('format', 'format', { unique: false });
        }
        if (!d.objectStoreNames.contains('analytics')) {
          const a = d.createObjectStore('analytics', { keyPath: 'id', autoIncrement: true });
          a.createIndex('scriptId', 'scriptId', { unique: false });
        }
        if (!d.objectStoreNames.contains('trends')) {
          d.createObjectStore('trends', { keyPath: 'id', autoIncrement: true });
        }
        if (!d.objectStoreNames.contains('hooks')) {
          d.createObjectStore('hooks', { keyPath: 'id', autoIncrement: true });
        }
        if (!d.objectStoreNames.contains('settings')) {
          d.createObjectStore('settings', { keyPath: 'key' });
        }
      };

      req.onsuccess = (e) => { db = e.target.result; resolve(db); };
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async function tx(store, mode) {
    const d = await open();
    return d.transaction(store, mode).objectStore(store);
  }

  function promisify(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function getAll(storeName) {
    const store = await tx(storeName, 'readonly');
    return promisify(store.getAll());
  }

  async function get(storeName, id) {
    const store = await tx(storeName, 'readonly');
    return promisify(store.get(id));
  }

  async function put(storeName, data) {
    const store = await tx(storeName, 'readwrite');
    return promisify(store.put(data));
  }

  async function add(storeName, data) {
    const store = await tx(storeName, 'readwrite');
    return promisify(store.add(data));
  }

  async function remove(storeName, id) {
    const store = await tx(storeName, 'readwrite');
    return promisify(store.delete(id));
  }

  async function clear(storeName) {
    const store = await tx(storeName, 'readwrite');
    return promisify(store.clear());
  }

  async function getByIndex(storeName, indexName, value) {
    const store = await tx(storeName, 'readonly');
    const index = store.index(indexName);
    return promisify(index.getAll(value));
  }

  async function count(storeName) {
    const store = await tx(storeName, 'readonly');
    return promisify(store.count());
  }

  async function getSetting(key) {
    try {
      const result = await get('settings', key);
      return result ? result.value : null;
    } catch { return null; }
  }

  async function setSetting(key, value) {
    return put('settings', { key, value });
  }

  async function exportAll() {
    const data = {};
    const stores = ['channels', 'scripts', 'analytics', 'trends', 'hooks'];
    for (const s of stores) {
      data[s] = await getAll(s);
    }
    return data;
  }

  async function importAll(data) {
    const stores = ['channels', 'scripts', 'analytics', 'trends', 'hooks'];
    for (const s of stores) {
      if (data[s]) {
        await clear(s);
        for (const item of data[s]) {
          await add(s, { ...item, id: undefined });
        }
      }
    }
  }

  async function clearAll() {
    const stores = ['channels', 'scripts', 'analytics', 'trends', 'hooks', 'settings'];
    for (const s of stores) {
      await clear(s);
    }
  }

  return {
    open, getAll, get, put, add, remove, clear,
    getByIndex, count, getSetting, setSetting,
    exportAll, importAll, clearAll
  };
})();