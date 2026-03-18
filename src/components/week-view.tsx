"use client";

import { useEffect, useState, useMemo } from "react";
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
import { ChevronLeft, ChevronRight, Users, Clock, AlertTriangle, CalendarDays, CloudSun } from "lucide-react";
import { Timestamp } from "firebase/firestore";
import { toast } from "sonner";
import Link from "next/link";
import { format, differenceInCalendarWeeks, startOfWeek as dateFnsStartOfWeek } from "date-fns";
import type { TranslationKeys } from "@/lib/i18n";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

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
      const message = err instanceof Error ? err.message : t("error");
      toast.error(message);
    }
  };

  const handleLeave = async (matchId: string) => {
    if (!profile) return;
    try {
      await leaveMatch(matchId, profile.uid, usersMap);
      toast.success(t("unregisteredToast"));
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
    const start = format(mon, "d MMMM", { locale: dateFnsLocale });
    const end = format(fri, "d MMMM yyyy", { locale: dateFnsLocale });
    return t("weekTitle", { start, end });
  })();

  const [calendarOpen, setCalendarOpen] = useState(false);

  const handleCalendarSelect = (date: Date | undefined) => {
    if (!date) return;
    const today = new Date();
    const todayMonday = dateFnsStartOfWeek(today, { weekStartsOn: 1 });
    const selectedMonday = dateFnsStartOfWeek(date, { weekStartsOn: 1 });
    const diff = differenceInCalendarWeeks(selectedMonday, todayMonday, { weekStartsOn: 1 });
    setWeekOffset(diff);
    setCalendarOpen(false);
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setWeekOffset((w) => w - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-2xl md:text-3xl font-bold text-emerald-800">{weekLabel}</h2>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setWeekOffset((w) => w + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon">
              <CalendarDays className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="center">
            <Calendar
              mode="single"
              selected={weekDates[0].date}
              onSelect={handleCalendarSelect}
              locale={dateFnsLocale}
              defaultMonth={weekDates[0].date}
            />
          </PopoverContent>
        </Popover>
      </div>

      {!loading && matches.length > 0 && (
        <a
          href="https://meteofrance.com/previsions-meteo-france/villeneuve-loubet/06270"
          target="_blank"
          rel="noopener noreferrer"
          className="mb-4 flex items-center justify-center gap-2 rounded-lg bg-sky-50 px-4 py-2 text-sm text-sky-700 hover:bg-sky-100 transition-colors"
        >
          <CloudSun className="h-4 w-4" />
          {t("weatherLinkLabel")}
        </a>
      )}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-lg bg-muted"
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-5">
          {weekDates.map(({ day, date }) => {
            const match = getMatchForDay(day, date);
            const isPast = date < new Date() && date.toDateString() !== new Date().toDateString();
            const isToday = date.toDateString() === new Date().toDateString();

            return (
              <Card
                key={day}
                className={`transition-all hover:shadow-lg ${
                  isToday ? "ring-2 ring-emerald-500 shadow-emerald-100 shadow-md" : ""
                } ${isPast ? "opacity-60" : ""} ${
                  match?.status === "cancelled" ? "opacity-50" : ""
                }`}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-sm">
                    <span>{t(dayTranslationKeys[day])}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {format(date, "d/MM")}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {!match ? (
                    <p className="text-center text-xs text-muted-foreground py-4">
                      {t("noMatch")}
                    </p>
                  ) : match.status === "cancelled" ? (
                    <div className="text-center py-4">
                      <p className="text-xs text-destructive">
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
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          12h30
                        </div>
                        <Badge
                          variant="default"
                          className={`text-xs ${match.players.length >= MIN_PLAYERS ? "bg-emerald-600" : "bg-red-500"}`}
                        >
                          <Users className="mr-1 h-3 w-3" />
                          {match.players.length}/{MAX_PLAYERS}
                          {match.players.length >= MIN_PLAYERS && (
                            <span className="ml-1">
                              · {match.players.length >= MAX_PLAYERS ? "6v6" : "5v5"}
                            </span>
                          )}
                        </Badge>
                      </div>

                      {match.waitingList.length > 0 && (
                        <p className="text-xs text-amber-600">
                          {t("waitingCount", { count: match.waitingList.length })}
                        </p>
                      )}

                      <div className="space-y-1">
                        {[...match.players].sort((a, b) => a.joinedAt.toMillis() - b.joinedAt.toMillis()).map((p) => (
                          <div key={p.uid} className="flex items-center gap-1.5">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={p.photoURL || undefined} />
                              <AvatarFallback className="text-[9px]">
                                {p.displayName.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate text-xs">{p.displayName}</span>
                          </div>
                        ))}
                      </div>

                      <Separator />

                      {!isRegistered(match) ? (
                        <Button
                          size="sm"
                          className="w-full text-xs bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => handleJoin(match.id)}
                          disabled={isPast || match.status === "completed"}
                        >
                          {t("register")}
                        </Button>
                      ) : (
                        <div className="space-y-1">
                          {isInPlayers(match) ? (
                            <Badge className="w-full justify-center bg-emerald-600" variant="default">
                              {t("registered")}
                            </Badge>
                          ) : (
                            <Badge className="w-full justify-center bg-amber-500 text-white" variant="secondary">
                              {t("waitingListPos", { pos: getWaitingPosition(match) })}
                            </Badge>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full text-xs"
                            onClick={() => handleLeave(match.id)}
                            disabled={isPast || match.status === "completed"}
                          >
                            {t("unregister")}
                          </Button>
                        </div>
                      )}

                      <Link
                        href={`/match/${match.id}`}
                        className="block text-center text-xs text-primary hover:underline"
                      >
                        {t("viewDetails")}
                      </Link>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
