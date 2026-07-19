'use client';

import { useState, useTransition } from 'react';
import { Star } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { leaveUserReview } from '@/actions/reviews';
import { cn } from '@/lib/utils';

type LeaveReviewFormProps = {
  revieweeId: string;
  revieweeName: string;
};

export function LeaveReviewForm({ revieweeId, revieweeName }: LeaveReviewFormProps) {
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState('');
  const [pending, startTransition] = useTransition();

  const submit = () => {
    startTransition(async () => {
      const res = await leaveUserReview({ revieweeId, rating, body });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success('Recensione pubblicata');
      setBody('');
    });
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-white/70">
        Hai viaggiato con {revieweeName}? Lascia una recensione.
      </p>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => {
          const active = n <= (hover || rating);
          return (
            <button
              key={n}
              type="button"
              className="rounded-md p-1 transition-transform hover:scale-110"
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(n)}
              aria-label={`${n} stelle`}
            >
              <Star
                className={cn(
                  'h-6 w-6',
                  active ? 'fill-amber-400 text-amber-400' : 'text-white/25'
                )}
              />
            </button>
          );
        })}
      </div>
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Com’è stato viaggiare insieme…"
        className="min-h-[96px] resize-none rounded-2xl border-white/15 bg-white/5 text-white placeholder:text-white/35"
        maxLength={800}
      />
      <Button
        type="button"
        onClick={submit}
        disabled={pending || body.trim().length < 8}
        className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90"
      >
        {pending ? 'Invio…' : 'Pubblica recensione'}
      </Button>
    </div>
  );
}
