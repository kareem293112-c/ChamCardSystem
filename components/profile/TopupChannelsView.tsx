import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Wallet } from 'lucide-react';

const TopupChannelsView = () => {
  const navigate = useNavigate();

  return (
    <div className="p-6 bg-slate-950 min-h-screen text-white" dir="rtl">
      <div className="flex items-center gap-3 mb-6">
        <button 
          onClick={() => navigate('/profile')} 
          className="p-2 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 transition active:scale-95 text-slate-400 hover:text-white"
        >
          <ArrowRight size={20} />
        </button>
        <h2 className="text-xl font-black">قنوات الشحن والربط</h2>
      </div>

      <div className="space-y-4">
        <p className="text-xs text-slate-400 leading-relaxed">القنوات المعتمدة لتعبئة رصيد بطاقتك الرقمية وربط الحسابات البنكية.</p>
        
        <div className="space-y-3">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between text-right">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-500">
                <Wallet size={20} />
              </div>
              <div>
                <p className="font-bold text-sm">سيريتل كاش - Syriatel Cash</p>
                <p className="text-[10px] text-slate-400 mt-1">شحن رصيد فوري تلقائي</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between text-right">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-500">
                <Wallet size={20} />
              </div>
              <div>
                <p className="font-bold text-sm">كاش موبايل - MTN Cash</p>
                <p className="text-[10px] text-slate-400 mt-1">إرسال إشعار الدفع يدوياً</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopupChannelsView;
