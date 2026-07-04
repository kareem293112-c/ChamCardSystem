import React, { useState } from 'react';

const VerifyIdView = () => {
  const [id, setId] = useState('');
  
  const handleVerify = async () => {
    if (id.length !== 11) {
      alert("الرقم الوطني يجب أن يتكون من 11 رقماً");
      return;
    }
    // API call placeholder
    alert("تم إرسال طلب التوثيق");
  };

  return (
    <div className="p-6 bg-slate-950 min-h-screen text-white">
      <h2 className="text-xl font-black mb-4">توثيق الحساب الوطني</h2>
      <input 
        type="text" 
        value={id}
        onChange={(e) => setId(e.target.value.replace(/[^0-9]/g, ''))}
        placeholder="أدخل الرقم الوطني (11 رقم)" 
        className="w-full p-4 rounded-xl bg-slate-900 border border-slate-700" 
      />
      <button 
        onClick={handleVerify}
        className="w-full mt-4 p-4 bg-emerald-600 text-white rounded-xl font-bold"
      >
        توثيق
      </button>
    </div>
  );
};

export default VerifyIdView;
