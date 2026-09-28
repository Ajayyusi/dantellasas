import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { LoginForm } from "@/components/auth/login-form";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const session = await getSession();
  if (session && params.reason !== "suspended") redirect("/");
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
