"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocale } from "@/hooks/useLocale";
import {
  subscribeToMatchesForWeek,
  subscribeToUsers,
  getWeekDates,
  joinMatch,
  leaveMatch,
  autoResolveExpiredMatches,
  cleanupOutOfRangeMatches,
} from "@/lib/matches";
import { Match, UserProfile, DayOfWeek, MAX_PLAYERS, MIN_PLAYERS } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft, ChevronRight, Users, CloudSun, ScrollText, ArrowRight, Activity, CalendarDays } from "lucide-react";
import { Timestamp } from "firebase/firestore";
import { toast } from "sonner";
import Link from "next/link";
import { format } from "date-fns";
import type { TranslationKeys, Locale } from "@/lib/i18n";

const dayTranslationKeys: Record<DayOfWeek, TranslationKeys> = {
  monday: "monday",
  tuesday: "tuesday",
  wednesday: "wednesday",
  thursday: "thursday",
  friday: "friday",
};

export function WeekView() {
  const { profile } = useAuth();
  const { t, dateFnsLocale } = useLocale();
  const [weekOffset, setWeekOffset] = useState(0);
  const [matches, setMatches] = useState<Match[]>([]);
  const [usersMap, setUsersMap] = useState<Map<string, UserProfile>>(new Map());
  const [loading, setLoading] = useState(true);

  const weekDates = getWeekDates(weekOffset);

  useEffect(() => {
    cleanupOutOfRangeMatches().catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    autoResolveExpiredMatches(weekOffset).catch(() => {});
    const unsubMatches = subscribeToMatchesForWeek(weekOffset, (m) => {
      setMatches(m);
      setLoading(false);
    });
    const unsubUsers = subscribeToUsers(setUsersMap);
    return () => {
      unsubMatches();
      unsubUsers();
    };
  }, [weekOffset]);

  const getMatchForDay = (day: DayOfWeek, date: Date): Match | undefined => {
    return matches.find((m) => {
      const matchDate = m.date.toDate();
      return (
        m.dayOfWeek === day &&
        matchDate.toDateString() === date.toDateString()
      );
    });
  };

  const handleJoin = async (matchId: string) => {
    if (!profile) return;
    try {
      const entry = {
        uid: profile.uid,
        displayName: profile.displayName,
        photoURL: profile.photoURL,
        joinedAt: Timestamp.now(),
      };
      await joinMatch(matchId, entry, usersMap);
      toast.success(t("registeredToast"));
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "BANNED") {
        toast.error(t("bannedCannotRegister"));
      } else {
        const message = err instanceof Error ? err.message : t("error");
        toast.error(message);
      }
    }
  };

  const handleLeave = async (matchId: string) => {
    if (!profile) return;
    try {
      const result = await leaveMatch(matchId, profile.uid, usersMap);
      if (result.autoLateCancelApplied) {
        toast.warning(t("lateCancelPenaltyApplied"));

        if (profile.email) {
          const penaltyUntil = new Date();
          penaltyUntil.setDate(penaltyUntil.getDate() + 14);

          fetch("/api/penalty-notification", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              playerEmail: profile.email,
              playerName: profile.displayName,
              playerLocale: profile.locale || "fr",
              reason: "late-cancellation",
              penaltyUntil: penaltyUntil.toISOString(),
            }),
          }).catch(() => {});
        }
      } else {
        toast.success(t("unregisteredToast"));
      }

      if (result.matchStatus === "confirmed" && result.promotedPlayers.length > 0) {
        const match = matches.find((m) => m.id === matchId);
        if (match) {
          const matchDate = format(match.date.toDate(), "d MMMM yyyy", { locale: dateFnsLocale });
          const matchDay = t(dayTranslationKeys[match.dayOfWeek]);

          const promotedPlayer = result.promotedPlayers[0];
          const promotedUser = usersMap.get(promotedPlayer.uid);
          const promotedRecipient = promotedUser?.email
            ? { email: promotedUser.email, locale: promotedUser.locale || "fr", displayName: promotedPlayer.displayName }
            : null;

          const existingPlayerEmails = result.players
            .filter((p) => !result.promotedPlayers.some((pp) => pp.uid === p.uid))
            .map((p) => {
              const user = usersMap.get(p.uid);
              return user?.email ? { email: user.email, locale: user.locale || "fr", displayName: p.displayName } : null;
            })
            .filter((r): r is { email: string; locale: Locale; displayName: string } => r !== null);

          fetch("/api/roster-update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              existingPlayerEmails,
              promotedPlayer: promotedRecipient,
              matchDay,
              matchDate,
              players: result.players.map((p) => ({ displayName: p.displayName })),
              waitingList: result.waitingList.map((p) => ({ displayName: p.displayName })),
            }),
          }).catch(() => {});
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("error");
      toast.error(message);
    }
  };

  const isRegistered = (match: Match): boolean => {
    if (!profile) return false;
    return [...match.players, ...match.waitingList].some(
      (p) => p.uid === profile.uid
    );
  };

  const isInPlayers = (match: Match): boolean => {
    if (!profile) return false;
    return match.players.some((p) => p.uid === profile.uid);
  };

  const getWaitingPosition = (match: Match): number => {
    if (!profile) return -1;
    const idx = match.waitingList.findIndex((p) => p.uid === profile.uid);
    return idx >= 0 ? idx + 1 : -1;
  };

  const weekLabel = (() => {
    const mon = weekDates[0].date;
    const fri = weekDates[4].date;
    const start = format(mon, "d MMM", { locale: dateFnsLocale });
    const end = format(fri, "d MMM yyyy", { locale: dateFnsLocale });
    return t("weekTitle", { start, end });
  })();

  return (
    <div className="w-full max-w-7xl mx-auto px-2 md:px-0">
      <div className="relative mb-10 flex flex-col md:flex-row items-center justify-between gap-6 p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-2xl shadow-2xl overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
        
        <div className="relative z-10 flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 shadow-lg shadow-emerald-500/20">
            <CalendarDays className="w-6 h-6 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-emerald-400 font-semibold text-sm tracking-wider uppercase mb-1">
              {weekOffset === 0 ? "This Week" : weekOffset === 1 ? "Next Week" : "Schedule"}
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70 tracking-tight">
              {weekLabel}
            </h2>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-full bg-white/5 border-white/10 text-white hover:bg-white/15 hover:scale-105 active:scale-95 transition-all duration-300"
            onClick={() => setWeekOffset((w) => w - 1)}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-full bg-white/5 border-white/10 text-white hover:bg-white/15 hover:scale-105 active:scale-95 transition-all duration-300"
            onClick={() => setWeekOffset((w) => w + 1)}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {!loading && matches.length > 0 && (
        <div className="mb-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/rules"
            className="group relative flex items-center gap-3 rounded-full bg-black/40 border border-white/10 px-6 py-3 transition-all hover:bg-black/60 hover:border-emerald-500/30 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            <ScrollText className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-medium text-white/90 group-hover:text-white transition-colors">
              {t("navRules")}
            </span>
          </Link>
          <a
            href="https://meteofrance.com/previsions-meteo-france/villeneuve-loubet/06270"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative flex items-center gap-3 rounded-full bg-black/40 border border-white/10 px-6 py-3 transition-all hover:bg-black/60 hover:border-sky-500/30 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-sky-500/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            <CloudSun className="h-4 w-4 text-sky-400" />
            <span className="text-sm font-medium text-white/90 group-hover:text-white transition-colors">
              {t("weatherLinkLabel")}
            </span>
          </a>
        </div>
      )}

      {loading ? (
        <div className="flex overflow-x-auto snap-x snap-mandatory md:grid md:grid-cols-5 gap-6 pb-8 hide-scrollbar">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="min-w-[85vw] md:min-w-0 snap-center h-[500px] animate-pulse rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur-md"
            />
          ))}
        </div>
      ) : (
        <div className="flex overflow-x-auto snap-x snap-mandatory md:grid md:grid-cols-5 gap-6 pb-8 hide-scrollbar">
          {weekDates.map(({ day, date }) => {
            const match = getMatchForDay(day, date);
            const isPast = date < new Date() && date.toDateString() !== new Date().toDateString();
            const isToday = date.toDateString() === new Date().toDateString();
            
            const baseCardStyle = "relative min-w-[85vw] md:min-w-0 snap-center rounded-[2rem] flex flex-col transition-all duration-500 overflow-hidden group";
            const interactionStyle = "hover:-translate-y-2 hover:shadow-2xl";
            const depthStyle = "bg-black/40 backdrop-blur-xl border border-white/10";
            
            const todayStyle = isToday 
              ? "ring-2 ring-emerald-500/50 shadow-[0_0_40px_-10px_rgba(16,185,129,0.3)] bg-gradient-to-b from-emerald-950/40 to-black/60" 
              : depthStyle;
              
            const opacityStyle = isPast || match?.status === "cancelled" ? "opacity-60 saturate-50 hover:opacity-100 hover:saturate-100" : "";

            return (
              <div key={day} className={`${baseCardStyle} ${interactionStyle} ${todayStyle} ${opacityStyle}`}>
                {isToday && <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-400" />}
                
                <div className="absolute -inset-px bg-gradient-to-b from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[2rem] pointer-events-none" />

                <div className="p-6 flex flex-col h-full z-10">
                  <div className="flex flex-col items-center mb-6">
                    <h3 className={`text-xl font-bold tracking-tight ${isToday ? 'text-emerald-400' : 'text-white'}`}>
                      {t(dayTranslationKeys[day])}
                    </h3>
                    <p className="text-sm text-white/50 font-medium mt-1">
                      {format(date, "d MMM")}
                    </p>
                    {isToday && (
                      <span className="flex h-3 w-3 relative mt-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                      </span>
                    )}
                  </div>

                  <div className="flex-1 flex flex-col">
                    {!match ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-white/30 space-y-3">
                        <div className="p-4 rounded-full bg-white/5">
                          <Activity className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-medium">{t("noMatch")}</p>
                      </div>
                    ) : match.status === "cancelled" ? (
                      <div className="flex-1 flex flex-col items-center justify-center space-y-3">
                        <div className="p-4 rounded-full bg-red-500/10 text-red-400">
                          <Activity className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-medium text-red-400 text-center px-4">
                          {match.cancellationReason?.type === "not_enough_players"
                            ? t("cancelledNotEnoughPlayers")
                            : match.cancellationReason?.type === "unplayable_field"
                            ? t("cancelledUnplayableField")
                            : match.cancellationReason?.type === "custom" && match.cancellationReason.customText
                            ? `${t("cancelled")}: ${match.cancellationReason.customText}`
                            : t("cancelled")}
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="mb-6 flex justify-center">
                          <Badge
                            className={`px-3 py-1.5 text-xs font-bold border-0 shadow-lg ${
                              match.status === "confirmed" 
                                ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white" 
                                : match.players.length >= MIN_PLAYERS 
                                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white" 
                                  : "bg-gradient-to-r from-orange-500 to-red-500 text-white"
                            }`}
                          >
                            <Users className="w-3 h-3 mr-1.5" />
                            {match.players.length}/{MAX_PLAYERS}
                            {match.players.length >= MIN_PLAYERS && (
                              <span className="ml-1 opacity-80">
                                · {match.players.length >= MAX_PLAYERS ? "6v6" : "5v5"}
                              </span>
                            )}
                          </Badge>
                        </div>

                        <div className="flex-1 min-h-[160px]">
                          <div className="flex flex-wrap justify-center gap-2">
                            {[...match.players].sort((a, b) => a.joinedAt.toMillis() - b.joinedAt.toMillis()).map((p) => (
                              <div key={p.uid} className="group/avatar relative">
                                <Avatar className="h-10 w-10 border-2 border-black/50 transition-transform duration-300 group-hover/avatar:scale-110 group-hover/avatar:z-10 shadow-lg">
                                  <AvatarImage src={p.photoURL || undefined} className="object-cover" />
                                  <AvatarFallback className="bg-white/10 text-white text-xs font-medium">
                                    {p.displayName.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                              </div>
                            ))}
                            {Array.from({ length: Math.max(0, MAX_PLAYERS - match.players.length) }).map((_, i) => (
                              <div key={`empty-${i}`} className="h-10 w-10 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center opacity-50">
                                <span className="text-[10px] text-white/30">+</span>
                              </div>
                            ))}
                          </div>
                          
                          {match.waitingList.length > 0 && (
                            <div className="mt-4 flex justify-center">
                              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-medium">
                                <Activity className="w-3 h-3" />
                                {t("waitingCount", { count: match.waitingList.length })}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="mt-6 space-y-3 pt-6 border-t border-white/10">
                          {!isRegistered(match) ? (
                            <Button
                              className="w-full h-12 rounded-xl text-sm font-bold tracking-wide bg-white text-black hover:bg-emerald-50 hover:text-emerald-900 transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(16,185,129,0.3)]"
                              onClick={() => handleJoin(match.id)}
                              disabled={isPast || match.status === "completed"}
                            >
                              {t("register")}
                              <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                          ) : (
                            <div className="space-y-3">
                              {isInPlayers(match) ? (
                                <div className="w-full h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm font-bold tracking-wide">
                                  {t("registered")}
                                </div>
                              ) : (
                                <div className="w-full h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center text-sm font-bold tracking-wide">
                                  {t("waitingListPos", { pos: getWaitingPosition(match) })}
                                </div>
                              )}
                              <Button
                                variant="outline"
                                className="w-full h-10 rounded-xl border-white/10 text-white hover:bg-white/5 hover:text-red-400 hover:border-red-400/30 transition-all duration-300"
                                onClick={() => handleLeave(match.id)}
                                disabled={isPast || match.status === "completed"}
                              >
                                {t("unregister")}
                              </Button>
                            </div>
                          )}

                          <Link
                            href={`/match/${match.id}`}
                            className="flex items-center justify-center gap-2 w-full text-xs font-medium text-white/50 hover:text-emerald-400 transition-colors py-2"
                          >
                            {t("viewDetails")}
                          </Link>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
}