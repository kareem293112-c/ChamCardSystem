import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, User, Phone, ShieldCheck, Calendar, Smartphone, Award, Hash } from 'lucide-react';
import { authStore } from '../../store/authStore';

const AccountInfoView = () => {
  const navigate = useNavigate();
  const session = authStore.getSession();
  const user = session?.user;
  const deviceId = authStore.getDeviceId();

  // Format date elegantly
  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'غير محدد';
    return new Date(timestamp).toLocaleDateString('ar-SY', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="p-6 bg-slate-950 min-h-screen text-white" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button 
          onClick={() => navigate('/profile')} 
          className="p-2 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 transition active:scale-95 text-slate-400 hover:text-white"
        >
          <ArrowRight size={20} />
        </button>
        <h2 className="text-xl font-black">معلومات الحساب والتسجيل</h2>
      </div>

      {/* Avatar Card */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-[32px] p-6 text-center mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl"></div>
        <div className="relative inline-block">
          <div className="w-24 h-24 rounded-[32px] border-4 border-slate-800 shadow-2xl mx-auto overflow-hidden ring-4 ring-emerald-500/10">
            <img src={user?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80"} alt="user avatar" className="w-full h-full object-cover" />
          </div>
          {user?.isVerified && (
            <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1.5 rounded-xl border-2 border-slate-900 shadow-lg">
              <ShieldCheck size={14} />
            </div>
          )}
        </div>
        <h3 className="text-lg font-black mt-4 text-white leading-tight">{user?.fullName || 'مستخدم غير معروف'}</h3>
        <span className="inline-block mt-2 bg-emerald-500/10 text-emerald-400 font-extrabold text-[10px] px-3 py-1.5 rounded-full border border-emerald-500/20">
          {user?.isVerified ? 'حساب وطني موثق' : 'حساب بانتظار التوثيق'}
        </span>
      </div>

      {/* Profile details grid */}
      <div className="space-y-4">
        {/* Full Name */}
        <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl flex items-center justify-between text-right">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-slate-400 border border-slate-800">
              <User size={18} />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-bold">الاسم الكامل</p>
              <p className="text-xs font-black text-white mt-1">{user?.fullName || 'غير محدد'}</p>
            </div>
          </div>
          <span className="text-[10px] text-slate-500 font-bold font-mono">Full Name</span>
        </div>

        {/* Phone Number */}
        <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl flex items-center justify-between text-right">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-slate-400 border border-slate-800">
              <Phone size={18} />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-bold">رقم الهاتف المسجل</p>
              <p className="text-xs font-black font-mono text-white mt-1" dir="ltr">{user?.phone || 'غير متوفر'}</p>
            </div>
          </div>
          <span className="text-[10px] text-slate-500 font-bold font-mono">Mobile</span>
        </div>

        {/* National ID */}
        <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl flex items-center justify-between text-right">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-slate-400 border border-slate-800">
              <Hash size={18} />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-bold">الرقم الوطني السوري</p>
              <p className="text-xs font-black font-mono text-white mt-1">{user?.nationalId || 'لم يتم الربط بالهوية الوطنية بعد'}</p>
            </div>
          </div>
          <span className="text-[10px] text-slate-500 font-bold font-mono">National ID</span>
        </div>

        {/* Registration Date */}
        <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl flex items-center justify-between text-right">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-slate-400 border border-slate-800">
              <Calendar size={18} />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-bold">تاريخ إنشاء الحساب</p>
              <p className="text-xs font-black text-white mt-1">{formatDate(user?.createdAt)}</p>
            </div>
          </div>
          <span className="text-[10px] text-slate-500 font-bold font-mono">Created At</span>
        </div>

        {/* Device Signature */}
        <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl flex items-center justify-between text-right">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-slate-400 border border-slate-800">
              <Smartphone size={18} />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-bold">معرف الجهاز النشط</p>
              <p className="text-xs font-black font-mono text-slate-400 mt-1">{deviceId}</p>
            </div>
          </div>
          <span className="text-[10px] text-slate-500 font-bold font-mono">Device ID</span>
        </div>

        {/* Account Type */}
        <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl flex items-center justify-between text-right">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-slate-400 border border-slate-800">
              <Award size={18} />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-bold">نوع ومستوى الحساب</p>
              <p className="text-xs font-black text-white mt-1">مواطن - بطاقة رقمية موحدة</p>
            </div>
          </div>
          <span className="text-[10px] text-slate-500 font-bold font-mono">Account Type</span>
        </div>
      </div>
    </div>
  );
};

export default AccountInfoView;
