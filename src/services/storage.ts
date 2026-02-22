export type AIProvider = 'openai' | 'anthropic' | 'gemini';

export interface Credentials {
  openaiKey?: string;
  anthropicKey?: string;
  geminiKey?: string;
  githubToken?: string;
  defaultProvider: AIProvider;
  onboardingComplete: boolean;
}

const STORAGE_KEY = 'forgepad_creds';

export const storage = {
  getCredentials: (): Credentials => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse credentials', e);
      }
    }
    return {
      defaultProvider: 'gemini',
      onboardingComplete: false,
    };
  },

  saveCredentials: (creds: Partial<Credentials>) => {
    const current = storage.getCredentials();
    const updated = { ...current, ...creds };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  },

  clearCredentials: () => {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  }
};
