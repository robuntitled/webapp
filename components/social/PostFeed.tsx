import { PostCard } from '@/components/social/PostCard';
import type { FeedPost } from '@/lib/data/posts';

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
      <p
        className={
          tone === 'onDark'
            ? 'rounded-2xl border border-dashed border-white/15 px-4 py-10 text-center text-sm text-white/45'
            : 'rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground'
        }
      >
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {posts.map((post) => (
        <li key={post.id}>
          <PostCard post={post} currentUserId={currentUserId} tone={tone} />
        </li>
      ))}
    </ul>
  );
}
