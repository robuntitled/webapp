import type { PlannerProfile } from '@/types/planner';

export async function savePlannerProfile(profile: PlannerProfile): Promise<void> {
  const response = await fetch('/api/planner/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error ?? 'Salvataggio profilo fallito');
  }
}
