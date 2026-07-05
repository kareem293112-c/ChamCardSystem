import { AuthSession, UserRole, PHONE_REGEX } from '../types';
import { authStore } from '../store/authStore';

// In production, VITE_API_BASE should be set in .env
const BASE_URL = (import.meta as any).env?.VITE_API_BASE || '';

const getAuthHeaders = () => {
  const session = authStore.getSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Device-ID': authStore.getDeviceId(),
    'X-App-Platform': 'Pilot-V10'
  };
  
  if (session?.token) {
    headers['Authorization'] = `Bearer ${session.token}`;
  }
  
  return headers;
};

export const apiService = {
  async login(phone: string, password: string): Promise<AuthSession> {
    // 1. Strict Phone Validation (E.164)
    if (!PHONE_REGEX.test(phone)) {
      throw new Error('رقم الهاتف يجب أن يكون بالتنسيق الدولي +963...');
    }

    // 2. Real Backend Integration
    const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ phone, password })
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || 'خطأ في المصادقة. يرجى التحقق من البيانات.');
    }
    return res.json();
  },

  async register(data: { fullName: string, phone: string, password: string }): Promise<AuthSession> {
    if (!PHONE_REGEX.test(data.phone)) {
      throw new Error('رقم الهاتف غير صالح.');
    }

    const res = await fetch(`${BASE_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || 'فشل التسجيل. قد يكون الرقم مستخدماً مسبقاً.');
    }
    return res.json();
  },

  async resetPassword(phone: string, password: string): Promise<{ success: boolean, message: string }> {
    if (!PHONE_REGEX.test(phone)) {
      throw new Error('رقم الهاتف يجب أن يكون بالتنسيق الدولي +963...');
    }

    const res = await fetch(`${BASE_URL}/api/v1/auth/reset-password`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ phone, password })
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || 'فشل إعادة تعيين كلمة المرور.');
    }
    return res.json();
  }
};