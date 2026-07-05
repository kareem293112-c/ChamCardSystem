
import React, { useState, useEffect, Suspense } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { 
  LogOut, ChevronLeft, ShieldCheck, 
  Shield, Bell, HelpCircle, Heart, MapPin, Bus, Navigation, TrainFront, Bike, Footprints, X, Check, MapPinned, Moon, Sun,
  Smartphone, Key, Info, MessageCircle, CreditCard, Loader2, User
} from 'lucide-react';
import { UserData, SavedRoute, AppAction } from '../types';

interface Props {
  user: UserData | null;
  dispatch: (action: AppAction) => void;
  getPermission: (action: AppAction) => { allowed: boolean; reason?: string };
  onSelectRoute?: (route: { from: string, to: string }) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onNotify?: () => void;
}

const transportIcons = [
  { id: 'MapPin', icon: <MapPin size={14} /> },
  { id: 'Bus', icon: <Bus size={14} /> },
  { id: 'Navigation', icon: <Navigation size={14} /> },
  { id: 'Train', icon: <TrainFront size={14} /> },
  { id: 'Bike', icon: <Bike size={14} /> },
  { id: 'Walk', icon: <Footprints size={14} /> },
];

const Profile: React.FC<Props> = ({ user, dispatch, getPermission, onSelectRoute, isDarkMode, onToggleDarkMode, onNotify }) => {
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const isMainMenu = location.pathname === '/profile' || location.pathname === '/profile/';

  useEffect(() => {
    const saved = localStorage.getItem('user_routes');
    if (saved) setSavedRoutes(JSON.parse(saved));
  }, []);

  const getIconById = (id?: string) => {
    const found = transportIcons.find(ti => ti.id === id);
    return found ? found.icon : <MapPin size={14} />;
  };

  return (
    <div className="p-6 pb-40 space-y-6 animate-in fade-in duration-500 relative bg-slate-50 dark:bg-slate-950 min-h-screen">
      {isMainMenu ? (
        <>
          {/* الرأس: الصورة والاسم */}
          <div className="text-center pt-10">
            <div className="relative inline-block">
              <div className="w-28 h-28 rounded-[40px] border-4 border-white dark:border-slate-800 shadow-2xl mx-auto overflow-hidden ring-8 ring-emerald-50 dark:ring-emerald-900/10">
                <img src={user?.avatar} alt="user" className="w-full h-full object-cover" />
              </div>
              {user?.isVerified && (
                <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-2 rounded-2xl border-4 border-white dark:border-slate-900 shadow-lg">
                  <ShieldCheck size={16} />
                </div>
              )}
            </div>
            <h2 className="text-2xl font-black mt-6 dark:text-white leading-tight">{user?.fullName}</h2>
            <p className="text-emerald-600 text-[10px] font-black uppercase tracking-[0.2em] mt-2 text-center">حساب موثق وطني</p>
          </div>

          <div className="space-y-4">
            {/* الوضع الليلي */}
            <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
              <div className="p-5 flex items-center justify-between transition-colors text-right">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-blue-500 border border-slate-100 dark:border-slate-700">
                    {isDarkMode ? <Moon size={22} /> : <Sun size={22} />}
                  </div>
                  <div className="text-right">
                    <p className="font-black text-sm dark:text-white leading-none">الوضع الليلي</p>
                    <p className="text-[10px] text-slate-400 font-bold mt-1.5">تبديل مظهر التطبيق</p>
                  </div>
                </div>
                <button 
                  onClick={onToggleDarkMode}
                  className={`w-12 h-6.5 rounded-full relative transition-all duration-500 p-1 ${isDarkMode ? 'bg-emerald-600' : 'bg-slate-200 dark:bg-slate-700'}`}>
                  <div className={`w-4.5 h-4.5 bg-white rounded-full shadow-md transition-all duration-500 ${isDarkMode ? 'translate-x-5.5' : 'translate-x-0'}`}></div>
                </button>
              </div>
            </div>

            {/* القائمة الجديدة */}
            <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
              <MenuLink onClick={() => navigate('/profile/account-info')} icon={<User />} label="معلومات الحساب والتسجيل" sub="الاسم، الرقم والتفاصيل" />
              <MenuLink onClick={() => navigate('/profile/verify-id')} icon={<ShieldCheck />} label="توثيق الحساب الوطني" sub="تأكيد الهوية" />
              <MenuLink onClick={() => navigate('/profile/active-sessions')} icon={<Smartphone />} label="سجل الأجهزة النشطة" sub="الأجهزة المتصلة" />
              <MenuLink onClick={() => navigate('/profile/change-pin')} icon={<Key />} label="تغيير رمز المرور" sub="تأمين الحساب" />
              <MenuLink onClick={() => navigate('/profile/topup-channels')} icon={<CreditCard />} label="قنوات الشحن والربط" sub="طرق الدفع" />
              <MenuLink onClick={() => navigate('/profile/compliance')} icon={<Info />} label="الاتفاقيات والقانون" sub="سياسة الخصوصية" />
              <MenuLink onClick={() => navigate('/profile/faq')} icon={<HelpCircle />} label="الأسئلة الشائعة" sub="مساعدة ودعم" />
              <MenuLink onClick={() => navigate('/profile/support-ticket')} icon={<MessageCircle />} label="مركز الدعم" sub="تواصل معنا" />
            </div>

            {/* زر تسجيل الخروج */}
            <button 
              onClick={() => dispatch('PERFORM_LOGOUT')}
              className="w-full bg-rose-50 dark:bg-rose-950/20 text-rose-600 py-5 rounded-[28px] font-black flex items-center justify-center gap-3 active:scale-95 transition-all shadow-sm border border-rose-100 dark:border-rose-900/10">
              <LogOut size={20} />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </>
      ) : (
        <Suspense fallback={
          <div className="flex items-center justify-center h-screen text-emerald-600">
            <Loader2 className="animate-spin w-8 h-8" />
          </div>
        }>
          <Outlet />
        </Suspense>
      )}
    </div>
  );
};

const MenuLink = ({ icon, label, sub, onClick }: any) => (
  <button 
    onClick={onClick}
    className="w-full p-5 flex items-center justify-between transition-all text-right group active:bg-slate-50 dark:active:bg-slate-800/50">
    <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-100 dark:border-slate-700">
          {React.cloneElement(icon, { size: 22, strokeWidth: 2.5 })}
        </div>
        <div className="text-right">
          <p className="font-black text-sm dark:text-white leading-none">{label}</p>
          <p className="text-[10px] text-slate-400 font-bold mt-1.5">{sub}</p>
        </div>
    </div>
    <ChevronLeft size={16} className="text-slate-300 group-hover:translate-x-[-4px] transition-transform" />
  </button>
);

export default Profile;
