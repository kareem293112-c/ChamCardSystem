import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck } from 'lucide-react';

const ComplianceView = () => {
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
        <h2 className="text-xl font-black">الاتفاقيات والقانون</h2>
      </div>

      <div className="space-y-6">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-start gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500 mt-1">
            <ShieldCheck size={18} />
          </div>
          <div>
            <h4 className="font-bold text-sm">سياسة حماية الخصوصية والبيانات</h4>
            <p className="text-xs text-slate-400 leading-relaxed mt-1.5">
              تلتزم بطاقة الشام الرقمية بحماية سرية وخصوصية كافة بيانات المستخدمين والهوية الوطنية. يتم تشفير جميع الجلسات وحركات المرور بأحدث معايير الأمان لمنع أي اختراقات أو تسريبات.
            </p>
          </div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-start gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500 mt-1">
            <ShieldCheck size={18} />
          </div>
          <div>
            <h4 className="font-bold text-sm">شروط استخدام المحفظة الرقمية</h4>
            <p className="text-xs text-slate-400 leading-relaxed mt-1.5">
              يُحظر استخدام البطاقة لأي عمليات دفع وهمية أو تلاعب مالي. جميع التعاملات تخضع لمراقبة دورية لضمان سلامة التعاملات والامتثال التام للأنظمة والتعليمات المصرفية المحلية.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComplianceView;
