import React, { useState } from 'react';
import { ShieldCheck, Smartphone, Lock, User, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { AuthSession, PHONE_REGEX } from '../types';
import { apiService } from '../services/api';
import { authStore } from '../store/authStore';

interface Props {
  onLogin: (session: AuthSession) => void;
}

const Auth: React.FC<Props> = ({ onLogin }) => {
  const [view, setView] = useState<'login' | 'signup' | 'forgot'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    password: ''
  });

  const validate = () => {
    if (!PHONE_REGEX.test(formData.phone)) {
      setError("رقم الهاتف يجب أن يكون بالتنسيق الدولي (E.164) ويبدأ بـ + (مثال: +963931112223)");
      return false;
    }
    if (formData.password.length < 6) {
      setError("كلمة المرور يجب أن تكون 6 خانات على الأقل.");
      return false;
    }
    if (view === 'signup' && formData.fullName.trim().length < 3) {
      setError("الرجاء إدخال اسم كامل صحيح.");
      return false;
    }
    return true;
  };

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validate()) return;

    setLoading(true);
    try {
      let session: AuthSession;
      if (view === 'login') {
        session = await apiService.login(formData.phone, formData.password);
      } else {
        session = await apiService.register(formData);
      }
      
      authStore.saveSession(session);
      onLogin(session);
    } catch (err: any) {
      setError(err.message || "فشل الاتصال بالخادم المركزي. تحقق من بياناتك.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col p-8 animate-in fade-in duration-500 overflow-y-auto" dir="rtl">
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-emerald-600 rounded-[30px] flex items-center justify-center mx-auto mb-6 shadow-2xl rotate-3">
            <ShieldCheck size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white leading-tight">شام كرت PRO</h1>
          <p className="text-slate-400 font-bold mt-2">نظام النقل الذكي المتكامل</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-950/30 border-2 border-rose-100 dark:border-rose-900/20 rounded-2xl flex items-center gap-3 text-rose-600 dark:text-rose-400 text-xs font-bold animate-in shake duration-300">
            <AlertCircle size={20} className="shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] shadow-xl border border-slate-100 dark:border-slate-800">
          <h2 className="text-xl font-black text-slate-800 dark:text-white mb-6">
            {view === 'login' ? 'مرحباً بك مجدداً' : 'إنشاء حساب جديد'}
          </h2>

          <form onSubmit={handleAction} className="space-y-4">
            {view === 'signup' && (
              <div className="relative group">
                <User className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors" size={18} />
                <input 
                  type="text" 
                  placeholder="الاسم الكامل"
                  required
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 pr-12 text-sm font-bold outline-none ring-2 ring-transparent focus:ring-emerald-500 dark:text-white text-right"
                  onChange={e => setFormData({...formData, fullName: e.target.value})}
                />
              </div>
            )}

            <div className="relative group">
              <Smartphone className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors" size={18} />
              <input 
                type="tel" 
                placeholder="رقم الهاتف (مثل +963...)"
                dir="ltr"
                required
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 pr-12 text-sm font-bold outline-none ring-2 ring-transparent focus:ring-emerald-500 dark:text-white text-right transition-all"
                onChange={e => setFormData({...formData, phone: e.target.value})}
              />
            </div>

            <div className="relative group">
              <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors" size={18} />
              <input 
                type="password" 
                placeholder="كلمة المرور"
                required
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 pr-12 text-sm font-bold outline-none ring-2 ring-transparent focus:ring-emerald-500 dark:text-white text-right"
                onChange={e => setFormData({...formData, password: e.target.value})}
              />
            </div>

            <button 
              disabled={loading}
              className="w-full bg-emerald-600 text-white font-black py-5 rounded-[24px] shadow-lg shadow-emerald-200 dark:shadow-none active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50">
              {loading ? <Loader2 className="animate-spin" /> : (view === 'login' ? 'دخول آمن' : 'تسجيل')}
            </button>
          </form>
        </div>

        <div className="text-center mt-10">
          {view === 'login' ? (
            <p className="text-sm font-bold text-slate-500">
              ليس لديك حساب؟ 
              <button onClick={() => setView('signup')} className="text-emerald-600 font-black mr-2 hover:underline">سجل الآن</button>
            </p>
          ) : (
            <button onClick={() => setView('login')} className="text-sm font-black text-emerald-600 flex items-center gap-2 mx-auto hover:opacity-80">
              <ArrowLeft size={16} /> العودة للدخول
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;