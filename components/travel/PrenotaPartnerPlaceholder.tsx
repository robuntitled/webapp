import { Bus, Car, CarTaxiFront, TrainFront } from 'lucide-react';

const ICONS = {
  car: Car,
  bus: Bus,
  train: TrainFront,
  taxi: CarTaxiFront,
} as const;

export function PrenotaPartnerPlaceholder({
  icon = 'car',
  partnerHint,
}: {
  icon?: keyof typeof ICONS;
  partnerHint: string;
}) {
  const Icon = ICONS[icon];
  return (
    <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 px-5 py-14 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="h-6 w-6" />
      </div>
      <p className="mt-4 text-sm font-semibold text-foreground">In arrivo</p>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">
        Stiamo attivando l&apos;integrazione partner. {partnerHint}
      </p>
    </div>
  );
}
