
import React from 'react';
import { QrCode, Wifi, Wallet, ArrowRightLeft, RefreshCw, Search } from 'lucide-react';
import { AppAction } from '../types';

interface Props {
  dispatch: (action: AppAction) => void;
  getPermission: (action: AppAction) => { allowed: boolean; reason?: string };
}

const QuickActions: React.FC<Props> = ({ dispatch, getPermission }) => {
  const actions: { id: AppAction; icon: React.ReactNode; label: string; color: string }[] = [
    { 
      id: 'PAY_QR', 
      icon: <QrCode />, 
      label: "دفع QR", 
      color: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-100"
    },
    { 
      id: 'TRANSFER_FUNDS', 
      icon: <ArrowRightLeft />, 
      label: "تحويل", 
      color: "bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border-purple-100"
    },
    { 
      id: 'TOP_UP_BALANCE', 
      icon: <Wallet />, 
      label: "شحن رصيد", 
      color: "bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border-orange-100"
    },
  ];

  return (
    <div className="px-6 grid grid-cols-3 gap-y-8 gap-x-4">
      {actions.map((action, idx) => {
        const { allowed } = getPermission(action.id);
        return (
          <button 
            key={idx} 
            onClick={() => dispatch(action.id)}
            disabled={!allowed}
            className={`flex flex-col items-center gap-3 transition-all
              ${allowed 
                ? 'active:scale-90 group' 
                : 'opacity-40 grayscale cursor-not-allowed'
              }`}
          >
            <div className={`w-[68px] h-[68px] rounded-[24px] flex items-center justify-center transition-all border-2 shadow-sm ${action.color}`}>
              {React.cloneElement(action.icon as React.ReactElement<any>, { size: 28, strokeWidth: 2.5 })}
            </div>
            <span className="text-[12px] font-black text-slate-700 dark:text-slate-200 tracking-tight text-center leading-none">
              {action.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default QuickActions;
