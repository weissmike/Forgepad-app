export type AIProvider = 'openai' | 'anthropic' | 'gemini';

type SecretStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

interface SecretPayload {
  providerKeys: Partial<Record<AIProvider, string>>;
  githubToken?: string;
}

export interface OnboardingVerificationStep {
  verified: boolean;
  verifiedAt: string | null;
  error: string | null;
}

export interface OnboardingStatus {
  providerValidation: OnboardingVerificationStep;
  githubConnection: OnboardingVerificationStep;
  githubTokenVerification: OnboardingVerificationStep;
  secureStorageConsent: OnboardingVerificationStep;
  localBuildsEnabled: boolean;
  sdkPathVerification: OnboardingVerificationStep;
  fullyValidated: boolean;
  updatedAt: string | null;
}

export interface StoragePreferences {
  defaultProvider: AIProvider;
  onboardingComplete: boolean;
  onboardingStatus: OnboardingStatus;
  providerFallbackEnabled: boolean;
  prDraftingEnabled: boolean;
  ciPollingEnabled: boolean;
  localBuildMode: boolean;
  cloudFallbackEnabled: boolean;
  safeMode: boolean;
  biometricProtectionEnabled: boolean;
  githubAccount: GithubAccount | null;
}

export interface Credentials {
  defaultProvider: AIProvider;
  onboardingComplete: boolean;
  providerFallbackEnabled: boolean;
  prDraftingEnabled: boolean;
  ciPollingEnabled: boolean;
  localBuildMode: boolean;
  cloudFallbackEnabled: boolean;
  safeMode: boolean;
  biometricProtectionEnabled: boolean;
  providers: Record<AIProvider, { configured: boolean; masked: string }>;
  github: { configured: boolean; masked: string; account: GithubAccount | null };
}

const PREFS_STORAGE_KEY = 'forgepad_prefs';
const SECRET_STORAGE_KEY = 'forgepad_secure';
const DEFAULT_PREFS: StoragePreferences = {
  defaultProvider: 'gemini',
  onboardingComplete: false,
  onboardingStatus: {
    providerValidation: { verified: false, verifiedAt: null, error: null },
    githubConnection: { verified: false, verifiedAt: null, error: null },
    githubTokenVerification: { verified: false, verifiedAt: null, error: null },
    secureStorageConsent: { verified: false, verifiedAt: null, error: null },
    localBuildsEnabled: false,
    sdkPathVerification: { verified: false, verifiedAt: null, error: null },
    fullyValidated: false,
    updatedAt: null,
  },
  providerFallbackEnabled: true,
  prDraftingEnabled: true,
  ciPollingEnabled: true,
  localBuildMode: false,
  cloudFallbackEnabled: true,
  safeMode: true,
  biometricProtectionEnabled: false,
  githubAccount: null,
};

const PREFS_CHANGED_EVENT = 'forgepad:prefs-changed';

const providerMaskPrefix: Record<AIProvider, string> = {
  gemini: 'GEM',
  openai: 'OAI',
  anthropic: 'ANT',
};

const pickSecretStorage = (): SecretStorage | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  if (window.sessionStorage) {
    return window.sessionStorage;
  }

  return null;
};

const safeJsonParse = <T>(value: string | null, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.error('Failed to parse storage payload', error);
    return fallback;
  }
};

const maskSecret = (value: string, prefix = 'TOK') => {
  if (!value) return '';
  if (value.length <= 6) return `${prefix}•••`;
  return `${prefix}•••${value.slice(-4)}`;
};

const readPrefs = (): StoragePreferences => {
  if (typeof window === 'undefined') {
    return DEFAULT_PREFS;
  }

  const parsed = safeJsonParse<Partial<StoragePreferences>>(
    window.localStorage.getItem(PREFS_STORAGE_KEY),
    DEFAULT_PREFS,
  );

  return {
    defaultProvider: parsed.defaultProvider ?? DEFAULT_PREFS.defaultProvider,
    onboardingComplete: parsed.onboardingComplete ?? DEFAULT_PREFS.onboardingComplete,
    onboardingStatus: {
      ...DEFAULT_PREFS.onboardingStatus,
      ...parsed.onboardingStatus,
    },
    providerFallbackEnabled:
      parsed.providerFallbackEnabled ??
      // legacy key
      (parsed as Partial<{ fallbackEnabled: boolean }>).fallbackEnabled ??
      DEFAULT_PREFS.providerFallbackEnabled,
    prDraftingEnabled: parsed.prDraftingEnabled ?? DEFAULT_PREFS.prDraftingEnabled,
    ciPollingEnabled: parsed.ciPollingEnabled ?? DEFAULT_PREFS.ciPollingEnabled,
    localBuildMode: parsed.localBuildMode ?? DEFAULT_PREFS.localBuildMode,
    cloudFallbackEnabled: parsed.cloudFallbackEnabled ?? DEFAULT_PREFS.cloudFallbackEnabled,
    safeMode: parsed.safeMode ?? DEFAULT_PREFS.safeMode,
    biometricProtectionEnabled:
      parsed.biometricProtectionEnabled ?? DEFAULT_PREFS.biometricProtectionEnabled,
    githubAccount: parsed.githubAccount ?? DEFAULT_PREFS.githubAccount,
  };
};

