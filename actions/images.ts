'use server';

type PexelsPhoto = {
  id: number;
  alt: string;
  src: {
    medium: string;
    large2x: string;
  };
};

export async function searchPexelsImages(query: string, page: number) {
  const apiKey = process.env.PEXELS_API_KEY;

  if (!apiKey) {
    throw new Error('La chiave API di Pexels non è configurata.');
  }

  const perPage = 8;
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape&locale=it-IT&page=${page}`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: apiKey,
      },
    });

    if (!response.ok) {
      if (response.status === 400) {
        return [];
      }
      throw new Error(`Errore nella chiamata a Pexels: ${response.statusText}`);
    }

    const data = await response.json();

    return (data.photos as PexelsPhoto[]).map((img) => ({
      id: img.id,
      description: img.alt,
      urls: {
        small: img.src.medium,
        regular: img.src.large2x,
      },
    }));
  } catch (error) {
    console.error('Errore durante la ricerca su Pexels:', error);
    throw new Error('Impossibile caricare le immagini al momento.');
  }
}