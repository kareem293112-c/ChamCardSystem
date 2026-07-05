import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const SupportTicketView = () => {
  const [category, setCategory] = useState('مشكلة تقنية');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleSend = () => {
    if (!message.trim()) {
      alert("يرجى كتابة تفاصيل المشكلة أولاً");
      return;
    }
    alert(`تم إرسال بطاقة الدعم بنجاح تحت تصنيف (${category})، سيقوم فريق الدعم بالتواصل معك قريباً.`);
    setMessage('');
    navigate('/profile');
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
        <h2 className="text-xl font-black">مركز الدعم والمساعدة</h2>
      </div>

      <div className="space-y-4">
        <p className="text-xs text-slate-400 leading-relaxed">تواجه مشكلة أو لديك استفسار؟ تواصل مع فريق الدعم الفني مباشرة وسنقوم بالرد عليك في أسرع وقت.</p>

        <div>
          <label className="block text-xs font-bold text-slate-400 mb-2">نوع الطلب أو الاستفسار</label>
          <select 
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="w-full p-4 rounded-xl bg-slate-900 border border-slate-700 text-right text-sm font-bold focus:outline-none focus:border-emerald-500 transition"
          >
            <option value="مشكلة تقنية">مشكلة تقنية في التطبيق</option>
            <option value="شحن معلق">مشكلة في تعبئة الرصيد</option>
            <option value="بطاقة ضائعة">فقدان البطاقة / قفل الحساب</option>
            <option value="اقتراح">اقتراح لتطوير الخدمة</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 mb-2">تفاصيل الرسالة</label>
          <textarea 
            value={message} 
            onChange={e => setMessage(e.target.value)} 
            placeholder="يرجى كتابة تفاصيل المشكلة أو استفسارك هنا بوضوح..." 
            rows={5}
            className="w-full p-4 rounded-xl bg-slate-900 border border-slate-700 text-right text-sm font-semibold placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition resize-none"
          />
        </div>

        <button 
          onClick={handleSend}
          className="w-full mt-4 p-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold active:scale-95 transition"
        >
          إرسال بطاقة الدعم
        </button>
      </div>
    </div>
  );
};

export default SupportTicketView;
