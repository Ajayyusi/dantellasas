"use client";

import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getClientAuth } from "@/lib/firebase/client";

/**
 * DEV PLACEHOLDER sign-in (email/password) to exercise the session flow.
 * The production sign-in method(s) — e.g. phone OTP, email link, Google —
 * are an open product decision; see docs/architecture/auth.md.
 */
function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/orgs";
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { establishSession } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(e.currentTarget);
    try {
      const cred = await signInWithEmailAndPassword(
        getClientAuth(),
        String(form.get("email")),
        String(form.get("password")),
      );
      await establishSession(cred.user);
      router.replace(safeNext(params.get("next")));
      router.refresh();
    } catch {
      setError("Sign-in failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-sm flex-col gap-4">
      <h1 className="text-xl font-semibold">Sign in</h1>
      <p className="text-muted-foreground text-xs">Development placeholder — final auth method TBD.</p>
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "…" : "Sign in"}
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
