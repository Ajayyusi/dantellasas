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

## Sign-in methods — OPEN DECISION

The login page currently uses **email/password as a dev placeholder** only.
Which methods the product needs (phone/SMS OTP, email link, Google, Apple…)
is undecided and should follow research. Relevant constraints to weigh:

- Phone auth needs reCAPTCHA / App Check setup and SMS cost planning.
- Staff on shared front-desk devices may need a different flow than owners.

Status of what the reference platform uses: `NOT YET VERIFIED`.

## Emulators

Set `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true` plus `FIRESTORE_EMULATOR_HOST`
and `FIREBASE_AUTH_EMULATOR_HOST`, then `npm run emulators`.
