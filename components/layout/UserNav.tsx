'use client';

import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { Session } from 'next-auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getInitialsFromFullName } from '@/lib/utils/user';

type User = Session['user'];

export function UserNav({
  user,
  showCostsDashboard = false,
}: {
  user: User;
  showCostsDashboard?: boolean;
}) {
  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-9 w-9 rounded-full p-0 text-slate-600 transition-colors hover:bg-slate-900/[0.05] hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent group-data-[hero=true]/nav:text-white/90 group-data-[hero=true]/nav:hover:bg-white/10 group-data-[hero=true]/nav:hover:text-white"
        >
          <Avatar className="h-9 w-9 ring-1 ring-slate-200/80 group-data-[hero=true]/nav:ring-white/30">
            <AvatarImage src={user.image ?? ''} alt={user.name ?? ''} />
            <AvatarFallback>
              {user.name ? getInitialsFromFullName(user.name) : 'U'}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/pratiche">I miei viaggi</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/dashboard/profilo">Modifica profilo</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/dashboard/impostazioni">Impostazioni</Link>
          </DropdownMenuItem>
          {showCostsDashboard ? (
            <DropdownMenuItem asChild>
              <Link href="/dashboard/costi">Costi API</Link>
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => signOut({ callbackUrl: '/' })}>
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}