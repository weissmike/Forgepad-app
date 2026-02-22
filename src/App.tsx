import { useState, useEffect } from 'react';
import { Onboarding } from './components/onboarding/Onboarding';
import { Workspace } from './components/workspace/Workspace';
import { Settings } from './components/settings/Settings';
import { storage } from './services/storage';
import { RuntimeSessionProvider } from './state/runtimeSession';

export default function App() {
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const prefs = storage.getPreferences();
    setOnboardingComplete(Boolean(prefs.onboardingStatus?.fullyValidated));
  }, []);

  if (onboardingComplete === null) return null;

  if (!onboardingComplete) {
    return <Onboarding onComplete={() => setOnboardingComplete(true)} />;
  }

  return (
    <RuntimeSessionProvider>
      <Workspace onOpenSettings={() => setShowSettings(true)} />
      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
    </RuntimeSessionProvider>
  );
}
