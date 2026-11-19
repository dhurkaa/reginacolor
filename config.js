// Konfigurimi publik i aplikacionit. Këto vlera NUK janë sekrete (shihen nga çdo shfletues).
// Mos vendosni ASNJËHERË service_role/secret key, VAPID_PRIVATE_KEY apo token-in e Telegram këtu.
export const CLOUD_CONFIG = {
  // Supabase → Project Settings → API
  supabaseUrl: '',
  supabaseAnonKey: '',
  // Çelësi PUBLIK VAPID për njoftimet push (npm run vapid). Çelësi privat shkon vetëm në Vercel.
  vapidPublicKey: 'BPdQGgWgRGCHjKQ_9oAqEz69Qa5XBBEu8xxN30WFdwUtjEGjW7SnF-7Q2xn6ZyH3WCkfOgzjKvx2zrNPFvj9rw0'
};
