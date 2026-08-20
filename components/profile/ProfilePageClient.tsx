'use client';

import { useState } from 'react';
import { Compass, UserRound } from 'lucide-react';
import ProfileForm from '@/app/(main)/dashboard/profilo/ProfileForm';
import { PlannerProfileSection } from '@/components/profile/PlannerProfileSection';
import type { UserProfile } from '@/types/user';
import type { PlannerProfile } from '@/types/planner';

type ProfileTab = 'account' | 'traveler';

const TABS: {
  id: ProfileTab;
  label: string;
  description: string;
  icon: typeof UserRound;
  accent: string;
}[] = [
  {
    id: 'account',
    label: 'Dati personali',
    description: 'Nome, contatti, residenza e consensi',
    icon: UserRound,
    accent: 'hub-accent-sky',
  },
  {
    id: 'traveler',
    label: 'Profilo viaggiatore',
    description: 'Preferenze per il composer e l\'AI',
    icon: Compass,
    accent: 'hub-accent-teal',
  },
];

type ProfilePageClientProps = {
  userProfile: UserProfile | null;
  plannerProfile: PlannerProfile | null;
  displayEmail?: string | null;
};

export function ProfilePageClient({
  userProfile,
  plannerProfile,
  displayEmail,
}: ProfilePageClientProps) {
  const [active, setActive] = useState<ProfileTab>('account');
  const activeMeta = TABS.find((t) => t.id === active)!;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-accent font-medium text-xs uppercase tracking-[0.2em] mb-2">
          Il tuo spazio
        </p>
        <h1 className="font-display text-4xl md:text-5xl font-semibold text-foreground tracking-tight">
          Profilo
        </h1>
        <p className="mt-3 text-muted-foreground max-w-xl text-base leading-relaxed">
          Tieni aggiornati i tuoi dati e le preferenze di viaggio — l&apos;AI e il composer
          useranno queste informazioni per suggerimenti su misura.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
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
              <p className="font-display text-lg font-semibold text-foreground">{tab.label}</p>
              <p className="text-sm text-muted-foreground mt-1">{tab.description}</p>
            </button>
          );
        })}
      </div>

      <div className="hub-panel overflow-hidden rounded-[10px]">
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
          {active === 'account' ? (
            <ProfileForm userProfile={userProfile} displayEmail={displayEmail} />
          ) : (
            <PlannerProfileSection initialProfile={plannerProfile} />
          )}
        </div>
      </div>
    </div>
  );
}