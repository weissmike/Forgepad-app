import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AIService, ProviderRuntimeEvent } from '../services/ai';
import { storage, AIProvider, Credentials, ProviderHealthState, StoragePreferences } from '../services/storage';

interface RuntimeSessionState {
  credentials: Credentials;
  preferences: StoragePreferences;
  activeProvider: AIProvider;
  providerHealth: Record<AIProvider, ProviderHealthState>;
  providerNotice: string;
  setActiveProvider: (provider: AIProvider) => void;
  setProviderNotice: (notice: string) => void;
  refresh: () => void;
}

const RuntimeSessionContext = createContext<RuntimeSessionState | null>(null);

export const RuntimeSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [credentials, setCredentials] = useState<Credentials>(storage.getCredentials());
  const [preferences, setPreferences] = useState<StoragePreferences>(storage.getPreferences());
  const [activeProvider, setActiveProviderState] = useState<AIProvider>(storage.getPreferences().defaultProvider);
  const [providerNotice, setProviderNotice] = useState('Ready');

  const refresh = () => {
    setCredentials(storage.getCredentials());
    const prefs = storage.getPreferences();
    setPreferences(prefs);
  };

  useEffect(() => {
    const unsubscribePrefs = storage.onPreferencesChanged((prefs) => {
      setPreferences(prefs);
      setCredentials(storage.getCredentials());
      setActiveProviderState(prefs.defaultProvider);
    });

    const unsubscribeRuntime = AIService.getInstance().subscribeRuntimeEvents((event: ProviderRuntimeEvent) => {
      if (event.type === 'provider_switch') {
        setActiveProviderState(event.to);
        setProviderNotice(`Fallback ${event.from} → ${event.to} (${event.reason})`);
      }

      if (event.type === 'provider_health') {
        refresh();
      }
    });

    return () => {
      unsubscribePrefs();
      unsubscribeRuntime();
    };
  }, []);

  const setActiveProvider = (provider: AIProvider) => {
    storage.savePreferences({ defaultProvider: provider });
    setActiveProviderState(provider);
    setProviderNotice(`Manual switch to ${provider}`);
  };

  const value = useMemo<RuntimeSessionState>(() => ({
    credentials,
    preferences,
    activeProvider,
    providerHealth: preferences.providerHealth,
    providerNotice,
    setActiveProvider,
    setProviderNotice,
    refresh,
  }), [credentials, preferences, activeProvider, providerNotice]);

  return <RuntimeSessionContext.Provider value={value}>{children}</RuntimeSessionContext.Provider>;
};

export const useRuntimeSession = () => {
  const context = useContext(RuntimeSessionContext);
  if (!context) {
    throw new Error('useRuntimeSession must be used within RuntimeSessionProvider');
  }
  return context;
};
