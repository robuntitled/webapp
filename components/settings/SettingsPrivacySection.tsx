'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Download, FileDown, ShieldAlert, Trash2 } from 'lucide-react';
import { exportUserData, deleteUserAccount } from '@/actions/privacy';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { SettingsSection, settingsFieldClass } from '@/components/settings/SettingsSection';
import { toast } from 'sonner';

export function SettingsPrivacySection({ privacyEmail }: { privacyEmail: string }) {
  const router = useRouter();
  const [exportPending, startExport] = useTransition();
  const [deletePending, startDelete] = useTransition();
  const [confirmText, setConfirmText] = useState('');

  const handleExport = () => {
    startExport(async () => {
      try {
        const data = await exportUserData();
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `nomadlink-dati-${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success('Export completato.');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Errore export');
      }
    });
  };

  const handleDelete = () => {
    startDelete(async () => {
      try {
        await deleteUserAccount(confirmText);
        await signOut({ redirectTo: '/' });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Errore eliminazione');
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-10">
      <SettingsSection
        icon={FileDown}
        title="Portabilità dei dati"
        description="Scarica una copia dei tuoi dati personali in formato JSON (art. 20 GDPR)."
      >
        <div className="rounded-2xl border border-border/70 bg-muted/20 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="font-medium text-foreground">Esporta i tuoi dati</p>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              Profilo, viaggi, preferiti e partecipazioni in un unico file.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={exportPending}
            className="rounded-full shrink-0"
          >
            <Download className="mr-2 h-4 w-4" />
            {exportPending ? 'Preparo...' : 'Esporta dati'}
          </Button>
        </div>
      </SettingsSection>

      <SettingsSection
        icon={ShieldAlert}
        title="Eliminazione account"
        description="Cancella definitivamente il tuo account e tutti i dati associati (art. 17 GDPR)."
      >
        <div className="rounded-2xl border border-red-200/80 dark:border-red-900/60 bg-red-50/60 dark:bg-red-950/20 p-5 space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Verranno eliminati profilo, viaggi creati, preferiti e partecipazioni. Questa azione è
            irreversibile.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="rounded-full">
                <Trash2 className="mr-2 h-4 w-4" />
                Elimina account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle>Confermi l&apos;eliminazione?</AlertDialogTitle>
                <AlertDialogDescription>
                  Digita <strong>ELIMINA</strong> per confermare la cancellazione definitiva.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="py-2">
                <Label htmlFor="confirm-delete">Conferma</Label>
                <Input
                  id="confirm-delete"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="ELIMINA"
                  className={`mt-2 ${settingsFieldClass}`}
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setConfirmText('')} className="rounded-full">
                  Annulla
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={confirmText !== 'ELIMINA' || deletePending}
                  className="rounded-full bg-red-600 hover:bg-red-700"
                >
                  {deletePending ? 'Elimino...' : 'Elimina definitivamente'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </SettingsSection>

      <p className="text-xs text-muted-foreground leading-relaxed pt-2 border-t border-border/50">
        Per altre richieste (accesso, rettifica, opposizione, limitazione) scrivi a{' '}
        <a href={`mailto:${privacyEmail}`} className="text-primary hover:underline font-medium">
          {privacyEmail}
        </a>
      </p>
    </div>
  );
}