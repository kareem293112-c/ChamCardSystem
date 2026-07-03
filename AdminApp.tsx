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
  Flame,
  CheckCircle,
  RefreshCw,
  Printer,
  Download
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
  pendingNfcAmount?: number;
}

interface RechargeRequest {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  receiptImage: string;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: number;
}

interface Offer {
  id: string;
  title: string;
  description: string;
  discount: string;
  code: string;
  expiryDate: string;
  active: boolean;
  createdAt: number;
}

export default function AdminApp() {
  const [activeTab, setActiveTab] = useState<'requests' | 'users' | 'offers' | 'reports'>('requests');
  const [users, setUsers] = useState<UserData[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [rechargeRequests, setRechargeRequests] = useState<RechargeRequest[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Reports & Financial Data
  const [reportData, setReportData] = useState<any>(null);
  const [loadingReport, setLoadingReport] = useState<boolean>(false);

  // Promotion Creation Form
  const [offerTitle, setOfferTitle] = useState('');
  const [offerDesc, setOfferDesc] = useState('');
  const [offerDiscount, setOfferDiscount] = useState('');
  const [offerCode, setOfferCode] = useState('');
  const [offerExpiry, setOfferExpiry] = useState('');

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
        // Redirect to secure login
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

      // 4. Fetch Offers
      const offersRes = await fetch('/api/offers', { headers });
      const offersData = await offersRes.json();
      setOffers(Array.isArray(offersData) ? offersData : []);

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
    if (activeTab === 'reports') {
      loadReportData();
    }
  }, [activeTab, loadReportData]);

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
      csvContent += `إجمالي المبالغ المشحونة المعتمدة,${reportData.rechargeStats.approvedAmount} ل.س\n`;
      csvContent += `عدد طلبات الشحن المعتمدة,${reportData.rechargeStats.approvedCount} طلب\n`;
      csvContent += `عدد طلبات الشحن المعلقة بانتظار المشرف,${reportData.rechargeStats.pendingCount} طلب\n`;
      csvContent += `إجمالي المستخدمين المسجلين في التطبيق,${reportData.systemStats.totalUsers} مستخدم\n`;
      csvContent += `إجمالي البطاقات النشطة,${reportData.systemStats.totalCards} بطاقة\n\n`;

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

          <h2>ثالثاً: ملخص عمليات شحن رصيد المحفظة عبر الوكلاء وشام كاش</h2>
          <table>
            <thead>
              <tr>
                <th>حالة طلبات الشحن المالي</th>
                <th>عدد الطلبات في المنظومة</th>
                <th>إجمالي القيمة المالية للطلبات (ل.س)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>الطلبات المعتمدة والمشحونة للركاب</td>
                <td>${reportData.rechargeStats?.approvedCount || 0} طلب</td>
                <td style="font-weight: bold; color: #059669;">${(reportData.rechargeStats?.approvedAmount || 0).toLocaleString()} ل.س</td>
              </tr>
              <tr>
                <td>الطلبات المعلقة بانتظار التدقيق</td>
                <td>${reportData.rechargeStats?.pendingCount || 0} معلق</td>
                <td style="font-weight: bold; color: #ea580c;">${(reportData.rechargeStats?.pendingAmount || 0).toLocaleString()} ل.س</td>
              </tr>
              <tr>
                <td>الطلبات المرفوضة (وهمية أو غير متطابقة)</td>
                <td>${reportData.rechargeStats?.rejectedCount || 0} مرفوض</td>
                <td style="font-weight: bold; color: #dc2626;">${(reportData.rechargeStats?.rejectedAmount || 0).toLocaleString()} ل.س</td>
              </tr>
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

  // Create Promotion Offer
  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerTitle || !offerDesc) {
      triggerToast("الرجاء تعبئة العنوان والوصف للعرض الجديد.", "error");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/offers', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          title: offerTitle,
          description: offerDesc,
          discount: offerDiscount,
          code: offerCode,
          expiryDate: offerExpiry
        })
      });
      if (res.ok) {
        triggerToast("تم إضافة العرض الجديد ونشره بنجاح للركاب!", "success");
        setOfferTitle('');
        setOfferDesc('');
        setOfferDiscount('');
        setOfferCode('');
        setOfferExpiry('');
        loadAdminData();
      } else {
        triggerToast("فشل إضافة العرض الترويجي الجديد.", "error");
      }
    } catch (err) {
      triggerToast("خطأ في الاتصال بالشبكة.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Offer
  const handleDeleteOffer = async (id: string) => {
    if (!confirm("هل أنت متأكد من رغبتك بحذف هذا العرض تماماً؟")) return;
    try {
      const res = await fetch(`/api/offers/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (res.ok) {
        triggerToast("تم إزالة العرض الترويجي بنجاح.", "success");
        loadAdminData();
      } else {
        triggerToast("خطأ أثناء محاولة حذف العرض.", "error");
      }
    } catch (err) {
      triggerToast("فشل الاتصال بالخادم.", "error");
    }
  };

  // Logout Handler
  const handleLogout = async () => {
    localStorage.removeItem('cham_admin_session');
    // Set cookie expiry on server
    document.cookie = "admin_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    window.location.href = '/admin-login';
  };

  // Filtering Logic
  const filteredUsers = users.filter(u => 
    u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.phone.includes(searchQuery) ||
    (u.nationalId && u.nationalId.includes(searchQuery))
  );

  const pendingCount = rechargeRequests.filter(r => r.status === 'pending').length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100">
      
      {/* Absolute Toast Alert */}
      {toast && (
        <div className={`fixed top-6 left-6 right-6 md:left-auto md:right-6 md:w-96 p-4 rounded-2xl text-xs font-bold text-right shadow-2xl z-50 border transition-all animate-bounce ${
          toast.type === 'success' ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/30' : 'bg-red-950/90 text-red-300 border-red-500/30'
        }`}>
          <div className="flex gap-3 items-center">
            {toast.type === 'success' ? <CheckCircle size={20} className="text-emerald-500 shrink-0" /> : <AlertCircle size={20} className="text-red-500 shrink-0" />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Top Professional Admin Bar */}
      <nav className="bg-slate-950 border-b border-slate-800/80 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-xl flex items-center justify-center shadow-md">
            <ShieldCheck size={22} className="text-white" />
          </div>
          <div className="text-right">
            <h1 className="text-base font-extrabold text-white">لوحة الإدارة والمشرفين</h1>
            <p className="text-[10px] text-slate-400 font-medium">قاعدة البيانات: Firestore المشتركة النشطة</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <button 
            onClick={loadAdminData}
            disabled={loading}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl transition text-slate-300 disabled:opacity-50"
            title="تحديث البيانات"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>

          <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
            <button 
              onClick={() => setActiveTab('requests')}
              className={`px-4 py-2 rounded-lg font-bold transition flex items-center gap-2 ${activeTab === 'requests' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              <span>طلبات الشحن</span>
              {pendingCount > 0 && (
                <span className="bg-red-600 text-white text-[9px] px-1.5 py-0.5 rounded-full font-black animate-pulse">{pendingCount}</span>
              )}
            </button>
            <button 
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 rounded-lg font-bold transition ${activeTab === 'users' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              المستخدمين والبطاقات
            </button>
            <button 
              onClick={() => setActiveTab('offers')}
              className={`px-4 py-2 rounded-lg font-bold transition ${activeTab === 'offers' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              العروض الترويجية
            </button>
            <button 
              onClick={() => setActiveTab('reports')}
              className={`px-4 py-2 rounded-lg font-bold transition ${activeTab === 'reports' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              التقارير والإيرادات
            </button>
          </div>

          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-xs font-black bg-red-950/30 hover:bg-red-900/40 text-red-400 border border-red-900/30 px-4 py-2.5 rounded-xl transition active:scale-95 shrink-0"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">تسجيل خروج</span>
          </button>
        </div>
      </nav>

      {/* Main Stats Banner (Bento Layout) */}
      <header className="px-6 pt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-950/45 border border-slate-800/60 rounded-3xl p-5 flex items-center justify-between shadow-lg">
          <div className="text-right">
            <p className="text-[10px] text-slate-400 font-bold mb-1">المسؤولين النشطين</p>
            <p className="text-2xl font-black text-white">١ مشرف</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-500">
            <ShieldCheck size={24} />
          </div>
        </div>

        <div className="bg-slate-950/45 border border-slate-800/60 rounded-3xl p-5 flex items-center justify-between shadow-lg">
          <div className="text-right">
            <p className="text-[10px] text-slate-400 font-bold mb-1">إجمالي الركاب المسجلين</p>
            <p className="text-2xl font-black text-white">{users.length} ركاب</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-blue-500">
            <Users size={24} />
          </div>
        </div>

        <div className="bg-slate-950/45 border border-slate-800/60 rounded-3xl p-5 flex items-center justify-between shadow-lg">
          <div className="text-right">
            <p className="text-[10px] text-slate-400 font-bold mb-1">البطاقات الرقمية والفيزيائية</p>
            <p className="text-2xl font-black text-white">{cards.length} بطاقات</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-amber-500">
            <CreditCard size={24} />
          </div>
        </div>

        <div className="bg-slate-950/45 border border-slate-800/60 rounded-3xl p-5 flex items-center justify-between shadow-lg">
          <div className="text-right">
            <p className="text-[10px] text-slate-400 font-bold mb-1">طلبات الشحن المعلقة</p>
            <p className="text-2xl font-black text-red-500">{pendingCount} معلق</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-red-500">
            <Clock size={24} className={pendingCount > 0 ? "animate-spin-slow" : ""} />
          </div>
        </div>
      </header>

      {/* Main Board Container */}
      <main className="flex-1 p-6">
        
        {loading ? (
          <div className="h-96 flex flex-col items-center justify-center gap-4">
            <div className="animate-spin h-10 w-10 text-emerald-500 rounded-full border-4 border-slate-800 border-t-emerald-500"></div>
            <p className="text-xs text-slate-400 font-bold">جاري جلب أحدث البيانات الآمنة من قاعدة البيانات الموحدة...</p>
          </div>
        ) : (
          
          <div className="bg-slate-950/60 border border-slate-800/70 rounded-[32px] p-6 shadow-2xl relative min-h-[500px]">
            
            {/* View 1: Recharge Requests */}
            {activeTab === 'requests' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="text-right">
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <span>إدارة طلبات شحن الرصيد الرقمي</span>
                      <span className="bg-slate-800 text-slate-300 text-xs px-2.5 py-0.5 rounded-full font-bold">{rechargeRequests.length} كلي</span>
                    </h3>
                    <p className="text-xs text-slate-400">وافق أو ارفض تحويلات إثبات الشحن المرسلة من الركاب عبر المنفذ السحابي</p>
                  </div>
                </div>

                {rechargeRequests.length === 0 ? (
                  <div className="border border-dashed border-slate-800 rounded-3xl p-12 text-center space-y-3">
                    <Clock size={40} className="mx-auto text-slate-600" />
                    <p className="text-sm font-bold text-slate-400">لا توجد أي طلبات شحن مرسلة بعد في السجل.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-slate-800">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-black">
                        <tr>
                          <th className="p-4">المرسل (العميل)</th>
                          <th className="p-4">رقم الهاتف</th>
                          <th className="p-4">المبلغ المراد شحنه</th>
                          <th className="p-4">إيصال الدفع الرقمي</th>
                          <th className="p-4 text-center">حالة الطلب</th>
                          <th className="p-4 text-left">العمليات السريعة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/70">
                        {rechargeRequests.map(req => (
                          <tr key={req.id} className="hover:bg-slate-900/50 transition duration-150">
                            <td className="p-4 font-black text-white flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                              {req.userName}
                            </td>
                            <td className="p-4 font-mono text-slate-300" dir="ltr">{req.userId}</td>
                            <td className="p-4 font-black text-emerald-400 text-sm">{req.amount.toLocaleString()} ل.س</td>
                            <td className="p-4">
                              {req.receiptImage ? (
                                <button 
                                  onClick={() => setZoomedImage(req.receiptImage)}
                                  className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 px-3 py-1.5 rounded-lg text-[10px] font-black text-slate-300 transition"
                                >
                                  <Eye size={12} />
                                  <span>معاينة الإيصال</span>
                                </button>
                              ) : (
                                <span className="text-slate-500">لا يوجد إيصال</span>
                              )}
                            </td>
                            <td className="p-4 text-center">
                              {req.status === 'pending' && (
                                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-full font-black text-[10px]">بانتظار المراجعة</span>
                              )}
                              {req.status === 'approved' && (
                                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full font-black text-[10px]">مقبول ومحسوب</span>
                              )}
                              {req.status === 'rejected' && (
                                <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-1 rounded-full font-black text-[10px]">مرفوض من المشرف</span>
                              )}
                            </td>
                            <td className="p-4 text-left">
                              {req.status === 'pending' ? (
                                <div className="flex gap-2 justify-end">
                                  <button 
                                    disabled={submitting}
                                    onClick={() => handleApprove(req.id)}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-3.5 py-1.5 rounded-xl transition text-[10px]"
                                  >
                                    موافقة وتغذية رصيده
                                  </button>
                                  <button 
                                    disabled={submitting}
                                    onClick={() => handleReject(req.id)}
                                    className="bg-red-950/40 hover:bg-red-900/40 border border-red-900/25 text-red-400 font-black px-3.5 py-1.5 rounded-xl transition text-[10px]"
                                  >
                                    رفض الإيصال
                                  </button>
                                </div>
                              ) : (
                                <span className="text-slate-500 font-medium">تمت المعالجة في النظام</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* View 2: User and Card Directory */}
            {activeTab === 'users' && (
              <div className="space-y-6 text-right">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-black text-white">دليل الركاب المسجلين وقيم البطاقات</h3>
                    <p className="text-xs text-slate-400">استعرض سجل كافة حسابات الركاب والبطاقات المرتبطة بهم لضمان النزاهة المالية</p>
                  </div>

                  {/* Search input */}
                  <div className="relative w-full md:w-80">
                    <Search size={16} className="absolute right-4 top-3.5 text-slate-500" />
                    <input 
                      type="text" 
                      placeholder="ابحث بالاسم، الهاتف أو الهوية الوطنية..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-3 pr-11 pl-4 text-xs font-semibold text-white outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {filteredUsers.length === 0 ? (
                  <div className="border border-dashed border-slate-800 rounded-3xl p-12 text-center space-y-3">
                    <Users size={40} className="mx-auto text-slate-600" />
                    <p className="text-sm font-bold text-slate-400">لم يتم العثور على أي ركاب بالبيانات المدخلة.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {filteredUsers.map(user => {
                      const userCards = cards.filter(c => c.userId === user.phone);
                      return (
                        <div key={user.phone} className="bg-slate-900/40 border border-slate-800 rounded-3xl p-5 space-y-4 shadow">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <img src={user.avatar} className="w-12 h-12 rounded-xl object-cover border border-slate-800" />
                              <div>
                                <h4 className="font-extrabold text-sm text-white">{user.fullName}</h4>
                                <p className="text-[10px] text-slate-400 font-mono" dir="ltr">{user.phone}</p>
                              </div>
                            </div>
                            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md text-[10px] font-black">حساب نشط</span>
                          </div>

                          <div className="border-t border-slate-800/80 pt-3 space-y-2">
                            <p className="text-[10px] text-slate-400 font-black flex justify-between">
                              <span>الهوية الوطنية السورية:</span>
                              <span className="text-white font-mono">{user.nationalId || "غير معرف"}</span>
                            </p>
                            <p className="text-[10px] text-slate-400 font-black flex justify-between">
                              <span>تاريخ إنشاء الحساب:</span>
                              <span className="text-white">{new Date(user.createdAt).toLocaleDateString('ar-SY')}</span>
                            </p>
                          </div>

                          {/* Associated cards list */}
                          <div className="bg-slate-950/60 rounded-2xl p-3 space-y-2 border border-slate-800/40">
                            <p className="text-[10px] font-black text-slate-400 mr-1">البطاقات المصدرة لها ({userCards.length}):</p>
                            
                            {userCards.length === 0 ? (
                              <p className="text-[10px] text-slate-500 italic mr-1">لا توجد أي بطاقات مسجلة حالياً لهذه الركاب.</p>
                            ) : (
                              userCards.map(c => (
                                <div key={c.id} className="flex justify-between items-center text-[11px] bg-slate-900/80 border border-slate-800 rounded-xl p-2.5">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded-full ${c.type === 'physical' ? 'bg-blue-500' : 'bg-emerald-500'}`}></div>
                                    <span className="font-black text-white">{c.alias}</span>
                                    <span className="text-[9px] text-slate-500">({c.type === 'physical' ? 'فيزيائية' : 'رقمية'})</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    {c.pendingNfcAmount && c.pendingNfcAmount > 0 && (
                                      <span className="text-[8px] bg-amber-500/10 text-amber-400 border border-amber-500/25 px-1.5 py-0.5 rounded font-black">معلق NFC: {c.pendingNfcAmount.toLocaleString()} ل.س</span>
                                    )}
                                    <span className="font-mono text-white font-black">{c.balance.toLocaleString()} ل.س</span>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* View 3: Offers Management */}
            {activeTab === 'offers' && (
              <div className="space-y-6 text-right">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Create offer form */}
                  <div className="lg:col-span-1 bg-slate-900/45 border border-slate-800 rounded-3xl p-5 space-y-4 h-fit">
                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                      <Plus size={18} className="text-emerald-500" />
                      <span>إضافة عرض أو حسم ترويجي جديد</span>
                    </h3>
                    <p className="text-[10px] text-slate-400 leading-relaxed">أدخل تفاصيل العرض لتحديثه مباشرة في التطبيقات والميزات لدى كافة الركاب بدمشق والمحافظات</p>

                    <form onSubmit={handleCreateOffer} className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 mb-1">عنوان العرض الترويجي *</label>
                        <input 
                          type="text" 
                          required
                          value={offerTitle}
                          onChange={(e) => setOfferTitle(e.target.value)}
                          placeholder="مثال: خصم لطلاب هندسة الحواسيب 15%"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-slate-400 mb-1">شرح وتفاصيل العرض الدقيقة *</label>
                        <textarea 
                          required
                          value={offerDesc}
                          onChange={(e) => setOfferDesc(e.target.value)}
                          placeholder="مثال: احصل على حسم مباشر على البطاقة عند تفعيل الكود في فرع المزة..."
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 outline-none focus:border-emerald-500 h-24 resize-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 mb-1">قيمة الحسم</label>
                          <input 
                            type="text" 
                            value={offerDiscount}
                            onChange={(e) => setOfferDiscount(e.target.value)}
                            placeholder="مثال: 15%+"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 mb-1">رمز الكود المساعد</label>
                          <input 
                            type="text" 
                            value={offerCode}
                            onChange={(e) => setOfferCode(e.target.value)}
                            placeholder="مثال: ENGI15"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 outline-none focus:border-emerald-500 text-center font-mono uppercase"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-slate-400 mb-1">تاريخ انتهاء صلاحية العرض</label>
                        <input 
                          type="date" 
                          value={offerExpiry}
                          onChange={(e) => setOfferExpiry(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-emerald-500"
                        />
                      </div>

                      <button 
                        type="submit"
                        disabled={submitting}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black py-3 rounded-xl text-xs transition duration-150 shadow-lg shadow-emerald-950/20"
                      >
                        {submitting ? "جاري الإرسال للتخزين السحابي..." : "نشر وتعميم العرض على الركاب"}
                      </button>
                    </form>
                  </div>

                  {/* List active offers */}
                  <div className="lg:col-span-2 space-y-4">
                    <div>
                      <h3 className="text-sm font-black text-white">سجل العروض والخصومات الفعالة</h3>
                      <p className="text-xs text-slate-400">العروض المتاحة حالياً على الصفحة الرئيسية لبرنامج شام كارت للمستخدم النهائي</p>
                    </div>

                    {offers.length === 0 ? (
                      <div className="border border-dashed border-slate-800 rounded-3xl p-12 text-center space-y-3 bg-slate-900/25">
                        <Flame size={40} className="mx-auto text-slate-600" />
                        <p className="text-sm font-bold text-slate-400">لا توجد عروض ترويجية نشطة حالياً.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {offers.map(off => (
                          <div key={off.id} className="bg-slate-900/50 border border-slate-800/80 rounded-3xl p-5 flex flex-col justify-between space-y-4 hover:border-emerald-500/40 transition">
                            <div className="space-y-2">
                              <div className="flex justify-between items-start">
                                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md font-black text-[9px] uppercase tracking-wider">{off.discount || "خصم مميز"}</span>
                                <button 
                                  onClick={() => handleDeleteOffer(off.id)}
                                  className="text-slate-500 hover:text-red-400 p-1 rounded-lg transition"
                                  title="حذف العرض نهائياً"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                              <h4 className="font-extrabold text-sm text-white">{off.title}</h4>
                              <p className="text-[11px] text-slate-400 leading-relaxed font-medium">{off.description}</p>
                            </div>

                            <div className="bg-slate-950/50 rounded-2xl p-2.5 flex justify-between items-center text-[10px] border border-slate-800/40">
                              <div>
                                <p className="text-slate-500 font-bold">تاريخ الانتهاء:</p>
                                <p className="text-white font-mono">{off.expiryDate || "غير محدد"}</p>
                              </div>
                              {off.code && (
                                <div className="text-left font-mono">
                                  <p className="text-slate-500 font-bold text-right">كود التفعيل:</p>
                                  <span className="bg-slate-800 text-slate-200 border border-slate-700/60 px-2.5 py-1 rounded font-black tracking-widest">{off.code}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              </div>
            )}

            {/* View 4: Reports & Financial Revenues */}
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
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/30 text-emerald-400 font-extrabold px-4 py-2.5 rounded-xl text-xs transition active:scale-95 disabled:opacity-50"
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
                        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl"></div>
                        <p className="text-[10px] text-slate-400 font-extrabold mb-1">إيرادات مبيعات التذاكر (QR)</p>
                        <p className="text-xl font-black text-emerald-400">{(reportData.totalBusRevenue || 0).toLocaleString()} ل.س</p>
                        <p className="text-[9px] text-slate-500 font-bold mt-1">محصلة من مسح الباركود مباشرة</p>
                      </div>

                      <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl"></div>
                        <p className="text-[10px] text-slate-400 font-extrabold mb-1">تذاكر العبور الناجحة</p>
                        <p className="text-xl font-black text-white">{(reportData.totalTransactionsCount || 0).toLocaleString()} عبور</p>
                        <p className="text-[9px] text-slate-500 font-bold mt-1">إجمالي الحركات الصالحة بالباصات</p>
                      </div>

                      <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-xl"></div>
                        <p className="text-[10px] text-slate-400 font-extrabold mb-1">شحن الرصيد المعتمد</p>
                        <p className="text-xl font-black text-sky-400">{(reportData.rechargeStats?.approvedAmount || 0).toLocaleString()} ل.س</p>
                        <p className="text-[9px] text-slate-500 font-bold mt-1">مقبول عبر الوكلاء والمشرفين</p>
                      </div>

                      <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl"></div>
                        <p className="text-[10px] text-slate-400 font-extrabold mb-1">مستخدمي النظام النشطين</p>
                        <p className="text-xl font-black text-white">{(reportData.systemStats?.totalUsers || 0).toLocaleString()} ركاب</p>
                        <p className="text-[9px] text-slate-500 font-bold mt-1">إجمالي الحسابات والبطاقات الفعالة</p>
                      </div>
                    </div>

                    {/* Bus Stats Performance & Revenues Breakdown */}
                    <div className="bg-slate-900/25 border border-slate-800/70 rounded-[28px] p-5">
                      <div className="mb-4 text-right">
                        <h4 className="font-extrabold text-sm text-white">أداء وإيرادات خطوط الباصات والميكروباصات</h4>
                        <p className="text-[11px] text-slate-400">تحليل فوري لحصة الدفع الإلكتروني لكل خط حافلة مسجل ومربوط بالنظام</p>
                      </div>

                      <div className="space-y-4">
                        {reportData.busStats?.map((bus: any) => {
                          const percentage = reportData.totalBusRevenue > 0 
                            ? Math.min(100, Math.round((bus.revenue / reportData.totalBusRevenue) * 100))
                            : 0;
                          return (
                            <div key={bus.busId} className="bg-slate-950/60 border border-slate-800/40 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                              <div className="space-y-1 text-right flex-1">
                                <div className="flex items-center gap-2 justify-start">
                                  <span className="bg-slate-800 text-slate-300 font-mono text-[9px] px-2 py-0.5 rounded-md font-bold uppercase">{bus.code}</span>
                                  <h5 className="font-extrabold text-xs text-white">{bus.name}</h5>
                                </div>
                                <p className="text-[10px] text-slate-400">إجمالي صعود الركاب: {bus.passengersCount} راكب</p>
                              </div>

                              <div className="w-full md:w-48 text-right space-y-1">
                                <div className="flex justify-between text-[10px] font-bold">
                                  <span className="text-emerald-400 font-black">{bus.revenue.toLocaleString()} ل.س</span>
                                  <span className="text-slate-500">{percentage}% من الكلي</span>
                                </div>
                                <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                                  <div className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${percentage}%` }}></div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Recent Payments Feed */}
                    <div className="space-y-3">
                      <div className="text-right">
                        <h4 className="font-extrabold text-sm text-white">سجل تدفق الركاب الفوري (آخر 30 رحلة)</h4>
                        <p className="text-xs text-slate-400">البيانات الحية الموثقة لعمليات الدفع عبر مسح QR مباشرة من الحافلات</p>
                      </div>

                      <div className="overflow-x-auto rounded-2xl border border-slate-800">
                        <table className="w-full text-right text-[11px]">
                          <thead className="bg-slate-900 text-slate-400 font-black">
                            <tr>
                              <th className="p-3">اسم الراكب</th>
                              <th className="p-3">الحافلة / الخط</th>
                              <th className="p-3">القيمة المستقطعة</th>
                              <th className="p-3">التاريخ والوقت</th>
                              <th className="p-3 text-center">الموقع والتحقق</th>
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
                                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[9px] font-black">تحقق سحابي آمن</span>
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

          </div>
        )}
      </main>

      {/* Image Zoom Overlay/Modal */}
      {zoomedImage && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50">
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

      {/* Subtle Admin Footer Branding */}
      <footer className="text-center py-6 text-[10px] text-slate-500 border-t border-slate-950 bg-slate-950 font-bold">
        <span>حقوق الإدارة محفوظة © {new Date().getFullYear()} - نظام التحكم الذكي المشترك سحابياً لقاعدة بيانات ChamCard PRO</span>
      </footer>

    </div>
  );
}
