'use client';

import { useState } from 'react';
import { Coins, Mail, Scale, Shield } from 'lucide-react';
import { SettingsCommunicationsSection } from '@/components/settings/SettingsCommunicationsSection';
import { SettingsCreditsSection } from '@/components/settings/SettingsCreditsSection';
import { SettingsSecuritySection } from '@/components/settings/SettingsSecuritySection';
import { SettingsPrivacySection } from '@/components/settings/SettingsPrivacySection';
import type { UserSettings } from '@/types/user';
import type { CreditsPageData } from '@/lib/data/credits';

type SettingsTab = 'credits' | 'communications' | 'security' | 'privacy';

const TABS: {
  id: SettingsTab;
  label: string;
  description: string;
  icon: typeof Mail;
  accent: string;
}[] = [
  {
    id: 'credits',
    label: 'Crediti',
    description: 'Cashback prenotazioni e saldo',
    icon: Coins,
    accent: 'hub-accent-teal',
  },
  {
    id: 'communications',
    label: 'Comunicazioni',
    description: 'Email promozionali e aggiornamenti',
    icon: Mail,
    accent: 'hub-accent-sky',
  },
  {
    id: 'security',
    label: 'Sicurezza',
    description: 'Email di accesso e password',
    icon: Shield,
    accent: 'hub-accent-amber',
  },
  {
    id: 'privacy',
    label: 'Privacy',
    description: 'Diritti GDPR e dati personali',
    icon: Scale,
    accent: 'hub-accent-teal',
  },
];

type SettingsPageClientProps = {
  userSettings: UserSettings | null;
  privacyEmail: string;
  credits: CreditsPageData;
};

export function SettingsPageClient({
  userSettings,
  privacyEmail,
  credits,
}: SettingsPageClientProps) {
  const [active, setActive] = useState<SettingsTab>('credits');
  const activeMeta = TABS.find((t) => t.id === active)!;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-accent font-medium text-xs uppercase tracking-[0.2em] mb-2">
          Account
        </p>
        <h1 className="font-display text-4xl md:text-5xl font-semibold text-white tracking-tight">
          Impostazioni
        </h1>
        <p className="mt-3 text-white/65 max-w-xl text-base leading-relaxed">
          Gestisci comunicazioni, credenziali e i tuoi diritti sulla privacy — tutto in un unico
          posto, con lo stesso stile del profilo.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActive(tab.id)}
              className={`hub-category-card text-left p-5 md:p-6 rounded-2xl transition-all duration-200 ${
                isActive ? `hub-category-active ${tab.accent}` : 'hub-category-idle'
              }`}
            >
              <div
                className={`hub-category-icon mb-4 ${isActive ? 'hub-category-icon-active' : ''}`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <p className="font-display text-lg font-semibold text-white">{tab.label}</p>
              <p className="text-sm text-white/55 mt-1">{tab.description}</p>
            </button>
          );
        })}
      </div>

      <div className="hub-panel rounded-3xl overflow-hidden">
        <div className="hub-panel-header px-6 py-5 flex items-center gap-3 border-b border-border/60">
          <div className="hub-panel-header-icon">
            <activeMeta.icon className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-xl font-semibold text-foreground">
              {activeMeta.label}
            </h2>
            <p className="text-sm text-muted-foreground">{activeMeta.description}</p>
          </div>
        </div>

        <div className="hub-panel-body p-6 md:p-8">
          {active === 'credits' && <SettingsCreditsSection credits={credits} />}
          {active === 'communications' && (
            <SettingsCommunicationsSection userSettings={userSettings} />
          )}
          {active === 'security' && <SettingsSecuritySection userSettings={userSettings} />}
          {active === 'privacy' && <SettingsPrivacySection privacyEmail={privacyEmail} />}
        </div>
      </div>
    </div>
  );
}