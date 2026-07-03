import { OfflineTransaction } from '../types';

export class LogService {
  private static STORAGE_KEY = 'pilot_tx_logs_v1';
  private static MAX_LOGS = 200;

  static saveTransaction(tx: OfflineTransaction) {
    const logs = this.getLogs();
    logs.unshift(tx);
    
    // Rotation: limit to MAX_LOGS
    const limitedLogs = logs.slice(0, this.MAX_LOGS);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(limitedLogs));
  }

  static getLogs(): OfflineTransaction[] {
    const data = localStorage.getItem(this.STORAGE_KEY);
    try {
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static clearLogs() {
    localStorage.setItem(this.STORAGE_KEY, '[]');
  }

  static exportAsJSON() {
    const data = JSON.stringify(this.getLogs(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chamcard_logs_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  static exportAsCSV() {
    const logs = this.getLogs();
    if (logs.length === 0) return;
    
    const headers = ["ID", "Timestamp", "UID", "Amount", "Type", "Role", "DeviceID", "Synced"];
    const rows = logs.map(l => [
      l.id, 
      new Date(l.timestamp).toISOString(), 
      l.cardUid, 
      l.amount, 
      l.type, 
      l.role, 
      l.deviceId,
      l.synced ? "YES" : "NO"
    ]);
    
    // Proper CSV quoting
    const csvContent = [
      headers.map(h => `"${h}"`).join(","),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chamcard_audit_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}