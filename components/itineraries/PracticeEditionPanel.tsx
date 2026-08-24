'use client';

import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserProfileLink } from '@/components/profile/UserProfileLink';
import type { EditionMemberCard } from '@/lib/itineraries/bookings';

export function PracticeChatCta({
  editionId,
  chatUnlocked,
}: {
  editionId: string;
  chatUnlocked: boolean;
  userConfirmed?: boolean;
}) {
  if (!chatUnlocked) {
    return (
      <p className="rounded-2xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        La chat di gruppo si apre quando il primo partecipante conferma il volo.
      </p>
    );
  }

  return (
    <Button
      type="button"
      className="rounded-full"
      onClick={() => {
        window.dispatchEvent(
          new CustomEvent('nomadlink:open-trip-chat', { detail: { tripId: editionId } })
        );
      }}
    >
      <MessageCircle className="mr-2 h-4 w-4" />
      Scrivi al gruppo
    </Button>
  );
}

export function PracticeEditionMembers({
  members,
  title = 'Partecipanti con volo confermato',
}: {
  members: EditionMemberCard[];
  title?: string;
}) {
  const confirmed = members.filter((m) => m.status === 'confirmed');
  if (confirmed.length === 0) return null;

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-white p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
        {title}
      </p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {confirmed.map((m) => (
          <li
            key={m.userId}
            className="rounded-xl border border-border bg-muted/20 px-3 py-2.5"
          >
            <UserProfileLink
              userId={m.userId}
              username={m.username}
              firstName={m.firstName}
              lastName={m.lastName}
              image={m.image}
              size="md"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
