
import { RechargeRequest } from '../types';

const STORAGE_KEY = 'sham_recharge_requests';

export const rechargeService = {
  async submitRequest(request: Omit<RechargeRequest, 'id' | 'status' | 'timestamp'>, token: string): Promise<boolean> {
    try {
      const res = await fetch('/api/recharge-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(request)
      });
      if (res.ok) {
        const data = await res.json();
        const requests = this.getRequests();
        requests.unshift(data.request);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to submit recharge request:", err);
      return false;
    }
  },

  getRequests(): RechargeRequest[] {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  updateStatus(requestId: string, status: 'approved' | 'rejected'): void {
    const requests = this.getRequests();
    const updated = requests.map(r => r.id === requestId ? { ...r, status } : r);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  },

  getPendingCount(): number {
    return this.getRequests().filter(r => r.status === 'pending').length;
  }
};
