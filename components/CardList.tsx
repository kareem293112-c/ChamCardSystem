import React, { useMemo, useState } from 'react';
import { Card, AppAction } from '../types';
import { CreditCard, Plus, Trash2, AlertTriangle, XCircle, Pencil, Check, Star, Wifi } from 'lucide-react';

interface Props {
  cards: Card[];
  onDeleteCard: (id: string) => void;
  onRenameCard?: (id: string, newAlias: string) => void;
  onMakePrimary?: (id: string) => void;
  dispatch: (action: AppAction) => void;
  getPermission: (action: AppAction) => { allowed: boolean };
  onTriggerNfcSync?: (card: Card) => void;
}

const CardList: React.FC<Props> = ({ cards, onDeleteCard, onRenameCard, onMakePrimary, dispatch, getPermission, onTriggerNfcSync }) => {
  const [cardToDelete, setCardToDelete] = React.useState<Card | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAlias, setEditAlias] = useState('');

  const isCardExpired = (expiryDate?: string) => {
    if (!expiryDate) return false;
    const [month, year] = expiryDate.split('/').map(Number);
    const expiry = new Date(2000 + year, month, 0); 
    return expiry < new Date();
  };

  const expiredCards = useMemo(() => cards.filter(card => isCardExpired(card.expiryDate)), [cards]);
  const hasExpiredCards = expiredCards.length > 0;

  const confirmDelete = () => {
    if (cardToDelete) {
      onDeleteCard(cardToDelete.id);
      setCardToDelete(null);
    }
  };

  const startEditing = (e: React.MouseEvent, card: Card) => {
    e.stopPropagation();
    setEditingId(card.id);
    setEditAlias(card.alias);
  };

  const saveEditing = (e: React.MouseEvent | React.KeyboardEvent, cardId: string) => {
    e.stopPropagation();
    if (onRenameCard && editAlias.trim()) {
      onRenameCard(cardId, editAlias.trim());
    }
    setEditingId(null);
  };

  const addAllowed = getPermission('ADD_NEW_CARD').allowed && cards.length < 1;

  return (
    <div className="p-6 space-y-6 pb-28">
      <div className="flex justify-between items-center px-2">
        <h2 className="text-2xl font-black text-gray-900 dark:text-white">بطاقاتي</h2>
        {cards.length < 1 && (
          <button 
            onClick={() => dispatch('ADD_NEW_CARD')}
            disabled={!addAllowed}
            className="w-12 h-12 bg-emerald-600 disabled:opacity-50 text-white rounded-2xl flex items-center justify-center shadow-lg active:scale-90 transition shadow-emerald-100 dark:shadow-emerald-900/20"
          >
            <Plus className="w-7 h-7" strokeWidth={2.5} />
          </button>
        )}
      </div>

      {hasExpiredCards && (
        <div className="bg-rose-50 dark:bg-rose-950/20 border-2 border-rose-100 dark:border-rose-900/30 rounded-[32px] p-6 shadow-xl relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="relative z-10 flex items-start gap-4">
            <div className="w-12 h-12 bg-rose-600 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-rose-200">
              <AlertTriangle size={24} strokeWidth={2.5} />
            </div>
            <div className="flex-1 text-right">
              <h4 className="font-black text-rose-900 dark:text-rose-400 text-lg leading-none">تنبيه: بطاقة منتهية</h4>
              <p className="text-xs text-rose-700 dark:text-rose-500/80 font-bold mt-2">
                لديك {expiredCards.length === 1 ? 'بطاقة واحدة منتهية' : `${expiredCards.length} بطاقات منتهية`} الصلاحية. يرجى تجديد الصلاحية لتتمكن من استخدامها في الدفع.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {cards.length > 0 ? (
          cards.map((card, idx) => {
            const expired = isCardExpired(card.expiryDate);
            const isPrimary = idx === 0;
            return (
              <div 
                key={card.id} 
                onClick={() => !expired && !isPrimary && onMakePrimary?.(card.id)}
                className={`group relative rounded-[32px] p-0.5 cursor-pointer transition-all duration-300 ${
                  isPrimary
                    ? 'bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 shadow-xl shadow-emerald-100 dark:shadow-none scale-[1.01]'
                    : expired 
                      ? 'bg-gradient-to-br from-rose-400 to-rose-600 shadow-lg shadow-rose-100' 
                      : 'bg-gradient-to-br from-slate-200 via-slate-100 dark:from-slate-700 dark:via-slate-800 to-white dark:to-slate-900 shadow-sm hover:shadow-md'
                }`}
              >
                <div className={`rounded-[30px] p-5 flex flex-col gap-4 ${
                  isPrimary
                    ? 'bg-white dark:bg-slate-900 border border-emerald-500/10'
                    : expired 
                      ? 'bg-gradient-to-br from-rose-50 via-white to-rose-50/80 dark:from-slate-900 dark:via-rose-950/20 dark:to-slate-900' 
                      : 'bg-gradient-to-br from-white via-slate-50/50 to-emerald-50/10 dark:from-slate-800 dark:via-slate-800 dark:to-slate-900'
                }`}>
                  {/* Card Main Info Row */}
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-500 ${
                        expired 
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-200' 
                        : isPrimary
                          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200 dark:shadow-none'
                          : card.type === 'digital' 
                            ? 'bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800' 
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
                      }`}>
                        {expired ? <XCircle size={26} strokeWidth={2.5} /> : <CreditCard size={26} strokeWidth={2.5} />}
                      </div>
                      
                      <div className="text-right flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {editingId === card.id ? (
                            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
                              <input 
                                type="text"
                                value={editAlias}
                                onChange={e => setEditAlias(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && saveEditing(e, card.id)}
                                className="bg-transparent border-none outline-none text-xs font-bold text-slate-800 dark:text-white text-right px-2 w-28"
                                autoFocus
                              />
                              <button onClick={e => saveEditing(e, card.id)} className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                                <Check size={12} strokeWidth={3} />
                              </button>
                            </div>
                          ) : (
                            <>
                              <h4 className={`font-black text-sm leading-tight transition-colors truncate max-w-[120px] ${expired ? 'text-rose-900 dark:text-rose-400' : 'text-slate-800 dark:text-slate-100'}`}>
                                {card.alias}
                              </h4>
                              <button onClick={e => startEditing(e, card)} className="p-1 text-slate-400 hover:text-emerald-600 transition">
                                <Pencil size={12} />
                              </button>
                            </>
                          )}
                          {expired && (
                            <span className="bg-rose-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full animate-pulse shadow-sm">
                              ملغاة
                            </span>
                          )}
                          {isPrimary && (
                            <span className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[8px] font-black px-2.5 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900 flex items-center gap-1">
                              <Star size={8} fill="currentColor" /> الافتراضية
                            </span>
                          )}
                        </div>
                        <p className={`text-[10px] font-bold tracking-widest mt-0.5 transition-colors ${expired ? 'text-rose-400' : 'text-slate-400 dark:text-slate-500'}`}>
                          {card.cardNumber}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-left">
                        <div className={`font-black text-lg transition-colors ${expired ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-white'}`}>
                          {card.balance.toLocaleString()}
                        </div>
                        <p className={`text-[9px] font-black uppercase tracking-tighter leading-none transition-colors ${expired ? 'text-rose-300 dark:text-rose-600' : 'text-emerald-600'}`}>
                          ل.س متوفر
                        </p>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setCardToDelete(card); }}
                        className="w-10 h-10 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all active:scale-90 bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 hover:bg-rose-50 hover:text-rose-500"
                      >
                        <Trash2 size={18} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>

                  {/* NFC Discharge/Recharge Row for Physical Cards */}
                  {card.type === 'physical' && (
                    <div className="border-t border-slate-100 dark:border-slate-800/60 pt-3 flex flex-col gap-2.5 w-full" onClick={e => e.stopPropagation()}>
                      <div className="flex justify-between items-center text-xs font-bold px-1">
                        <span className="text-slate-400 dark:text-slate-500">الرصيد المعلق بانتظار الشحن:</span>
                        <span className={`transition-colors font-black ${card.pendingNfcAmount && card.pendingNfcAmount > 0 ? 'text-amber-500' : 'text-slate-400 dark:text-slate-600'}`}>
                          {((card.pendingNfcAmount || 0)).toLocaleString()} ل.س
                        </span>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onTriggerNfcSync) {
                            onTriggerNfcSync(card);
                          }
                        }}
                        disabled={!card.pendingNfcAmount || card.pendingNfcAmount <= 0}
                        className={`w-full py-3.5 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                          card.pendingNfcAmount && card.pendingNfcAmount > 0
                            ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/10'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                        }`}
                      >
                        <Wifi className={`w-4 h-4 ${card.pendingNfcAmount && card.pendingNfcAmount > 0 ? 'animate-pulse' : ''}`} />
                        تفريغ الشحن في البطاقة (NFC)
                      </button>
                    </div>
                  )}

                </div>
              </div>
            );
          })
        ) : (
          <div className="py-12 text-center bg-white dark:bg-slate-800 rounded-[40px] border-2 border-dashed border-slate-100 dark:border-slate-700 shadow-inner">
             <div className="w-20 h-20 bg-slate-50 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
               <CreditCard className="w-10 h-10 text-slate-200 dark:text-slate-600" />
             </div>
             <p className="text-slate-400 dark:text-slate-500 font-bold text-sm">لا يوجد بطاقات مسجلة حالياً</p>
          </div>
        )}
      </div>

      {cards.length < 1 && (
        <div 
          onClick={addAllowed ? () => dispatch('ADD_NEW_CARD') : undefined}
          className={`group bg-gradient-to-br from-emerald-50 to-white dark:from-slate-800 dark:to-slate-900 border-2 border-dashed border-emerald-100 dark:border-slate-700 rounded-[40px] p-8 flex flex-col items-center justify-center text-center transition-all shadow-sm ${addAllowed ? 'cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-700 active:scale-[0.98] hover:shadow-md' : 'opacity-50 grayscale cursor-not-allowed'}`}
        >
          <div className="w-16 h-16 bg-white dark:bg-slate-700 p-4 rounded-2xl mb-4 shadow-sm flex items-center justify-center border border-emerald-50 dark:border-emerald-900 group-hover:scale-110 transition-transform duration-500">
            <Plus className="text-emerald-600 dark:text-emerald-400" strokeWidth={3} size={28} />
          </div>
          <h4 className="font-black text-emerald-900 dark:text-emerald-500 text-lg">أضف بطاقة جديدة</h4>
          <p className="text-xs text-emerald-700 dark:text-slate-400 font-bold mt-1.5 opacity-60 leading-relaxed max-w-[200px]">
            استخدم تقنية NFC لربط بطاقتك الفيزيائية أو أنشئ بطاقة رقمية فوراً
          </p>
        </div>
      )}

      {cardToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 z-[600] flex items-center justify-center p-6 animate-in fade-in duration-300 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-[48px] p-8 animate-in zoom-in duration-300 shadow-2xl text-center border border-slate-100 dark:border-slate-700">
            <div className="w-20 h-20 bg-rose-50 dark:bg-rose-950/20 rounded-[32px] flex items-center justify-center mx-auto mb-6 text-rose-500">
               <AlertTriangle size={40} strokeWidth={2.5} />
            </div>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-3">حذف البطاقة</h3>
            <p className="text-slate-500 dark:text-slate-400 font-bold text-sm leading-relaxed mb-8">
              هل أنت متأكد من رغبتك في حذف <span className="text-slate-800 dark:text-white">"{cardToDelete.alias}"</span>؟ 
            </p>
            <div className="flex flex-col gap-3">
              <button onClick={confirmDelete} className="w-full bg-rose-600 text-white font-black py-5 rounded-[24px] shadow-xl active:scale-95 transition">تأكيد الحذف النهائي</button>
              <button onClick={() => setCardToDelete(null)} className="w-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-black py-5 rounded-[24px] active:scale-95 transition">تراجع</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CardList;