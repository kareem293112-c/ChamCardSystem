import { AuthSession } from '../types';

const SESSION_KEY = 'chamcard_session_v1';
const DEVICE_KEY = 'chamcard_device_id_v1';
const APP_PIN_KEY = 'chamcard_app_pin_v1';
const LOCK_STATE_KEY = 'chamcard_is_locked_v1';

export const authStore = {
  saveSession(session: AuthSession) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    // When logging in, if a PIN is set, the app starts locked
    if (this.isLockEnabled()) {
      this.setLockState(true);
    }
  },

  getSession(): AuthSession | null {
    const data = localStorage.getItem(SESSION_KEY);
    try {
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  clearSession() {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(LOCK_STATE_KEY);
    sessionStorage.clear();
  },

  getDeviceId(): string {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = 'PRO-' + crypto.randomUUID().split('-')[0].toUpperCase() + '-' + Date.now().toString(36).toUpperCase();
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  },

  setAppPin(pin: string | null) {
    if (pin) {
      localStorage.setItem(APP_PIN_KEY, pin);
      this.setLockState(true);
    } else {
      localStorage.removeItem(APP_PIN_KEY);
      localStorage.removeItem(LOCK_STATE_KEY);
    }
  },

  getAppPin(): string | null {
    return localStorage.getItem(APP_PIN_KEY);
  },

  isLockEnabled(): boolean {
    return !!this.getAppPin();
  },

  isCurrentlyLocked(): boolean {
    return localStorage.getItem(LOCK_STATE_KEY) === 'true';
  },

  setLockState(locked: boolean) {
    localStorage.setItem(LOCK_STATE_KEY, locked ? 'true' : 'false');
  }
};