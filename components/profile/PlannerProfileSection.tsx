'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Compass, Sparkles } from 'lucide-react';

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
      className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
        active
          ? 'border-primary bg-primary/10 text-primary font-medium'
          : 'border-border bg-background text-muted-foreground hover:border-primary/40'
      }`}
    >
      {children}
    </button>
  );
}

export function PlannerProfileSection({ initialProfile }: PlannerProfileSectionProps) {
  const [profile, setProfile] = useState<PlannerProfile>(initialProfile ?? EMPTY_PLANNER_PROFILE);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

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
    setMessage('');
    try {
      await savePlannerProfile(profile);
      setMessage('Profilo viaggiatore salvato — l\'AI userà queste preferenze nei prossimi viaggi.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="max-w-3xl mt-8">
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Compass className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl">Profilo viaggiatore</CardTitle>
            <CardDescription>
              Preferenze usate dal Trip Composer e dall&apos;AI per suggerimenti su misura.
              Modificale qui senza rifare il wizard.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-8">
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Stile di viaggio</Label>
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
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-semibold">Ritmo della giornata</Label>
          <div className="grid gap-2 sm:grid-cols-3">
            {PACE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => patch({ pace: opt.id })}
                className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                  profile.pace === opt.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/30'
                }`}
              >
                <span className="font-medium">{opt.label}</span>
                <span className="block text-xs text-muted-foreground mt-0.5">{opt.hint}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-semibold">Interessi</Label>
          <p className="text-xs text-muted-foreground">Scegli fino a 8</p>
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
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-semibold">Budget indicativo</Label>
          <div className="grid gap-2 sm:grid-cols-3">
            {BUDGET_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => patch({ budgetLevel: opt.id })}
                className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                  profile.budgetLevel === opt.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/30'
                }`}
              >
                <span className="font-medium">{opt.label}</span>
                <span className="block text-xs text-muted-foreground mt-0.5">{opt.hint}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Alloggio preferito</Label>
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
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-semibold">Esperienza con le destinazioni</Label>
            <div className="space-y-2">
              {EXPERIENCE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => patch({ experienceLevel: opt.id })}
                  className={`w-full rounded-lg border p-2.5 text-left text-sm transition-colors ${
                    profile.experienceLevel === opt.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/30'
                  }`}
                >
                  <span className="font-medium">{opt.label}</span>
                  <span className="block text-xs text-muted-foreground">{opt.hint}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4 border-t pt-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            Note opzionali per l&apos;AI
          </div>
          <div className="space-y-2">
            <Label htmlFor="dietary">Dieta / allergie</Label>
            <Textarea
              id="dietary"
              placeholder="Es. vegetariano, senza glutine…"
              value={profile.dietaryNotes ?? ''}
              onChange={(e) => patch({ dietaryNotes: e.target.value || undefined })}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mobility">Mobilità / accessibilità</Label>
            <Textarea
              id="mobility"
              placeholder="Es. poco cammino, evitare scale…"
              value={profile.mobilityNotes ?? ''}
              onChange={(e) => patch({ mobilityNotes: e.target.value || undefined })}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="freeNotes">Altro</Label>
            <Textarea
              id="freeNotes"
              placeholder="Es. viaggio fotografico, early bird, niente club…"
              value={profile.freeNotes ?? ''}
              onChange={(e) => patch({ freeNotes: e.target.value || undefined })}
              rows={3}
            />
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex justify-between border-t pt-6">
        <Button type="button" onClick={() => void handleSave()} disabled={saving}>
          {saving ? 'Salvataggio…' : 'Salva profilo viaggiatore'}
        </Button>
        {message && (
          <p
            className={`text-sm ${
              message.startsWith('Errore') || message.includes('fallito')
                ? 'text-red-600'
                : 'text-green-600'
            }`}
          >
            {message}
          </p>
        )}
      </CardFooter>
    </Card>
  );
}