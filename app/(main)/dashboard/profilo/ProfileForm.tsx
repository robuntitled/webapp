'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { updateUserProfile, updateUserAvatar } from '@/actions/user';
import type { UserProfile } from '@/types/user';
import { getInitialsFromNames } from '@/lib/utils/user';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CalendarIcon,
  Camera,
  Contact,
  FileCheck2,
  MapPin,
  Settings,
  User,
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import imageCompression from 'browser-image-compression';
import { toast } from 'sonner';
import { MIN_AGE_YEARS } from '@/lib/privacy/constants';

function ProfileSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof User;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-5">
      <div className="flex items-start gap-3 pb-1">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-display text-lg font-semibold text-foreground">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}

const fieldClass =
  'h-11 rounded-xl border-border/80 bg-background/80 focus-visible:ring-primary/25';

export default function ProfileForm({
  userProfile,
  displayEmail,
}: {
  userProfile: UserProfile | null;
  displayEmail?: string | null;
}) {
  const [birthDate, setBirthDate] = useState<Date | undefined>(
    userProfile?.birth_date ? new Date(userProfile.birth_date) : undefined
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(userProfile?.image ?? null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const phoneParts = userProfile?.phone_number?.split(' ') ?? [];
  const [phonePrefix, setPhonePrefix] = useState(phoneParts[0] ?? '+39');
  const [phoneNumber, setPhoneNumber] = useState(phoneParts.slice(1).join(' '));
  const [gender, setGender] = useState(userProfile?.gender ?? '');
  const [privacyConsent, setPrivacyConsent] = useState(userProfile?.privacy_consent ?? false);
  const [marketingConsent, setMarketingConsent] = useState(
    userProfile?.marketing_consent ?? false
  );

  const fullName = `${userProfile?.first_name || ''} ${userProfile?.last_name || ''}`.trim();
  const email = displayEmail ?? userProfile?.email ?? '';

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressedFile = await imageCompression(file, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1024,
        useWebWorker: true,
      });
      setAvatarFile(compressedFile);
      setAvatarPreview(URL.createObjectURL(compressedFile));
    } catch {
      toast.error('Errore durante la compressione dell\'immagine.');
    }
  };

  const handleAvatarSubmit = async () => {
    if (!avatarFile) return;
    const formData = new FormData();
    formData.append('avatar', avatarFile);

    setIsSubmitting(true);
    try {
      const result = await updateUserAvatar(formData);
      if (result.success) {
        setAvatarFile(null);
        toast.success('Foto profilo aggiornata!');
        window.location.reload();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Errore imprevisto');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProfileSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);

    if (birthDate) {
      const timezoneOffset = birthDate.getTimezoneOffset() * 60000;
      const adjustedDate = new Date(birthDate.getTime() - timezoneOffset);
      formData.set('birth_date', adjustedDate.toISOString().split('T')[0]);
    } else {
      formData.set('birth_date', '');
    }

    if (!privacyConsent) {
      toast.error('Il consenso privacy è obbligatorio.');
      setIsSubmitting(false);
      return;
    }

    formData.set('phone_prefix', phonePrefix);
    formData.set('phone_number', phoneNumber);
    formData.set('gender', gender);
    if (privacyConsent) formData.set('privacy_consent', 'on');
    else formData.delete('privacy_consent');
    if (marketingConsent) formData.set('marketing_consent', 'on');
    else formData.delete('marketing_consent');

    try {
      const result = await updateUserProfile(formData);
      toast.success(result.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Errore imprevisto');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleProfileSubmit} className="space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-center gap-6 p-5 rounded-2xl bg-muted/40 border border-border/60">
        <div className="relative shrink-0 mx-auto sm:mx-0">
          <Avatar className="h-24 w-24 ring-4 ring-background shadow-lg">
            <AvatarImage src={avatarPreview ?? undefined} className="object-cover" />
            <AvatarFallback className="text-2xl font-display bg-primary/10 text-primary">
              {getInitialsFromNames(userProfile?.first_name, userProfile?.last_name)}
            </AvatarFallback>
          </Avatar>
          <Button
            type="button"
            size="icon"
            className="absolute -bottom-1 -right-1 h-9 w-9 rounded-full shadow-md"
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera className="h-4 w-4" />
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/png, image/jpeg, image/webp"
            onChange={handleFileChange}
          />
        </div>
        <div className="flex-1 text-center sm:text-left min-w-0">
          <p className="font-display text-2xl font-semibold truncate">
            {fullName || 'Il tuo profilo'}
          </p>
          {userProfile?.username && (
            <p className="text-sm font-medium text-primary mt-1 truncate">
              @{userProfile.username}
            </p>
          )}
          {email && (
            <p className="text-sm text-muted-foreground mt-0.5 truncate">{email}</p>
          )}
          {avatarFile && (
            <div className="mt-4 flex flex-wrap justify-center sm:justify-start gap-2">
              <Button
                type="button"
                size="sm"
                className="rounded-full"
                onClick={handleAvatarSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Caricamento…' : 'Salva foto'}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="rounded-full"
                onClick={() => {
                  setAvatarFile(null);
                  setAvatarPreview(userProfile?.image ?? null);
                }}
              >
                Annulla
              </Button>
            </div>
          )}
        </div>
        <Button asChild variant="outline" size="sm" className="rounded-full shrink-0 gap-2">
          <Link href="/dashboard/impostazioni">
            <Settings className="h-4 w-4" />
            Impostazioni
          </Link>
        </Button>
      </div>

      <ProfileSection
        icon={User}
        title="Dati anagrafici"
        description="Informazioni di base visibili agli altri viaggiatori"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="username">Username *</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                @
              </span>
              <Input
                id="username"
                name="username"
                defaultValue={userProfile?.username ?? ''}
                required
                minLength={3}
                maxLength={24}
                pattern="[a-zA-Z0-9_]+"
                autoComplete="username"
                className={`${fieldClass} pl-8`}
                placeholder="es. marco_rossi"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Univoco su NomadLink. Solo lettere, numeri e underscore (3–24 caratteri).
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="first_name">Nome *</Label>
            <Input
              id="first_name"
              name="first_name"
              defaultValue={userProfile?.first_name ?? ''}
              required
              className={fieldClass}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="last_name">Cognome *</Label>
            <Input
              id="last_name"
              name="last_name"
              defaultValue={userProfile?.last_name ?? ''}
              required
              className={fieldClass}
            />
          </div>
          <div className="space-y-2">
            <Label>Data di nascita (facoltativa, min. {MIN_AGE_YEARS} anni)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  type="button"
                  className={cn(
                    'w-full justify-start font-normal rounded-xl h-11',
                    !birthDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                  {birthDate ? format(birthDate, 'PPP', { locale: it }) : 'Scegli una data'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 rounded-xl" align="start">
                <Calendar
                  mode="single"
                  selected={birthDate}
                  onSelect={setBirthDate}
                  captionLayout="dropdown"
                  fromYear={1940}
                  toYear={new Date().getFullYear() - MIN_AGE_YEARS}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label>Sesso (facoltativo)</Label>
            <RadioGroup
              value={gender}
              onValueChange={setGender}
              className="flex flex-wrap gap-4 pt-2"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="uomo" id="male" />
                <Label htmlFor="male" className="font-normal cursor-pointer">
                  Uomo
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="donna" id="female" />
                <Label htmlFor="female" className="font-normal cursor-pointer">
                  Donna
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>
      </ProfileSection>

      <ProfileSection
        icon={Contact}
        title="Contatti"
        description="Facoltativi — utili per organizzare i viaggi di gruppo"
      >
        <div className="space-y-2 max-w-md">
          <Label htmlFor="phone_number">Telefono</Label>
          <div className="flex gap-2">
            <Select value={phonePrefix} onValueChange={setPhonePrefix}>
              <SelectTrigger className="w-[120px] rounded-xl h-11">
                <SelectValue placeholder="Pref." />
              </SelectTrigger>
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
              className={cn(fieldClass, 'flex-1')}
              placeholder="333 1234567"
            />
          </div>
        </div>
      </ProfileSection>

      <ProfileSection
        icon={MapPin}
        title="Residenza"
        description="Aiuta a suggerire aeroporti e partenze vicine a te"
      >
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
          <div className="space-y-2 sm:col-span-3">
            <Label htmlFor="address_street">Via / Piazza</Label>
            <Input
              id="address_street"
              name="address_street"
              defaultValue={userProfile?.address_street ?? ''}
              className={fieldClass}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="address_number">N° civico</Label>
            <Input
              id="address_number"
              name="address_number"
              defaultValue={userProfile?.address_number ?? ''}
              className={fieldClass}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="address_city">Città</Label>
            <Input
              id="address_city"
              name="address_city"
              defaultValue={userProfile?.address_city ?? ''}
              className={fieldClass}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address_postal_code">CAP</Label>
            <Input
              id="address_postal_code"
              name="address_postal_code"
              defaultValue={userProfile?.address_postal_code ?? ''}
              className={fieldClass}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">Paese</Label>
            <Input
              id="country"
              name="country"
              defaultValue={userProfile?.country ?? ''}
              className={fieldClass}
            />
          </div>
        </div>
      </ProfileSection>

      <ProfileSection
        icon={FileCheck2}
        title="Consensi"
        description="Obbligatori per usare NomadLink in conformità al GDPR"
      >
        <div className="space-y-4 rounded-2xl border border-border/60 bg-muted/30 p-5">
          <div className="flex items-start gap-3">
            <Checkbox
              id="privacy"
              checked={privacyConsent}
              onCheckedChange={(checked) => setPrivacyConsent(checked === true)}
            />
            <label htmlFor="privacy" className="text-sm leading-relaxed cursor-pointer">
              Ho letto l&apos;{' '}
              <Link href="/privacy" className="text-primary hover:underline" target="_blank">
                Informativa Privacy
              </Link>{' '}
              e autorizzo il trattamento dei dati. *
            </label>
          </div>
          <div className="flex items-start gap-3">
            <Checkbox
              id="marketing"
              checked={marketingConsent}
              onCheckedChange={(checked) => setMarketingConsent(checked === true)}
            />
            <label htmlFor="marketing" className="text-sm leading-relaxed cursor-pointer">
              Acconsento a ricevere email di marketing e novità sui viaggi.
            </label>
          </div>
        </div>
      </ProfileSection>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2 border-t border-border/60">
        <p className="text-xs text-muted-foreground">
          I campi con * sono obbligatori per salvare il profilo.
        </p>
        <Button type="submit" disabled={isSubmitting} className="rounded-full px-8">
          {isSubmitting ? 'Salvataggio…' : 'Salva dati personali'}
        </Button>
      </div>
    </form>
  );
}