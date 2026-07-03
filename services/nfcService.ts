
import { SmartCardData } from '../types';
import { CryptoService } from './cryptoService';

const PHYSICAL_CARD_STORAGE_KEY = 'mock_nfc_card_chip_';

export const NFCService = {
  async scanCard(): Promise<SmartCardData | null> {
    await new Promise(r => setTimeout(r, 400));
    
    const uid = '96308822';
    const rawData = localStorage.getItem(PHYSICAL_CARD_STORAGE_KEY + uid);
    
    if (!rawData) {
      const data: SmartCardData = {
        uid,
        version: 1,
        balance: 0,
        txCounter: 0,
        status: 'uninitialized',
        issuerKeyId: 'master_v1'
      };
      // حساب CMAC للبطاقة الجديدة لضمان اجتياز فحص المحفظة الأولي
      data.cmac = CryptoService.calculateCMAC(data);
      return data;
    }
    
    return JSON.parse(rawData);
  },

  async writeCard(card: SmartCardData): Promise<boolean> {
    await new Promise(r => setTimeout(r, 600));
    
    // إعادة حساب CMAC إجبارياً قبل كل عملية تخزين (Write)
    const cardWithHmac: SmartCardData = {
      ...card,
      cmac: CryptoService.calculateCMAC(card)
    };
    
    localStorage.setItem(PHYSICAL_CARD_STORAGE_KEY + card.uid, JSON.stringify(cardWithHmac));
    return true;
  },

  async initializeNewCard(uid: string): Promise<SmartCardData> {
    const newCard: SmartCardData = {
      uid,
      version: 1,
      balance: 1000, // رصيد ترحيبي عند التهيئة
      txCounter: 0,
      status: 'active',
      issuerKeyId: 'master_v1'
    };
    
    // حساب وتخزين CMAC فوراً لضمان صلاحية البطاقة المهيأة
    newCard.cmac = CryptoService.calculateCMAC(newCard);
    await this.writeCard(newCard);
    return newCard;
  }
};
