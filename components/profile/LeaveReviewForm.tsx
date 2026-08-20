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
      <p className="text-sm text-foreground">
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
                  active ? 'fill-amber-500 text-amber-500' : 'text-border'
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
        className="min-h-[96px] resize-none"
        maxLength={800}
      />
      <Button
        type="button"
        onClick={submit}
        disabled={pending || body.trim().length < 8}
      >
        {pending ? 'Invio…' : 'Pubblica recensione'}
      </Button>
    </div>
  );
}
