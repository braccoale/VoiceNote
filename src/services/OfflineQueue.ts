import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';
import { OfflineQueueItem, TemplateType } from '../types';
import { audioRecordingService } from './AudioRecordingService';

const KEY = 'voiceorder_offline_queue';

export type QueueProcessResult = {
  processed: number;
  failed: number;
  results: Array<{ item: OfflineQueueItem; data: any } | { item: OfflineQueueItem; error: string }>;
};

class OfflineQueueService {
  private queue: OfflineQueueItem[] = [];

  async load(): Promise<void> {
    try {
      const json = await AsyncStorage.getItem(KEY);
      this.queue = json ? JSON.parse(json) : [];
    } catch {
      this.queue = [];
    }
  }

  private async save(): Promise<void> {
    await AsyncStorage.setItem(KEY, JSON.stringify(this.queue));
  }

  async enqueue(projectId: string, audioUri: string, template: TemplateType = 'cantiere'): Promise<OfflineQueueItem> {
    const item: OfflineQueueItem = {
      id: Math.random().toString(36).slice(2),
      projectId,
      audioUri,
      template,
      createdAt: new Date().toISOString(),
    };
    this.queue.push(item);
    await this.save();
    return item;
  }

  getQueue(): OfflineQueueItem[] {
    return [...this.queue];
  }

  getPending(): number {
    return this.queue.length;
  }

  async isOnline(): Promise<boolean> {
    try {
      const state = await Network.getNetworkStateAsync();
      return !!state.isConnected && !!state.isInternetReachable;
    } catch {
      return true; // assume online se non si riesce a verificare
    }
  }

  async processQueue(
    onItemProcessed?: (item: OfflineQueueItem, data: any) => void,
    onItemFailed?: (item: OfflineQueueItem, error: string) => void
  ): Promise<QueueProcessResult> {
    await this.load();
    if (this.queue.length === 0) return { processed: 0, failed: 0, results: [] };

    const online = await this.isOnline();
    if (!online) return { processed: 0, failed: 0, results: [] };

    const result: QueueProcessResult = { processed: 0, failed: 0, results: [] };
    const remaining: OfflineQueueItem[] = [];

    for (const item of this.queue) {
      try {
        const data = await audioRecordingService.transcribeAudio(item.audioUri);
        result.processed++;
        result.results.push({ item, data });
        onItemProcessed?.(item, data);
      } catch (err) {
        const msg = (err as Error).message;
        // Se è un errore di rete, rimette in coda. Altrimenti scarta.
        if (msg.includes('connessione') || msg.includes('NETWORK')) {
          remaining.push(item);
        }
        result.failed++;
        result.results.push({ item, error: msg });
        onItemFailed?.(item, msg);
      }
    }

    this.queue = remaining;
    await this.save();
    return result;
  }

  async clear(): Promise<void> {
    this.queue = [];
    await this.save();
  }
}

export const offlineQueue = new OfflineQueueService();
