import React, { useState } from 'react';
import { Shield, Smartphone, Key, Fingerprint, ArrowRight, Monitor, AlertCircle, CheckCircle2 } from 'lucide-react';
import { authStore } from '../store/authStore';

interface Props {
  onBack: () => void;
}

const SecurityCenter: React.FC<Props> = ({ onBack }) => {
  const [isPinEnabled, setIsPinEnabled] = useState(authStore.isLockEnabled());
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [tempPin, setTempPin] = useState('');
  const deviceId = authStore.getDeviceId();

  const handlePinToggle = () => {
    if (isPinEnabled) {
      authStore.setAppPin(null);
      setIsPinEnabled(false);
    } else {
      setShowPinSetup(true);
    }
  };

  const savePin = () => {
    if (tempPin.length === 4) {
      authStore.setAppPin(tempPin);
      setIsPinEnabled(true);
      setShowPinSetup(false);
      setTempPin('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 animate-in slide-in-from-left duration-500 pb-32" dir="rtl">
       <div className="flex justify-between items-center mb-10 pt-6">
          <button onClick={onBack} className="p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm"><ArrowRight size={20} className="dark:text-white" /></button>
          <h2 className="text-2xl font-black dark:text-white">مركز الأمان</h2>
       </div>

       <div className="bg-emerald-600 rounded-[40px] p-8 text-white mb-8 relative overflow-hidden shadow-xl">
          <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          <Shield size={48} className="mb-4 text-emerald-200" />
          <h3 className="text-xl font-black mb-1">حماية متقدمة</h3>
          <p className="text-emerald-100 text-sm font-bold opacity-80">نظام تشفير الجلسة الرقمية مفعل</p>
       </div>

       <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 p-5 rounded-[32px] flex items-center justify-between border border-slate-50 dark:border-slate-700 shadow-sm">
            <div className="flex items-center gap-4 text-right">
               <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-2xl text-emerald-600"><Fingerprint size={24} /></div>
               <div>
                 <p className="font-black text-sm dark:text-white">قفل التطبيق (PIN)</p>
                 <p className="text-[10px] text-slate-400 font-bold">طلب رمز سري عند الفتح</p>
               </div>
            </div>
            <button 
              onClick={handlePinToggle}
              className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${isPinEnabled ? 'bg-emerald-600' : 'bg-slate-200 dark:bg-slate-700'}`}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${isPinEnabled ? 'left-1' : 'left-7'}`}></div>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-800 p-8 rounded-[40px] border border-slate-100 dark:border-slate-700 shadow-sm">
             <h4 className="font-black mb-6 flex items-center gap-2 dark:text-white">
                <Monitor size={20} className="text-emerald-500" /> ربط الجهاز الآمن
             </h4>
             <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 flex justify-between items-center">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Device ID</span>
               <span className="text-xs font-mono font-bold text-emerald-600">{deviceId}</span>
             </div>
             <p className="text-[10px] text-slate-400 font-bold mt-4 leading-relaxed">
               حسابك مربوط حالياً بهذا المعرف الفريد. في حال محاولة الدخول من جهاز آخر سيتم طلب تأكيد إضافي عبر الهاتف.
             </p>
          </div>
       </div>

       {showPinSetup && (
         <div className="fixed inset-0 bg-slate-900/80 z-[1000] flex items-center justify-center p-6 backdrop-blur-md">
            <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-[48px] p-8 text-center animate-in zoom-in duration-300">
               <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                 <Key size={30} />
               </div>
               <h3 className="text-xl font-black mb-2 dark:text-white">إعداد رمز PIN</h3>
               <p className="text-sm text-slate-400 font-bold mb-8">أدخل 4 أرقام لتأمين التطبيق</p>
               
               <div className="flex justify-center gap-4 mb-10">
                 {[...Array(4)].map((_, i) => (
                   <div key={i} className={`w-10 h-12 rounded-xl flex items-center justify-center text-xl font-black ${tempPin.length > i ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-300'}`}>
                     {tempPin[i] ? '•' : ''}
                   </div>
                 ))}
               </div>

               <div className="grid grid-cols-3 gap-3 mb-8">
                 {['1','2','3','4','5','6','7','8','9','0'].map(n => (
                   <button key={n} onClick={() => tempPin.length < 4 && setTempPin(tempPin + n)} className="bg-slate-50 dark:bg-slate-700 py-4 rounded-2xl font-black dark:text-white active:bg-emerald-600 transition-colors">
                     {n}
                   </button>
                 ))}
                 <button onClick={() => setTempPin(tempPin.slice(0, -1))} className="bg-slate-100 dark:bg-slate-700 py-4 rounded-2xl font-black text-slate-500">حذف</button>
               </div>

               <div className="flex gap-3">
                 <button onClick={savePin} disabled={tempPin.length !== 4} className="flex-1 bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-lg disabled:opacity-50">حفظ الرمز</button>
                 <button onClick={() => { setShowPinSetup(false); setTempPin(''); }} className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-500 py-4 rounded-2xl font-black">إلغاء</button>
               </div>
            </div>
         </div>
       )}
    </div>
  );
};

export default SecurityCenter;