import type { Metadata } from "next";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const { oobCode } = await searchParams;
  return <ResetPasswordForm code={typeof oobCode === "string" ? oobCode : null} />;
}
