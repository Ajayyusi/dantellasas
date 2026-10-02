# Authentication architecture

## Flow

1. Client signs in with the Firebase Web SDK.
2. Client sends the fresh ID token to `POST /api/auth/session`.
3. Server verifies it (must be a sign-in within the last 5 minutes) and sets an
   **httpOnly, SameSite=Lax** Firebase session cookie (`SESSION_COOKIE_NAME`,
   default `__session` — the only cookie name Firebase Hosting forwards).
4. Server components and route handlers call `getSession()`
   (`src/lib/auth/session.ts`), which verifies the cookie with
   `checkRevoked = true`.
5. `src/proxy.ts` does a cheap cookie-presence redirect for protected routes;
   it never trusts the cookie.
6. `DELETE /api/auth/session` clears the cookie and revokes refresh tokens.

Mutating API routes reject cross-origin requests via an `Origin` check.

## Sign-in methods

Email/password is implemented, covering sign-up, login, forgot password,
reset password (through the app's own `/auth/action` page), change password and
logout everywhere. Sessions are httpOnly cookies verified on every request.

Google sign-in (`signInWithGoogle`) is used by the platform admin sign-in at
`/admin/login`; it needs the Google provider enabled in Firebase →
Authentication → Sign-in method. Offering it to salon users too only needs the
button on `/login`.

Adding phone sign-in only needs a client-side sign-in call.
Everything after the ID token (session cookie, membership lookup) is
method-agnostic. Phone sign-in additionally needs reCAPTCHA / App Check and
planning for SMS costs.

## Emulators

Set `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true` plus `FIRESTORE_EMULATOR_HOST`
and `FIREBASE_AUTH_EMULATOR_HOST`, then `npm run emulators`.
