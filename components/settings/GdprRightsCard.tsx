'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { exportUserData, deleteUserAccount } from '@/actions/privacy';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { toast } from 'sonner';
import { Download, Trash2 } from 'lucide-react';

export function GdprRightsCard({ privacyEmail }: { privacyEmail: string }) {
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
    <Card className="border-red-200 dark:border-red-900">
      <CardHeader>
        <CardTitle>I tuoi diritti GDPR</CardTitle>
        <CardDescription>
          Accesso, portabilità e cancellazione dei dati personali (artt. 15–20 GDPR).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-900">
          <div>
            <p className="font-medium">Scarica i tuoi dati</p>
            <p className="text-sm text-slate-500">
              Ricevi un file JSON con profilo, viaggi, preferiti e partecipazioni.
            </p>
          </div>
          <Button variant="outline" onClick={handleExport} disabled={exportPending}>
            <Download className="mr-2 h-4 w-4" />
            {exportPending ? 'Preparo...' : 'Esporta dati'}
          </Button>
        </div>

        <div className="p-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
          <p className="font-medium text-red-800 dark:text-red-200">Elimina account</p>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Cancella definitivamente il tuo account e tutti i dati associati. Questa azione è
            irreversibile.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="mt-4">
                <Trash2 className="mr-2 h-4 w-4" />
                Elimina account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confermi l&apos;eliminazione?</AlertDialogTitle>
                <AlertDialogDescription>
                  Verranno eliminati profilo, viaggi creati, preferiti e partecipazioni. Digita{' '}
                  <strong>ELIMINA</strong> per confermare.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="py-2">
                <Label htmlFor="confirm-delete">Conferma</Label>
                <Input
                  id="confirm-delete"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="ELIMINA"
                  className="mt-2"
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setConfirmText('')}>Annulla</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={confirmText !== 'ELIMINA' || deletePending}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {deletePending ? 'Elimino...' : 'Elimina definitivamente'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
      <CardFooter className="text-xs text-slate-500 border-t">
        Per altre richieste (opposizione, limitazione) scrivi a{' '}
        <a href={`mailto:${privacyEmail}`} className="text-blue-600 hover:underline">
          {privacyEmail}
        </a>
      </CardFooter>
    </Card>
  );
}