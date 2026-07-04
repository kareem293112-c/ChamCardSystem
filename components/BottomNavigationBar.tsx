
import React from 'react';
import { Home, CreditCard, User, QrCode, Search } from 'lucide-react';
import { View } from '../types';

interface Props {
  activeView: View;
  onNavigate: (view: View) => void;
}

const BottomNavigationBar: React.FC<Props> = ({ activeView, onNavigate }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 pb-safe pt-2 px-2 flex justify-around items-center h-20 z-50">
      <button onClick={() => onNavigate('home')} className={`flex flex-col items-center gap-1 p-2 ${activeView === 'home' ? 'text-emerald-600' : 'text-slate-400'}`}>
        <Home size={24} />
        <span className="text-[10px] font-bold">الرئيسية</span>
      </button>
      <button onClick={() => onNavigate('cards')} className={`flex flex-col items-center gap-1 p-2 ${activeView === 'cards' ? 'text-emerald-600' : 'text-slate-400'}`}>
        <CreditCard size={24} />
        <span className="text-[10px] font-bold">بطاقاتي</span>
      </button>
      
      {/* Centered Elevated FAB */}
      <div className="relative -top-6">
        <button 
          onClick={() => onNavigate('qr_payment')} 
          className="bg-emerald-600 text-white w-16 h-16 rounded-full flex items-center justify-center shadow-lg border-4 border-white dark:border-slate-900 active:scale-95 transition-all"
        >
          <QrCode size={32} />
        </button>
      </div>

      <button onClick={() => onNavigate('transactions_history')} className={`flex flex-col items-center gap-1 p-2 ${activeView === 'transactions_history' ? 'text-emerald-600' : 'text-slate-400'}`}>
        <Search size={24} />
        <span className="text-[10px] font-bold">سجل العبور</span>
      </button>
      <button onClick={() => onNavigate('profile')} className={`flex flex-col items-center gap-1 p-2 ${activeView === 'profile' ? 'text-emerald-600' : 'text-slate-400'}`}>
        <User size={24} />
        <span className="text-[10px] font-bold">الحساب</span>
      </button>
    </div>
  );
};

export default BottomNavigationBar;
