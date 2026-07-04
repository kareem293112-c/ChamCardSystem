import React, { useState } from 'react';

const SupportTicketView = () => {
  const [message, setMessage] = useState('');

  return (
    <div className="p-6 bg-slate-950 min-h-screen text-white">
      <h2 className="text-xl font-black mb-4">مركز الدعم</h2>
      <select className="w-full p-4 rounded-xl bg-slate-900 border border-slate-700 mb-2">
        <option>مشكلة تقنية</option>
        <option>اقتراح</option>
      </select>
      <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="شرح المشكلة" className="w-full p-4 rounded-xl bg-slate-900 border border-slate-700"></textarea>
      <button className="w-full mt-4 p-4 bg-emerald-600 text-white rounded-xl font-bold">إرسال</button>
    </div>
  );
};

export default SupportTicketView;
