"use client";

import { Avatar as AvatarPrimitive } from "radix-ui";
import * as React from "react";

import { cn, initials } from "@/lib/utils";

function Avatar({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn("relative flex size-9 shrink-0 overflow-hidden rounded-full ring-2 ring-card", className)}
      {...props}
    />
  );
}

function AvatarImage({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return <AvatarPrimitive.Image className={cn("aspect-square size-full object-cover", className)} {...props} />;
}

function AvatarFallback({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      className={cn(
        "flex size-full items-center justify-center rounded-full bg-primary-soft text-[0.8em] font-semibold tracking-wide text-primary",
        className,
      )}
      {...props}
    />
  );
}

/** Brand tones for initials when a person has no colour of their own. */
const AVATAR_TONES = ["#965660", "#a25c43", "#90693b", "#507357", "#4b6d8a", "#7d5279", "#715f53", "#4f7b80"];

function toneFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_TONES[h % AVATAR_TONES.length] ?? AVATAR_TONES[0]!;
}

/** Convenience: photo or initials on a colour derived from the name. */
function PersonAvatar({
  name,
  src,
  color,
  className,
}: {
  name: string;
  src?: string | null;
  color?: string;
  className?: string;
}) {
  const tone = color || toneFor(name);
  return (
    <Avatar className={className}>
      {src ? <AvatarImage src={src} alt="" /> : null}
      <AvatarFallback style={{ backgroundColor: `color-mix(in oklch, ${tone} 16%, var(--card))`, color: tone }}>
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}

export { Avatar, AvatarFallback, AvatarImage, PersonAvatar };
