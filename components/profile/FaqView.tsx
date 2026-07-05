import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';

const FaqView = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const navigate = useNavigate();

  const faqs = [
    { q: "كيف أقوم بشحن رصيد بطاقتي الرقمية؟", a: "يمكنك شحن رصيدك عبر سيريتل كاش أو كاش موبايل بشكل فوري، أو عبر زيارة أحد مراكزنا المعتمدة لتعبئة الرصيد عن طريق رقم البطاقة." },
    { q: "كيف أقوم بتفعيل ميزة الـ NFC لقراءة البطاقة؟", a: "إذا كان جهازك يدعم تقنية NFC، كل ما عليك فعله هو الضغط على زر الشحن المعلق أو 'تمرير البطاقة' ثم وضع البطاقة البلاستيكية خلف ظهر هاتفك مباشرة ليتم التعرف عليها وتحديث الرصيد فوراً." },
    { q: "لماذا يظهر رمز الاستجابة السريعة (QR) غير صالح؟", a: "تأكد من وجود اتصال كافٍ بالإنترنت لتحديث الرمز، أو استخدم التوقيع الرقمي غير المتصل (Offline Signature) الذي يعمل تماماً بدون الحاجة لإنترنت في خطوط النقل العامة." },
    { q: "ماذا أفعل في حال فقدت بطاقتي أو نسيت الرمز السري؟", a: "يمكنك فوراً الدخول إلى 'تغيير رمز المرور' لتحديث الرمز، أو مراجعة مركز الدعم الفني لإيقاف البطاقة القديمة وإصدار بديل رقمي آمن بنقرة واحدة." }
  ];

  return (
    <div className="p-6 bg-slate-950 min-h-screen text-white" dir="rtl">
      <div className="flex items-center gap-3 mb-6">
        <button 
          onClick={() => navigate('/profile')} 
          className="p-2 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 transition active:scale-95 text-slate-400 hover:text-white"
        >
          <ArrowRight size={20} />
        </button>
        <h2 className="text-xl font-black">الأسئلة الشائعة</h2>
      </div>

      <div className="space-y-3">
        {faqs.map((f, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl transition">
            <button 
              className="font-bold w-full text-right flex items-center justify-between text-sm leading-relaxed" 
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
            >
              <span>{f.q}</span>
              <span className="text-emerald-500">
                {openIndex === i ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </span>
            </button>
            {openIndex === i && (
              <p className="text-xs text-slate-400 mt-3 leading-relaxed border-t border-slate-800 pt-3">{f.a}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FaqView;
