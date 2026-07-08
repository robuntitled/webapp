'use server';

// La funzione ora accetta anche un numero di pagina, che le viene passato dal frontend
export async function searchPexelsImages(query: string, page: number) {
  const apiKey = process.env.PEXELS_API_KEY;

  if (!apiKey) {
    throw new Error('La chiave API di Pexels non è configurata.');
  }

  const perPage = 8; // Chiediamo sempre 8 immagini

  // L'URL è ora più semplice: usa direttamente la pagina richiesta
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape&locale=it-IT&page=${page}`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: apiKey,
      },
    });

    if (!response.ok) {
      // Se la pagina richiesta non esiste (es. abbiamo finito le foto), Pexels dà un errore.
      // Lo gestiamo restituendo un array vuoto.
      if (response.status === 400) {
        return [];
      }
      throw new Error(`Errore nella chiamata a Pexels: ${response.statusText}`);
    }

    const data = await response.json();

    // La logica per mappare i risultati non cambia
    return data.photos.map((img: any) => ({
      id: img.id,
      description: img.alt,
      urls: {
        small: img.src.medium,
        regular: img.src.large2x,
      },
    }));

  } catch (error) {
    console.error("Errore durante la ricerca su Pexels:", error);
    throw new Error("Impossibile caricare le immagini al momento.");
  }
}