import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-2xl font-semibold">Salon Platform — scaffold</h1>
      <p className="text-muted-foreground text-sm">
        Infrastructure only. Product screens are pending verified research — see
        <code className="mx-1">docs/product-research.md</code>.
      </p>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/login">Sign in</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/orgs">My organizations</Link>
        </Button>
      </div>
    </main>
  );
}
