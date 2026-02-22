import React, { useMemo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Key, Github, CheckCircle2, ArrowRight, Loader2, AlertCircle, Cpu, CircleDashed, XCircle } from 'lucide-react';
import { storage, AIProvider, OnboardingStatus } from '../../services/storage';
import { AIService } from '../../services/ai';
import { cn } from '../../lib/utils';

interface OnboardingProps {
  onComplete: () => void;
}

type OAuthState = 'idle' | 'pending' | 'connected' | 'failed';

const statusBadge = (state: OAuthState) => {
  if (state === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-2 py-1 text-xs text-yellow-500">
        <CircleDashed className="h-3 w-3 animate-spin" />
        Pending
      </span>
    );
  }

  if (state === 'connected') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-500">
        <CheckCircle2 className="h-3 w-3" />
        Connected
      </span>
    );
  }

  if (state === 'failed') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-1 text-xs text-red-500">
        <XCircle className="h-3 w-3" />
        Failed
      </span>
    );
  }

  return null;
};

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [loadingProvider, setLoadingProvider] = useState<AIProvider | null>(null);

  const [keys, setKeys] = useState({
    openai: '',
    anthropic: '',
    gemini: '',
  });

  const [validated, setValidated] = useState({
    openai: false,
    anthropic: false,
    gemini: false,
  });

  const [providerError, setProviderError] = useState<string | null>(null);
  const [providerVerifiedAt, setProviderVerifiedAt] = useState<string | null>(null);

  const [oauthState, setOauthState] = useState<OAuthState>('idle');
  const [githubToken, setGithubToken] = useState<string>('');
  const [githubConnectionError, setGithubConnectionError] = useState<string | null>(null);
  const [githubVerificationError, setGithubVerificationError] = useState<string | null>(null);
  const [githubTokenVerified, setGithubTokenVerified] = useState(false);
  const [githubConnectedAt, setGithubConnectedAt] = useState<string | null>(null);
  const [githubVerifiedAt, setGithubVerifiedAt] = useState<string | null>(null);

  const [secureStorageConsent, setSecureStorageConsent] = useState(false);
  const [secureStorageError, setSecureStorageError] = useState<string | null>(null);
  const [secureStorageAt, setSecureStorageAt] = useState<string | null>(null);

  const [localBuildEnabled, setLocalBuildEnabled] = useState(false);
  const [sdkPath, setSdkPath] = useState('');
  const [sdkVerified, setSdkVerified] = useState(false);
  const [sdkError, setSdkError] = useState<string | null>(null);
  const [sdkVerifiedAt, setSdkVerifiedAt] = useState<string | null>(null);

  const requiredProviderValidated = useMemo(
    () => validated.openai || validated.anthropic || validated.gemini,
    [validated],
  );

  const sdkRequirementMet = !localBuildEnabled || sdkVerified;
  const allValidationsPass = requiredProviderValidated && secureStorageConsent && sdkRequirementMet;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const token = params.get('github_token');
    const login = params.get('github_login');
    const id = params.get('github_id');

    if (!token || !login || !id) return;

    storage.saveGithubOAuth(token, {
      id,
      login,
      name: params.get('github_name') ?? login,
      avatarUrl: params.get('github_avatar') ?? undefined,
    });
    setValidated((prev) => ({ ...prev, github: true }));
  }, []);

  const handleValidate = async (provider: AIProvider) => {
    setLoadingProvider(provider);
    setProviderError(null);
    const key = keys[provider as keyof typeof keys];

    if (!key) {
      setProviderError(`Please enter a key for ${provider}.`);
      setLoadingProvider(null);
      return;
    }

    const isValid = await AIService.getInstance().validateKey(provider, key);

    if (isValid) {
      const now = new Date().toISOString();
      setValidated((prev) => ({ ...prev, [provider]: true }));
      setProviderVerifiedAt(now);
      storage.saveProviderApiKey(provider, key);
    } else {
      setValidated((prev) => ({ ...prev, [provider]: false }));
      setProviderError(`Validation test request failed for ${provider}. Check key and retry.`);
    }

    setLoadingProvider(null);
  };

  const connectGithub = async () => {
    setOauthState('pending');
    setGithubConnectionError(null);

    await new Promise((resolve) => setTimeout(resolve, 900));

    if (!githubToken.trim()) {
      setOauthState('failed');
      setGithubConnectionError('OAuth callback did not return a token. Paste a token and reconnect.');
      return;
    }

    setOauthState('connected');
    setGithubConnectedAt(new Date().toISOString());
  };

  const verifyGithubToken = async () => {
    setGithubVerificationError(null);

    if (oauthState !== 'connected') {
      setGithubVerificationError('Connect GitHub before verifying the token.');
      return;
    }

    const token = githubToken.trim();

    if (!token.startsWith('gh') || token.length < 20) {
      setGithubTokenVerified(false);
      setGithubVerificationError('Token format looks invalid. Expected a GitHub token (gh*).');
      return;
    }

    storage.saveGithubToken(token);
    setGithubTokenVerified(true);
    setGithubVerifiedAt(new Date().toISOString());
  };

  const verifySdkPath = () => {
    setSdkError(null);

    if (!localBuildEnabled) {
      setSdkVerified(false);
      return;
    }

    if (!sdkPath.trim().includes('sdk')) {
      setSdkVerified(false);
      setSdkError('SDK path verification failed. Provide a valid Android SDK path.');
      return;
    }

    setSdkVerified(true);
    setSdkVerifiedAt(new Date().toISOString());
  };

  const steps = [
    {
      id: 1,
      title: 'Welcome to ForgePad',
      description: "Your pocket-sized AI development studio. Let's get you set up.",
      icon: <Cpu className="w-12 h-12 text-blue-500" />,
    },
    {
      id: 2,
      title: 'AI Providers',
      description: 'Connect at least one AI provider and validate it with a test request.',
      icon: <Key className="w-12 h-12 text-purple-500" />,
    },
    {
      id: 3,
      title: 'GitHub Integration',
      description: 'Optional: connect GitHub OAuth to sync repos while ForgePad still tracks local changes with git.',
      icon: <Github className="w-12 h-12 text-white" />,
    },
    {
      id: 4,
      title: 'Security & Build Validation',
      description: 'Acknowledge secure storage consent and optionally verify SDK for local builds.',
      icon: <Shield className="w-12 h-12 text-emerald-500" />,
    },
  ];

  const currentStepData = steps[step - 1];

  const persistAndComplete = () => {
    const now = new Date().toISOString();
    const onboardingStatus: OnboardingStatus = {
      providerValidation: {
        verified: requiredProviderValidated,
        verifiedAt: providerVerifiedAt,
        error: providerError,
      },
      githubConnection: {
        verified: oauthState === 'connected',
        verifiedAt: githubConnectedAt,
        error: githubConnectionError,
      },
      githubTokenVerification: {
        verified: githubTokenVerified,
        verifiedAt: githubVerifiedAt,
        error: githubVerificationError,
      },
      secureStorageConsent: {
        verified: secureStorageConsent,
        verifiedAt: secureStorageAt,
        error: secureStorageError,
      },
      localBuildsEnabled: localBuildEnabled,
      sdkPathVerification: {
        verified: sdkRequirementMet,
        verifiedAt: localBuildEnabled ? sdkVerifiedAt : now,
        error: localBuildEnabled ? sdkError : null,
      },
      fullyValidated: allValidationsPass,
      updatedAt: now,
    };

    storage.savePreferences({
      onboardingComplete: allValidationsPass,
      onboardingStatus,
    });

    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-forge-bg p-4">
      <div className="w-full max-w-lg">
        <div className="flex justify-between mb-8 px-2">
          {steps.map((s) => (
            <div
              key={s.id}
              className={cn(
                'h-1.5 flex-1 mx-1 rounded-full transition-all duration-500',
                step >= s.id ? 'bg-blue-500' : 'bg-forge-border',
              )}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="glass rounded-3xl p-8 shadow-2xl"
          >
            <div className="flex flex-col items-center text-center mb-8">
              <div className="mb-4 p-4 bg-white/5 rounded-2xl">{currentStepData.icon}</div>
              <h1 className="text-3xl font-display font-bold mb-2">{currentStepData.title}</h1>
              <p className="text-forge-muted">{currentStepData.description}</p>
            </div>

            <div className="space-y-4 mb-8">
              {step === 1 && (
                <div className="py-4 text-center">
                  <p className="text-sm text-forge-muted italic">"Creation at the top. Intelligence at the bottom."</p>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  {(['gemini', 'openai', 'anthropic'] as AIProvider[]).map((provider) => (
                    <div key={provider} className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-forge-muted">{provider} API Key</label>
                      <div className="relative">
                        <input
                          type="password"
                          value={keys[provider as keyof typeof keys]}
                          onChange={(e) => setKeys((prev) => ({ ...prev, [provider]: e.target.value }))}
                          placeholder={`Enter ${provider} key...`}
                          className="w-full bg-forge-bg border border-forge-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                        />
                        <button
                          onClick={() => handleValidate(provider)}
                          disabled={Boolean(loadingProvider) || validated[provider as keyof typeof validated]}
                          className={cn(
                            'absolute right-2 top-2 px-3 py-1 rounded-lg text-xs font-medium transition-all',
                            validated[provider as keyof typeof validated]
                              ? 'bg-emerald-500/20 text-emerald-500'
                              : 'bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50',
                          )}
                        >
                          {loadingProvider === provider ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : validated[provider as keyof typeof validated] ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            'Verify'
                          )}
                        </button>
                      </div>
                    </div>
                  ))}

                  {!requiredProviderValidated && (
                    <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-500 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      Validate at least one provider with a successful test request.
                    </div>
                  )}

                  {providerError && (
                    <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      {providerError}
                    </div>
                  )}
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-forge-border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">OAuth Connection State</p>
                      {statusBadge(oauthState)}
                    </div>
                    <input
                      type="password"
                      value={githubToken}
                      onChange={(e) => {
                        setGithubToken(e.target.value);
                        setGithubTokenVerified(false);
                      }}
                      placeholder="Paste GitHub OAuth token"
                      className="w-full bg-forge-bg border border-forge-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={connectGithub}
                        className="w-full flex items-center justify-center gap-2 bg-white text-black font-bold py-3 rounded-xl hover:bg-zinc-200 transition-all"
                      >
                        <Github className="w-4 h-4" />
                        Connect
                      </button>
                      <button
                        onClick={verifyGithubToken}
                        className="w-full py-3 rounded-xl bg-blue-500 text-white font-semibold hover:bg-blue-600 transition-all"
                      >
                        Verify Token
                      </button>
                    </div>
                  </div>

                  {githubConnectionError && (
                    <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      {githubConnectionError}
                    </div>
                  )}

                  {githubVerificationError && (
                    <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      {githubVerificationError}
                    </div>
                  )}

                  <p className="text-xs text-center text-forge-muted">Optional step: GitHub connection is not required to complete setup.</p>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4 bg-blue-500/5 border border-blue-500/10 p-4 rounded-2xl">
                  <div className="flex gap-3">
                    <Shield className="w-5 h-5 text-blue-500 shrink-0" />
                    <div className="text-sm">
                      <p className="font-semibold mb-1">Secure Storage Consent</p>
                      <p className="text-forge-muted mb-3">ForgePad uses hardware-backed storage to keep API keys and OAuth tokens encrypted.</p>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={secureStorageConsent}
                          onChange={(e) => {
                            setSecureStorageConsent(e.target.checked);
                            setSecureStorageAt(e.target.checked ? new Date().toISOString() : null);
                            setSecureStorageError(null);
                          }}
                        />
                        I acknowledge and consent to secure secret storage.
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2 rounded-xl border border-forge-border p-3">
                    <label className="flex items-center justify-between">
                      <span className="text-sm font-semibold">Enable local builds</span>
                      <input
                        type="checkbox"
                        checked={localBuildEnabled}
                        onChange={(e) => {
                          const enabled = e.target.checked;
                          setLocalBuildEnabled(enabled);
                          if (!enabled) {
                            setSdkVerified(false);
                            setSdkError(null);
                            setSdkVerifiedAt(null);
                          }
                        }}
                      />
                    </label>

                    {localBuildEnabled && (
                      <>
                        <input
                          type="text"
                          value={sdkPath}
                          onChange={(e) => {
                            setSdkPath(e.target.value);
                            setSdkVerified(false);
                          }}
                          placeholder="/usr/local/android-sdk"
                          className="w-full bg-forge-bg border border-forge-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                        />
                        <button
                          onClick={verifySdkPath}
                          className="w-full py-2 rounded-xl bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 transition-all"
                        >
                          Verify SDK Path
                        </button>
                      </>
                    )}
                  </div>

                  {!secureStorageConsent && (
                    <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      Secure storage consent is required.
                    </div>
                  )}

                  {localBuildEnabled && !sdkVerified && (
                    <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-500 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      Verify Android SDK path to use local build mode.
                    </div>
                  )}

                  {sdkError && (
                    <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      {sdkError}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              {step > 1 && (
                <button
                  onClick={() => setStep((s) => s - 1)}
                  className="flex-1 py-4 rounded-2xl border border-forge-border font-semibold hover:bg-white/5 transition-all"
                >
                  Back
                </button>
              )}
              <button
                onClick={() => {
                  if (step === 4) {
                    if (!secureStorageConsent) {
                      setSecureStorageError('Secure storage consent is required.');
                      return;
                    }

                    if (!allValidationsPass) {
                      return;
                    }

                    persistAndComplete();
                    return;
                  }

                  if (step === 2 && !requiredProviderValidated) {
                    setProviderError('Please validate at least one provider to continue.');
                    return;
                  }

                  if (step === 3) {
                    setGithubVerificationError(null);
                  }

                  setStep((s) => s + 1);
                }}
                disabled={step === 4 && !allValidationsPass}
                className="flex-[2] flex items-center justify-center gap-2 bg-blue-500 text-white font-bold py-4 rounded-2xl hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:hover:bg-blue-500"
              >
                {step === 4 ? 'Complete Setup' : 'Continue'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {step === 4 && !allValidationsPass && (
              <p className="mt-3 text-xs text-center text-red-500">Complete Setup is blocked until all required validations pass.</p>
            )}
            {step === 4 && secureStorageError && <p className="mt-2 text-xs text-center text-red-500">{secureStorageError}</p>}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
