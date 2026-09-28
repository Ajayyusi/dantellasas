import { redirect } from "next/navigation";

/**
 * Custom Firebase email action handler. Point Firebase Authentication ›
 * Templates › "Customize action URL" at https://<your-domain>/auth/action so
 * reset links open inside the app instead of the default Firebase page.
 */
export default async function AuthActionPage({ searchParams }: PageProps<"/auth/action">) {
  const params = await searchParams;
  const mode = typeof params.mode === "string" ? params.mode : "";
  const code = typeof params.oobCode === "string" ? params.oobCode : "";
  if (mode === "resetPassword" && code) {
    redirect(`/reset-password?oobCode=${encodeURIComponent(code)}`);
  }
  redirect("/login");
}
