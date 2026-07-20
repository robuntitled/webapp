import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserProfileLink } from '@/components/profile/UserProfileLink';
import { getInitialsFromNames } from '@/lib/utils/user';
import type { TripParticipant } from '@/types/trip';
import { cn } from '@/lib/utils';

type TripCrewPeekProps = {
  participants?: TripParticipant[];
  creatorId?: string | null;
  /** Se true: nomi e foto chiari + link profilo. Altrimenti sfocati. */
  revealed: boolean;
};

export function TripCrewPeek({
  participants = [],
  creatorId,
  revealed,
}: TripCrewPeekProps) {
  // Solo chi si è aggiunto (non l’organizzatore, già sotto “Organizzato da”)
  const joined = participants.filter((p) => p.user_id !== creatorId);

  if (joined.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Ancora nessuno in crew — sii tra i primi.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">
        Nella crew · {joined.length}
      </p>
      <ul className="space-y-1.5">
        {joined.map((member) => {
          const user = member.user;
          const name =
            [user?.first_name, user?.last_name].filter(Boolean).join(' ') ||
            (user?.username ? `@${user.username}` : 'Viaggiatore');

          if (revealed) {
            return (
              <li key={member.user_id}>
                <UserProfileLink
                  userId={member.user_id}
                  username={user?.username}
                  firstName={user?.first_name}
                  lastName={user?.last_name}
                  image={user?.image}
                  mode="both"
                  size="sm"
                  className="w-full rounded-xl border bg-muted/20 px-2.5 py-2 hover:bg-muted/40"
                />
              </li>
            );
          }

          return (
            <li
              key={member.user_id}
              className="flex items-center gap-2.5 rounded-xl border bg-muted/15 px-2.5 py-2 select-none"
              aria-hidden
            >
              <Avatar className="h-8 w-8 shrink-0 blur-[5px] opacity-70">
                <AvatarImage src={user?.image ?? ''} alt="" />
                <AvatarFallback className="text-[10px]">
                  {getInitialsFromNames(user?.first_name, user?.last_name)}
                </AvatarFallback>
              </Avatar>
              <span
                className={cn(
                  'min-w-0 flex-1 truncate text-sm font-medium blur-[4px] opacity-60'
                )}
              >
                {name}
              </span>
            </li>
          );
        })}
      </ul>
      {!revealed && (
        <p className="text-[11px] text-muted-foreground leading-snug">
          Unisciti al viaggio per scoprire chi c’è.
        </p>
      )}
    </div>
  );
}
