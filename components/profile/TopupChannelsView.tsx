import React from 'react';

const TopupChannelsView = () => {
  return (
    <div className="p-6 bg-slate-950 min-h-screen text-white">
      <h2 className="text-xl font-black mb-4">قنوات الشحن والربط</h2>
      <div className="space-y-3">
        <a href="#" className="block p-4 bg-slate-900 rounded-xl font-bold text-emerald-400">شام كاش</a>
        <a href="#" className="block p-4 bg-slate-900 rounded-xl font-bold text-emerald-400">MTN Cash</a>
      </div>
    </div>
  );
};

export default TopupChannelsView;
