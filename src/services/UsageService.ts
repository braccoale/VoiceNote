import AsyncStorage from '@react-native-async-storage/async-storage';

const keyMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const KEY_TRANSCRIPTIONS = () => `usage_transcriptions_${keyMonth()}`;
const KEY_PDFS           = () => `usage_pdfs_${keyMonth()}`;

class UsageService {
  // ─── Transcriptions ──────────────────────────────────────────

  async getTranscriptionCount(): Promise<number> {
    const val = await AsyncStorage.getItem(KEY_TRANSCRIPTIONS());
    return val ? parseInt(val, 10) : 0;
  }

  async incrementTranscription(): Promise<void> {
    const current = await this.getTranscriptionCount();
    await AsyncStorage.setItem(KEY_TRANSCRIPTIONS(), String(current + 1));
  }

  // ─── PDF Exports ─────────────────────────────────────────────

  async getPDFCount(): Promise<number> {
    const val = await AsyncStorage.getItem(KEY_PDFS());
    return val ? parseInt(val, 10) : 0;
  }

  async incrementPDF(): Promise<void> {
    const current = await this.getPDFCount();
    await AsyncStorage.setItem(KEY_PDFS(), String(current + 1));
  }

  // ─── Helpers ─────────────────────────────────────────────────

  /** Returns remaining count, or null if limit is null (unlimited) */
  remaining(used: number, limit: number | null): number | null {
    if (limit === null) return null;
    return Math.max(0, limit - used);
  }

  async getUsageSummary(): Promise<{ transcriptions: number; pdfs: number }> {
    const [transcriptions, pdfs] = await Promise.all([
      this.getTranscriptionCount(),
      this.getPDFCount(),
    ]);
    return { transcriptions, pdfs };
  }
}

export const usageService = new UsageService();
