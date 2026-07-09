import Link from 'next/link';

type AffiliateDisclosureProps = {
  className?: string;
};

export function AffiliateDisclosure({ className }: AffiliateDisclosureProps) {
  return (
    <p className={className ?? 'text-xs text-muted-foreground leading-relaxed'}>
      La ricerca voli e hotel è gestita tramite partner esterni (Travelpayouts). Il pagamento
      avviene sul sito del fornitore selezionato. NomadLink può ricevere una commissione senza
      costi aggiuntivi per te.{' '}
      <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">
        Privacy
      </Link>
      {' · '}
      <Link href="/cookie" className="underline underline-offset-2 hover:text-foreground">
        Cookie
      </Link>
    </p>
  );
}