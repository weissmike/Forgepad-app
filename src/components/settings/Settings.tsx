import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  X,
  Shield,
  Key,
  Github,
  Smartphone,
  Fingerprint,
  RotateCcw,
  Check,
  AlertTriangle,
  Lock,
  Terminal,
  Loader2,
} from 'lucide-react';
import { storage, Credentials, AIProvider, StoragePreferences } from '../../services/storage';
import { AIService } from '../../services/ai';
import { cn } from '../../lib/utils';

interface SettingsProps {
  onClose: () => void;
}

const providers: AIProvider[] = ['gemini', 'openai', 'anthropic'];

export const Settings: React.FC<SettingsProps> = ({ onClose }) => {
  const [creds, setCreds] = useState<Credentials>(storage.getCredentials());
  const [prefs, setPrefs] = useState<StoragePreferences>(storage.getPreferences());
  const [activeSection, setActiveSection] = useState<'ai' | 'github' | 'build' | 'security'>('ai');
  const [providerInputs, setProviderInputs] = useState<Record<AIProvider, string>>({
    gemini: '',
    openai: '',
    anthropic: '',
  });
  const [providerStatus, setProviderStatus] = useState<Record<AIProvider, string>>({
    gemini: '',
    openai: '',
    anthropic: '',
  });
  const [providerLoading, setProviderLoading] = useState<Record<AIProvider, boolean>>({
    gemini: false,
    openai: false,
    anthropic: false,
  });

  const updatePrefs = (updates: Partial<StoragePreferences>) => {
    const nextCreds = storage.savePreferences(updates);
    setCreds(nextCreds);
    setPrefs(storage.getPreferences());
  };

  const upsertProviderKey = async (provider: AIProvider, mode: 'update' | 'rotate') => {
    const key = providerInputs[provider].trim();
    if (!key) {
      setProviderStatus((prev) => ({ ...prev, [provider]: 'Enter an API key first.' }));
      return;
    }

    setProviderLoading((prev) => ({ ...prev, [provider]: true }));
    setProviderStatus((prev) => ({ ...prev, [provider]: 'Validating key…' }));

    const valid = await AIService.getInstance().validateKey(provider, key);
    if (!valid) {
      setProviderStatus((prev) => ({ ...prev, [provider]: 'Validation failed. Key not saved.' }));
      setProviderLoading((prev) => ({ ...prev, [provider]: false }));
      return;
    }

    const nextCreds = storage.saveProviderApiKey(provider, key);
    setCreds(nextCreds);
    setProviderInputs((prev) => ({ ...prev, [provider]: '' }));
    setProviderStatus((prev) => ({
      ...prev,
      [provider]: mode === 'rotate' ? 'Key rotated and validated successfully.' : 'Key saved and validated successfully.',
    }));
    setProviderLoading((prev) => ({ ...prev, [provider]: false }));
  };

  const clearProviderKey = (provider: AIProvider) => {
    const nextCreds = storage.removeProviderApiKey(provider);
    setCreds(nextCreds);
    setProviderInputs((prev) => ({ ...prev, [provider]: '' }));
    setProviderStatus((prev) => ({ ...prev, [provider]: 'Key cleared.' }));
  };

  const sections = useMemo(
    () => [
      { id: 'ai', label: 'AI Providers', icon: <Key className="w-4 h-4" /> },
      { id: 'github', label: 'GitHub', icon: <Github className="w-4 h-4" /> },
      { id: 'build', label: 'Build & SDK', icon: <Smartphone className="w-4 h-4" /> },
      { id: 'security', label: 'Security', icon: <Shield className="w-4 h-4" /> },
    ],
    [],
  );

  const Toggle = ({
    enabled,
    onToggle,
    label,
    desc,
  }: {
    enabled: boolean;
    onToggle: () => void;
    label: string;
    desc: string;
  }) => (
    <div className="flex items-center justify-between p-4 hover:bg-white/5 rounded-2xl transition-all">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-forge-muted">{desc}</p>
      </div>
      <button
        onClick={onToggle}
        className={cn(
          'w-10 h-5 rounded-full relative transition-all',
          enabled ? 'bg-blue-500' : 'bg-forge-border',
        )}
        aria-label={label}
      >
        <div
          className={cn(
            'absolute top-1 w-3 h-3 bg-white rounded-full transition-all',
            enabled ? 'right-1' : 'left-1',
          )}
        />
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-4xl h-[80vh] bg-forge-bg border border-forge-border rounded-3xl shadow-2xl overflow-hidden flex"
      >
        <div className="w-64 border-r border-forge-border flex flex-col p-4 bg-forge-card/30">
          <div className="flex items-center justify-between mb-8 px-2">
            <h2 className="font-display font-bold text-xl">Settings</h2>
          </div>

          <nav className="space-y-1 flex-1">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id as 'ai' | 'github' | 'build' | 'security')}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all',
                  activeSection === s.id
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                    : 'text-forge-muted hover:bg-white/5 hover:text-white',
                )}
              >
                {s.icon}
                {s.label}
              </button>
            ))}
          </nav>

          <button
            onClick={() => {
              if (
                confirm(
                  'Are you sure you want to reset all configuration? This clears API keys, OAuth, settings, and onboarding progress.',
                )
              ) {
                storage.clearCredentials();
              }
            }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            Reset App
          </button>
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <div className="h-16 border-b border-forge-border flex items-center justify-between px-8 shrink-0">
            <h3 className="font-bold text-lg">{sections.find((s) => s.id === activeSection)?.label}</h3>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8">
            {activeSection === 'ai' && (
              <div className="space-y-8">
                <div className="grid gap-6">
                  {providers.map((provider) => {
                    const configured = creds.providers[provider].configured;

                    return (
                      <div key={provider} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-bold capitalize">{provider}</label>
                          <input
                            type="radio"
                            name="defaultProvider"
                            checked={creds.defaultProvider === provider}
                            onChange={() => updatePrefs({ defaultProvider: provider })}
                            className="w-4 h-4 accent-blue-500"
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="w-full bg-forge-card border border-forge-border rounded-xl px-4 py-3 text-sm text-forge-muted">
                            {creds.providers[provider].masked}
                          </div>
                          <input
                            type="password"
                            value={providerInputs[provider]}
                            onChange={(e) =>
                              setProviderInputs((prev) => ({ ...prev, [provider]: e.target.value }))
                            }
                            placeholder={`Enter ${provider} API key`}
                            className="w-full bg-forge-card border border-forge-border rounded-xl px-4 py-3 text-sm"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => upsertProviderKey(provider, 'update')}
                              disabled={providerLoading[provider]}
                              className="px-3 py-2 bg-blue-500/10 text-blue-400 rounded-lg text-xs font-bold border border-blue-500/20"
                            >
                              {providerLoading[provider] ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Add / Update key'}
                            </button>
                            <button
                              onClick={() => upsertProviderKey(provider, 'rotate')}
                              disabled={providerLoading[provider] || !configured}
                              className="px-3 py-2 bg-amber-500/10 text-amber-400 rounded-lg text-xs font-bold border border-amber-500/20 disabled:opacity-50"
                            >
                              Rotate key
                            </button>
                            <button
                              onClick={() => clearProviderKey(provider)}
                              disabled={!configured}
                              className="px-3 py-2 bg-red-500/10 text-red-400 rounded-lg text-xs font-bold border border-red-500/20 disabled:opacity-50"
                            >
                              Clear key
                            </button>
                          </div>
                          <p className="text-xs text-forge-muted">{providerStatus[provider]}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex gap-4">
                  <div className="p-2 bg-blue-500/10 rounded-xl h-fit">
                    <Check className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="w-full">
                    <h4 className="text-sm font-bold mb-1">Automatic Fallback Routing</h4>
                    <p className="text-xs text-forge-muted mb-3">
                      If your primary provider fails, ForgePad switches to the next configured provider.
                    </p>
                    <Toggle
                      enabled={prefs.providerFallbackEnabled}
                      onToggle={() =>
                        updatePrefs({ providerFallbackEnabled: !prefs.providerFallbackEnabled })
                      }
                      label={prefs.providerFallbackEnabled ? 'Fallback enabled' : 'Fallback disabled'}
                      desc="Control provider failover behavior"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'github' && (
              <div className="space-y-6">
                <div className="p-6 bg-forge-card border border-forge-border rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center overflow-hidden">
                      {creds.github.account?.avatarUrl ? (
                        <img src={creds.github.account.avatarUrl} alt="GitHub avatar" className="w-full h-full object-cover" />
                      ) : (
                        <Github className="w-6 h-6 text-black" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold">
                        {creds.github.configured ? (creds.github.account?.name ?? 'Connected Account') : 'GitHub Not Connected'}
                      </h4>
                      <p className="text-sm text-forge-muted">
                        {creds.github.account ? `@${creds.github.account.login}` : creds.github.masked}
                      </p>
                    </div>
                  </div>
                  {creds.github.configured && (
                    <button
                      onClick={() => setCreds(storage.removeGithubToken())}
                      className="px-4 py-2 bg-red-500/10 text-red-500 rounded-xl text-sm font-bold hover:bg-red-500/20 transition-all"
                    >
                      Disconnect
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold px-1">Automation</h4>
                  <div className="space-y-2">
                    <Toggle
                      enabled={prefs.prDraftingEnabled}
                      onToggle={() => updatePrefs({ prDraftingEnabled: !prefs.prDraftingEnabled })}
                      label="Automatic PR Drafting"
                      desc="Agent creates PR drafts for major changes"
                    />
                    <Toggle
                      enabled={prefs.ciPollingEnabled}
                      onToggle={() => updatePrefs({ ciPollingEnabled: !prefs.ciPollingEnabled })}
                      label="CI Status Polling"
                      desc="Show build status in workspace header"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'build' && (
              <div className="space-y-6">
                <div className="p-6 bg-yellow-500/5 border border-yellow-500/10 rounded-2xl flex gap-4">
                  <AlertTriangle className="w-6 h-6 text-yellow-500 shrink-0" />
                  <div>
                    <h4 className="font-bold text-yellow-500">Local Build Mode</h4>
                    <p className="text-sm text-forge-muted mt-1">
                      Local builds require Android SDK and Gradle to be configured.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Toggle
                    enabled={prefs.localBuildMode}
                    onToggle={() => updatePrefs({ localBuildMode: !prefs.localBuildMode })}
                    label="Local Build Mode"
                    desc="Prefer local Android build tooling"
                  />
                  <Toggle
                    enabled={prefs.cloudFallbackEnabled}
                    onToggle={() => updatePrefs({ cloudFallbackEnabled: !prefs.cloudFallbackEnabled })}
                    label="Cloud Build Fallback"
                    desc="Fallback to cloud build when local build is unavailable"
                  />
                </div>
              </div>
            )}

            {activeSection === 'security' && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <Lock className="w-5 h-5 text-emerald-500" />
                      <div>
                        <p className="text-sm font-bold">Hardware Keystore Active</p>
                        <p className="text-xs text-forge-muted">Your secrets are protected by TEE/StrongBox.</p>
                      </div>
                    </div>
                    <Check className="w-5 h-5 text-emerald-500" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-4 hover:bg-white/5 rounded-2xl transition-all">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/5 rounded-lg text-forge-muted">
                          <Terminal className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Safe Mode</p>
                          <p className="text-xs text-forge-muted">Require approval for terminal commands</p>
                        </div>
                      </div>
                      <button
                        onClick={() => updatePrefs({ safeMode: !prefs.safeMode })}
                        className={cn('w-10 h-5 rounded-full relative transition-all', prefs.safeMode ? 'bg-blue-500' : 'bg-forge-border')}
                      >
                        <div className={cn('absolute top-1 w-3 h-3 bg-white rounded-full transition-all', prefs.safeMode ? 'right-1' : 'left-1')} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 hover:bg-white/5 rounded-2xl transition-all">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/5 rounded-lg text-forge-muted">
                          <Fingerprint className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Biometric Unlock</p>
                          <p className="text-xs text-forge-muted">Require fingerprint to access settings</p>
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          updatePrefs({
                            biometricProtectionEnabled: !prefs.biometricProtectionEnabled,
                          })
                        }
                        className={cn(
                          'w-10 h-5 rounded-full relative transition-all',
                          prefs.biometricProtectionEnabled ? 'bg-blue-500' : 'bg-forge-border',
                        )}
                      >
                        <div
                          className={cn(
                            'absolute top-1 w-3 h-3 bg-white rounded-full transition-all',
                            prefs.biometricProtectionEnabled ? 'right-1' : 'left-1',
                          )}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
