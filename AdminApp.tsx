import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  CreditCard, 
  ShieldCheck, 
  Check, 
  X, 
  Search, 
  Plus, 
  Trash2, 
  LogOut, 
  Coins, 
  Clock, 
  AlertCircle, 
  Filter, 
  Eye,
  CheckCircle,
  RefreshCw,
  Printer,
  Download,
  Bus,
  FileText,
  Key,
  Shield,
  Compass
} from 'lucide-react';

interface UserData {
  fullName: string;
  phone: string;
  nationalId?: string;
  isVerified: boolean;
  avatar: string;
  createdAt: number;
}

interface Card {
  id: string;
  userId: string;
  alias: string;
  cardNumber: string;
  balance: number;
  type: 'digital' | 'physical';
  status: 'active' | 'blocked';
  themeColor: string;
  category: string;
}

interface RechargeRequest {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  receiptImage: string;
  paymentMethod?: string;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: number;
}

interface BusTrip {
  id: string;
  routeId: string;
  routeName: string;
  routeCode: string;
  ticketPrice: number;
  ownerName: string;
  plateNumber: string;
  tripCode: string;
  password: string;
  status: 'active' | 'completed';
  createdAt: number;
}

const DEFAULT_BUSES = [
  { id: 'bus_M1', route_name: 'ميكرو البرامكة - المزة جبل (خط داخلي قصير)', ticket_price: 1000, route_code: 'M1' },
  { id: 'bus_B2', route_name: 'باص باب توما - ركن الدين (دائري)', ticket_price: 1000, route_code: 'B2' },
  { id: 'bus_H3', route_name: 'خط المزة أوتوستراد - السومرية السريع', ticket_price: 2500, route_code: 'H3' },
  { id: 'bus_L5', route_name: 'ميكرو الجسر الأبيض - المهاجرين', ticket_price: 1000, route_code: 'L5' }
];

