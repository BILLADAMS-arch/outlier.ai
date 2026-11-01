// Public client settings. The anon key is designed to be public: what each user may
// read or change is enforced by Row Level Security in /supabase/*.sql.
// Never put a service_role key in the front end.
export const config = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || 'https://uviopkumykzfabzkeswc.supabase.co',
  supabaseAnonKey:
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2aW9wa3VteWt6ZmFiemtlc3djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1MjM5OTgsImV4cCI6MjEwOTA5OTk5OH0.oZ__G_WeCEHvIjFEBg0ekGqz2fsbglgWL3ch5VU-Wx4',
}
