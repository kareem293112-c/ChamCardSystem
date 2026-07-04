
import React from 'react';

const Compliance: React.FC = () => {
  return (
    <div className="p-6 bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-800">
      <h2 className="text-xl font-black mb-4 dark:text-white">الاتفاقيات والقانون</h2>
      <div className="prose dark:prose-invert text-xs leading-relaxed text-slate-600 dark:text-slate-400">
        <p>تفاصيل سياسة الخصوصية، وقوانين أمن البيانات، ومسؤولية النظام أثناء الانقطاع عن الشبكة.</p>
        {/* Add more legal content here */}
      </div>
    </div>
  );
};

export default Compliance;
