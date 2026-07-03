
import { OfflineTransaction, SystemConfig } from '../types';

export class SyncEngine {
  private static STORAGE_KEY = 'offline_tx_queue';

  static getQueue(): OfflineTransaction[] {
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  static addToQueue(tx: OfflineTransaction) {
    const queue = this.getQueue();
    queue.push(tx);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(queue));
  }

  static async syncWithServer(): Promise<{ success: boolean, syncedCount: number }> {
    const queue = this.getQueue();
    if (queue.length === 0) return { success: true, syncedCount: 0 };

    try {
      // POST /api/tx/sync
      console.log("[Sync] Uploading transactions...", queue);
      await new Promise(r => setTimeout(r, 1000)); // Simulate Network
      
      localStorage.setItem(this.STORAGE_KEY, '[]'); // Clear on success
      return { success: true, syncedCount: queue.length };
    } catch (e) {
      console.error("[Sync] Failed to sync", e);
      return { success: false, syncedCount: 0 };
    }
  }

  static async fetchRemoteConfig(): Promise<Partial<SystemConfig>> {
    // GET /api/device/config
    return {
      fareAmount: 500,
      antiPassbackSeconds: 3,
      dailyCap: 5000
    };
  }
}
