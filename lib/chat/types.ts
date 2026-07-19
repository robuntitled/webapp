export type ChatGroupItem = {
  id: string;
  title: string;
  destination: string;
  imageUrl: string | null;
  participantCount: number;
  role: 'owner' | 'member';
};
