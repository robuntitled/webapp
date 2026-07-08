import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../../../../lib/supabase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { firstName, lastName, email, password } = body;

    if (!email || !firstName || !lastName || !password) {
      return new NextResponse('Tutti i campi sono obbligatori', { status: 400 });
    }

    const { data: existingUser } = await supabaseAdmin.from('users').select('id').eq('email', email).single();
    if (existingUser) {
      return new NextResponse('Utente già registrato', { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const { data: newUser, error } = await supabaseAdmin
      .from('users')
      .insert([{ 
        first_name: firstName, 
        last_name: lastName, 
        email, 
        hashedPassword 
      }])
      .select()
      .single();

    if (error) {
      throw error;
    }
    
    return NextResponse.json(newUser);

  } catch (error) {
    console.error("ERRORE REGISTRAZIONE:", error);
    return new NextResponse('Errore Interno del Server', { status: 500 });
  }
}