const savePrefs = (updates: Partial<StoragePreferences>) => {
  if (typeof window === 'undefined') return DEFAULT_PREFS;

  const next = { ...readPrefs(), ...updates };
  window.localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(PREFS_CHANGED_EVENT, { detail: next }));
  return next;
};

const readSecrets = (): SecretPayload => {
  const secretStore = pickSecretStorage();
  if (!secretStore) {
    return { providerKeys: {} };
  }

  const parsed = safeJsonParse<SecretPayload>(
    secretStore.getItem(SECRET_STORAGE_KEY),
    { providerKeys: {} },
  );

  return {
    providerKeys: parsed.providerKeys ?? {},
    githubToken: parsed.githubToken,
  };
};

const writeSecrets = (next: SecretPayload) => {
  const secretStore = pickSecretStorage();
  if (!secretStore) return;
  secretStore.setItem(SECRET_STORAGE_KEY, JSON.stringify(next));
};

const buildCredentialsView = (): Credentials => {
  const prefs = readPrefs();
  const secrets = readSecrets();

  return {
    ...prefs,
    providers: {
      gemini: {
        configured: Boolean(secrets.providerKeys.gemini),
        masked: secrets.providerKeys.gemini ? maskSecret(secrets.providerKeys.gemini, providerMaskPrefix.gemini) : 'Not configured',
      },
      openai: {
        configured: Boolean(secrets.providerKeys.openai),
        masked: secrets.providerKeys.openai ? maskSecret(secrets.providerKeys.openai, providerMaskPrefix.openai) : 'Not configured',
      },
      anthropic: {
        configured: Boolean(secrets.providerKeys.anthropic),
        masked: secrets.providerKeys.anthropic ? maskSecret(secrets.providerKeys.anthropic, providerMaskPrefix.anthropic) : 'Not configured',
      },
    },
    github: {
      configured: Boolean(secrets.githubToken),
      masked: secrets.githubToken ? maskSecret(secrets.githubToken, 'GH') : 'Not connected',
      account: prefs.githubAccount,
    },
  };
};

export const storage = {
  getCredentials: (): Credentials => buildCredentialsView(),

  getPreferences: (): StoragePreferences => readPrefs(),

  onPreferencesChanged: (listener: (prefs: StoragePreferences) => void) => {
    if (typeof window === 'undefined') return () => {};

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<StoragePreferences>).detail;
      listener(detail ?? readPrefs());
    };

    window.addEventListener(PREFS_CHANGED_EVENT, handler);
    return () => window.removeEventListener(PREFS_CHANGED_EVENT, handler);
  },

  savePreferences: (updates: Partial<StoragePreferences>) => {
    savePrefs(updates);
    return buildCredentialsView();
  },

  saveProviderApiKey: (provider: AIProvider, key: string) => {
    const current = readSecrets();
    writeSecrets({
      ...current,
      providerKeys: {
        ...current.providerKeys,
        [provider]: key,
      },
    });
    return buildCredentialsView();
  },

  removeProviderApiKey: (provider: AIProvider) => {
    const current = readSecrets();
    const nextProviderKeys = { ...current.providerKeys };
    delete nextProviderKeys[provider];
    writeSecrets({ ...current, providerKeys: nextProviderKeys });
    return buildCredentialsView();
  },

  withProviderApiKey: async <T>(provider: AIProvider, fn: (key: string) => Promise<T>) => {
    const key = readSecrets().providerKeys[provider];
    if (!key) throw new Error(`${provider} API Key missing`);
    return fn(key);
  },

  getConfiguredProviders: (): AIProvider[] => {
    const secrets = readSecrets();
    return (['gemini', 'openai', 'anthropic'] as AIProvider[]).filter((provider) => {
      if (provider === 'gemini' && typeof process !== 'undefined' && process.env.GEMINI_API_KEY) {
        return true;
      }
      return Boolean(secrets.providerKeys[provider]);
    });
  },

  saveGithubToken: (token: string) => {
    const current = readSecrets();
    writeSecrets({ ...current, githubToken: token });
    return buildCredentialsView();
  },

  saveGithubOAuth: (token: string, account: GithubAccount) => {
    const current = readSecrets();
    writeSecrets({ ...current, githubToken: token });
    savePrefs({ githubAccount: account });
    return buildCredentialsView();
  },

  removeGithubToken: () => {
    const current = readSecrets();
    writeSecrets({ ...current, githubToken: undefined });
    savePrefs({ githubAccount: null });
    return buildCredentialsView();
  },

  withGithubToken: async <T>(fn: (token: string) => Promise<T>) => {
    const token = readSecrets().githubToken;
    if (!token) throw new Error('GitHub OAuth token missing');
    return fn(token);
  },

  clearCredentials: () => {
    if (typeof window === 'undefined') return;

    window.localStorage.removeItem(PREFS_STORAGE_KEY);
    const secretStore = pickSecretStorage();
    secretStore?.removeItem(SECRET_STORAGE_KEY);
    window.location.reload();
  },
};
