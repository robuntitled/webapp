'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { savePlannerProfile } from '@/lib/composer/client-planner';
import {
  ACCOMMODATION_OPTIONS,
  BUDGET_OPTIONS,
  EXPERIENCE_OPTIONS,
  INTEREST_OPTIONS,
  PACE_OPTIONS,
  TRAVEL_STYLE_OPTIONS,
} from '@/lib/composer/planner-options';
import { EMPTY_PLANNER_PROFILE, type PlannerProfile } from '@/types/planner';
import { Heart, Sparkles, Wallet, Zap } from 'lucide-react';
import { toast } from 'sonner';

type PlannerProfileSectionProps = {
  initialProfile: PlannerProfile | null;
};

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3.5 py-2 text-sm transition-all ${
        active
          ? 'border-primary bg-primary/10 text-primary font-medium shadow-sm'
          : 'border-border/80 bg-background text-muted-foreground hover:border-primary/35 hover:bg-muted/50'
      }`}
    >
      {children}
    </button>
  );
}

function OptionCard({
  active,
  onClick,
  title,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left text-sm transition-all ${
        active
          ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/15'
          : 'border-border/80 hover:border-primary/25 hover:bg-muted/30'
      }`}
    >
      <span className="font-medium text-foreground">{title}</span>
      <span className="block text-xs text-muted-foreground mt-1 leading-relaxed">{hint}</span>
    </button>
  );
}

function Subsection({
  icon: Icon,
  title,
  hint,
  children,
}: {
  icon: typeof Heart;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <Label className="text-base font-semibold text-foreground">{title}</Label>
        </div>
        {hint && <p className="text-xs text-muted-foreground mt-1 ml-6">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

export function PlannerProfileSection({ initialProfile }: PlannerProfileSectionProps) {
  const [profile, setProfile] = useState<PlannerProfile>(initialProfile ?? EMPTY_PLANNER_PROFILE);
  const [saving, setSaving] = useState(false);

  const patch = (partial: Partial<PlannerProfile>) => {
    setProfile((prev) => ({ ...prev, ...partial }));
  };

  const toggleInterest = (id: string) => {
    const next = profile.interests.includes(id)
      ? profile.interests.filter((i) => i !== id)
      : [...profile.interests, id].slice(0, 8);
    patch({ interests: next });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await savePlannerProfile(profile);
      toast.success('Profilo viaggiatore salvato — l\'AI userà queste preferenze.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-10">
      <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
        Queste preferenze alimentano il Trip Composer e i suggerimenti AI. Puoi modificarle qui
        senza rifare il wizard di creazione viaggio.
      </p>

      <Subsection icon={Heart} title="Stile di viaggio">
        <div className="flex flex-wrap gap-2">
          {TRAVEL_STYLE_OPTIONS.map((opt) => (
            <Chip
              key={opt.id}
              active={profile.travelStyle === opt.id}
              onClick={() => patch({ travelStyle: opt.id })}
            >
              {opt.emoji} {opt.label}
            </Chip>
          ))}
        </div>
      </Subsection>

      <Subsection icon={Zap} title="Ritmo della giornata">
        <div className="grid gap-3 sm:grid-cols-3">
          {PACE_OPTIONS.map((opt) => (
            <OptionCard
              key={opt.id}
              active={profile.pace === opt.id}
              onClick={() => patch({ pace: opt.id })}
              title={opt.label}
              hint={opt.hint}
            />
          ))}
        </div>
      </Subsection>

      <Subsection icon={Sparkles} title="Interessi" hint="Scegli fino a 8">
        <div className="flex flex-wrap gap-2">
          {INTEREST_OPTIONS.map((opt) => (
            <Chip
              key={opt.id}
              active={profile.interests.includes(opt.id)}
              onClick={() => toggleInterest(opt.id)}
            >
              {opt.emoji} {opt.label}
            </Chip>
          ))}
        </div>
      </Subsection>

      <Subsection icon={Wallet} title="Budget indicativo">
        <div className="grid gap-3 sm:grid-cols-3">
          {BUDGET_OPTIONS.map((opt) => (
            <OptionCard
              key={opt.id}
              active={profile.budgetLevel === opt.id}
              onClick={() => patch({ budgetLevel: opt.id })}
              title={opt.label}
              hint={opt.hint}
            />
          ))}
        </div>
      </Subsection>

      <div className="grid gap-8 lg:grid-cols-2">
        <Subsection icon={Heart} title="Alloggio preferito">
          <div className="flex flex-wrap gap-2">
            {ACCOMMODATION_OPTIONS.map((opt) => (
              <Chip
                key={opt.id}
                active={profile.accommodationPref === opt.id}
                onClick={() => patch({ accommodationPref: opt.id })}
              >
                {opt.label}
              </Chip>
            ))}
          </div>
        </Subsection>

        <Subsection icon={Sparkles} title="Esperienza con le destinazioni">
          <div className="space-y-2">
            {EXPERIENCE_OPTIONS.map((opt) => (
              <OptionCard
                key={opt.id}
                active={profile.experienceLevel === opt.id}
                onClick={() => patch({ experienceLevel: opt.id })}
                title={opt.label}
                hint={opt.hint}
              />
            ))}
          </div>
        </Subsection>
      </div>

      <div className="space-y-4 rounded-2xl border border-border/60 bg-muted/30 p-5 md:p-6">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Sparkles className="h-4 w-4 text-accent" />
          Note per l&apos;AI
          <span className="text-xs font-normal text-muted-foreground">(opzionale)</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="dietary">Dieta / allergie</Label>
            <Textarea
              id="dietary"
              placeholder="Es. vegetariano, senza glutine…"
              value={profile.dietaryNotes ?? ''}
              onChange={(e) => patch({ dietaryNotes: e.target.value || undefined })}
              rows={2}
              className="rounded-xl resize-none"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mobility">Mobilità / accessibilità</Label>
            <Textarea
              id="mobility"
              placeholder="Es. poco cammino, evitare scale…"
              value={profile.mobilityNotes ?? ''}
              onChange={(e) => patch({ mobilityNotes: e.target.value || undefined })}
              rows={3}
              className="rounded-xl resize-none"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="freeNotes">Altro</Label>
            <Textarea
              id="freeNotes"
              placeholder="Es. viaggio fotografico, early bird…"
              value={profile.freeNotes ?? ''}
              onChange={(e) => patch({ freeNotes: e.target.value || undefined })}
              rows={3}
              className="rounded-xl resize-none"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2 border-t border-border/60">
        <p className="text-xs text-muted-foreground">
          Le modifiche si applicano ai prossimi viaggi che componi.
        </p>
        <Button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="rounded-full px-8"
        >
          {saving ? 'Salvataggio…' : 'Salva profilo viaggiatore'}
        </Button>
      </div>
    </div>
  );
}