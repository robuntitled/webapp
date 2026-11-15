/**
 * FAQ copy for `/domande-frequenti`.
 * Keep `{segnaposto}` literal. No FAQPage JSON-LD until placeholders are resolved.
 *
 * Skipped (not ready / ⚠️ / 🔒):
 * - FAQ 9 chat (🔒 flag + regole)
 * - FAQ 13 account deletion (code not aligned)
 * - “scegliere persona su Noivia” / ricerca persone
 * - Segnala/Blocca (migration 044 unverified)
 * - Conditional flight fee line on FAQ 3 (not confirmable)
 */

export type FaqItem = {
  id: string;
  question: string;
  /** Answer may contain `{placeholder}` tokens rendered with visual markers. */
  answer: string;
};

export type FaqSection = {
  id: string;
  title: string;
  items: FaqItem[];
};

export const FAQ_SECTIONS: FaqSection[] = [
  {
    id: 'prenotazioni',
    title: 'Noivia e le prenotazioni',
    items: [
      {
        id: 'tour-operator',
        question: 'Noivia è un tour operator?',
        answer:
          'No. Noivia è una piattaforma che ti aiuta a organizzare il viaggio e a trovare compagni di viaggio. Voli e hotel li vende {venditore}: Noivia ti aiuta a prenotare e non è il venditore. Le partenze di gruppo sono organizzate da un tour operator autorizzato, indicato su ogni partenza.',
      },
      {
        id: 'chi-vende',
        question: 'Chi mi vende il volo e l’hotel?',
        answer:
          '{venditore}, che gestisce anche il pagamento. Lo vedi scritto prima di pagare. Per i voli vedi anche la compagnia che opera il volo (“Volo operato da {compagnia}”).',
      },
      {
        id: 'cosa-pago',
        question: 'Cosa pago a Noivia?',
        answer:
          'Cercare, organizzare un viaggio e iscriversi a una partenza di gruppo, quando le iscrizioni sono aperte, è gratis. Sugli hotel il prezzo che vedi include il costo del servizio Noivia ({costo servizio}). Il prezzo finale, con il dettaglio, lo vedi sempre prima di pagare.',
      },
      {
        id: 'account-cerca',
        question: 'Devo avere un account per cercare?',
        answer:
          'No. Puoi cercare e confrontare voli e hotel senza account. Ti chiediamo di accedere solo per salvare il viaggio o prenotare.',
      },
      {
        id: 'ricevuta',
        question: 'Chi mi manda la ricevuta?',
        answer: 'La ricevuta te la invia {venditore}.',
      },
    ],
  },
  {
    id: 'insieme',
    title: 'Viaggiare insieme',
    items: [
      {
        id: 'paga-se',
        question: 'Ognuno paga per sé?',
        answer:
          'Sì. Nei viaggi che organizzi con i tuoi amici ognuno prenota e paga i propri voli e hotel: i biglietti sono separati. Nelle partenze di gruppo il viaggio lo acquisti da {tour_operator}.',
      },
      {
        id: 'invito',
        question: 'Come invito qualcuno?',
        answer:
          'Dal tuo viaggio tocca “Invita”: puoi mandare il link su WhatsApp o dove preferisci. Chi apre il link vede il viaggio e può unirsi, dopo aver dichiarato di avere almeno 18 anni.',
      },
      {
        id: 'partenza-gruppo',
        question: 'Come funziona una partenza di gruppo?',
        answer:
          'È organizzata da un tour operator autorizzato, sempre indicato sulla partenza. Su Noivia ti iscrivi gratis e senza impegno. Se il gruppo raggiunge {min} iscritti entro {data}, puoi acquistare il viaggio da {tour_operator}. Le partenze “In arrivo” non sono ancora aperte alle iscrizioni.',
      },
    ],
  },
  {
    id: 'modifiche',
    title: 'Modifiche e cancellazioni',
    items: [
      {
        id: 'modifica-viaggio',
        question: 'Posso modificare o eliminare un viaggio?',
        answer:
          'Puoi modificare il tuo viaggio quando vuoi. Puoi eliminarlo se non ci sono altri partecipanti, se non hai voli pagati o in conferma e se non ci sono hotel o attività pagati. Se ci sono altri partecipanti puoi uscire dal viaggio, e il ruolo di creatore passa a un’altra persona.',
      },
      {
        id: 'cambio-volo-hotel',
        question: 'Come cambio o annullo un volo o un hotel?',
        answer:
          'Cambi e cancellazioni dipendono dalle condizioni della tariffa, che vedi prima di pagare (per gli hotel, per esempio, “Tariffa rimborsabile” o “Tariffa non rimborsabile”). Per un cambio o una cancellazione il riferimento è {venditore}. Se ti serve aiuto, scrivici: {canale assistenza}.',
      },
      {
        id: 'compagnia-cancella',
        question: 'E se la compagnia cancella il mio volo?',
        answer:
          'Conserva i documenti del viaggio: possono applicarsi i diritti previsti dal Regolamento CE 261/2004. La richiesta va fatta alla compagnia aerea: Noivia non gestisce rimborsi al posto della compagnia.',
      },
      {
        id: 'coincidenza',
        question: 'E se perdo una coincidenza tra due voli prenotati a parte?',
        answer:
          'Sono biglietti separati: se il primo volo ritarda e perdi il secondo, la seconda compagnia non è obbligata a riproteggerti e le tutele del Reg. CE 261/2004 sulla coincidenza non si applicano. Lascia tempo sufficiente tra un volo e l’altro.',
      },
    ],
  },
  {
    id: 'account',
    title: 'Account e dati',
    items: [
      {
        id: 'esporta-dati',
        question: 'Posso scaricare i miei dati?',
        answer:
          'Sì. In Impostazioni › Privacy tocca “Esporta dati”: ricevi una copia dei dati del tuo profilo in formato JSON.',
      },
      {
        id: 'chi-scrivere',
        question: 'A chi scrivo se ho un problema?',
        answer:
          'Per voli e hotel: {venditore}. Per l’account, i viaggi e i gruppi: {canale assistenza}, {orari}. Per la privacy: {email privacy}.',
      },
    ],
  },
];
