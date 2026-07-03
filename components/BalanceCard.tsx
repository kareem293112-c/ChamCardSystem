
import React from 'react';
import { Card, AppAction } from '../types';
import { PlusCircle, CreditCard, Cpu } from 'lucide-react';

interface Props {
  card: Card | null;
  dispatch: (action: AppAction) => void;
  getPermission: (action: AppAction) => { allowed: boolean };
}

const BalanceCard: React.FC<Props> = ({ card, dispatch, getPermission }) => {
  if (!card) {
    return (
      <div className="px-6 animate-in fade-in duration-700">
        <div className="bg-slate-100 dark:bg-slate-900 rounded-[48px] p-16 text-center border-4 border-dashed border-slate-200 dark:border-slate-800">
          <CreditCard className="mx-auto w-14 h-14 text-slate-300 dark:text-slate-700 mb-6 animate-pulse" />
          <p className="text-slate-400 font-black text-sm uppercase tracking-widest">لا توجد بطاقة نشطة</p>
        </div>
      </div>
    );
  }



  const themes: Record<string, string> = {
    emerald: 'from-[#065f46] via-[#059669] to-[#10b981]',
    blue: 'from-[#1e3a8a] via-[#3b82f6] to-[#60a5fa]',
    rose: 'from-[#9f1239] via-[#e11d48] to-[#fb7185]',
    amber: 'from-[#92400e] via-[#d97706] to-[#fbbf24]'
  };

  const currentTheme = themes[card.themeColor || 'emerald'];
  const topUpAllowed = getPermission('TOP_UP_BALANCE').allowed;

  return (
    <div className="px-6">
      <div className={`bg-gradient-to-br ${currentTheme} rounded-[48px] p-8 shadow-[0_30px_70px_rgba(0,0,0,0.3)] relative overflow-hidden group transition-all duration-700 border border-white/20 active:scale-[0.98]`}>
        
        <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full -mr-36 -mt-36 blur-[100px] group-hover:scale-150 transition-all duration-1000"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full -ml-24 -mb-24 blur-[80px]"></div>
        
        <div className="relative z-10">
          {/* Header Section: Type and Card Name */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex-1 text-right">
              <div className="flex flex-col items-end gap-1 mb-4">
                <div className="flex items-center gap-2">
                  <div className="bg-black/20 backdrop-blur-md text-[9px] font-black text-white px-3 py-1 rounded-xl border border-white/10 shadow-sm">
                    {card.type === 'digital' ? 'بطاقة رقمية' : 'بطاقة فيزيائية'}
                  </div>
                  <span className="text-white/60 text-[10px] font-black uppercase tracking-[0.2em]">{card.alias}</span>
                </div>
                <span className="text-white/40 text-[9px] font-black uppercase tracking-widest mt-1">بطاقتي الشهرية</span>
              </div>
              
              <div className="flex items-baseline gap-2 justify-end">
                <span className="text-sm font-bold text-white/50 uppercase">ل.س</span>
                <h2 className="text-white text-5xl font-black tracking-tighter drop-shadow-xl">
                  {card.balance.toLocaleString()}
                </h2>
              </div>
            </div>
          </div>

          <div className="text-center mb-6">
            <p className="text-white/20 text-[8px] font-black tracking-[0.5em] uppercase">ق م ل ج ب ا ب ل ق ي</p>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex flex-col gap-1 text-right">
              <div className="text-white/90 text-sm tracking-[0.3em] font-mono bg-black/20 px-4 py-2 rounded-2xl border border-white/10 backdrop-blur-md">
                {card.cardNumber.slice(0, 4)} •••• {card.cardNumber.slice(-4)}
              </div>
            </div>

            <button 
              onClick={() => dispatch('TOP_UP_BALANCE')}
              disabled={!topUpAllowed}
              className={`font-black py-4 px-8 rounded-full text-sm flex items-center gap-2.5 transition-all
                ${topUpAllowed 
                  ? 'bg-white text-slate-900 shadow-2xl hover:scale-105 active:scale-95' 
                  : 'bg-white/20 text-white/40 cursor-not-allowed grayscale'
                }`}
            >
              <PlusCircle size={20} className={topUpAllowed ? "text-emerald-600" : ""} />
              تعبئة
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BalanceCard;
