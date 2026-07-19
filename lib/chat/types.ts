export type ChatGroupItem = {
  id: string;
  title: string;
  destination: string;
  imageUrl: string | null;
  participantCount: number;
  role: 'owner' | 'member';
  unreadCount: number;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
};

export type ChatContact = {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  image: string | null;
  /** Viaggio condiviso più recente (per aprire la chat gruppo) */
  sharedTripId: string;
  sharedTripTitle: string;
};

export type ChatSearchHit = {
  messageId: string;
  tripId: string;
  tripTitle: string;
  body: string;
  createdAt: string;
  authorName: string;
};
