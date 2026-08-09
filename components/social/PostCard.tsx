'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { deletePost, togglePostLike } from '@/actions/posts';
import type { FeedPost } from '@/lib/data/posts';
import { profilePath } from '@/lib/profile/paths';
import { getInitialsFromNames } from '@/lib/utils/user';
import { cn } from '@/lib/utils';

type PostCardProps = {
  post: FeedPost;
  currentUserId?: string | null;
  /** Variante scura per bacheca / profilo pubblico */
  tone?: 'default' | 'onDark';
};

export function PostCard({
  post,
  currentUserId,
  tone = 'default',
}: PostCardProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [liked, setLiked] = useState(post.likedByMe);
  const [likes, setLikes] = useState(post.likeCount);

  const name =
    [post.author.firstName, post.author.lastName].filter(Boolean).join(' ') ||
    (post.author.username ? `@${post.author.username}` : 'Viaggiatore');
  const href = profilePath(post.author.username, post.author.id);
  const isOwn = currentUserId === post.author.id;
  const onDark = tone === 'onDark';

  return (
    <article
      className={cn(
        'rounded-3xl p-4 sm:p-5',
        onDark ? 'nl-feed-card' : 'border border-border/60 bg-card'
      )}
    >
      <div className="flex items-start gap-3">
        {href ? (
          <Link href={href} className="shrink-0">
            <Avatar
              className={cn(
                'h-11 w-11 ring-2',
                onDark ? 'ring-white/15' : 'ring-border/60'
              )}
            >
              <AvatarImage src={post.author.image ?? ''} alt="" />
              <AvatarFallback className="text-xs">
                {getInitialsFromNames(post.author.firstName, post.author.lastName)}
              </AvatarFallback>
            </Avatar>
          </Link>
        ) : (
          <Avatar className="h-11 w-11">
            <AvatarImage src={post.author.image ?? ''} alt="" />
            <AvatarFallback className="text-xs">?</AvatarFallback>
          </Avatar>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              {href ? (
                <Link
                  href={href}
                  className={cn(
                    'truncate text-sm font-semibold hover:underline',
                    onDark ? 'text-white' : 'text-foreground'
                  )}
                >
                  {name}
                </Link>
              ) : (
                <p
                  className={cn(
                    'text-sm font-semibold',
                    onDark ? 'text-white' : 'text-foreground'
                  )}
                >
                  {name}
                </p>
              )}
              <p
                className={cn(
                  'mt-0.5 text-[11px]',
                  onDark ? 'text-white/45' : 'text-muted-foreground'
                )}
              >
                {post.author.username ? `@${post.author.username} · ` : ''}
                {new Date(post.createdAt).toLocaleString('it-IT', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
            {isOwn ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                  'h-8 w-8 shrink-0 rounded-full',
                  onDark && 'text-white/55 hover:bg-white/10 hover:text-white'
                )}
                disabled={pending}
                aria-label="Elimina post"
                onClick={() =>
                  startTransition(async () => {
                    const res = await deletePost(post.id);
                    if (!res.ok) {
                      toast.error(res.error);
                      return;
                    }
                    toast.message('Post eliminato');
                    router.refresh();
                  })
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            ) : null}
          </div>

          {post.body ? (
            <p
              className={cn(
                'mt-3 whitespace-pre-wrap text-[15px] leading-relaxed',
                onDark ? 'text-white/88' : 'text-foreground'
              )}
            >
              {post.body}
            </p>
          ) : null}

          {post.imageUrl ? (
            <div
              className={cn(
                'mt-3 overflow-hidden rounded-2xl',
                onDark ? 'ring-1 ring-white/10' : 'border border-black/5'
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.imageUrl}
                alt=""
                className="max-h-[460px] w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </div>
          ) : null}

          <div className="mt-3.5 flex items-center gap-2">
            <button
              type="button"
              disabled={pending || !currentUserId}
              onClick={() => {
                if (!currentUserId) {
                  toast.error('Accedi per mettere like.');
                  return;
                }
                const next = !liked;
                setLiked(next);
                setLikes((n) => n + (next ? 1 : -1));
                startTransition(async () => {
                  const res = await togglePostLike(post.id);
                  if (!res.ok) {
                    setLiked(!next);
                    setLikes((n) => n + (next ? -1 : 1));
                    toast.error(res.error);
                  }
                });
              }}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition',
                liked
                  ? 'bg-rose-500/15 text-rose-400'
                  : onDark
                    ? 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                    : 'bg-muted text-muted-foreground hover:text-foreground',
                !currentUserId && 'opacity-60'
              )}
            >
              <Heart className={cn('h-3.5 w-3.5', liked && 'fill-current')} />
              {likes}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
