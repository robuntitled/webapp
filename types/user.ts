export const USER_PROFILE_SELECT =
  'id, email, username, first_name, last_name, birth_date, gender, phone_number, country, address_city, address_street, address_number, address_postal_code, privacy_consent, marketing_consent, image';

export type UserProfile = {
  id: string;
  email: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  birth_date: string | null;
  gender: string | null;
  phone_number: string | null;
  country: string | null;
  address_city: string | null;
  address_street: string | null;
  address_number: string | null;
  address_postal_code: string | null;
  privacy_consent: boolean | null;
  marketing_consent: boolean | null;
  privacy_consent_at: string | null;
  marketing_consent_at: string | null;
  terms_accepted_at: string | null;
  privacy_policy_version: string | null;
  image: string | null;
};

export type UserSettings = {
  email: string;
  marketing_consent: boolean | null;
  canChangePassword: boolean;
};