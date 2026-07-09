'use client';

import { useState, useRef } from 'react';
import { updateUserProfile, updateUserAvatar } from '@/actions/user';
import type { UserProfile } from '@/types/user';
import { getInitialsFromNames } from '@/lib/utils/user';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from "@/components/ui/calendar";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Camera } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import imageCompression from 'browser-image-compression';
import Link from 'next/link';
import { MIN_AGE_YEARS } from '@/lib/privacy/constants';

export default function ProfileForm({
  userProfile,
}: {
  userProfile: UserProfile | null;
}) {
  const [birthDate, setBirthDate] = useState<Date | undefined>(
    userProfile?.birth_date ? new Date(userProfile.birth_date) : undefined
  );
  
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(userProfile?.image ?? null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const phoneParts = userProfile?.phone_number?.split(' ') ?? [];
  const [phonePrefix, setPhonePrefix] = useState(phoneParts[0] ?? '+39');
  const [phoneNumber, setPhoneNumber] = useState(phoneParts.slice(1).join(' '));
  const [gender, setGender] = useState(userProfile?.gender ?? '');
  const [privacyConsent, setPrivacyConsent] = useState(userProfile?.privacy_consent ?? false);
  const [marketingConsent, setMarketingConsent] = useState(userProfile?.marketing_consent ?? false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const options = {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 1024,
      useWebWorker: true,
    };
    try {
      const compressedFile = await imageCompression(file, options);
      setAvatarFile(compressedFile);
      setAvatarPreview(URL.createObjectURL(compressedFile));
    } catch (error) {
      setMessage("Errore durante la compressione dell'immagine.");
    }
  };

  const handleAvatarSubmit = async () => {
    if (!avatarFile) return;
    const formData = new FormData();
    formData.append('avatar', avatarFile);
    
    setIsSubmitting(true);
    setMessage('');
    try {
      const result = await updateUserAvatar(formData);
      if (result.success) {
        setAvatarFile(null);
        setMessage('Foto profilo aggiornata!');
        // Ricarichiamo la pagina per vedere la nuova immagine ovunque
        window.location.reload();
      }
    } catch (error) {
      setMessage(`Errore: ${error instanceof Error ? error.message : 'Errore imprevisto'}`);
    }
    setIsSubmitting(false);
  };

  const handleProfileSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage('');
    const formData = new FormData(event.currentTarget);
    if (birthDate) {
      const timezoneOffset = birthDate.getTimezoneOffset() * 60000;
      const adjustedDate = new Date(birthDate.getTime() - timezoneOffset);
      formData.set('birth_date', adjustedDate.toISOString().split('T')[0]);
    } else {
      formData.set('birth_date', '');
    }
    
    if (!privacyConsent) {
      setMessage('Errore: Il consenso privacy è obbligatorio.');
      setIsSubmitting(false);
      return;
    }

    formData.set('phone_prefix', phonePrefix);
    formData.set('phone_number', phoneNumber);
    formData.set('gender', gender);
    if (privacyConsent) {
      formData.set('privacy_consent', 'on');
    } else {
      formData.delete('privacy_consent');
    }
    if (marketingConsent) {
      formData.set('marketing_consent', 'on');
    } else {
      formData.delete('marketing_consent');
    }

    try {
      const result = await updateUserProfile(formData);
      setMessage(result.message);
    } catch (error) {
      setMessage(`Errore: ${error instanceof Error ? error.message : 'Errore imprevisto'}`);
    }
    setIsSubmitting(false);
  };

  const fullName = `${userProfile?.first_name || ''} ${userProfile?.last_name || ''}`.trim();

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <div className="flex items-center space-x-6">
          <div className="relative">
            <Avatar className="h-24 w-24 border-4 border-white shadow-lg">
              <AvatarImage src={avatarPreview ?? undefined} style={{ objectFit: 'cover' }} />
              <AvatarFallback className="text-3xl">
                {getInitialsFromNames(userProfile?.first_name, userProfile?.last_name)}
              </AvatarFallback>
            </Avatar>
            <Button type="button" size="icon" className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full" onClick={() => fileInputRef.current?.click()}><Camera className="h-4 w-4" /></Button>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/png, image/jpeg, image/webp" onChange={handleFileChange} />
          </div>
          <div>
            <CardTitle className="text-2xl">{fullName || 'Utente'}</CardTitle>
            <CardDescription>Aggiorna i tuoi dati personali e le preferenze.</CardDescription>
            {avatarFile && <div className="mt-2 flex items-center space-x-2"><Button size="sm" onClick={handleAvatarSubmit} disabled={isSubmitting}>{isSubmitting ? "Carico..." : "Salva Foto"}</Button><Button size="sm" variant="ghost" onClick={() => { setAvatarFile(null); setAvatarPreview(userProfile?.image ?? null); }}>Annulla</Button></div>}
          </div>
        </div>
      </CardHeader>
      <form onSubmit={handleProfileSubmit}>
        <CardContent className="space-y-8 pt-6">
          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">Dati Anagrafici</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <div className="space-y-2"><Label htmlFor="first_name">Nome *</Label><Input id="first_name" name="first_name" defaultValue={userProfile?.first_name ?? ''} required /></div>
              <div className="space-y-2"><Label htmlFor="last_name">Cognome *</Label><Input id="last_name" name="last_name" defaultValue={userProfile?.last_name ?? ''} required /></div>
              <div className="space-y-2"><Label>Data di nascita (facoltativa, min. {MIN_AGE_YEARS} anni)</Label><Popover><PopoverTrigger asChild><Button variant="outline" className={cn("w-full justify-start text-left font-normal h-10", !birthDate && "text-muted-foreground")} type="button"><CalendarIcon className="mr-2 h-4 w-4" />{birthDate ? format(birthDate, "PPP", { locale: it }) : <span>Scegli una data</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={birthDate} onSelect={setBirthDate} captionLayout="dropdown" fromYear={1940} toYear={new Date().getFullYear() - MIN_AGE_YEARS} initialFocus /></PopoverContent></Popover></div>
              <div className="space-y-2">
                <Label>Sesso (facoltativo)</Label>
                <RadioGroup
                  value={gender}
                  onValueChange={setGender}
                  className="flex items-center space-x-4 pt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="uomo" id="male" />
                    <Label htmlFor="male">Uomo</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="donna" id="female" />
                    <Label htmlFor="female">Donna</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </div>
          <div className="border-t pt-6 space-y-4">
             <h3 className="font-semibold text-lg border-b pb-2">Contatti e residenza (facoltativi)</h3>
             <div className="space-y-2">
                <Label htmlFor="phone_number">Numero di telefono</Label>
                <div className="flex gap-2">
                    <Select name="phone_prefix" defaultValue={phonePrefix} onValueChange={setPhonePrefix}>
                        <SelectTrigger className="w-[120px]"><SelectValue placeholder="Pref." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="+39">+39 IT</SelectItem>
                          <SelectItem value="+43">+43 AT</SelectItem>
                          <SelectItem value="+32">+32 BE</SelectItem>
                          <SelectItem value="+359">+359 BG</SelectItem>
                          <SelectItem value="+385">+385 HR</SelectItem>
                          <SelectItem value="+357">+357 CY</SelectItem>
                          <SelectItem value="+420">+420 CZ</SelectItem>
                          <SelectItem value="+45">+45 DK</SelectItem>
                          <SelectItem value="+372">+372 EE</SelectItem>
                          <SelectItem value="+358">+358 FI</SelectItem>
                          <SelectItem value="+33">+33 FR</SelectItem>
                          <SelectItem value="+49">+49 DE</SelectItem>
                          <SelectItem value="+30">+30 GR</SelectItem>
                          <SelectItem value="+36">+36 HU</SelectItem>
                          <SelectItem value="+353">+353 IE</SelectItem>
                          <SelectItem value="+371">+371 LV</SelectItem>
                          <SelectItem value="+370">+370 LT</SelectItem>
                          <SelectItem value="+352">+352 LU</SelectItem>
                          <SelectItem value="+356">+356 MT</SelectItem>
                          <SelectItem value="+31">+31 NL</SelectItem>
                          <SelectItem value="+48">+48 PL</SelectItem>
                          <SelectItem value="+351">+351 PT</SelectItem>
                          <SelectItem value="+40">+40 RO</SelectItem>
                          <SelectItem value="+421">+421 SK</SelectItem>
                          <SelectItem value="+386">+386 SI</SelectItem>
                          <SelectItem value="+34">+34 ES</SelectItem>
                          <SelectItem value="+46">+46 SE</SelectItem>
                          <SelectItem value="+44">+44 UK</SelectItem>
                          <SelectItem value="+41">+41 CH</SelectItem>
                        </SelectContent>
                    </Select>
                    <Input
                      id="phone_number"
                      name="phone_number"
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="flex-grow"
                    />
                </div>
              </div>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                <div className="space-y-2 sm:col-span-3"><Label htmlFor="address_street">Via / Piazza</Label><Input id="address_street" name="address_street" defaultValue={userProfile?.address_street ?? ''} /></div>
                <div className="space-y-2 sm:col-span-2"><Label htmlFor="address_number">N° Civico</Label><Input id="address_number" name="address_number" defaultValue={userProfile?.address_number ?? ''} /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                 <div className="space-y-2"><Label htmlFor="address_city">Città</Label><Input id="address_city" name="address_city" defaultValue={userProfile?.address_city ?? ''} /></div>
                 <div className="space-y-2"><Label htmlFor="address_postal_code">CAP</Label><Input id="address_postal_code" name="address_postal_code" defaultValue={userProfile?.address_postal_code ?? ''} /></div>
                 <div className="space-y-2"><Label htmlFor="country">Paese</Label><Input id="country" name="country" defaultValue={userProfile?.country ?? ''} /></div>
            </div>
          </div>
          <div className="space-y-4 pt-6 border-t">
            <h3 className="font-semibold text-lg border-b pb-2">Consensi</h3>
            <div className="items-top flex space-x-2 pt-4">
              <Checkbox
                id="privacy"
                checked={privacyConsent}
                onCheckedChange={(checked) => setPrivacyConsent(checked === true)}
                required
              />
              <div className="grid gap-1.5 leading-none">
                <label htmlFor="privacy" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Ho letto l&apos;{' '}
                  <Link href="/privacy" className="text-blue-600 hover:underline" target="_blank">
                    Informativa Privacy
                  </Link>{' '}
                  e autorizzo il trattamento dei dati. *
                </label>
              </div>
            </div>
            <div className="items-top flex space-x-2">
              <Checkbox
                id="marketing"
                checked={marketingConsent}
                onCheckedChange={(checked) => setMarketingConsent(checked === true)}
              />
              <div className="grid gap-1.5 leading-none">
                <label htmlFor="marketing" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Acconsento a ricevere email di marketing.
                </label>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-6">
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Salvataggio..." : "Salva Dati Profilo"}</Button>
          {message && <p className={`text-sm font-medium ${message.startsWith('Errore') ? 'text-red-600' : 'text-green-600'}`}>{message}</p>}
        </CardFooter>
      </form>
    </Card>
  );
}



