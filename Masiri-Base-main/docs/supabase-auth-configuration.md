# Supabase Auth Provider Setup

The app now includes a Google OAuth sign-in action and a password-reset flow. The database migrations are applied, but provider credentials and redirect allowlists are managed in the Supabase Auth dashboard and cannot be safely inferred from repository code.

## Password recovery

In Supabase Dashboard → Authentication → URL Configuration, ensure the following are allowed:
- Site URL: `https://masiri-middle.vercel.app`
- Redirect URL: `https://masiri-middle.vercel.app/?password-reset=1`

The login screen requests a reset email with that redirect. After the user follows the email link, the app displays the new-password form.

## Google sign-in

1. Create an OAuth 2.0 Web application in Google Cloud Console.
2. In Supabase Dashboard → Authentication → Providers → Google, enable Google and enter the Google client ID and client secret.
3. Add the Supabase callback URL shown on that provider settings page to the Google OAuth client's authorized redirect URIs.
4. Keep `https://masiri-middle.vercel.app` in Supabase's allowed redirect URLs.
5. Test with an existing account first. New Google accounts need a grade-onboarding step before they can be assigned to a class; do not treat an OAuth login alone as teacher approval.

Do not put the Google client secret in Vite environment variables or frontend code. It belongs only in Supabase's provider settings.
