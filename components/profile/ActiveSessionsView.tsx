import React from 'react';

const ActiveSessionsView = () => {
  return (
    <div className="p-6 bg-slate-950 min-h-screen text-white">
      <h2 className="text-xl font-black mb-4">سجل الأجهزة النشطة</h2>
      <div className="space-y-4">
        {/* Mock sessions */}
        <div className="p-4 bg-slate-900 rounded-xl flex justify-between items-center">
            <div>
                <p className="font-bold">iPhone 15 - Chrome</p>
                <p className="text-xs text-slate-400">192.168.1.1</p>
            </div>
            <button className="text-rose-500 font-bold text-xs">حظر الجلسة</button>
        </div>
      </div>
    </div>
  );
};

export default ActiveSessionsView;
