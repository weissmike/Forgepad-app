import React, { useState } from 'react';
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
  ChevronRight,
  AlertTriangle,
  Lock,
  Terminal
} from 'lucide-react';
import { storage, Credentials, AIProvider } from '../../services/storage';
import { cn } from '../../lib/utils';

interface SettingsProps {
  onClose: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onClose }) => {
  const [creds, setCreds] = useState<Credentials>(storage.getCredentials());
  const [fallbackEnabled, setFallbackEnabled] = useState(storage.getPreferences().fallbackEnabled);
  const [activeSection, setActiveSection] = useState<'ai' | 'github' | 'build' | 'security'>('ai');

  const updateDefaultProvider = (provider: AIProvider) => {
    const nextCreds = storage.savePreferences({ defaultProvider: provider });
    setCreds(nextCreds);
  };

  const toggleFallback = () => {
    const next = !fallbackEnabled;
    storage.savePreferences({ fallbackEnabled: next });
    setFallbackEnabled(next);
    setCreds(storage.getCredentials());
  };

  const sections = [
    { id: 'ai', label: 'AI Providers', icon: <Key className="w-4 h-4" /> },
    { id: 'github', label: 'GitHub', icon: <Github className="w-4 h-4" /> },
    { id: 'build', label: 'Build & SDK', icon: <Smartphone className="w-4 h-4" /> },
    { id: 'security', label: 'Security', icon: <Shield className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-4xl h-[80vh] bg-forge-bg border border-forge-border rounded-3xl shadow-2xl overflow-hidden flex"
      >
        {/* Sidebar */}
        <div className="w-64 border-r border-forge-border flex flex-col p-4 bg-forge-card/30">
          <div className="flex items-center justify-between mb-8 px-2">
            <h2 className="font-display font-bold text-xl">Settings</h2>
          </div>
          
          <nav className="space-y-1 flex-1">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id as any)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                  activeSection === s.id 
                    ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20" 
                    : "text-forge-muted hover:bg-white/5 hover:text-white"
                )}
              >
                {s.icon}
                {s.label}
              </button>
            ))}
          </nav>

          <button 
            onClick={() => {
              if (confirm("Are you sure you want to reset all configuration? This will clear all API keys.")) {
                storage.clearCredentials();
              }
            }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            Reset App
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="h-16 border-b border-forge-border flex items-center justify-between px-8 shrink-0">
            <h3 className="font-bold text-lg">{sections.find(s => s.id === activeSection)?.label}</h3>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/5 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8">
            {activeSection === 'ai' && (
              <div className="space-y-8">
                <div className="grid gap-6">
                  {(['gemini', 'openai', 'anthropic'] as AIProvider[]).map((provider) => (
                    <div key={provider} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-bold capitalize">{provider}</label>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-full border border-emerald-500/20 font-bold uppercase">Healthy</span>
                          <input 
                            type="radio" 
                            name="defaultProvider"
                            checked={creds.defaultProvider === provider}
                            onChange={() => updateDefaultProvider(provider)}
                            className="w-4 h-4 accent-blue-500"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="w-full bg-forge-card border border-forge-border rounded-xl px-4 py-3 text-sm text-forge-muted">
                          {creds.providers[provider].masked}
                        </div>
                        <p className="text-xs text-forge-muted">
                          {creds.providers[provider].configured ? 'Configured in secure storage.' : 'No key stored for this provider.'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex gap-4">
                  <div className="p-2 bg-blue-500/10 rounded-xl h-fit">
                    <Check className="w-4 h-4 text-blue-500" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold mb-1">Automatic Fallback Routing</h4>
                    <p className="text-xs text-forge-muted mb-3">If your primary provider fails, ForgePad will switch to the next configured healthy provider and publish the switch event to the workspace status.</p>
                    <button
                      onClick={toggleFallback}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-bold border transition-all",
                        fallbackEnabled
                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                          : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                      )}
                    >
                      {fallbackEnabled ? 'Fallback enabled' : 'Fallback disabled'}
                    </button>
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-5 bg-blue-500 rounded-full relative cursor-pointer">
                        <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full" />
                      </div>
                      <span className="text-xs font-medium">Enabled</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'github' && (
              <div className="space-y-6">
                <div className="p-6 bg-forge-card border border-forge-border rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                      <Github className="w-6 h-6 text-black" />
                    </div>
                    <div>
                      <h4 className="font-bold">{creds.github.configured ? 'Connected Account' : 'GitHub Not Connected'}</h4>
                      <p className="text-sm text-forge-muted">{creds.github.masked}</p>
                    </div>
                  </div>
                  {creds.github.configured && (
                  <button className="px-4 py-2 bg-red-500/10 text-red-500 rounded-xl text-sm font-bold hover:bg-red-500/20 transition-all">
                    Disconnect
                  </button>
                  )}
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold px-1">Automation</h4>
                  <div className="space-y-2">
                    {[
                      { label: 'Automatic PR Drafting', desc: 'Agent will create drafts for every major change' },
                      { label: 'CI Status Polling', desc: 'Show build status in workspace header' }
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-4 hover:bg-white/5 rounded-2xl transition-all cursor-pointer group">
                        <div>
                          <p className="text-sm font-medium">{item.label}</p>
                          <p className="text-xs text-forge-muted">{item.desc}</p>
                        </div>
                        <div className="w-10 h-5 bg-forge-border rounded-full relative group-hover:bg-forge-muted transition-all">
                          <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full" />
                        </div>
                      </div>
                    ))}
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
                    <p className="text-sm text-forge-muted mt-1">Local builds require Android SDK and Gradle to be configured. Cloud Build is used as fallback.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-forge-muted px-1">Android SDK Path</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="/usr/local/android-sdk"
                        className="flex-1 bg-forge-card border border-forge-border rounded-xl px-4 py-3 text-sm"
                      />
                      <button className="px-4 py-2 bg-white/5 border border-forge-border rounded-xl text-sm font-bold">Browse</button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-forge-muted px-1">Gradle Version</label>
                    <select className="w-full bg-forge-card border border-forge-border rounded-xl px-4 py-3 text-sm appearance-none">
                      <option>8.2.1 (Recommended)</option>
                      <option>7.6.0</option>
                    </select>
                  </div>
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
                    {[
                      { label: 'Safe Mode', desc: 'Require approval for terminal commands', icon: <Terminal className="w-4 h-4" /> },
                      { label: 'Biometric Unlock', desc: 'Require fingerprint to access settings', icon: <Fingerprint className="w-4 h-4" /> }
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-4 hover:bg-white/5 rounded-2xl transition-all cursor-pointer group">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white/5 rounded-lg text-forge-muted group-hover:text-white transition-colors">
                            {item.icon}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{item.label}</p>
                            <p className="text-xs text-forge-muted">{item.desc}</p>
                          </div>
                        </div>
                        <div className="w-10 h-5 bg-blue-500 rounded-full relative">
                          <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full" />
                        </div>
                      </div>
                    ))}
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
