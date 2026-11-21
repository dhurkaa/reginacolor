// Konfigurimi publik i aplikacionit. Këto vlera NUK janë sekrete (shihen nga çdo shfletues).
// Mos vendosni ASNJËHERË service_role/secret key, VAPID_PRIVATE_KEY apo token-in e Telegram këtu.
export const CLOUD_CONFIG = {
  // Supabase → Project Settings → API
  supabaseUrl: 'https://irjjjebummsqzocwcipl.supabase.co',
  supabaseAnonKey: 'sb_publishable_jdTjCt22UVnjIH0ubp7nUQ_-CKzUhII',
  // Çelësi PUBLIK VAPID për njoftimet push (npm run vapid). Çelësi privat shkon vetëm në Vercel.
  vapidPublicKey: 'BKvibgQGX7lQEVBz7bV-Tkex3DwbeAS8GJZJGM-E7mKGVRoqR2JUMVPXfGQYt9FqsDwxU6_P_HAR0geh9hNABMI',
  // Prices and euro values in the app. false = hidden everywhere (data in the database is kept).
  showPrices: false,
  // Login screen: one button per role, then only the password. Emails are not secret (the password is).
  loginAccounts: [
    {key: 'admin', label: 'Administrator', hint: 'Stafi, katalogu dhe raportet', email: 'admin@regina.ks'},
    {key: 'agent', label: 'Agjent', hint: 'Krijon porosi në terren', email: 'agjenti@regina.ks'},
    {key: 'warehouse', label: 'Fabrika', hint: 'Përgatit dhe dërgon porositë', email: 'fabrika@regina.ks'}
  ]
};
