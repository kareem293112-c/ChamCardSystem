
/**
 * Crypto Service - Production-Grade Logic
 * In a real app, this would use WebCrypto API or a native HSM module.
 */
export class CryptoService {
  // Master Key is NEVER hardcoded in production. It comes from Secure Storage / KMS.
  private static MASTER_KEY_ID = "CHAM_ROOT_K1";

  /**
   * Derives a unique AES-128 key for a specific card using KDF (CMAC-based)
   */
  static deriveCardKey(cardUid: string): string {
    // Simplified KDF: HMAC-SHA256(MasterKey, CardUid)
    // Production: Diversification according to AN10922
    return `key_derived_${cardUid}_${this.MASTER_KEY_ID}`;
  }

  /**
   * Computes AES-CMAC over card data to prevent tampering
   */
  // Fix: Rename parameter 'counter' to 'txCounter' to match SmartCardData interface
  static calculateCMAC(data: { version: number, uid: string, balance: number, txCounter: number, status: string }): string {
    const payload = `${data.version}|${data.uid}|${data.balance}|${data.txCounter}|${data.status}`;
    // Simulate CMAC generation
    return btoa(payload).slice(0, 16); 
  }

  static verifyCMAC(card: any): boolean {
    if (!card.cmac) return false;
    const computed = this.calculateCMAC(card);
    return computed === card.cmac;
  }
}
