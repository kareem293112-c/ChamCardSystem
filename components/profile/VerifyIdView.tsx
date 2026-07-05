import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const VerifyIdView = () => {
  const [id, setId] = useState('');
  const navigate = useNavigate();
  
  const handleVerify = async () => {
    if (id.length !== 11) {
      alert("الرقم الوطني يجب أن يتكون من 11 رقماً");
      return;
    }
    // API call placeholder
    alert("تم إرسال طلب التوثيق");
  };

  return (
    <div className="p-6 bg-slate-950 min-h-screen text-white" dir="rtl">
      <div className="flex items-center gap-3 mb-6">
        <button 
          onClick={() => navigate('/profile')} 
          className="p-2 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 transition active:scale-95 text-slate-400 hover:text-white"
        >
          <ArrowRight size={20} />
        </button>
        <h2 className="text-xl font-black">توثيق الحساب الوطني</h2>
      </div>

      <div className="space-y-4">
        <p className="text-xs text-slate-400 leading-relaxed">يرجى إدخال الرقم الوطني المكون من 11 رقماً لتفعيل جميع ميزات بطاقة الشام الرقمية.</p>
        <input 
          type="text" 
          value={id}
          onChange={(e) => setId(e.target.value.replace(/[^0-9]/g, ''))}
          placeholder="أدخل الرقم الوطني (11 رقم)" 
          className="w-full p-4 rounded-xl bg-slate-900 border border-slate-700 text-right text-sm font-bold tracking-wider placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition" 
        />
        <button 
          onClick={handleVerify}
          className="w-full mt-4 p-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold active:scale-95 transition"
        >
          إرسال طلب التوثيق
        </button>
      </div>
    </div>
  );
};

export default VerifyIdView;
