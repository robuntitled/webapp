import { Badge } from '@/components/ui/badge';
import { TRIP_ROLE_META, type TripParticipantRole } from '@/lib/trips/roles';

type TripRoleBadgeProps = {
  role: TripParticipantRole;
};

export function TripRoleBadge({ role }: TripRoleBadgeProps) {
  const meta = TRIP_ROLE_META[role];
  return (
    <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs font-medium">
      {meta.emoji} {meta.label}
    </Badge>
  );
}