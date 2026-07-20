import { Card, CardContent } from '@/components/ui/card';
import { UserProfileLink } from '@/components/profile/UserProfileLink';
import { TRIP_ROLE_META } from '@/lib/trips/roles';
import type { TripParticipant, TripPlanningMode } from '@/types/trip';
import { Users } from 'lucide-react';

type TripCrewCardProps = {
  planningMode?: TripPlanningMode;
  participants?: TripParticipant[];
  creatorId?: string | null;
};

function sortByRoleRank(participants: TripParticipant[]): TripParticipant[] {
  const rank = { owner: 0, editor: 1, viewer: 2 } as const;
  return [...participants].sort((a, b) => {
    const roleA = a.role ?? 'viewer';
    const roleB = b.role ?? 'viewer';
    return rank[roleA] - rank[roleB];
  });
}

export function TripCrewCard({
  planningMode = 'group',
  participants = [],
  creatorId,
}: TripCrewCardProps) {
  const crew = sortByRoleRank(participants);
  const relaxCount = crew.filter((p) => (p.role ?? 'viewer') === 'viewer').length;

  return (
    <Card className="rounded-2xl border-0 shadow-md">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start gap-3">
          <Users className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <h3 className="font-display text-lg font-semibold">
              {planningMode === 'solo' ? 'La tua crew (per ora)' : 'La crew del viaggio'}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {planningMode === 'solo'
                ? 'Stai pianificando da solo — invita amici quando vuoi, entreranno in modalità relax.'
                : relaxCount > 0
                  ? `${relaxCount} ${relaxCount === 1 ? 'amico' : 'amici'} in modalità relax — tocca un profilo per conoscerli.`
                  : 'Tocca nome o foto per aprire il profilo pubblico.'}
            </p>
          </div>
        </div>

        {crew.length === 0 ? (
          <p className="text-sm text-muted-foreground rounded-xl border border-dashed p-4 text-center">
            Nessuno iscritto ancora — invita dalla condivisione in alto
          </p>
        ) : (
          <ul className="space-y-2">
            {crew.map((member) => {
              const role = member.role ?? (member.user_id === creatorId ? 'owner' : 'viewer');
              const meta = TRIP_ROLE_META[role];
              const user = member.user;

              return (
                <li
                  key={member.user_id}
                  className="flex items-center gap-3 rounded-xl border bg-muted/20 px-3 py-2.5"
                >
                  <UserProfileLink
                    userId={member.user_id}
                    username={user?.username}
                    firstName={user?.first_name}
                    lastName={user?.last_name}
                    image={user?.image}
                    mode="both"
                    size="sm"
                    className="min-w-0 flex-1"
                    subtitle={meta.description}
                  />
                  <span className="text-xs font-medium shrink-0 rounded-full bg-background px-2.5 py-1 border">
                    {meta.emoji} {meta.label}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
