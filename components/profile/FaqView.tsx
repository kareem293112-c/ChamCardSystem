import React, { useState } from 'react';

const FaqView = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    { q: "كيف أشحن البطاقة؟", a: "عن طريق قنوات الشحن..." },
    { q: "لماذا لا يعمل الماسح؟", a: "تأكد من إذن الكاميرا..." }
  ];

  return (
    <div className="p-6 bg-slate-950 min-h-screen text-white">
      <h2 className="text-xl font-black mb-4">الأسئلة الشائعة</h2>
      <div className="space-y-2">
        {faqs.map((f, i) => (
          <div key={i} className="bg-slate-900 p-4 rounded-xl">
            <button className="font-bold w-full text-right" onClick={() => setOpenIndex(openIndex === i ? null : i)}>{f.q}</button>
            {openIndex === i && <p className="text-xs text-slate-400 mt-2">{f.a}</p>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FaqView;
