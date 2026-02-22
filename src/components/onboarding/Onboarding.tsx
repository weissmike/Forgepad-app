import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Key, Github, CheckCircle2, ArrowRight, Loader2, AlertCircle, Cpu } from 'lucide-react';
import { storage, AIProvider } from '../../services/storage';
import { AIService } from '../../services/ai';
import { cn } from '../../lib/utils';

interface OnboardingProps {
  onComplete: () => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [keys, setKeys] = useState({
    openai: '',
    anthropic: '',
    gemini: '',
    github: ''
  });

  const [validated, setValidated] = useState({
    openai: false,
    anthropic: false,
    gemini: false,
    github: false
  });

  const handleValidate = async (provider: AIProvider) => {
    setLoading(true);
    setError(null);
    const key = keys[provider as keyof typeof keys];
    
    if (!key) {
      setError(`Please enter a key for ${provider}`);
      setLoading(false);
      return;
    }

    const isValid = await AIService.getInstance().validateKey(provider, key);
    
    if (isValid) {
      setValidated(prev => ({ ...prev, [provider]: true }));
      storage.saveCredentials({ [`${provider}Key`]: key });
    } else {
      setError(`Invalid API key for ${provider}. Please check and try again.`);
    }
    setLoading(false);
  };

  const canProceed = validated.openai || validated.anthropic || validated.gemini;

  const steps = [
    {
      id: 1,
      title: "Welcome to ForgePad",
      description: "Your pocket-sized AI development studio. Let's get you set up.",
      icon: <Cpu className="w-12 h-12 text-blue-500" />
    },
    {
      id: 2,
      title: "AI Providers",
      description: "Connect at least one AI provider to power your agent.",
      icon: <Key className="w-12 h-12 text-purple-500" />
    },
    {
      id: 3,
      title: "GitHub Integration",
      description: "Connect your GitHub account to sync projects and deploy.",
      icon: <Github className="w-12 h-12 text-white" />
    },
    {
      id: 4,
      title: "Security & Storage",
      description: "Your keys are stored securely in the hardware-backed keystore.",
      icon: <Shield className="w-12 h-12 text-emerald-500" />
    }
  ];

  const currentStepData = steps[step - 1];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-forge-bg p-4">
      <div className="w-full max-w-lg">
        {/* Progress Indicator */}
        <div className="flex justify-between mb-8 px-2">
          {steps.map((s) => (
            <div 
              key={s.id}
              className={cn(
                "h-1.5 flex-1 mx-1 rounded-full transition-all duration-500",
                step >= s.id ? "bg-blue-500" : "bg-forge-border"
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
              <div className="mb-4 p-4 bg-white/5 rounded-2xl">
                {currentStepData.icon}
              </div>
              <h1 className="text-3xl font-display font-bold mb-2">{currentStepData.title}</h1>
              <p className="text-forge-muted">{currentStepData.description}</p>
            </div>

            <div className="space-y-4 mb-8">
              {step === 1 && (
                <div className="py-4 text-center">
                  <p className="text-sm text-forge-muted italic">
                    "Creation at the top. Intelligence at the bottom."
                  </p>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  {(['gemini', 'openai', 'anthropic'] as AIProvider[]).map((provider) => (
                    <div key={provider} className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-forge-muted">
                        {provider} API Key
                      </label>
                      <div className="relative">
                        <input
                          type="password"
                          value={keys[provider as keyof typeof keys]}
                          onChange={(e) => setKeys(prev => ({ ...prev, [provider]: e.target.value }))}
                          placeholder={`Enter ${provider} key...`}
                          className="w-full bg-forge-bg border border-forge-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                        />
                        <button
                          onClick={() => handleValidate(provider)}
                          disabled={loading || validated[provider as keyof typeof validated]}
                          className={cn(
                            "absolute right-2 top-2 px-3 py-1 rounded-lg text-xs font-medium transition-all",
                            validated[provider as keyof typeof validated] 
                              ? "bg-emerald-500/20 text-emerald-500"
                              : "bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
                          )}
                        >
                          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 
                           validated[provider as keyof typeof validated] ? <CheckCircle2 className="w-3 h-3" /> : "Verify"}
                        </button>
                      </div>
                    </div>
                  ))}
                  {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      {error}
                    </div>
                  )}
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <button 
                    onClick={() => setValidated(v => ({ ...v, github: true }))}
                    className="w-full flex items-center justify-center gap-3 bg-white text-black font-bold py-4 rounded-2xl hover:bg-zinc-200 transition-all"
                  >
                    <Github className="w-5 h-5" />
                    Connect with GitHub
                  </button>
                  <p className="text-xs text-center text-forge-muted">
                    OAuth tokens are stored encrypted in the Android Keystore.
                  </p>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4 bg-blue-500/5 border border-blue-500/10 p-4 rounded-2xl">
                  <div className="flex gap-3">
                    <Shield className="w-5 h-5 text-blue-500 shrink-0" />
                    <div className="text-sm">
                      <p className="font-semibold mb-1">Hardware-Backed Security</p>
                      <p className="text-forge-muted">ForgePad uses the Android Keystore system to ensure your API keys never touch persistent storage in plaintext.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              {step > 1 && (
                <button
                  onClick={() => setStep(s => s - 1)}
                  className="flex-1 py-4 rounded-2xl border border-forge-border font-semibold hover:bg-white/5 transition-all"
                >
                  Back
                </button>
              )}
              <button
                onClick={() => {
                  if (step === 4) {
                    storage.saveCredentials({ onboardingComplete: true });
                    onComplete();
                  } else {
                    if (step === 2 && !canProceed) {
                      setError("Please configure at least one provider to continue.");
                      return;
                    }
                    setStep(s => s + 1);
                  }
                }}
                className="flex-[2] flex items-center justify-center gap-2 bg-blue-500 text-white font-bold py-4 rounded-2xl hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20"
              >
                {step === 4 ? "Complete Setup" : "Continue"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
