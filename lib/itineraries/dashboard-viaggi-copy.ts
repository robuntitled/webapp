/**
 * Microcopy «I miei viaggi» (dashboard).
 * Spec di riferimento: seo-copy/dashboard-viaggi-microcopy.md
 */

export const DASHBOARD_VIAGGI_COPY = {
  pageEyebrow: 'Account',
  pageTitle: 'I miei viaggi',
  pageSub:
    'Organizzati da te, a cui partecipi, prenotazioni e salvati. Tocca un viaggio per aprire Itinerario, Voli, Hotel e Partecipanti.',

  badges: {
    draft: 'Bozza',
    flightPending: 'Volo in conferma',
    booked: 'Prenotato',
    toBook: 'Da prenotare',
    carrierCancelled: 'Volo annullato dal vettore',
  },

  menu: {
    open: 'Altre azioni sul viaggio',
    openTrip: 'Apri viaggio',
    invite: 'Invita',
    delete: 'Elimina viaggio',
    leave: 'Esci dal viaggio',
  },

  toast: {
    deleted: 'Viaggio eliminato',
    left: 'Hai lasciato il viaggio',
    creatorTransferred: 'Sei uscito: il ruolo di creatore è passato a un altro partecipante.',
    deleteBlockedPaid:
      'Non puoi eliminare questo viaggio: risulta un pagamento o una prenotazione attiva.',
    deleteBlockedHotel:
      'Non puoi eliminare: ci sono hotel o attività pagati collegati a questo viaggio.',
    deleteBlockedMembers:
      'Non puoi eliminare: ci sono altri partecipanti. Esci dal viaggio per passare il ruolo di creatore.',
    deleteFailedCharge:
      'Non possiamo eliminare: risulta un addebito collegato. Contatta l’assistenza.',
    detachedFromGroup: 'Le date sono cambiate: il viaggio non fa più parte della partenza di gruppo.',
  },

  carrierCancelledNote:
    'Il vettore ha annullato il volo. Conserva i documenti: possono applicarsi i diritti del Reg. CE 261/2004. Noivia non gestisce rimborsi al posto della compagnia.',

  invite: {
    ageLabel: 'Dichiaro di avere almeno 18 anni',
    ageRequired: 'Per unirti conferma di avere almeno 18 anni.',
    whatsapp: 'Invita su WhatsApp',
    friends: 'Invita amici',
    emailDisabled: 'Invito email non disponibile (in attesa di verifica Legale).',
  },

  fields: {
    tripName: 'Nome del viaggio',
    tripNameHint: 'Opzionale. Se vuoto usiamo la destinazione.',
    notes: 'Note',
    notesHint: 'Solo per te e i partecipanti. Non sostituiscono i documenti di viaggio.',
  },

  empty: {
    organizedTitle: 'Nessun viaggio organizzato',
    organizedBody: 'Crea un viaggio da Organizza: comparirà qui con lo stato delle prenotazioni.',
    joinedTitle: 'Nessun viaggio a cui partecipi',
    joinedBody: 'Quando accetti un invito o entri in un gruppo, il viaggio compare qui.',
    bookingsTitle: 'Nessuna prenotazione',
    bookingsBody: 'I voli e hotel che hai pagato restano raccolti in questa sezione.',
  },
} as const;
