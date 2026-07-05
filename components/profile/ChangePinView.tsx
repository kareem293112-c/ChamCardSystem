import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const ChangePinView = () => {
  const [current, setCurrent] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const navigate = useNavigate();

  const handleSave = () => {
    if (!current || !newPin || !confirm) {
        alert("يرجى ملء جميع الحقول");
        return;
    }
    if (newPin.length < 4 || newPin.length > 6) {
        alert("يجب أن يتكون الرمز الجديد من 4 إلى 6 أرقام");
        return;
    }
    if (newPin !== confirm) {
        alert("تأكيد الرمز الجديد غير متطابق");
        return;
    }
    alert("تم تغيير رمز المرور بنجاح");
    navigate('/profile');
  };

  const handleNumericChange = (value: string, setter: (val: string) => void) => {
    setter(value.replace(/[^0-9]/g, ''));
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
        <h2 className="text-xl font-black">تغيير رمز المرور</h2>
      </div>

      <div className="space-y-4">
        <p className="text-xs text-slate-400 leading-relaxed">تغيير رمز PIN المكون من 4-6 أرقام لتأمين العمليات والدخول السريع لبطاقتك.</p>
        
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-2">الرمز الحالي</label>
          <input 
            type="password" 
            pattern="[0-9]*"
            inputMode="numeric"
            maxLength={6}
            value={current} 
            onChange={e => handleNumericChange(e.target.value, setCurrent)} 
            placeholder="الرمز الحالي" 
            className="w-full p-4 rounded-xl bg-slate-900 border border-slate-700 text-right text-sm font-bold tracking-widest placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition" 
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 mb-2">الرمز الجديد</label>
          <input 
            type="password" 
            pattern="[0-9]*"
            inputMode="numeric"
            maxLength={6}
            value={newPin} 
            onChange={e => handleNumericChange(e.target.value, setNewPin)} 
            placeholder="الرمز الجديد" 
            className="w-full p-4 rounded-xl bg-slate-900 border border-slate-700 text-right text-sm font-bold tracking-widest placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition" 
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 mb-2">تأكيد الرمز الجديد</label>
          <input 
            type="password" 
            pattern="[0-9]*"
            inputMode="numeric"
            maxLength={6}
            value={confirm} 
            onChange={e => handleNumericChange(e.target.value, setConfirm)} 
            placeholder="تأكيد الرمز الجديد" 
            className="w-full p-4 rounded-xl bg-slate-900 border border-slate-700 text-right text-sm font-bold tracking-widest placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition" 
          />
        </div>

        <button 
          onClick={handleSave} 
          className="w-full mt-4 p-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold active:scale-95 transition"
        >
          حفظ الرمز الجديد
        </button>
      </div>
    </div>
  );
};

export default ChangePinView;
