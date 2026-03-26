import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_SETTINGS = 'voiceorder_settings';

export interface AppSettings {
    logoBase64?: string;
    companyName?: string;
}

class SettingsStore {
    private settings: AppSettings = {};

    async load() {
        try {
            const json = await AsyncStorage.getItem(KEY_SETTINGS);
            if (json) {
                this.settings = JSON.parse(json);
            }
        } catch (e) {
            console.error("Failed to load settings", e);
        }
    }

    getSettings() {
        return { ...this.settings };
    }

    async saveLogo(base64: string) {
        this.settings.logoBase64 = base64;
        await this.persist();
    }
    
    async saveCompanyName(name: string) {
        this.settings.companyName = name;
        await this.persist();
    }

    private async persist() {
        try {
            await AsyncStorage.setItem(KEY_SETTINGS, JSON.stringify(this.settings));
        } catch (e) {
            console.error("Failed to save settings", e);
        }
    }
}

export const settingsStore = new SettingsStore();
// Load immediately
settingsStore.load();
