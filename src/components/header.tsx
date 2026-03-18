"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useLocale } from "@/hooks/useLocale";
import { subscribeToPendingReportsCount, subscribeToPendingUsersCount } from "@/lib/matches";
import { localeList, localeLabels, type Locale } from "@/lib/i18n";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { LogOut, Shield, User, UserCircle, Ticket, Globe, ScrollText } from "lucide-react";

export function Header() {
  const { profile, signInWithGoogle, signOut, loading } = useAuth();
  const { t, locale, setLocale } = useLocale();
  const [pendingCount, setPendingCount] = useState(0);
  const [reportsCount, setReportsCount] = useState(0);

  useEffect(() => {
    if (profile?.role !== "admin") return;
    return subscribeToPendingUsersCount(setPendingCount);
  }, [profile?.role]);

  useEffect(() => {
    if (profile?.role !== "admin") return;
    return subscribeToPendingReportsCount(setReportsCount);
  }, [profile?.role]);

  return (
    <header className="sticky top-0 z-50 bg-transparent text-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex flex-col items-start leading-none">
            <span className="text-2xl font-black tracking-[0.2em] text-white uppercase drop-shadow-sm">FOOT</span>
            <span className="text-[10px] tracking-[0.5em] text-emerald-300 uppercase w-full text-center">BEL-AIR</span>
          </div>
          <img src="/soccer-ball.png" alt="Football" className="h-9 w-9 drop-shadow-lg invert brightness-200" />
        </Link>

        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-white/80 hover:text-white hover:bg-white/10">
                <Globe className="h-4 w-4" />
                <span className="text-xs uppercase">{locale}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {localeList.map((loc: Locale) => (
                <DropdownMenuItem
                  key={loc}
                  onClick={() => setLocale(loc)}
                  className={locale === loc ? "bg-muted font-medium" : ""}
                >
                  {localeLabels[loc]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {loading ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
          ) : profile ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-sm text-white/80">
                <Ticket className="h-4 w-4" />
                <span>{profile.quota.remaining}/10</span>
              </div>

              {profile.penalty?.active && (
                <Badge variant="destructive" className="text-xs bg-red-500 border-red-400">
                  {t("penalized")}
                </Badge>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full hover:bg-white/10">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile.photoURL || undefined} />
                      <AvatarFallback>
                        {profile.displayName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{profile.displayName}</p>
                    <p className="text-xs text-muted-foreground">{profile.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center gap-2">
                      <UserCircle className="h-4 w-4" />
                      {t("navProfile")}
                    </Link>
                  </DropdownMenuItem>
                  {profile.status !== "pending" && (
                    <DropdownMenuItem asChild>
                      <Link href="/" className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {t("navMatches")}
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {profile.status !== "pending" && (
                    <DropdownMenuItem asChild>
                      <Link href="/rules" className="flex items-center gap-2">
                        <ScrollText className="h-4 w-4" />
                        {t("navRules")}
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {profile.role === "admin" && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        {t("navAdmin")}
                        {(pendingCount + reportsCount) > 0 && (
                          <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white">
                            {pendingCount + reportsCount}
                          </span>
                        )}
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="flex items-center gap-2">
                    <LogOut className="h-4 w-4" />
                    {t("logout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <Button onClick={signInWithGoogle} size="sm" className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 shadow-md">
              {t("googleLogin")}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
