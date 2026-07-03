import React, { useState, useEffect } from 'react';
import { Wifi, X, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { Card } from '../types';

interface NfcSyncModalProps {
  card: Card;
  token: string;
  onClose: () => void;
  onSuccess: (newBalance: number) => void;
}

export const NfcSyncModal: React.FC<NfcSyncModalProps> = ({ card, token, onClose, onSuccess }) => {
  const [step, setStep] = useState<'ready' | 'tapping' | 'syncing' | 'success' | 'error'>('ready');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [newBalance, setNewBalance] = useState<number>(card.balance);

  useEffect(() => {
    if (step === 'tapping') {
      // Simulate physical NFC card detection delay of 2 seconds
      const timer = setTimeout(() => {
        setStep('syncing');
        performSync();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const performSync = async () => {
    try {
      const response = await fetch('/api/cards/sync-nfc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ cardId: card.id })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'فشلت عملية المزامنة اللاسلكية.');
      }

      setNewBalance(data.newBalance);
      setStep('success');
      onSuccess(data.newBalance);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'عذراً، فشل شحن البطاقة عبر NFC. تأكد من ثبات البطاقة خلف الهاتف وحاول مجدداً.');
      setStep('error');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 z-[800] flex items-center justify-center p-6 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[40px] p-8 shadow-2xl relative border border-slate-100 dark:border-slate-700 text-center animate-in zoom-in-95 duration-300" dir="rtl">
        
        {/* Close button */}
        {(step === 'ready' || step === 'error' || step === 'success') && (
          <button 
            onClick={onClose} 
            className="absolute top-6 left-6 p-2 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-full text-slate-400 hover:text-slate-600 dark:text-slate-300 transition active:scale-90"
          >
            <X size={20} />
          </button>
        )}

        {step === 'ready' && (
          <div className="space-y-6 pt-4">
            <div className="w-20 h-20 bg-amber-500/10 text-amber-500 rounded-[28px] flex items-center justify-center mx-auto shadow-inner relative">
              <Wifi size={40} className="relative z-10 animate-bounce" />
              <span className="absolute inset-0 rounded-[28px] bg-amber-500/10 animate-ping opacity-70"></span>
            </div>
            
            <div>
              <h3 className="text-2xl font-black text-slate-800 dark:text-white">تفريغ الرصيد المعلق (NFC)</h3>
              <p className="text-slate-500 dark:text-slate-400 font-bold text-sm leading-relaxed mt-2">
                بطاقتك الفيزيائية لديها رصيد معلق بقيمة <span className="text-amber-600 dark:text-amber-400 font-extrabold">{(card.pendingNfcAmount || 0).toLocaleString()} ل.س</span>.
                يرجى الضغط على البدء وتمرير البطاقة خلف هاتفك لتأكيد الشحن فوراً.
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 text-right space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-400">رقم البطاقة:</span>
                <span className="text-slate-800 dark:text-slate-200">{card.cardNumber}</span>
              </div>
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-400">الرصيد المتاح حالياً:</span>
                <span className="text-slate-800 dark:text-slate-200">{(card.balance).toLocaleString()} ل.س</span>
              </div>
            </div>

            <button 
              onClick={() => setStep('tapping')}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-black py-5 rounded-[22px] shadow-lg shadow-amber-500/20 active:scale-95 transition-all text-base"
            >
              ابدأ عملية التمرير اللاتلامسي
            </button>
          </div>
        )}

        {step === 'tapping' && (
          <div className="space-y-8 pt-6">
            {/* NFC radar pulsing effect */}
            <div className="relative w-36 h-36 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 bg-amber-500/10 dark:bg-amber-500/20 rounded-full animate-ping opacity-40"></div>
              <div className="absolute w-28 h-28 bg-amber-500/20 dark:bg-amber-500/30 rounded-full animate-ping duration-1000 opacity-60"></div>
              <div className="relative w-20 h-20 bg-gradient-to-tr from-amber-400 to-amber-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-amber-500/30">
                <Wifi size={36} className="animate-pulse" />
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xl font-black text-slate-800 dark:text-white animate-pulse">جاري الملامسة والتحقق...</h4>
              <p className="text-slate-500 dark:text-slate-400 font-bold text-sm leading-relaxed max-w-xs mx-auto">
                يرجى ملامسة بطاقتك البلاستيكية بخلفية الهاتف الآن لنقل الرصيد.
              </p>
            </div>

            <p className="text-[10px] font-mono text-amber-600 dark:text-amber-400 font-bold uppercase tracking-widest">
              انتظار موجة NFC القصيرة المدى...
            </p>
          </div>
        )}

        {step === 'syncing' && (
          <div className="space-y-8 pt-6">
            <div className="w-20 h-20 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <RefreshCw size={36} className="animate-spin" />
            </div>

            <div className="space-y-3">
              <h4 className="text-xl font-black text-slate-800 dark:text-white">جاري مزامنة قاعدة البيانات...</h4>
              <p className="text-slate-500 dark:text-slate-400 font-bold text-sm leading-relaxed">
                نقوم بتفريغ الرصيد وتحديث شريحة البطاقة بأمان في الخادم.
              </p>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="space-y-6 pt-4 animate-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-[28px] flex items-center justify-center mx-auto shadow-inner relative">
              <CheckCircle size={40} className="relative z-10" />
              <span className="absolute inset-0 rounded-[28px] bg-emerald-500/10 animate-ping opacity-30"></span>
            </div>

            <div>
              <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">نجحت العملية!</h3>
              <p className="text-slate-500 dark:text-slate-400 font-bold text-sm leading-relaxed mt-3">
                تم شحن بطاقتك الفيزيائية بنجاح، رصيدك الحالي هو <span className="text-slate-800 dark:text-white font-black text-base">{newBalance.toLocaleString()} ل.س</span> ل.س.
              </p>
            </div>

            <div className="bg-emerald-50/50 dark:bg-emerald-950/10 p-5 rounded-2xl border border-emerald-100/50 dark:border-emerald-900/20 text-right space-y-1">
              <p className="text-xs font-bold text-emerald-800 dark:text-emerald-400">
                • تم تصفير الرصيد المعلق بنجاح.
              </p>
              <p className="text-xs font-bold text-emerald-800 dark:text-emerald-400">
                • البطاقة جاهزة للاستخدام الآن في جميع خطوط النقل.
              </p>
            </div>

            <button 
              onClick={onClose}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-5 rounded-[22px] shadow-lg shadow-emerald-500/20 active:scale-95 transition-all text-base"
            >
              تم، العودة للمحفظة
            </button>
          </div>
        )}

        {step === 'error' && (
          <div className="space-y-6 pt-4 animate-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-rose-500/10 text-rose-500 rounded-[28px] flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle size={40} />
            </div>

            <div>
              <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400">فشلت العملية</h3>
              <p className="text-slate-500 dark:text-slate-400 font-bold text-sm leading-relaxed mt-2">
                {errorMessage}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <button 
                onClick={() => setStep('tapping')}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-black py-5 rounded-[22px] active:scale-95 transition-all text-base"
              >
                إعادة المحاولة اللاتلامسية
              </button>
              <button 
                onClick={onClose}
                className="w-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold py-4 rounded-[22px] active:scale-95 transition-all text-sm"
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
