import React, { useState, useMemo } from 'react';
import { Transaction } from '../types';
import { ArrowRight, Search, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Calendar, TrendingDown, TrendingUp, HelpCircle } from 'lucide-react';

interface Props {
  transactions: Transaction[];
  onBack: () => void;
}

const TransactionsHistory: React.FC<Props> = ({ transactions, onBack }) => {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'recharge' | 'pay' | 'transfer'>('all');

  const ninetyDaysAgo = useMemo(() => {
    return Date.now() - 90 * 24 * 60 * 60 * 1000;
  }, []);

  // Filter transactions within the last 90 days
  const validTransactions = useMemo(() => {
    return transactions.filter(tx => tx.timestamp >= ninetyDaysAgo);
  }, [transactions, ninetyDaysAgo]);

  // Apply search and category filter
  const filteredTransactions = useMemo(() => {
    return validTransactions.filter(tx => {
      const matchesSearch = 
        tx.title.toLowerCase().includes(search.toLowerCase()) ||
        tx.subtitle.toLowerCase().includes(search.toLowerCase());
      
      const matchesFilter = 
        activeFilter === 'all' || 
        (activeFilter === 'recharge' && tx.type === 'recharge') ||
        (activeFilter === 'pay' && tx.type === 'pay') ||
        (activeFilter === 'transfer' && tx.type === 'transfer');

      return matchesSearch && matchesFilter;
    });
  }, [validTransactions, search, activeFilter]);

  // Statistics calculation
  const stats = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;

    validTransactions.forEach(tx => {
      if (tx.type === 'recharge') {
        totalIn += tx.amount;
      } else if (tx.type === 'pay') {
        totalOut += Math.abs(tx.amount);
      } else if (tx.type === 'transfer') {
        if (tx.amount > 0) {
          totalIn += tx.amount;
        } else {
          totalOut += Math.abs(tx.amount);
        }
      }
    });

    return { totalIn, totalOut };
  }, [validTransactions]);

  // Helper to format Arabic dates
  const formatDateGroup = (timestamp: number) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'اليوم';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'أمس';
    } else {
      return date.toLocaleDateString('ar-SY', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    }
  };

  // Group by date
  const groupedTransactions = useMemo(() => {
    const groups: { [key: string]: Transaction[] } = {};
    
    // Sort chronologically in descending order
    const sorted = [...filteredTransactions].sort((a, b) => b.timestamp - a.timestamp);

    sorted.forEach(tx => {
      const key = formatDateGroup(tx.timestamp);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(tx);
    });

    return groups;
  }, [filteredTransactions]);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 pb-36 text-slate-800 dark:text-slate-100 p-6" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 pt-6">
        <button 
          id="tx-history-back"
          onClick={onBack}
          className="p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-750 transition active:scale-95"
          aria-label="Back"
        >
          <ArrowRight size={20} />
        </button>
        <div className="text-right">
          <h2 className="text-2xl font-black dark:text-white">سجل العمليات</h2>
          <p className="text-[10px] text-slate-400 font-bold mt-0.5">آخر 90 يوماً</p>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6 px-1">
        <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">ملخص المعاملات الفعالة</span>
        <div className="text-left font-mono text-[10px] text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 px-3 py-1.5 rounded-xl font-bold">
          {validTransactions.length} عملية مسترجعة
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 space-y-6">
        {/* Analytics Card */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/10 rounded-[28px] p-4 flex flex-col justify-between">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-black">إجمالي الشحن</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <TrendingUp size={14} />
              </div>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold">الوارد خلال 90 يوم</p>
              <h3 className="text-md font-black text-emerald-600 mt-1">
                +{stats.totalIn.toLocaleString()} <span className="text-[10px]">ل.س</span>
              </h3>
            </div>
          </div>

          <div className="bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/10 rounded-[28px] p-4 flex flex-col justify-between">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] text-rose-600 dark:text-rose-400 font-black">إجمالي المصاريف</span>
              <div className="w-7 h-7 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-600">
                <TrendingDown size={14} />
              </div>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold">الصادر خلال 90 يوم</p>
              <h3 className="text-md font-black text-rose-600 mt-1">
                -{stats.totalOut.toLocaleString()} <span className="text-[10px]">ل.س</span>
              </h3>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <input 
            type="text"
            placeholder="البحث في العمليات..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-11 pl-4 py-3.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-xs font-bold outline-none focus:border-emerald-500 dark:focus:border-emerald-500/55 transition text-right shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={16} />
        </div>

        {/* Filters Panel */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {[
            { id: 'all', label: 'الكل' },
            { id: 'recharge', label: 'شحن رصيد' },
            { id: 'pay', label: 'دفع رحلات' },
            { id: 'transfer', label: 'تحويلات' }
          ].map(filter => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id as any)}
              className={`px-4 py-2.5 rounded-xl text-xs font-black shrink-0 transition active:scale-95 ${
                activeFilter === filter.id 
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/10' 
                  : 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Transactions list grouped by date */}
        {Object.keys(groupedTransactions).length > 0 ? (
          <div className="space-y-6">
            {Object.keys(groupedTransactions).map(dateGroup => (
              <div key={dateGroup} className="space-y-3">
                <h4 className="text-[11px] font-black text-slate-400 dark:text-slate-500 flex items-center gap-1.5 px-1 uppercase">
                  <Calendar size={12} />
                  {dateGroup}
                </h4>

                <div className="space-y-3">
                  {groupedTransactions[dateGroup].map(tx => {
                    const isRecharge = tx.type === 'recharge';
                    const isTransfer = tx.type === 'transfer';
                    
                    return (
                      <div key={tx.id} className="bg-white dark:bg-slate-900 rounded-[24px] p-4 flex justify-between items-center border border-slate-100 dark:border-slate-850 shadow-sm hover:shadow-md transition duration-200 hover:border-slate-200/50 dark:hover:border-slate-800">
                        <div className="flex items-center gap-3">
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black ${
                            isRecharge 
                              ? 'bg-emerald-50 dark:bg-emerald-950/45 text-emerald-600 dark:text-emerald-400' 
                              : isTransfer 
                              ? 'bg-blue-50 dark:bg-blue-950/45 text-blue-600 dark:text-blue-400'
                              : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300'
                          }`}>
                            {isRecharge ? (
                              <ArrowUpRight size={18} />
                            ) : isTransfer ? (
                              <ArrowLeftRight size={18} />
                            ) : (
                              <ArrowDownLeft size={18} />
                            )}
                          </div>
                          <div className="text-right">
                            <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-100">{tx.title}</h4>
                            <p className="text-[10px] text-slate-400 font-bold mt-0.5">{tx.subtitle || tx.cardName}</p>
                          </div>
                        </div>

                        <div className="text-left">
                          <div className={`font-black text-xs ${
                            isRecharge 
                              ? 'text-emerald-600' 
                              : isTransfer && tx.amount > 0 
                              ? 'text-blue-600 dark:text-blue-400'
                              : isTransfer 
                              ? 'text-rose-600'
                              : 'text-slate-800 dark:text-white'
                          }`}>
                            {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()} ل.س
                          </div>
                          <span className="text-[8px] text-slate-400 block mt-0.5 font-bold">
                            {new Date(tx.timestamp).toLocaleTimeString('ar-SY', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 p-6 shadow-sm">
            <div className="w-14 h-14 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-3 text-slate-400">
              <Calendar size={24} />
            </div>
            <h4 className="font-extrabold text-sm text-slate-800 dark:text-white mb-1">لا توجد معاملات كافية</h4>
            <p className="text-[10px] text-slate-400 max-w-xs font-bold leading-relaxed">
              لم نجد أي معاملات تطابق فلاتر البحث الحالية خلال الـ 90 يوماً الماضية.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionsHistory;
