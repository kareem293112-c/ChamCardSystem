import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const ActiveSessionsView = () => {
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
        <h2 className="text-xl font-black">سجل الأجهزة النشطة</h2>
      </div>

      <div className="space-y-4">
        {/* Mock sessions */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex justify-between items-center text-right">
            <div>
                <p className="font-bold text-sm text-white">iPhone 15 - Chrome</p>
                <p className="text-xs text-slate-400 mt-1">192.168.1.1</p>
            </div>
            <button 
              onClick={() => alert("تم حظر الجلسة بنجاح وتوجيه طلب إنهاء الاتصال")}
              className="text-rose-500 hover:text-rose-400 font-bold text-xs bg-rose-500/10 hover:bg-rose-500/20 px-3 py-1.5 rounded-lg active:scale-95 transition"
            >
              حظر الجلسة
            </button>
        </div>
      </div>
    </div>
  );
};

export default ActiveSessionsView;
