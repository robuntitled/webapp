import { Images } from 'lucide-react';
import { PostCard } from '@/components/social/PostCard';
import type { FeedPost } from '@/lib/data/posts';
import { cn } from '@/lib/utils';

type PostFeedProps = {
  posts: FeedPost[];
  currentUserId?: string | null;
  tone?: 'default' | 'onDark';
  emptyMessage?: string;
};

export function PostFeed({
  posts,
  currentUserId,
  tone = 'default',
  emptyMessage = 'Ancora nessun post. Sii il primo a raccontare un viaggio.',
}: PostFeedProps) {
  if (!posts.length) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed px-6 py-14 text-center',
          tone === 'onDark'
            ? 'border-white/15 bg-white/[0.03] text-white/55'
            : 'border-border bg-muted/20 text-muted-foreground'
        )}
      >
        <div
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-2xl',
            tone === 'onDark' ? 'bg-white/8 text-accent' : 'bg-muted text-primary'
          )}
        >
          <Images className="h-5 w-5" />
        </div>
        <p className="max-w-sm text-sm leading-relaxed">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <ul className="space-y-4">
      {posts.map((post) => (
        <li key={post.id}>
          <PostCard post={post} currentUserId={currentUserId} tone={tone} />
        </li>
      ))}
    </ul>
  );
}
