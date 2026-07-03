// Native IndexedDB wrapper for Offline-First durability in ChamCard PRO

class OfflineDB {
  private dbName = "cham_card_pro_offline_db";
  private version = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = (e) => {
        console.error("IndexedDB opening error:", e);
        reject(e);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = request.result;
        if (!db.objectStoreNames.contains("kv")) {
          db.createObjectStore("kv");
        }
        if (!db.objectStoreNames.contains("sync_queue")) {
          db.createObjectStore("sync_queue", { autoIncrement: true });
        }
      };
    });
  }

  async get(key: string): Promise<any> {
    await this.init();
    return new Promise((resolve, reject) => {
      if (!this.db) return resolve(null);
      const transaction = this.db.transaction(["kv"], "readonly");
      const store = transaction.objectStore("kv");
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = (e) => {
        reject(e);
      };
    });
  }

  async set(key: string, value: any): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      if (!this.db) return reject("Database not initialized");
      const transaction = this.db.transaction(["kv"], "readwrite");
      const store = transaction.objectStore("kv");
      const request = store.put(value, key);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = (e) => {
        reject(e);
      };
    });
  }

  async addToSyncQueue(item: any): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      if (!this.db) return reject("Database not initialized");
      const transaction = this.db.transaction(["sync_queue"], "readwrite");
      const store = transaction.objectStore("sync_queue");
      const request = store.add(item);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = (e) => {
        reject(e);
      };
    });
  }

  async getSyncQueue(): Promise<any[]> {
    await this.init();
    return new Promise((resolve, reject) => {
      if (!this.db) return resolve([]);
      const transaction = this.db.transaction(["sync_queue"], "readonly");
      const store = transaction.objectStore("sync_queue");
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = (e) => {
        reject(e);
      };
    });
  }

  async clearSyncQueue(): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      if (!this.db) return reject("Database not initialized");
      const transaction = this.db.transaction(["sync_queue"], "readwrite");
      const store = transaction.objectStore("sync_queue");
      const request = store.clear();

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = (e) => {
        reject(e);
      };
    });
  }
}

export const offlineDb = new OfflineDB();
