'use client';

import { DAY_TEMPLATES } from '@/lib/composer/day-templates';
import { Copy, Eraser, LayoutTemplate } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

type DayToolsBarProps = {
  onApplyTemplate: (templateId: string) => void;
  onDuplicateDay: () => void;
  onClearDay: () => void;
  blockCount: number;
};

export function DayToolsBar({
  onApplyTemplate,
  onDuplicateDay,
  onClearDay,
  blockCount,
}: DayToolsBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full h-8 text-xs border-white/12 bg-white/[0.04] text-white hover:bg-white/10 hover:text-white"
          >
            <LayoutTemplate className="mr-1.5 h-3.5 w-3.5 text-accent" />
            Template giornata
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-64 rounded-xl border-white/10 bg-slate-950/95 backdrop-blur-xl text-white"
        >
          {DAY_TEMPLATES.map((t) => (
            <DropdownMenuItem
              key={t.id}
              className="flex items-start gap-3 py-2.5 cursor-pointer focus:bg-white/10 focus:text-white"
              onClick={() => onApplyTemplate(t.id)}
            >
              <span className="text-lg">{t.emoji}</span>
              <div>
                <p className="font-medium text-sm">{t.label}</p>
                <p className="text-[10px] text-white/45">{t.description}</p>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="rounded-full h-8 text-xs border-white/12 bg-white/[0.04] text-white hover:bg-white/10"
        onClick={onDuplicateDay}
        disabled={blockCount === 0}
      >
        <Copy className="mr-1.5 h-3.5 w-3.5" />
        Duplica
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="rounded-full h-8 text-xs border-white/12 bg-white/[0.04] text-rose-300/80 hover:bg-rose-500/10 hover:text-rose-200"
        onClick={onClearDay}
        disabled={blockCount === 0}
      >
        <Eraser className="mr-1.5 h-3.5 w-3.5" />
        Svuota
      </Button>
    </div>
  );
}