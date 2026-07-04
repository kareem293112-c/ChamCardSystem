import React, { useState } from 'react';

const ChangePinView = () => {
  const [current, setCurrent] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirm, setConfirm] = useState('');

  const handleSave = () => {
    if (newPin !== confirm) {
        alert("كلمات المرور غير متطابقة");
        return;
    }
    alert("تم تغيير الرمز بنجاح");
  };

  return (
    <div className="p-6 bg-slate-950 min-h-screen text-white">
      <h2 className="text-xl font-black mb-4">تغيير رمز المرور</h2>
      <input type="password" value={current} onChange={e => setCurrent(e.target.value)} placeholder="الرمز الحالي" className="w-full p-4 rounded-xl bg-slate-900 border border-slate-700 mb-2" />
      <input type="password" value={newPin} onChange={e => setNewPin(e.target.value)} placeholder="الرمز الجديد" className="w-full p-4 rounded-xl bg-slate-900 border border-slate-700 mb-2" />
      <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="تأكيد الرمز الجديد" className="w-full p-4 rounded-xl bg-slate-900 border border-slate-700" />
      <button onClick={handleSave} className="w-full mt-4 p-4 bg-emerald-600 text-white rounded-xl font-bold">حفظ</button>
    </div>
  );
};

export default ChangePinView;
