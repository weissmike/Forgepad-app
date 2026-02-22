import { useState, useEffect } from 'react';
import { Onboarding } from './components/onboarding/Onboarding';
import { Workspace } from './components/workspace/Workspace';
import { Settings } from './components/settings/Settings';
import { storage } from './services/storage';

export default function App() {
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const creds = storage.getCredentials();
    setOnboardingComplete(creds.onboardingComplete);
  }, []);

  if (onboardingComplete === null) return null;

  if (!onboardingComplete) {
    return <Onboarding onComplete={() => setOnboardingComplete(true)} />;
  }

  return (
    <>
      <Workspace onOpenSettings={() => setShowSettings(true)} />
      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
    </>
  );
}
