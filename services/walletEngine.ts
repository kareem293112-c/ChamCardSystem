
import { SmartCardData, SystemConfig, OfflineTransaction, UserRole } from '../types';
import { CryptoService } from './cryptoService';

export class WalletEngine {
  static validateTap(card: SmartCardData, config: SystemConfig): { valid: boolean; error?: string } {
    // 1. التحقق من سلامة البيانات عبر CMAC
    if (!CryptoService.verifyCMAC(card)) {
      return { valid: false, error: 'تلاعب بالبيانات (CMAC Error)' };
    }

    // 2. التحقق من دورة حياة البطاقة - يجب أن تكون نشطة حصراً
    if (card.status !== 'active') {
      const statusMsgs = {
        'blocked': 'البطاقة محظورة حالياً',
        'uninitialized': 'البطاقة غير مهيئة للعمل',
      };
      return { valid: false, error: statusMsgs[card.status as keyof typeof statusMsgs] || 'حالة البطاقة غير صالحة' };
    }
    
    // 3. التحقق من الرصيد الكافي للرحلة
    if (card.balance < config.fareAmount) return { valid: false, error: 'الرصيد غير كافٍ' };

    // 4. منع النقر المزدوج السريع (Anti-Passback)
    const now = Date.now();
    if (card.lastTapTime && (now - card.lastTapTime < config.antiPassbackSeconds * 1000)) {
      return { valid: false, error: 'انتظر قليلاً قبل النقر مجدداً' };
    }

    return { valid: true };
  }

  static createDebitTx(card: SmartCardData, config: SystemConfig, role: UserRole): { updatedCard: SmartCardData, tx: OfflineTransaction } {
    const updatedCard: SmartCardData = {
      ...card,
      balance: card.balance - config.fareAmount,
      txCounter: card.txCounter + 1,
      lastTapTime: Date.now()
    };
    
    // تحديث CMAC فوراً قبل إرجاع البيانات لضمان المزامنة الصحيحة
    updatedCard.cmac = CryptoService.calculateCMAC(updatedCard);

    const tx: OfflineTransaction = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      cardUid: card.uid,
      amount: config.fareAmount,
      type: 'debit',
      role: role,
      deviceId: config.deviceId,
      counterBefore: card.txCounter,
      counterAfter: updatedCard.txCounter,
      synced: false
    };

    return { updatedCard, tx };
  }
}
