'use client';

import { useState, useEffect } from 'react';
import { createTrip } from '../../../../actions/trips';
import { searchPexelsImages } from '../../../../actions/images';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, Image as ImageIcon, RotateCw } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import Image from 'next/image';

type PexelsImage = {
  id: number;
  description: string;
  urls: { small: string; regular: string; };
};

export default function CreateTripPage() {
    const [startDate, setStartDate] = useState<Date | undefined>();
    const [endDate, setEndDate] = useState<Date | undefined>();
    const [destination, setDestination] = useState('');
    const [isSearchingImages, setIsSearchingImages] = useState(false);
    const [imageResults, setImageResults] = useState<PexelsImage[]>([]);
    const [selectedImageUrl, setSelectedImageUrl] = useState('');
    const [pexelsPage, setPexelsPage] = useState(1);

    const handleImageSearch = async () => {
        if (!destination) return;
        setIsSearchingImages(true);
        try {
            const results = await searchPexelsImages(destination, pexelsPage);
            if (results.length === 0 && pexelsPage > 1) {
                alert("Non ci sono altre immagini per questa destinazione. Il ciclo ricomincerà.");
                setPexelsPage(1);
                setImageResults([]);
            } else {
                setImageResults(results);
                setPexelsPage(prevPage => prevPage + 1);
            }
        } catch (error) { console.error(error); alert("Errore durante la ricerca delle immagini."); }
        setIsSearchingImages(false);
    };

    useEffect(() => {
        setPexelsPage(1);
        setImageResults([]);
        setSelectedImageUrl('');
    }, [destination]);

    const handleImageSelect = (img: PexelsImage) => { setSelectedImageUrl(img.urls.regular); };

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
            <div className="bg-white dark:bg-slate-950 p-8 rounded-xl shadow-lg my-10">
                <h1 className="text-3xl font-bold mb-8">Crea il Tuo Prossimo Viaggio</h1>
                <form action={createTrip} className="space-y-8">
                    <div className="space-y-2">
                        <Label htmlFor="title" className="text-base font-semibold">1. Dai un titolo al tuo viaggio</Label>
                        <Input name="title" id="title" placeholder="Es: Avventura epica alla scoperta della Tailandia" required className="h-11"/>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="destination" className="text-base font-semibold">2. Scegli la destinazione e la copertina</Label>
                        <div className="flex items-center space-x-2">
                            <Input name="destination" id="destination" placeholder="Es: Tailandia" required value={destination} onChange={(e) => setDestination(e.target.value)} className="h-11" />
                            <Button type="button" onClick={handleImageSearch} disabled={!destination || isSearchingImages} className="h-11">
                                {isSearchingImages ? 'Cerco...' : imageResults.length > 0 ? <><RotateCw className="mr-2 h-4 w-4" />Altre</> : <><ImageIcon className="mr-2 h-4 w-4" /> Cerca</>}
                            </Button>
                        </div>
                    </div>
                    {imageResults.length > 0 && (
                        <div className="grid grid-cols-4 gap-2">
                            {imageResults.map(img => (
                                <button type="button" key={img.id} onClick={() => handleImageSelect(img)} className={`relative aspect-video rounded-md overflow-hidden transition-all ${selectedImageUrl === img.urls.regular ? 'ring-4 ring-blue-500' : 'ring-2 ring-transparent hover:ring-blue-400'}`}>
                                    <Image src={img.urls.small} alt={img.description} fill style={{objectFit: 'cover'}} />
                                </button>
                            ))}
                        </div>
                    )}
                    <input type="hidden" name="image_url" value={selectedImageUrl} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-base font-semibold">3. Quando?</Label>
                            <Input type="hidden" name="startDate" value={startDate?.toISOString() || ''} />
                            <Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-start text-left font-normal h-11"><CalendarIcon className="mr-2 h-4 w-4" />{startDate ? format(startDate, "PPP", { locale: it }) : <span>Data di inizio</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus disabled={{ before: new Date() }} /></PopoverContent></Popover>
                        </div>
                        <div className="space-y-2">
                             <Label className="text-base font-semibold opacity-0 md:opacity-100">E quando si torna?</Label>
                            <Input type="hidden" name="endDate" value={endDate?.toISOString() || ''} />
                            <Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-start text-left font-normal h-11" disabled={!startDate}><CalendarIcon className="mr-2 h-4 w-4" />{endDate ? format(endDate, "PPP", { locale: it }) : <span>Data di fine</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus disabled={{ before: startDate || new Date() }} /></PopoverContent></Popover>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       <div className="space-y-2">
                            <Label className="text-base font-semibold">4. Dettagli Gruppo</Label>
                            <Input type="hidden" name="minAge" id="minAgeInput" />
                            <Input type="hidden" name="maxAge" id="maxAgeInput" />
                            {/* --- FASCE D'ETÀ CORRETTE --- */}
                            <Select name="ageRange" onValueChange={(value) => { if(!value) return; const [min, max] = value.split('-'); (document.getElementById('minAgeInput') as HTMLInputElement).value = min; (document.getElementById('maxAgeInput') as HTMLInputElement).value = max;}} required>
                                <SelectTrigger className="h-11"><SelectValue placeholder="Fascia d'età..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="18-999">18+</SelectItem>
                                    <SelectItem value="18-25">18-25</SelectItem>
                                    <SelectItem value="26-35">26-35</SelectItem>
                                    <SelectItem value="36-45">36-45</SelectItem>
                                    <SelectItem value="46-59">46-59</SelectItem>
                                    <SelectItem value="60-999">60+</SelectItem>
                                </SelectContent>
                            </Select>
                       </div>
                        <div className="space-y-2"><Label className="opacity-0 md:opacity-100">Minimo</Label><Input name="minParticipants" id="minParticipants" type="number" placeholder="Min. Partecipanti" required min="2" className="h-11" /></div>
                        <div className="space-y-2"><Label className="opacity-0 md:opacity-100">Massimo</Label><Input name="maxParticipants" id="maxParticipants" type="number" placeholder="Max. Partecipanti" required min="2" className="h-11" /></div>
                    </div>
                    <div className="space-y-2"><Label htmlFor="description" className="text-base font-semibold">5. Descrivi l'itinerario</Label><Textarea name="description" id="description" placeholder="Descrivi giorno per giorno le attività principali..." rows={5} required /></div>
                    <div className="space-y-2"><Label htmlFor="price" className="text-base font-semibold">6. Prezzo Stimato a Persona (€)</Label><Input name="price"id="price" type="number" placeholder="Es: 1500" required min="1" /></div>
                    <div className="pt-6"><Button type="submit" className="w-full text-lg h-12">Pubblica Viaggio</Button></div>
                </form>
            </div>
        </div>
    );
}