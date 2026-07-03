
import { PilotConfig } from '../types';

export class ConfigService {
  private static STORAGE_KEY = 'pilot_config';

  static getDefaultConfig(): PilotConfig {
    return {
      isEnabled: true,
      fareAmount: 500,
      maxDailyRidesPerDevice: 1000,
      antiPassbackSeconds: 5,
      requireDeviceAuth: true,
      version: "v1.0.0-PILOT"
    };
  }

  static getConfig(): PilotConfig {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    return saved ? JSON.parse(saved) : this.getDefaultConfig();
  }

  static updateConfig(config: Partial<PilotConfig>) {
    const current = this.getConfig();
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify({ ...current, ...config }));
  }

  // Debug/Simulation Flags
  static setFailureSimulation(key: string, value: boolean) {
    localStorage.setItem(`sim_${key}`, String(value));
  }

  static getFailureSimulation(key: string): boolean {
    return localStorage.getItem(`sim_${key}`) === 'true';
  }
}
