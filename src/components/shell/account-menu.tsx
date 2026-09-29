"use client";

import { LogOutIcon, MonitorIcon, MoonIcon, SunIcon, UserIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useOrg } from "@/components/providers/org-provider";
import { PersonAvatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme, type Theme } from "@/hooks/use-browser";
import { signOutEverywhere } from "@/lib/auth/client";
import { useI18n } from "@/lib/i18n/client";
import { SYSTEM_ROLE_KEYS, type SystemRoleKey } from "@/lib/permissions";

function isSystemRole(key: string): key is SystemRoleKey {
  return (SYSTEM_ROLE_KEYS as readonly string[]).includes(key);
}

/** The member's role in their language (custom roles keep their own name). */
export function useRoleLabel(): string {
  const { t } = useI18n();
  const org = useOrg();
  const key = org.user.roleKey;
  return isSystemRole(key) ? t(`settings.roleNames.${key}.name`) : org.user.roleName;
}

/** Profile, theme and sign-out; `children` is the trigger. */
export function AccountMenu({
  children,
  align = "end",
  side,
}: {
  children: React.ReactNode;
  align?: "start" | "end";
  side?: "top" | "bottom";
}) {
  const { t } = useI18n();
  const org = useOrg();
  const router = useRouter();
  const [theme, changeTheme] = useTheme();
  const role = useRoleLabel();
  const name = org.user.name || org.user.email;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align={align} side={side} className="w-72">
        <div className="flex items-center gap-3 px-2.5 py-2.5">
          <PersonAvatar name={name} className="size-10" />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{name}</div>
            <div className="truncate text-xs text-muted-foreground">{org.user.email}</div>
            <div className="mt-1 text-xs font-semibold text-gold-foreground">{role}</div>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/account">
            <UserIcon />
            {t("shell.profile")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{t("shell.theme")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme} onValueChange={(v) => changeTheme(v as Theme)}>
          <DropdownMenuRadioItem value="light">
            <SunIcon />
            {t("shell.themeLight")}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <MoonIcon />
            {t("shell.themeDark")}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <MonitorIcon />
            {t("shell.themeSystem")}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={async () => {
            await signOutEverywhere();
            router.replace("/login");
            router.refresh();
          }}
        >
          <LogOutIcon />
          {t("shell.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
