import { Audio } from 'expo-av';
import { Platform } from 'react-native';
import { Config } from '../lib/config';

export class TranscriptionError extends Error {
  constructor(message: string, public readonly code: 'PERMISSION' | 'NETWORK' | 'AI' | 'UNKNOWN') {
    super(message);
    this.name = 'TranscriptionError';
  }
}

export class AudioRecordingService {
  private recording: Audio.Recording | null = null;
  private sound: Audio.Sound | null = null;

  async requestPermissions(): Promise<boolean> {
    const { status } = await Audio.requestPermissionsAsync();
    return status === 'granted';
  }

  async startRecording(onStatusUpdate?: (status: Audio.RecordingStatus) => void): Promise<void> {
    try {
      if (this.sound) {
        await this.sound.unloadAsync();
        this.sound = null;
      }

      const permission = await this.requestPermissions();
      if (!permission) {
        throw new TranscriptionError('Permesso microfono negato', 'PERMISSION');
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
        (status) => { if (onStatusUpdate) onStatusUpdate(status); },
        100
      );
      this.recording = recording;
    } catch (err) {
      if (err instanceof TranscriptionError) throw err;
      throw new TranscriptionError(`Impossibile avviare la registrazione: ${(err as Error).message}`, 'UNKNOWN');
    }
  }

  async stopRecording(): Promise<string | null> {
    if (!this.recording) return null;
    try {
      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      this.recording = null;
      return uri;
    } catch (error) {
      console.error('Failed to stop recording', error);
      return null;
    }
  }

  async playAudio(uri: string): Promise<void> {
    try {
      if (this.sound) await this.sound.unloadAsync();
      const { sound } = await Audio.Sound.createAsync({ uri });
      this.sound = sound;
      await sound.playAsync();
    } catch (error) {
      console.error('Failed to play audio', error);
    }
  }

  async stopAudio(): Promise<void> {
    if (this.sound) await this.sound.stopAsync();
  }

  async transcribeAudio(uri: string): Promise<{ text: string; data: any }> {
    try {
      const formData = new FormData();

      if (Platform.OS === 'web') {
        const response = await fetch(uri);
        const blob = await response.blob();
        formData.append('file', blob, 'recording.m4a');
      } else {
        formData.append('file', {
          uri,
          name: 'recording.m4a',
          type: 'audio/m4a',
        } as any);
      }

      let uploadResponse: Response;
      try {
        uploadResponse = await fetch(Config.transcribeUrl, {
          method: 'POST',
          body: formData,
          headers: {
            'x-function-secret': Config.functionSecret,
          },
        });
      } catch {
        throw new TranscriptionError('Nessuna connessione. Il report verrà processato appena torni online.', 'NETWORK');
      }

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        if (uploadResponse.status >= 500) {
          throw new TranscriptionError('Servizio AI momentaneamente non disponibile. Riprova tra poco.', 'AI');
        }
        throw new TranscriptionError(`Errore server (${uploadResponse.status}): ${errorText}`, 'UNKNOWN');
      }

      const data = await uploadResponse.json();
      if (data.error) {
        throw new TranscriptionError(`Errore AI: ${data.error}`, 'AI');
      }
      return data;
    } catch (err) {
      if (err instanceof TranscriptionError) throw err;
      throw new TranscriptionError(`Trascrizione fallita: ${(err as Error).message}`, 'UNKNOWN');
    }
  }

  async unloadAudio(): Promise<void> {
    if (this.sound) {
      await this.sound.unloadAsync();
      this.sound = null;
    }
  }

  isRecording(): boolean {
    return !!this.recording;
  }
}

export const audioRecordingService = new AudioRecordingService();
