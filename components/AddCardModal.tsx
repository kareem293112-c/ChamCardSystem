
import React, { useState } from 'react';
import { X, Smartphone, Wifi, CreditCard, ChevronRight, Loader2, CheckCircle2 } from 'lucide-react';
import { Card } from '../types';
import { NFCService } from '../services/nfcService';

interface Props {
  onClose: () => void;
  onAdd: (card: Card) => void;
}

const AddCardModal: React.FC<Props> = ({ onClose, onAdd }) => {
  const [step, setStep] = useState<'selection' | 'scanning' | 'details'>('selection');
  const [cardType, setCardType] = useState<'digital' | 'physical'>('digital');
  const [loading, setLoading] = useState(false);
  const [alias, setAlias] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'general' | 'student' | 'social' | 'free'>('general');

  const handleDigitalInit = () => {
    setCardType('digital');
    setStep('details');
  };

  const handlePhysicalInit = async () => {
    setCardType('physical');
    setStep('scanning');
    setLoading(true);
    
    try {
      // Simulate NFC sequence
      const nfcCard = await NFCService.scanCard();
      if (nfcCard && nfcCard.status === 'uninitialized') {
        await NFCService.initializeNewCard(nfcCard.uid);
      }
      setLoading(false);
      setStep('details');
    } catch (e) {
      setLoading(false);
      setStep('selection');
    }
  };

  const handleFinalize = () => {
    const categoryNames: Record<string, string> = {
      general: 'البطاقة العامة',
      student: 'بطاقة الطالب الرقمية',
      social: 'بطاقة الموظف الرقمية',
      free: 'بطاقة العبور المجاني'
    };
    
    const categoryThemes: Record<string, string> = {
      general: 'rose',
      student: 'blue',
      social: 'emerald',
      free: 'amber'
    };

    const newCard: Card = {
      id: Math.random().toString(36).substr(2, 9),
      alias: alias || (cardType === 'digital' ? categoryNames[selectedCategory] : `بطاقة شام فيزيائية (${categoryNames[selectedCategory]})`),
      cardNumber: `9630 ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)}`,
      balance: 0,
      type: cardType,
      themeColor: categoryThemes[selectedCategory] || 'rose',
      category: selectedCategory
    };
    onAdd(newCard);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-[600] flex items-end justify-center backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-t-[48px] p-8 animate-in slide-in-from-bottom duration-500 shadow-2xl relative">
        
        <button 
          onClick={onClose}
          className="absolute top-8 right-8 w-10 h-10 bg-slate-100 dark:bg-slate-700 text-slate-400 rounded-full flex items-center justify-center active:scale-90 transition"
        >
          <X size={20} />
        </button>

        <div className="text-right mt-4 mb-8">
          <h2 className="text-2xl font-black dark:text-white">إضافة بطاقة جديدة</h2>
          <p className="text-slate-400 font-bold text-sm mt-1">اختر الطريقة التي تفضلها للربط</p>
        </div>

        {step === 'selection' && (
          <div className="space-y-4">
            <button 
              onClick={handleDigitalInit}
              className="w-full group bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-[32px] border-2 border-emerald-100 dark:border-emerald-800 flex items-center justify-between hover:bg-emerald-100 transition active:scale-[0.98]"
            >
              <ChevronRight className="text-emerald-300 group-hover:text-emerald-500 transition" />
              <div className="flex items-center gap-4 text-right">
                <div>
                  <h4 className="font-black text-emerald-900 dark:text-emerald-400">إصدار بطاقة رقمية</h4>
                  <p className="text-[10px] text-emerald-700/60 font-bold">جاهزة للاستخدام فوراً عبر QR</p>
                </div>
                <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm">
                  <Smartphone size={28} />
                </div>
              </div>
            </button>
          </div>
        )}

        {step === 'scanning' && (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-6">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping"></div>
              <div className="relative w-32 h-32 bg-blue-600 rounded-full flex items-center justify-center shadow-xl">
                <Wifi size={48} className="text-white animate-pulse" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-black dark:text-white">جاري البحث عن بطاقة...</h3>
              <p className="text-sm text-slate-400 font-bold mt-2">ضع البطاقة خلف الهاتف وتحسس موقع الحساس</p>
            </div>
          </div>
        )}

        {step === 'details' && (
          <div className="space-y-6 animate-in fade-in duration-500">
             <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-[32px] border border-slate-100 dark:border-slate-800 text-center flex items-center gap-4 text-right">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h3 className="font-black text-sm dark:text-white leading-none">تم التحقق من البطاقة</h3>
                  <p className="text-[11px] text-slate-400 font-bold mt-1">البطاقة جاهزة للربط بحسابك</p>
                </div>
             </div>

             <div className="space-y-3 text-right">
                <label className="text-xs font-black text-slate-400 mr-4">فئة التعرفة / نوع البطاقة</label>
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('general')}
                    className="w-full p-4 rounded-2xl border-2 text-right transition-all flex items-center justify-between h-20 border-rose-500 bg-rose-500/5 text-rose-700 dark:text-rose-400 outline-none"
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-black">العامة (شام الحمراء)</span>
                      <span className="text-[10px] opacity-75 mt-1">1,000 ل.س / رحلة</span>
                    </div>
                    <span className="text-xs bg-rose-500 text-white font-extrabold px-3 py-1.5 rounded-xl">نشطة</span>
                  </button>
                </div>
             </div>

             <div className="space-y-2 text-right">
                <label className="text-xs font-black text-slate-400 mr-4">تسمية البطاقة (اختياري)</label>
                <input 
                  type="text" 
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  placeholder="مثال: بطاقتي المدرسية"
                  className="w-full bg-slate-50 dark:bg-slate-700 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none text-right dark:text-white"
                />
             </div>

             <button 
               onClick={handleFinalize}
               className="w-full bg-emerald-600 text-white font-black py-5 rounded-[24px] shadow-xl shadow-emerald-200 dark:shadow-none active:scale-95 transition flex items-center justify-center gap-3"
             >
               إتمام الربط الآن
             </button>
          </div>
        )}

        <div className="h-10"></div>
      </div>
    </div>
  );
};

export default AddCardModal;
