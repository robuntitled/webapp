import { z } from 'zod';
import { MIN_AGE_YEARS } from '@/lib/privacy/constants';
import { isMinimumAge } from '@/lib/privacy/consent';

const optionalString = z.string().trim().optional().or(z.literal(''));

export const updateProfileSchema = z
  .object({
    username: z
      .string()
      .trim()
      .toLowerCase()
      .min(3, 'Username: minimo 3 caratteri')
      .max(24, 'Username: massimo 24 caratteri')
      .regex(/^[a-z0-9_]+$/, 'Solo lettere minuscole, numeri e underscore'),
    first_name: z.string().min(1, 'Il nome è obbligatorio').max(80),
    last_name: z.string().min(1, 'Il cognome è obbligatorio').max(80),
    birth_date: z.string().optional(),
    gender: z.enum(['uomo', 'donna']).optional().or(z.literal('')),
    phone_prefix: z.string().min(2).optional().or(z.literal('')),
    phone_number: optionalString,
    country: optionalString,
    address_city: optionalString,
    address_street: optionalString,
    address_number: optionalString,
    address_postal_code: optionalString,
    privacy_consent: z.literal('on', { message: 'Il consenso privacy è obbligatorio' }),
    marketing_consent: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.birth_date) {
      const birth = new Date(data.birth_date);
      if (!isMinimumAge(birth, MIN_AGE_YEARS)) {
        ctx.addIssue({
          code: 'custom',
          message: `Devi avere almeno ${MIN_AGE_YEARS} anni per usare NomadLink.`,
          path: ['birth_date'],
        });
      }
    }
  });

export const updateSettingsSchema = z.object({
  marketing_consent: z.boolean(),
});

export const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, 'Inserisci la vecchia password'),
    newPassword: z.string().min(8, 'La nuova password deve avere almeno 8 caratteri'),
    confirmPassword: z.string().min(1, 'Conferma la nuova password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'La nuova password e la conferma non coincidono',
    path: ['confirmPassword'],
  });

export const registerSchema = z.object({
  firstName: z.string().min(1, 'Il nome è obbligatorio'),
  lastName: z.string().min(1, 'Il cognome è obbligatorio'),
  email: z.string().email('Email non valida'),
  password: z.string().min(8, 'La password deve avere almeno 8 caratteri'),
  privacyConsent: z.literal(true, { message: 'Devi accettare l\'informativa privacy' }),
  termsAccepted: z.literal(true, { message: 'Devi accettare i termini di servizio' }),
  marketingConsent: z.boolean().optional(),
});

export const legalConsentSchema = z.object({
  privacyConsent: z.literal(true, { message: 'Il consenso privacy è obbligatorio' }),
  termsAccepted: z.literal(true, { message: 'Devi accettare i termini di servizio' }),
  marketingConsent: z.boolean().optional(),
});

export function parseProfileFormData(formData: FormData) {
  return updateProfileSchema.parse({
    username: formData.get('username'),
    first_name: formData.get('first_name'),
    last_name: formData.get('last_name'),
    birth_date: formData.get('birth_date') || undefined,
    gender: formData.get('gender') || undefined,
    phone_prefix: formData.get('phone_prefix') || '+39',
    phone_number: formData.get('phone_number'),
    country: formData.get('country'),
    address_city: formData.get('address_city'),
    address_street: formData.get('address_street'),
    address_number: formData.get('address_number'),
    address_postal_code: formData.get('address_postal_code'),
    privacy_consent: formData.get('privacy_consent'),
    marketing_consent: formData.get('marketing_consent') ?? undefined,
  });
}