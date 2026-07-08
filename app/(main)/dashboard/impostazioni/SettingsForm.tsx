'use client';

import { useState } from 'react';
import { updateUserProfile } from '../../../../actions/user';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export default function SettingsForm({ userSettings }: { userSettings: any }) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSettingsSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    
    try {
      const result = await updateUserProfile(formData);
      toast.success(result.message); // Mostra una notifica di successo
    } catch (error: any) {
      toast.error(error.message); // Mostra una notifica di errore
    }
    setIsSubmitting(false);
  };

  return (
    <div className="grid gap-8">
        {/* Card per le Notifiche */}
        <form onSubmit={handleSettingsSubmit}>
            <Card>
                <CardHeader>
                    <CardTitle>Notifiche</CardTitle>
                    <CardDescription>Gestisci come vuoi essere contattato.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between space-x-2">
                        <Label htmlFor="email_notifications" className="flex flex-col space-y-1">
                        <span>Email di Marketing</span>
                        <span className="font-normal leading-snug text-muted-foreground">
                            Ricevi email su nuovi viaggi, articoli e promozioni.
                        </span>
                        </Label>
                        <Switch
                        id="email_notifications"
                        name="email_notifications"
                        defaultChecked={userSettings?.email_notifications}
                        />
                    </div>
                </CardContent>
                <CardFooter className="border-t px-6 py-4">
                    <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Salvo..." : "Salva Preferenze"}</Button>
                </CardFooter>
            </Card>
        </form>

        {/* Card per la Sicurezza (segnaposto) */}
        <Card>
            <CardHeader>
                <CardTitle>Account e Sicurezza</CardTitle>
                <CardDescription>Modifica le tue credenziali di accesso. (Funzionalità in arrivo)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex justify-between items-center"><p className="text-sm text-slate-500">Email: {userSettings?.email}</p><Button variant="outline" disabled>Modifica Email</Button></div>
                <div className="flex justify-between items-center"><p className="text-sm text-slate-500">Password: **********</p><Button variant="outline" disabled>Modifica Password</Button></div>
            </CardContent>
        </Card>
        
        {/* Card per i Pagamenti (segnaposto) */}
        <Card>
            <CardHeader>
                <CardTitle>Metodi di Pagamento</CardTitle>
                <CardDescription>Aggiungi e gestisci le tue carte e account. (Funzionalità in arrivo)</CardDescription>
            </CardHeader>
            <CardContent>
                 <p className="text-sm text-slate-400">Nessun metodo di pagamento salvato.</p>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
                <Button disabled>Aggiungi Metodo</Button>
            </CardFooter>
        </Card>
    </div>
  );
}