export default function AdminApp() {
  const [activeTab, setActiveTab] = useState<'overview' | 'cards' | 'recharge' | 'reports' | 'fleet'>('overview');
  const [users, setUsers] = useState<UserData[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [rechargeRequests, setRechargeRequests] = useState<RechargeRequest[]>([]);
  const [trips, setTrips] = useState<BusTrip[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Reports & Financial Data
  const [reportData, setReportData] = useState<any>(null);
  const [loadingReport, setLoadingReport] = useState<boolean>(false);

  // Card Creation Form
  const [newCardNumber, setNewCardNumber] = useState('');
  const [newCardAlias, setNewCardAlias] = useState('');
  const [newCardBalance, setNewCardBalance] = useState('5000');
  const [newCardType, setNewCardType] = useState<'digital' | 'physical'>('digital');
  const [newCardUserPhone, setNewCardUserPhone] = useState('');

  // Trip Creation Form
  const [ownerName, setOwnerName] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [customRouteName, setCustomRouteName] = useState('');
  const [customVehicleType, setCustomVehicleType] = useState('ميكرو باص');
  const [customPrice, setCustomPrice] = useState('1500');
  const [generatedTrip, setGeneratedTrip] = useState<BusTrip | null>(null);

  // Image Zoom Modal
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  // Toast System
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const triggerToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Auth Session Helper
  const getSessionToken = () => {
    const raw = localStorage.getItem('cham_admin_session');
    if (!raw) return '';
    try {
      return JSON.parse(raw).token || '';
    } catch {
      return '';
    }
  };

  const getHeaders = useCallback(() => {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getSessionToken()}`
    };
  }, []);

  // Fetch All Admin Data
  const loadAdminData = useCallback(async () => {
    setLoading(true);
    const headers = getHeaders();
    try {
      // 1. Fetch Users
      const usersRes = await fetch('/api/admin/users', { headers });
      if (usersRes.status === 401 || usersRes.status === 403) {
        window.location.href = '/admin-login';
        return;
      }
      const usersData = await usersRes.json();
      setUsers(Array.isArray(usersData) ? usersData : []);

      // 2. Fetch Cards
      const cardsRes = await fetch('/api/admin/cards', { headers });
      const cardsData = await cardsRes.json();
      setCards(Array.isArray(cardsData) ? cardsData : []);

      // 3. Fetch Recharge Requests
      const reqRes = await fetch('/api/recharge-requests', { headers });
      const reqData = await reqRes.json();
      setRechargeRequests(Array.isArray(reqData) ? reqData : []);

      // 4. Fetch Bus Trips (Fleet)
      const fleetRes = await fetch('/api/admin/fleet/trips', { headers });
      if (fleetRes.ok) {
        const fleetData = await fleetRes.json();
        setTrips(Array.isArray(fleetData) ? fleetData : []);
      }

    } catch (err) {
      console.error("Failed loading admin data:", err);
      triggerToast("فشل الاتصال بالخادم الرئيسي لتحديث البيانات.", "error");
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  // Load Financial Report
  const loadReportData = useCallback(async () => {
    setLoadingReport(true);
    const headers = getHeaders();
    try {
      const res = await fetch('/api/admin/financial-report', { headers });
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
      } else {
        triggerToast("فشل جلب أرقام التقارير المالية من المخدم الموثق.", "error");
      }
    } catch (err) {
      console.error("Error loading reports", err);
      triggerToast("خطأ غير متوقع عند جلب التقارير المالية.", "error");
    } finally {
      setLoadingReport(false);
    }
  }, [getHeaders]);

  useEffect(() => {
    if (activeTab === 'overview' || activeTab === 'reports') {
      loadReportData();
    }
  }, [activeTab, loadReportData]);

  // Create Card
  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardNumber || !newCardAlias || !newCardUserPhone) {
      triggerToast("يرجى تعبئة كافة حقول كرت البطاقة المطلوب.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/cards/create', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          cardNumber: newCardNumber.trim(),
          alias: newCardAlias.trim(),
          userPhone: newCardUserPhone.trim(),
          balance: Number(newCardBalance || 0),
          type: newCardType
        })
      });

      if (res.ok) {
        triggerToast("تم إنشاء وتخصيص البطاقة برقمها التسلسلي بنجاح!", "success");
        setNewCardNumber('');
        setNewCardAlias('');
        setNewCardBalance('5000');
        setNewCardUserPhone('');
        loadAdminData();
      } else {
        const err = await res.json();
        triggerToast(err.message || "فشل إنشاء البطاقة.", "error");
      }
    } catch (err) {
      triggerToast("حدث خطأ أثناء الاتصال بالخادم.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Block (Freeze/Unfreeze)
  const handleToggleBlock = async (cardId: string) => {
    try {
      const res = await fetch(`/api/admin/cards/${cardId}/toggle-block`, {
        method: 'POST',
        headers: getHeaders()
      });

      if (res.ok) {
        const data = await res.json();
        triggerToast(data.message || "تم تغيير حالة تجميد البطاقة بنجاح.", "success");
        loadAdminData();
      } else {
        triggerToast("فشل معالجة تغيير حالة البطاقة.", "error");
      }
    } catch (err) {
      triggerToast("خطأ في الاتصال بالشبكة الموثقة.", "error");
    }
  };

  // Create Bus Trip
  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerName || !plateNumber || !customRouteName || !customVehicleType || !customPrice) {
      triggerToast("يرجى ملء جميع حقول الإدخال الحرة والمخصصة لبث الرحلة.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/fleet/create', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          ownerName: ownerName.trim(),
          plateNumber: plateNumber.trim(),
          routeName: customRouteName.trim(),
          routeCode: customVehicleType.trim(),
          ticketPrice: Number(customPrice)
        })
      });

      if (res.ok) {
        const data = await res.json();
        setGeneratedTrip(data.trip);
        triggerToast("تم تسجيل الباص المخصص وتوليد كود الرحلة السري بنجاح!", "success");
        setOwnerName('');
        setPlateNumber('');
        setCustomRouteName('');
        setCustomPrice('1500');
        loadAdminData();
      } else {
        triggerToast("فشل تسجيل الحافلة وتوليد الرحلة المخصصة.", "error");
      }
    } catch (err) {
      triggerToast("خطأ غير متوقع بالاتصال بالشبكة.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Approve Request
  const handleApprove = async (id: string) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/recharge-requests/${id}/approve`, {
        method: 'POST',
        headers: getHeaders()
      });
      if (res.ok) {
        triggerToast("تمت الموافقة على طلب الشحن وشحن رصيد العميل فوراً بنجاح!", "success");
        loadAdminData();
      } else {
        const err = await res.json();
        triggerToast(err.message || "فشل الموافقة على طلب الشحن.", "error");
      }
    } catch (err) {
      triggerToast("خطأ غير متوقع بالاتصال بالخادم.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Reject Request
  const handleReject = async (id: string) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/recharge-requests/${id}/reject`, {
        method: 'POST',
        headers: getHeaders()
      });
      if (res.ok) {
        triggerToast("تم رفض طلب الشحن المعلق بنجاح.", "success");
        loadAdminData();
      } else {
        const err = await res.json();
        triggerToast(err.message || "فشل معالجة رفض الطلب.", "error");
      }
    } catch (err) {
      triggerToast("خطأ غير متوقع بالاتصال بالخادم.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Export financial statistics to Excel/CSV with Arabic UTF-8 BOM
  const exportToExcel = () => {
    if (!reportData) return;
    try {
      let csvContent = "\ufeff"; // UTF-8 BOM to prevent Excel display corruption
      csvContent += "تقرير الإيرادات المالي الشامل - شام كارت\n";
      csvContent += `تاريخ التصدير,${new Date().toLocaleString('ar-SY')}\n\n`;

      csvContent += "أولاً: ملخص المؤشرات المالية والنظام\n";
      csvContent += `إجمالي إيرادات خطوط الباصات,${reportData.totalBusRevenue} ل.س\n`;
      csvContent += `إجمالي تذاكر عبور QR الناجحة,${reportData.totalTransactionsCount} عملية\n`;
      csvContent += `إجمالي المبالغ المشحونة المعتمدة,${reportData.rechargeStats?.approvedAmount || 0} ل.س\n`;
      csvContent += `عدد طلبات الشحن المعتمدة,${reportData.rechargeStats?.approvedCount || 0} طلب\n`;
      csvContent += `عدد طلبات الشحن المعلقة بانتظار المشرف,${reportData.rechargeStats?.pendingCount || 0} طلب\n`;
      csvContent += `إجمالي المستخدمين المسجلين في التطبيق,${reportData.systemStats?.totalUsers || 0} مستخدم\n`;
      csvContent += `إجمالي البطاقات النشطة,${reportData.systemStats?.totalCards || 0} بطاقة\n\n`;

      csvContent += "ثانياً: تفصيل الإيرادات والركاب لكل خط باص\n";
      csvContent += "معرف الخط,رمز المسار,اسم مسار الحافلة,عدد الركاب (العمليات),إجمالي الإيرادات\n";
      reportData.busStats?.forEach((bus: any) => {
        csvContent += `"${bus.busId}","${bus.code}","${bus.name}",${bus.passengersCount},${bus.revenue}\n`;
      });
      csvContent += "\n";

      csvContent += "ثالثاً: سجل آخر عمليات مسح QR صعود الركاب\n";
      csvContent += "المعرف الفريد,اسم الراكب,قيمة التعرفة,تاريخ ووقت الصعود\n";
      reportData.recentPayments?.forEach((pay: any) => {
        const timeStr = new Date(pay.timestamp).toLocaleString('ar-SY');
        csvContent += `"${pay.id}","${pay.passengerName}",${pay.amount},"${timeStr}"\n`;
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `ShamCard_Financial_Report_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      triggerToast("تم تصدير تقرير الإكسل المالي بنجاح!", "success");
    } catch (e) {
      console.error(e);
      triggerToast("فشل تصدير تقرير الإكسل المالي.", "error");
    }
  };

  // Generate printable elegant official report (PDF/Print preview)
  const exportToPDF = () => {
    if (!reportData) return;
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        triggerToast("يرجى تفعيل السماح بالنوافذ المنبثقة (Popups) لتوليد تقرير الطباعة.", "error");
        return;
      }

      const htmlContent = `
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8">
          <title>التقرير المالي الموحد - شام كارت</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');
            body {
              font-family: 'Cairo', sans-serif;
              color: #1e293b;
              background-color: #ffffff;
              padding: 40px;
              line-height: 1.6;
            }
            .header-container {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 4px double #0f172a;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .logo-title {
              font-size: 24px;
              font-weight: 900;
              color: #059669;
            }
            .subtitle {
              font-size: 11px;
              color: #64748b;
              margin-top: 5px;
            }
            .meta-info {
              text-align: left;
              font-size: 11px;
              color: #475569;
            }
            .meta-info p { margin: 3px 0; }
            h2 {
              font-size: 14px;
              border-bottom: 2px solid #059669;
              padding-bottom: 6px;
              color: #0f172a;
              margin-top: 40px;
              margin-bottom: 15px;
            }
            .stats-grid {
              display: grid;
              grid-template-cols: repeat(4, 1fr);
              gap: 15px;
              margin-bottom: 30px;
            }
            .stat-card {
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 15px;
              text-align: center;
              background-color: #f8fafc;
            }
            .stat-label {
              font-size: 10px;
              color: #64748b;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .stat-val {
              font-size: 18px;
              font-weight: 900;
              color: #0f172a;
            }
            .stat-val.highlight {
              color: #059669;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 15px;
              font-size: 11px;
            }
            th, td {
              border: 1px solid #e2e8f0;
              padding: 10px 12px;
              text-align: right;
            }
            th {
              background-color: #f1f5f9;
              color: #0f172a;
              font-weight: bold;
            }
            tr:nth-child(even) {
              background-color: #f8fafc;
            }
            .signatures {
              margin-top: 80px;
              display: flex;
              justify-content: space-between;
              text-align: center;
              font-size: 12px;
            }
            .sig-line {
              width: 200px;
              border-top: 1px solid #94a3b8;
              margin-top: 50px;
              padding-top: 8px;
              color: #475569;
            }
            .no-print {
              background: #059669;
              color: white;
              border: none;
              padding: 10px 20px;
              font-family: 'Cairo', sans-serif;
              font-size: 14px;
              font-weight: bold;
              border-radius: 8px;
              cursor: pointer;
              margin-bottom: 20px;
              box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
            }
            @media print {
              .no-print { display: none; }
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <button class="no-print" onclick="window.print()">طباعة التقرير المالي فوراً</button>
          
          <div class="header-container">
            <div>
              <div class="logo-title">شام كارت • ChamCard PRO</div>
              <div class="subtitle">المنظومة الرقمية الموحدة لقطاع النقل العام والمحفظة الوطنية السورية</div>
            </div>
            <div class="meta-info">
              <p><strong>تاريخ التقرير:</strong> ${new Date().toLocaleDateString('ar-SY')}</p>
              <p><strong>وقت التوليد:</strong> ${new Date().toLocaleTimeString('ar-SY')}</p>
              <p><strong>رقم التقرير المرجعي:</strong> RPT-${Math.floor(100000 + Math.random() * 900000)}</p>
              <p><strong>المشرف المسؤول:</strong> مالي المنظومة العام</p>
            </div>
          </div>

          <h1 style="text-align: center; font-size: 18px; color: #0f172a; margin-bottom: 30px;">تقرير التدقيق والحسابات المالية الفوري الموحد</h1>

          <h2>أولاً: ملخص المؤشرات والأداء المالي العام</h2>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-label">إيرادات تذاكر عبور الحافلات</div>
              <div class="stat-val highlight">${(reportData.totalBusRevenue || 0).toLocaleString()} ل.س</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">عدد التذاكر الممسوحة (QR)</div>
              <div class="stat-val">${(reportData.totalTransactionsCount || 0).toLocaleString()} عبور</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">إجمالي رصيد الشحن المعتمد</div>
              <div class="stat-val" style="color: #0284c7;">${(reportData.rechargeStats?.approvedAmount || 0).toLocaleString()} ل.س</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">إجمالي الركاب المسجلين</div>
              <div class="stat-val">${(reportData.systemStats?.totalUsers || 0).toLocaleString()} مستخدم</div>
            </div>
          </div>

          <h2>ثانياً: تفصيل إيرادات خطوط وباصات النقل</h2>
          <table>
            <thead>
              <tr>
                <th>معرف الخط</th>
                <th>رمز المسار</th>
                <th>اسم مسار الحافلة</th>
                <th>إجمالي الركاب المستفيدين</th>
                <th>صافي الإيرادات المسجلة (ل.س)</th>
              </tr>
            </thead>
            <tbody>
              ${reportData.busStats?.map((bus: any) => `
                <tr>
                  <td>${bus.busId}</td>
                  <td style="font-weight: bold; font-family: monospace;">${bus.code}</td>
                  <td>${bus.name}</td>
                  <td>${(bus.passengersCount || 0).toLocaleString()} راكب</td>
                  <td style="font-weight: bold; color: #059669;">${(bus.revenue || 0).toLocaleString()} ل.س</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="signatures">
            <div>
              <p>توقيع المدقق المالي الرئيسي</p>
              <div class="sig-line">إدارة الحسابات العامة المشتركة</div>
            </div>
            <div>
              <p>الختم الرسمي للمؤسسة</p>
              <div class="sig-line">شام كارت للحلول الرقمية السحابية</div>
            </div>
          </div>
          
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 400);
            }
          </script>
        </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
      triggerToast("تم فتح التقرير المالي الموحد للتصدير والطباعة!", "success");
    } catch (e) {
      console.error(e);
      triggerToast("فشل توليد تقرير الطباعة للطباعة المباشرة.", "error");
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem('cham_admin_session');
    document.cookie = "admin_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    window.location.href = '/admin-login';
  };

  const filteredCards = cards.filter(card => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return card.cardNumber.toLowerCase().includes(query) || 
           card.alias.toLowerCase().includes(query);
  });

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100 font-sans relative overflow-hidden" dir="rtl">
      
      {/* Toast Notification HUD */}
      {toast && (
        <div className={`fixed top-6 left-6 z-50 px-6 py-4 rounded-2xl shadow-2xl border flex items-center gap-3 animate-in slide-in-from-left duration-200 ${
          toast.type === 'success' 
            ? 'bg-emerald-950 border-emerald-500/30 text-emerald-300' 
            : 'bg-red-950 border-red-500/30 text-red-300'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span className="text-xs font-bold">{toast.message}</span>
        </div>
      )}

      {/* 1. Sidebar Panel (RTL Navigation) */}
      <aside className="w-80 shrink-0 border-l border-slate-900 bg-slate-900/40 backdrop-blur-md p-6 flex flex-col justify-between relative z-10">
        <div className="space-y-8">
          {/* Logo Brand Header */}
          <div className="flex items-center gap-3.5 pb-6 border-b border-slate-900/80">
            <div className="w-11 h-11 bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-950/20">
              <Shield size={22} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-black text-white">شام كارت</h1>
                <span className="bg-emerald-500/10 border border-emerald-500/20 text-[9px] text-emerald-400 font-bold px-1.5 py-0.5 rounded-full">PRO</span>
              </div>
              <p className="text-[10px] text-slate-500 font-semibold mt-0.5">لوحة التحكم والعمليات</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full p-4 rounded-2xl text-xs font-extrabold flex items-center gap-3.5 transition duration-150 ${
                activeTab === 'overview' 
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-sm' 
                  : 'text-slate-400 hover:bg-slate-900 hover:text-white border border-transparent'
              }`}
            >
              <Compass size={18} />
              <span>الرئيسية (Overview)</span>
            </button>

            <button
              onClick={() => setActiveTab('cards')}
              className={`w-full p-4 rounded-2xl text-xs font-extrabold flex items-center gap-3.5 transition duration-150 ${
                activeTab === 'cards' 
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-sm' 
                  : 'text-slate-400 hover:bg-slate-900 hover:text-white border border-transparent'
              }`}
            >
              <CreditCard size={18} />
              <span>إدارة البطاقات (Cards)</span>
            </button>

            <button
              onClick={() => setActiveTab('recharge')}
              className={`w-full p-4 rounded-2xl text-xs font-extrabold flex items-center gap-3.5 justify-between transition duration-150 ${
                activeTab === 'recharge' 
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-sm' 
                  : 'text-slate-400 hover:bg-slate-900 hover:text-white border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <Coins size={18} />
                <span>طلبات شحن الرصيد</span>
              </div>
              {rechargeRequests.filter(r => r.status === 'pending').length > 0 && (
                <span className="bg-amber-500 text-slate-950 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
                  {rechargeRequests.filter(r => r.status === 'pending').length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className={`w-full p-4 rounded-2xl text-xs font-extrabold flex items-center gap-3.5 transition duration-150 ${
                activeTab === 'reports' 
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-sm' 
                  : 'text-slate-400 hover:bg-slate-900 hover:text-white border border-transparent'
              }`}
            >
              <FileText size={18} />
              <span>السجلات والتقارير (Reports)</span>
            </button>

            <button
              onClick={() => setActiveTab('fleet')}
              className={`w-full p-4 rounded-2xl text-xs font-extrabold flex items-center gap-3.5 transition duration-150 ${
                activeTab === 'fleet' 
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-sm' 
                  : 'text-slate-400 hover:bg-slate-900 hover:text-white border border-transparent'
              }`}
            >
              <Bus size={18} />
              <span>إنشاء وإدارة الرحلات (Fleet)</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer Logout Block */}
        <div className="pt-6 border-t border-slate-900/80">
          <button
            onClick={handleLogout}
            className="w-full p-4 bg-slate-950 hover:bg-red-950/20 hover:text-red-400 text-slate-400 border border-slate-900 rounded-2xl text-xs font-black transition duration-150 flex items-center gap-3.5"
          >
            <LogOut size={16} />
            <span>تسجيل خروج المشرف</span>
          </button>
        </div>
      </aside>

      {/* 2. Main Content Frame */}
      <main className="flex-1 overflow-y-auto relative z-10 p-8">
        
        {/* Top welcome banner */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 pb-6 border-b border-slate-900">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 block">الإدارة العامة الموحدة للجمهورية العربية السورية</span>
            <h2 className="text-xl font-black text-white">نظام التشغيل المتكامل لبطاقة الشام الرقمية</h2>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={loadAdminData}
              className="p-3 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition"
              title="تحديث البيانات"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs font-bold text-slate-400 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>قاعدة البيانات السحابية نشطة</span>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="h-96 flex flex-col items-center justify-center gap-3">
            <div className="animate-spin h-10 w-10 text-emerald-500 rounded-full border-2 border-slate-800 border-t-emerald-500"></div>
            <p className="text-xs font-bold text-slate-400">جاري مزامنة قيود الخادم السحابية الموثقة...</p>
          </div>
        ) : (
          <div className="space-y-6">

            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                
                {/* Visual Counters Bento Box */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-slate-900/30 border border-slate-800/60 rounded-3xl p-6 relative overflow-hidden">
                    <p className="text-[10px] text-slate-500 font-extrabold block">إجمالي الإيرادات الكلية للباصات</p>
                    <span className="text-3xl font-black text-emerald-400 block mt-1">{(reportData?.totalBusRevenue || 0).toLocaleString()} ل.س</span>
                    <span className="text-[9px] text-slate-500 block mt-1.5">شام كاش الرقمي التراكمي</span>
                  </div>

                  <div className="bg-slate-900/30 border border-slate-800/60 rounded-3xl p-6 relative overflow-hidden">
                    <p className="text-[10px] text-slate-500 font-extrabold block">إجمالي عمليات عبور الباركود QR</p>
                    <span className="text-3xl font-black text-white block mt-1">{(reportData?.totalTransactionsCount || 0).toLocaleString()}</span>
                    <span className="text-[9px] text-slate-500 block mt-1.5">تذكرة مسح ناجحة بالباصات</span>
                  </div>

                  <div className="bg-slate-900/30 border border-slate-800/60 rounded-3xl p-6 relative overflow-hidden">
                    <p className="text-[10px] text-slate-500 font-extrabold block">إجمالي طلبات الشحن المقبولة</p>
                    <span className="text-3xl font-black text-sky-400 block mt-1">{(reportData?.rechargeStats?.approvedAmount || 0).toLocaleString()} ل.س</span>
                    <span className="text-[9px] text-slate-500 block mt-1.5">طلب معتمد ومغلق</span>
                  </div>

                  <div className="bg-slate-900/30 border border-slate-800/60 rounded-3xl p-6 relative overflow-hidden">
                    <p className="text-[10px] text-slate-500 font-extrabold block">المستفيدين الفعالين بالمنظومة</p>
                    <span className="text-3xl font-black text-white block mt-1">{(reportData?.systemStats?.totalUsers || 0).toLocaleString()}</span>
                    <span className="text-[9px] text-slate-500 block mt-1.5">حساب مسجل وبطاقة نشطة</span>
                  </div>
                </div>

                {/* Grid performance details */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Bus Performance */}
                  <div className="lg:col-span-2 bg-slate-900/20 border border-slate-800/60 rounded-[32px] p-6">
                    <div className="mb-6">
                      <h4 className="font-extrabold text-sm text-white">إيرادات خطوط النقل والحافلات الذكية</h4>
                      <p className="text-[11px] text-slate-500">توزيع الإيرادات والركاب حسب الخطوط المسجلة</p>
                    </div>

                    <div className="space-y-4">
                      {reportData?.busStats?.map((bus: any) => {
                        const totalRev = reportData.totalBusRevenue || 1;
                        const pct = Math.min(100, Math.round((bus.revenue / totalRev) * 100));
                        return (
                          <div key={bus.busId} className="bg-slate-950/40 border border-slate-900/60 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="bg-slate-800 text-slate-300 font-mono text-[9px] px-1.5 py-0.5 rounded font-black uppercase">{bus.code}</span>
                                <h5 className="font-extrabold text-xs text-white">{bus.name}</h5>
                              </div>
                              <span className="text-[10px] text-slate-500 block mt-1">الركاب الصاعدين: {bus.passengersCount} راكب</span>
                            </div>
                            <div className="w-full sm:w-40 text-right space-y-1">
                              <div className="flex justify-between text-[10px] font-bold">
                                <span className="text-emerald-400">{bus.revenue.toLocaleString()} ل.س</span>
                                <span className="text-slate-500">{pct}%</span>
                              </div>
                              <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${pct}%` }}></div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Quick System Activity Logs */}
                  <div className="bg-slate-900/20 border border-slate-800/60 rounded-[32px] p-6 space-y-4">
                    <div>
                      <h4 className="font-extrabold text-sm text-white">آخر عمليات العبور الصالحة</h4>
                      <p className="text-[11px] text-slate-500">بث حي فوري مباشر من الحافلات</p>
                    </div>

                    <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                      {reportData?.recentPayments?.slice(0, 7).map((pay: any) => (
                        <div key={pay.id} className="p-3 bg-slate-950/40 border border-slate-900 rounded-xl flex justify-between items-center text-xs">
                          <div className="space-y-0.5 text-right">
                            <strong className="text-white block">{pay.passengerName || "راكب محقق"}</strong>
                            <span className="text-[9px] text-slate-500 font-mono">{new Date(pay.timestamp).toLocaleTimeString('ar-SY')}</span>
                          </div>
                          <span className="text-[11px] font-bold text-emerald-400">+{Number(pay.amount).toLocaleString()} ل.س</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* TAB 2: CARD MANAGEMENT */}
            {activeTab === 'cards' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Part A: Create Card Form */}
                <div className="lg:col-span-1 bg-slate-900/40 border border-slate-800/80 rounded-[32px] p-6 space-y-6 h-fit">
                  <div>
                    <h3 className="font-black text-sm text-white flex items-center gap-2">
                      <CreditCard className="text-emerald-400 animate-pulse" size={16} />
                      <span>تخصيص بطاقة جديدة للركاب</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">إنشاء بطاقة إلكترونية أو فيزيائية جديدة للمستخدمين برقمها التسلسلي</p>
                  </div>

                  <form onSubmit={handleCreateCard} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 font-bold block">الرقم التسلسلي الفريد للبطاقة (Serial Number)</label>
                      <input 
                        type="text" 
                        required
                        placeholder="مثال: 963283749201"
                        value={newCardNumber}
                        onChange={(e) => setNewCardNumber(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 font-bold block">الاسم المستعار للبطاقة (Alias Label)</label>
                      <input 
                        type="text" 
                        required
                        placeholder="مثال: محفظة الطالب الجامعي"
                        value={newCardAlias}
                        onChange={(e) => setNewCardAlias(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 font-bold block">رقم هاتف الراكب المرتبط</label>
                      <input 
                        type="text" 
                        required
                        placeholder="مثال: 0991234567"
                        value={newCardUserPhone}
                        onChange={(e) => setNewCardUserPhone(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-slate-400 font-bold block">نوع البطاقة</label>
                        <select 
                          value={newCardType}
                          onChange={(e: any) => setNewCardType(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none cursor-pointer"
                        >
                          <option value="digital">رقمية (تطبيق)</option>
                          <option value="physical">فيزيائية (ملموسة)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] text-slate-400 font-bold block">الرصيد الابتدائي (ل.س)</label>
                        <input 
                          type="number" 
                          required
                          value={newCardBalance}
                          onChange={(e) => setNewCardBalance(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-emerald-500 font-mono"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black py-3.5 rounded-xl text-xs transition flex items-center justify-center gap-2 mt-4"
                    >
                      {submitting ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
                      <span>تخصيص وإطلاق البطاقة فوراً</span>
                    </button>
                  </form>
                </div>

                {/* Part B: Cards Grid and Monitor */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="text-right">
                      <h3 className="font-black text-sm text-white">جدول مراقبة وتجميد البطاقات النشطة</h3>
                      <p className="text-xs text-slate-500 mt-1">تجميد أو إلغاء تجميد أي بطاقة ركاب بشكل لحظي وفوري</p>
                    </div>

                    {/* Quick Search */}
                    <div className="relative w-full sm:w-64">
                      <Search size={14} className="absolute right-3.5 top-3.5 text-slate-500" />
                      <input 
                        type="text" 
                        placeholder="ابحث بـ الرقم أو الاسم..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pr-9 pl-4 text-xs text-white outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="bg-slate-900/20 border border-slate-800 rounded-2xl overflow-hidden">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-900/60 text-slate-400 font-black border-b border-slate-800">
                        <tr>
                          <th className="p-4">الرقم التسلسلي للبطاقة</th>
                          <th className="p-4">اسم البطاقة</th>
                          <th className="p-4">المستخدم (رقم الهاتف)</th>
                          <th className="p-4">النوع</th>
                          <th className="p-4">الرصيد الحالي</th>
                          <th className="p-4">الحالة</th>
                          <th className="p-4 text-center">العمليات الإدارية</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900 bg-slate-950/25">
                        {filteredCards.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-12 text-center text-slate-500">
                              لا توجد أي بطاقات تفي بشروط البحث الحالية.
                            </td>
                          </tr>
                        ) : (
                          filteredCards.map(card => (
                            <tr key={card.id} className="hover:bg-slate-900/10 transition">
                              <td className="p-4 font-mono font-bold text-white tracking-wider">{card.cardNumber}</td>
                              <td className="p-4 font-extrabold text-slate-200">{card.alias}</td>
                              <td className="p-4 text-slate-400 font-mono">{card.userId || "غير مرتبط"}</td>
                              <td className="p-4 text-xs font-semibold">
                                <span className={`px-2 py-0.5 rounded text-[10px] ${card.type === 'physical' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/15' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15'}`}>
                                  {card.type === 'physical' ? 'فيزيائي' : 'رقمي تطبيق'}
                                </span>
                              </td>
                              <td className="p-4 font-black text-white">{card.balance.toLocaleString()} ل.س</td>
                              <td className="p-4">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${card.status === 'blocked' ? 'bg-red-500/10 text-red-400 border border-red-500/15' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15'}`}>
                                  {card.status === 'blocked' ? 'مجمدة ومحظورة' : 'فعالة ونشطة'}
                                </span>
                              </td>
                              <td className="p-4 text-center">
                                <button
                                  onClick={() => handleToggleBlock(card.id)}
                                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${
                                    card.status === 'blocked' 
                                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md' 
                                      : 'bg-red-950/40 hover:bg-red-900/30 text-red-400 border border-red-900/30'
                                  }`}
                                >
                                  {card.status === 'blocked' ? 'إلغاء التجميد' : 'تجميد وحظر البطاقة'}
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {/* TAB 3: RECHARGE REQUESTS */}
            {activeTab === 'recharge' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <span>طلبات شحن وتعبئة الرصيد المعلقة</span>
                    <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs px-2.5 py-0.5 rounded-full font-bold">بانتظار المشرف</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">راجع طلبات الشحن المقدمة من الركاب عبر الحوالات أو شام كاش، وتحقق من صور الإيصالات قبل الاعتماد</p>
                </div>

                <div className="bg-slate-900/20 border border-slate-800 rounded-[28px] overflow-hidden">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-900/60 text-slate-400 font-black border-b border-slate-800">
                      <tr>
                        <th className="p-4">الراكب / الحساب</th>
                        <th className="p-4">المبلغ المطلوب</th>
                        <th className="p-4">إيصال الدفع البنكي</th>
                        <th className="p-4">تاريخ الطلب</th>
                        <th className="p-4">الحالة</th>
                        <th className="p-4 text-center">الإجراءات والاعتماد</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900 bg-slate-950/25">
                      {rechargeRequests.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-16 text-center text-slate-500 font-bold">
                            لا توجد أي طلبات شحن أرصدة حالية مسجلة بالنظام.
                          </td>
                        </tr>
                      ) : (
                        rechargeRequests.map(req => (
                          <tr key={req.id} className="hover:bg-slate-900/10 transition">
                            <td className="p-4 font-extrabold text-white">
                              <span className="block">{req.userName || "مستفيد شام كارت"}</span>
                              <span className="text-[10px] text-slate-500 font-mono">{req.userId}</span>
                            </td>
                            <td className="p-4 font-black text-emerald-400 text-sm">{(req.amount || 0).toLocaleString()} ل.س</td>
                            <td className="p-4">
                              <div className="flex flex-col gap-1 items-start">
                                <span className="text-[11px] font-extrabold text-slate-300">
                                  {req.paymentMethod || 'سيريتل كاش'}
                                </span>
                                {req.receiptImage && req.receiptImage !== 'none' && (
                                  <button 
                                    onClick={() => setZoomedImage(req.receiptImage)}
                                    className="flex items-center gap-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 px-2 py-1 rounded-lg transition text-[9px] font-black"
                                  >
                                    <Eye size={10} className="text-amber-500" />
                                    <span>معاينة الإيصال</span>
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="p-4 text-slate-400 font-mono">{new Date(req.timestamp).toLocaleString('ar-SY')}</td>
                            <td className="p-4">
                              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black ${
                                req.status === 'approved' 
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' 
                                  : req.status === 'rejected' 
                                    ? 'bg-red-500/10 text-red-400 border border-red-500/15' 
                                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/15 animate-pulse'
                              }`}>
                                {req.status === 'approved' ? 'مقبول ومعتمد' : req.status === 'rejected' ? 'مرفوض ومغلق' : 'معلق ومحمي'}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              {req.status === 'pending' ? (
                                <div className="flex justify-center gap-2">
                                  <button
                                    onClick={() => handleApprove(req.id)}
                                    disabled={submitting}
                                    className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white p-2.5 rounded-xl transition shadow-md"
                                    title="موافقة وشحن رصيد الكارت"
                                  >
                                    <Check size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleReject(req.id)}
                                    disabled={submitting}
                                    className="bg-red-950/40 hover:bg-red-900/30 border border-red-900/30 text-red-400 p-2.5 rounded-xl transition"
                                    title="رفض الطلب"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-slate-500 text-[10px] font-bold">تمت المعالجة وإغلاق القيد</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 4: LOGS & REPORTS */}
            {activeTab === 'reports' && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="text-right">
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <span>إدارة التقارير والرقابة المالية</span>
                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs px-2.5 py-0.5 rounded-full font-bold">الرقابة النشطة</span>
                    </h3>
                    <p className="text-xs text-slate-400">تتبع تدفقات الركاب، مبيعات التذاكر، واشتراكات الشحن المالي المعتمدة مع أدوات التصدير</p>
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <button
                      onClick={exportToExcel}
                      disabled={loadingReport || !reportData}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/30 text-emerald-400 font-extrabold px-4 py-2.5 rounded-xl text-xs transition active:scale-95 disabled:opacity-50"
                    >
                      <Download size={16} />
                      <span>تصدير إكسل (CSV)</span>
                    </button>
                    <button
                      onClick={exportToPDF}
                      disabled={loadingReport || !reportData}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs transition active:scale-95 disabled:opacity-50 shadow-lg shadow-emerald-950/20"
                    >
                      <Printer size={16} />
                      <span>توليد تقرير رسمي (PDF)</span>
                    </button>
                  </div>
                </div>

                {loadingReport ? (
                  <div className="h-64 flex flex-col items-center justify-center gap-3">
                    <div className="animate-spin h-8 w-8 text-emerald-500 rounded-full border-2 border-slate-800 border-t-emerald-500"></div>
                    <p className="text-xs text-slate-400 font-bold">جاري حساب الإحصائيات الحية وتدقيق القيود الماليّة...</p>
                  </div>
                ) : !reportData ? (
                  <div className="border border-dashed border-slate-800 rounded-3xl p-12 text-center text-slate-500">
                    لا تتوفر بيانات مالية حالية لعرضها. يرجى تكرار المحاولة.
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Summary Bento Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-5 relative overflow-hidden">
                        <p className="text-[10px] text-slate-400 font-extrabold mb-1">إيرادات تذاكر الباصات (QR)</p>
                        <p className="text-xl font-black text-emerald-400">{(reportData.totalBusRevenue || 0).toLocaleString()} ل.س</p>
                        <p className="text-[9px] text-slate-500 mt-1">محصلة من مسح الباركود مباشرة</p>
                      </div>

                      <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-5 relative overflow-hidden">
                        <p className="text-[10px] text-slate-400 font-extrabold mb-1">تذاكر العبور الناجحة</p>
                        <p className="text-xl font-black text-white">{(reportData.totalTransactionsCount || 0).toLocaleString()} عبور</p>
                        <p className="text-[9px] text-slate-500 mt-1">إجمالي الحركات الصالحة بالباصات</p>
                      </div>

                      <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-5 relative overflow-hidden">
                        <p className="text-[10px] text-slate-400 font-extrabold mb-1">شحن الرصيد المعتمد</p>
                        <p className="text-xl font-black text-sky-400">{(reportData.rechargeStats?.approvedAmount || 0).toLocaleString()} ل.س</p>
                        <p className="text-[9px] text-slate-500 mt-1">مقبول ومضاف للركاب</p>
                      </div>

                      <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-5 relative overflow-hidden">
                        <p className="text-[10px] text-slate-400 font-extrabold mb-1">مستخدمي التطبيق والبطاقات</p>
                        <p className="text-xl font-black text-white">{(reportData.systemStats?.totalUsers || 0).toLocaleString()} مستخدم</p>
                        <p className="text-[9px] text-slate-500 mt-1">إجمالي الحسابات المسجلة</p>
                      </div>
                    </div>

                    {/* Detailed Logs list */}
                    <div className="space-y-3">
                      <div className="text-right">
                        <h4 className="font-extrabold text-sm text-white">سجل تدفق الركاب الفوري والمصادقة</h4>
                        <p className="text-xs text-slate-500">سجلات مرور وعمليات ركاب حافلات الشام الرقمية</p>
                      </div>

                      <div className="overflow-x-auto rounded-2xl border border-slate-800">
                        <table className="w-full text-right text-[11px]">
                          <thead className="bg-slate-900 text-slate-400 font-black">
                            <tr>
                              <th className="p-3">اسم الراكب</th>
                              <th className="p-3">الحافلة / الخط</th>
                              <th className="p-3">القيمة المستقطعة</th>
                              <th className="p-3">التاريخ والوقت</th>
                              <th className="p-3 text-center">حالة العملية والتحقق</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60 bg-slate-950/25">
                            {reportData.recentPayments?.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="p-8 text-center text-slate-500">
                                  لا توجد عمليات مسح QR حالية مسجلة بعد.
                                </td>
                              </tr>
                            ) : (
                              reportData.recentPayments?.map((pay: any) => (
                                <tr key={pay.id} className="hover:bg-slate-900/20 transition">
                                  <td className="p-3 font-extrabold text-slate-200">{pay.passengerName || "راكب شام كارت"}</td>
                                  <td className="p-3 text-white">
                                    <span className="bg-slate-800 text-slate-300 font-mono text-[9px] px-1.5 py-0.5 rounded font-black ml-1.5">{pay.busId === 'bus_M1' ? 'M1' : (pay.busId === 'bus_B2' ? 'B2' : 'BUS')}</span>
                                    {pay.busId === 'bus_M1' ? "ميكرو البرامكة - المزة جبل" : (pay.busId === 'bus_B2' ? "باص البرامكة - مزة أوتوستراد" : "خط نقل عام")}
                                  </td>
                                  <td className="p-3 font-bold text-emerald-400">{Number(pay.amount || 1000).toLocaleString()} ل.س</td>
                                  <td className="p-3 font-medium text-slate-400">{new Date(pay.timestamp).toLocaleString('ar-SY')}</td>
                                  <td className="p-3 text-center">
                                    {pay.status === 'failed' ? (
                                      <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-0.5 rounded-full text-[9px] font-black">فشلت: {pay.errorReason || "رصيد غير كافٍ"}</span>
                                    ) : (
                                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-[9px] font-black">مكتملة ومؤكدة</span>
                                    )}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: FLEET & ROUTE CREATION */}
            {activeTab === 'fleet' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Part A: Create Bus Trip Form */}
                <div className="lg:col-span-1 bg-slate-900/40 border border-slate-800/80 rounded-[32px] p-6 space-y-6 h-fit relative">
                  <div>
                    <h3 className="font-black text-sm text-white flex items-center gap-2">
                      <Bus className="text-emerald-400" size={18} />
                      <span>تسجيل باص وإنشاء كود رحلة جديد</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">توليد أكواد سرية فريدة لتسجيل دخول السائقين وتفعيل البث الحي للـ QR</p>
                  </div>

                  <form onSubmit={handleCreateTrip} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 font-bold block">اسم مالك / سائق الباص</label>
                      <input 
                        type="text" 
                        required
                        placeholder="مثال: يوسف الخراط"
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 font-bold block">رقم لوحة الباص الفنية / نمرة السيارة</label>
                      <input 
                        type="text" 
                        required
                        placeholder="مثال: دمشق - 289384"
                        value={plateNumber}
                        onChange={(e) => setPlateNumber(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 font-bold block">اسم خط النقل والمسار</label>
                      <input 
                        type="text" 
                        required
                        placeholder="مثال: المزة جبل أو البرامكة"
                        value={customRouteName}
                        onChange={(e) => setCustomRouteName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 font-bold block">نوع واسطة النقل</label>
                      <select 
                        value={customVehicleType}
                        onChange={(e) => setCustomVehicleType(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none cursor-pointer focus:border-emerald-500"
                      >
                        <option value="ميكرو باص">ميكرو باص</option>
                        <option value="باص نقل داخلي كبير">باص نقل داخلي كبير</option>
                        <option value="سرفيس">سرفيس</option>
                        <option value="بولمان بين المحافظات">بولمان بين المحافظات</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 font-bold block">التعرفة والتسعيرة الرقمية (الأجرة بالليرة السورية)</label>
                      <input 
                        type="number" 
                        required
                        min="500"
                        placeholder="مثال: 1500"
                        value={customPrice}
                        onChange={(e) => setCustomPrice(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-emerald-500"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black py-3.5 rounded-xl text-xs transition flex items-center justify-center gap-2 mt-4"
                    >
                      {submitting ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
                      <span>توليد كود وبث الرحلة للمحاكي</span>
                    </button>
                  </form>

                  {/* Generated Credentials Popup display */}
                  {generatedTrip && (
                    <div className="bg-slate-950 border border-emerald-500/30 rounded-2xl p-5 space-y-4 shadow-xl border-t-4 border-t-emerald-500 animate-in fade-in duration-250">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-900">
                        <strong className="text-xs text-emerald-400">بطاقة اعتماد السائق والرحلة</strong>
                        <button 
                          onClick={() => setGeneratedTrip(null)}
                          className="text-slate-500 hover:text-white"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      <div className="space-y-3.5 text-right text-xs">
                        <div>
                          <span className="text-[10px] text-slate-500 font-bold block">السائق / المالك:</span>
                          <span className="text-white font-extrabold">{generatedTrip.ownerName}</span>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-500 font-bold block">خط سير الرحلة والتعرفة:</span>
                          <span className="text-white font-extrabold block">{generatedTrip.routeName} ({generatedTrip.routeCode})</span>
                          <span className="text-emerald-400 font-extrabold mt-0.5 block">{(generatedTrip.ticketPrice || 1000).toLocaleString()} ل.س</span>
                        </div>

                        {/* TRIP CODE */}
                        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
                          <span className="text-[9px] text-emerald-400 font-black block flex items-center gap-1">
                            <Key size={10} />
                            <span>كود تفعيل الرحلة (16 رقم)</span>
                          </span>
                          <span className="text-sm font-mono font-black text-white block mt-1 tracking-[0.1em] text-center">{generatedTrip.tripCode}</span>
                        </div>

                        {/* TRIP PASSWORD */}
                        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
                          <span className="text-[9px] text-emerald-400 font-black block flex items-center gap-1">
                            <Shield size={10} />
                            <span>كلمة السر للرحلة (10 أرقام)</span>
                          </span>
                          <span className="text-sm font-mono font-black text-amber-400 block mt-1 tracking-[0.15em] text-center">{generatedTrip.password}</span>
                        </div>
                      </div>

                      <p className="text-[9px] text-slate-500 font-semibold text-center leading-relaxed">
                        قم بإعطاء هذه الرموز السرية للسائق ليقوم بوضعها في شاشة محاكي السائق لتسجيل الدخول وبدء البث الحيّ.
                      </p>
                    </div>
                  )}
                </div>

                {/* Part B: Trips History and status */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="text-right">
                    <h3 className="font-black text-sm text-white">سجل مراقبة وحالات الرحلات وبث الحافلات</h3>
                    <p className="text-xs text-slate-500 mt-1">تتبع الحافلات النشطة على الخريطة وسير الرحلات المسجلة في السحاب</p>
                  </div>

                  <div className="bg-slate-900/20 border border-slate-800 rounded-2xl overflow-hidden">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-900/60 text-slate-400 font-black border-b border-slate-800">
                        <tr>
                          <th className="p-4">اسم المالك وباص الدخول</th>
                          <th className="p-4">المسار والخط</th>
                          <th className="p-4">كود الرحلة السري</th>
                          <th className="p-4">كلمة السر للرحلة</th>
                          <th className="p-4">تاريخ التوليد</th>
                          <th className="p-4">الحالة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900 bg-slate-950/25">
                        {trips.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-12 text-center text-slate-500">
                              لا توجد أي رحلات حافلات مولدة مسبقاً بالنظام السحابي.
                            </td>
                          </tr>
                        ) : (
                          trips.map(t => (
                            <tr key={t.id} className="hover:bg-slate-900/10 transition">
                              <td className="p-4 font-extrabold text-white">
                                <span className="block">{t.ownerName}</span>
                                <span className="text-[10px] text-slate-500 font-mono">لوحة: {t.plateNumber}</span>
                              </td>
                              <td className="p-4">
                                <span className="bg-slate-800 text-slate-300 font-mono text-[9px] px-1.5 py-0.5 rounded font-black uppercase ml-1.5">{t.routeCode}</span>
                                <span className="text-slate-300 font-semibold">{t.routeName}</span>
                                <div className="text-[10px] font-bold text-emerald-400 mt-0.5 font-mono">{(t.ticketPrice || 1000).toLocaleString()} ل.س</div>
                              </td>
                              <td className="p-4 font-mono font-bold text-slate-300 tracking-wider text-[11px]">{t.tripCode}</td>
                              <td className="p-4 font-mono font-bold text-amber-500/80 tracking-wider text-[11px]">{t.password}</td>
                              <td className="p-4 text-slate-500 font-mono">{new Date(t.createdAt).toLocaleDateString('ar-SY')}</td>
                              <td className="p-4">
                                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black ${
                                  t.status === 'completed' 
                                    ? 'bg-slate-900 text-slate-500 border border-slate-850' 
                                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 animate-pulse'
                                }`}>
                                  {t.status === 'completed' ? 'منتهية ومغلقة' : 'نشطة وتبث حالياً'}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

          </div>
        )}

      </main>

      {/* Image Zoom Overlay/Modal */}
      {zoomedImage && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="relative max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-4 overflow-hidden shadow-2xl">
            <button 
              onClick={() => setZoomedImage(null)}
              className="absolute top-4 right-4 bg-red-600/25 hover:bg-red-600/40 text-red-300 p-2.5 rounded-full transition z-10"
            >
              <X size={20} />
            </button>
            <div className="text-right p-2 mb-4">
              <h3 className="font-black text-sm text-white">معاينة إيصال الدفع بالتفصيل</h3>
              <p className="text-slate-400 text-xs font-medium">تأكد من قيمة الحوالة وتاريخها في صورة الإيصال المرفقة قبل اعتماد الرصيد</p>
            </div>
            <img 
              src={zoomedImage} 
              alt="Receipt Details" 
              className="w-full h-auto max-h-[70vh] object-contain rounded-2xl border border-slate-800" 
            />
          </div>
        </div>
      )}

    </div>
  );
}
