import 'server-only';

import { supabaseAdmin } from '@/lib/supabase-admin';

export type FeedPostAuthor = {
  id: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  image: string | null;
};

export type FeedPost = {
  id: string;
  body: string;
  imageUrl: string | null;
  createdAt: string;
  likeCount: number;
  likedByMe: boolean;
  author: FeedPostAuthor;
};

function isMissingTable(error: { code?: string } | null): boolean {
  return error?.code === '42P01';
}

async function hydratePosts(
  rows: {
    id: string;
    user_id: string;
    body: string;
    image_url: string | null;
    created_at: string;
  }[],
  viewerId?: string | null
): Promise<FeedPost[]> {
  if (!rows.length) return [];

  const postIds = rows.map((r) => r.id);
  const userIds = [...new Set(rows.map((r) => r.user_id))];

  const [{ data: users }, { data: likes }] = await Promise.all([
    supabaseAdmin
      .from('users')
      .select('id, username, first_name, last_name, image')
      .in('id', userIds),
    supabaseAdmin.from('post_likes').select('post_id, user_id').in('post_id', postIds),
  ]);

  const userMap = new Map((users ?? []).map((u) => [u.id as string, u]));
  const likeCount = new Map<string, number>();
  const likedByMe = new Set<string>();

  for (const like of likes ?? []) {
    const pid = like.post_id as string;
    likeCount.set(pid, (likeCount.get(pid) ?? 0) + 1);
    if (viewerId && like.user_id === viewerId) likedByMe.add(pid);
  }

  return rows
    .map((row) => {
      const u = userMap.get(row.user_id);
      if (!u) return null;
      return {
        id: row.id,
        body: String(row.body ?? ''),
        imageUrl: row.image_url,
        createdAt: String(row.created_at),
        likeCount: likeCount.get(row.id) ?? 0,
        likedByMe: likedByMe.has(row.id),
        author: {
          id: u.id as string,
          username: (u.username as string | null) ?? null,
          firstName: (u.first_name as string | null) ?? null,
          lastName: (u.last_name as string | null) ?? null,
          image: (u.image as string | null) ?? null,
        },
      };
    })
    .filter(Boolean) as FeedPost[];
}

export async function listFeedPosts(
  viewerId?: string | null,
  limit = 40
): Promise<FeedPost[]> {
  const { data, error } = await supabaseAdmin
    .from('user_posts')
    .select('id, user_id, body, image_url, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data?.length) {
    if (error && !isMissingTable(error)) {
      console.error('[listFeedPosts]', error.message);
    }
    return [];
  }

  return hydratePosts(data as never, viewerId);
}

export async function listUserPosts(
  userId: string,
  viewerId?: string | null,
  limit = 40
): Promise<FeedPost[]> {
  const { data, error } = await supabaseAdmin
    .from('user_posts')
    .select('id, user_id, body, image_url, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data?.length) {
    if (error && !isMissingTable(error)) {
      console.error('[listUserPosts]', error.message);
    }
    return [];
  }

  return hydratePosts(data as never, viewerId);
}
