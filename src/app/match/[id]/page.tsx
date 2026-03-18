"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useLocale } from "@/hooks/useLocale";
import { Header } from "@/components/header";
import {
  subscribeToMatch,
  subscribeToUsers,
  joinMatch,
  leaveMatch,
  createNoShowReport,
} from "@/lib/matches";
import { Match, UserProfile, DayOfWeek, MAX_PLAYERS } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { ArrowLeft, Clock, Users, Ticket, AlertTriangle, Flag } from "lucide-react";
import { Timestamp } from "firebase/firestore";
import { toast } from "sonner";
import { format } from "date-fns";
import Link from "next/link";
import type { TranslationKeys } from "@/lib/i18n";

const dayTranslationKeys: Record<DayOfWeek, TranslationKeys> = {
  monday: "monday",
  tuesday: "tuesday",
  wednesday: "wednesday",
  thursday: "thursday",
  friday: "friday",
};

export default function MatchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { profile, loading: authLoading } = useAuth();
  const { t, dateFnsLocale } = useLocale();
  const [match, setMatch] = useState<Match | null>(null);
  const [usersMap, setUsersMap] = useState<Map<string, UserProfile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [reportingPlayer, setReportingPlayer] = useState<{ uid: string; displayName: string } | null>(null);
  const [reportSending, setReportSending] = useState(false);
  const [reportedPlayers, setReportedPlayers] = useState<Set<string>>(new Set());

  const matchId = params.id as string;

  useEffect(() => {
    if (!authLoading && !profile) {
      router.push("/login");
    }
  }, [authLoading, profile, router]);

  useEffect(() => {
    if (!authLoading && profile?.status === "pending") {
      router.push("/");
    }
  }, [authLoading, profile, router]);

  useEffect(() => {
    if (!matchId) return;
    const unsubMatch = subscribeToMatch(matchId, (m) => {
      setMatch(m);
      setLoading(false);
    });
    const unsubUsers = subscribeToUsers(setUsersMap);
    return () => {
      unsubMatch();
      unsubUsers();
    };
  }, [matchId]);

  const handleJoin = async () => {
    if (!profile || !match) return;
    try {
      const entry = {
        uid: profile.uid,
        displayName: profile.displayName,
        photoURL: profile.photoURL,
        joinedAt: Timestamp.now(),
      };
      await joinMatch(match.id, entry, usersMap);
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

  const handleLeave = async () => {
    if (!profile || !match) return;
    try {
      const result = await leaveMatch(match.id, profile.uid, usersMap);
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("error");
      toast.error(message);
    }
  };

  const handleReportNoShow = async () => {
    if (!profile || !match || !reportingPlayer) return;
    setReportSending(true);
    try {
      const adminEmails = Array.from(usersMap.values())
        .filter((u) => u.role === "admin" && u.email)
        .map((u) => u.email!);
      const matchDate = format(match.date.toDate(), "d MMMM yyyy", { locale: dateFnsLocale });
      const matchDay = t(dayTranslationKeys[match.dayOfWeek]);
      await fetch("/api/report-noshow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reporterName: profile.displayName,
          reportedPlayerName: reportingPlayer.displayName,
          matchDate,
          matchDay,
          adminEmails,
        }),
      });
      await createNoShowReport({
        reporterUid: profile.uid,
        reporterName: profile.displayName,
        reportedPlayerUid: reportingPlayer.uid,
        reportedPlayerName: reportingPlayer.displayName,
        matchId,
        matchDate,
        matchDay,
      });
      setReportedPlayers((prev) => new Set(prev).add(reportingPlayer.uid));
      toast.success(t("reportNoShowSent"));
    } catch {
      toast.error(t("error"));
    } finally {
      setReportSending(false);
      setReportingPlayer(null);
    }
  };

  const isRegistered =
    match && profile
      ? [...match.players, ...match.waitingList].some(
          (p) => p.uid === profile.uid
        )
      : false;

  const isInPlayers =
    match && profile
      ? match.players.some((p) => p.uid === profile.uid)
      : false;

  const waitingPosition =
    match && profile
      ? match.waitingList.findIndex((p) => p.uid === profile.uid) + 1
      : 0;

  if (authLoading || loading) {
    return (
      <div
        className="min-h-screen bg-cover bg-center bg-no-repeat bg-fixed"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1487466365202-1afdb86c764e?w=1920&q=80&auto=format')" }}
      >
        <div className="min-h-screen bg-gradient-to-b from-slate-900/70 via-slate-800/50 to-emerald-950/40 backdrop-blur-[2px]">
          <Header />
          <div className="flex items-center justify-center py-20">
            <div className="text-white/70">{t("loading")}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div
        className="min-h-screen bg-cover bg-center bg-no-repeat bg-fixed"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1487466365202-1afdb86c764e?w=1920&q=80&auto=format')" }}
      >
        <div className="min-h-screen bg-gradient-to-b from-slate-900/70 via-slate-800/50 to-emerald-950/40 backdrop-blur-[2px]">
          <Header />
          <div className="mx-auto max-w-5xl px-6 py-10">
            <p className="text-center text-white/70">{t("matchNotFound")}</p>
            <div className="mt-4 text-center">
              <Link href="/">
                <Button variant="outline" className="bg-white/20 border-white/30 text-white hover:bg-white/30 backdrop-blur-sm">{t("back")}</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const matchDate = match.date.toDate();

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat bg-fixed"
      style={{ backgroundImage: "url('https://images.unsplash.com/photo-1487466365202-1afdb86c764e?w=1920&q=80&auto=format')" }}
    >
      <div className="min-h-screen bg-gradient-to-b from-slate-900/70 via-slate-800/50 to-emerald-950/40 backdrop-blur-[2px]">
        <Header />
        <main className="mx-auto max-w-5xl px-6 py-6">
        <Link href="/" className="mb-4 inline-flex items-center gap-1 text-sm text-white/70 hover:text-white transition-colors drop-shadow-sm">
          <ArrowLeft className="h-4 w-4" />
          {t("back")}
        </Link>

        <Card className="mb-6 backdrop-blur-xl bg-white/70 border border-white/30 rounded-2xl shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                {t(dayTranslationKeys[match.dayOfWeek])}{" "}
                {format(matchDate, "d MMMM yyyy", { locale: dateFnsLocale })}
              </span>
              <Badge
                variant={
                  match.status === "cancelled"
                    ? "destructive"
                    : match.status === "completed"
                    ? "secondary"
                    : match.players.length >= MAX_PLAYERS
                    ? "destructive"
                    : "default"
                }
              >
                {match.status === "cancelled"
                  ? match.cancellationReason?.type === "not_enough_players"
                    ? t("cancelledNotEnoughPlayers")
                    : match.cancellationReason?.type === "unplayable_field"
                    ? t("cancelledUnplayableField")
                    : match.cancellationReason?.type === "custom" && match.cancellationReason.customText
                    ? `${t("cancelled")}: ${match.cancellationReason.customText}`
                    : t("cancelled")
                  : match.status === "completed"
                  ? t("completed")
                  : match.players.length >= MAX_PLAYERS
                  ? t("full")
                  : t("spotsAvailable")}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                12h30
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {match.players.length}/{MAX_PLAYERS}
              </div>
            </div>

            {match.status !== "cancelled" && match.status !== "completed" && (
              <div>
                {!isRegistered ? (
                  <Button onClick={handleJoin} className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-md shadow-emerald-500/20 active:scale-[0.98] transition-all duration-300">
                    {t("register")}
                  </Button>
                ) : (
                  <div className="space-y-2">
                    {isInPlayers ? (
                      <Badge className="w-full justify-center py-2 bg-gradient-to-r from-emerald-500 to-teal-500 border-0" variant="default">
                        {t("registered")}
                      </Badge>
                    ) : (
                      <Badge className="w-full justify-center py-2 bg-gradient-to-r from-amber-500 to-orange-400 text-white border-0" variant="secondary">
                        {t("waitingListPos", { pos: waitingPosition })}
                      </Badge>
                    )}
                    <Button
                      variant="outline"
                      onClick={handleLeave}
                      className="w-full"
                    >
                      {t("unregister")}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="backdrop-blur-xl bg-white/70 border border-white/30 rounded-2xl shadow-lg">
            <CardHeader>
              <CardTitle className="text-sm">
                {t("players")} ({match.players.length}/{MAX_PLAYERS})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {match.players.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("noPlayers")}</p>
              ) : (
                <div className="space-y-2">
                  {[...match.players].sort((a, b) => a.joinedAt.toMillis() - b.joinedAt.toMillis()).map((p, i) => {
                    const user = usersMap.get(p.uid);
                    const hasPenalty = user?.penalty?.active;
                    return (
                      <div
                        key={p.uid}
                        className="flex items-center gap-3 rounded-md p-2 hover:bg-white/50"
                      >
                        <span className="w-5 text-xs text-muted-foreground">
                          {i + 1}.
                        </span>
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={p.photoURL || undefined} />
                          <AvatarFallback className="text-xs">
                            {p.displayName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 text-sm">{p.displayName}</div>
                        <div className="flex items-center gap-1">
                          {user && (
                            <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                              <Ticket className="h-3 w-3" />
                              {user.quota.remaining}
                            </span>
                          )}
                          {hasPenalty && (
                            <AlertTriangle className="h-3 w-3 text-destructive" />
                          )}
                          {match.status === "completed" && profile && p.uid !== profile.uid && (
                            reportedPlayers.has(p.uid) ? (
                              <span className="ml-1 flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200">
                                <Flag className="h-3 w-3" />
                                {t("playerReported")}
                              </span>
                            ) : (
                              <button
                                onClick={() => setReportingPlayer({ uid: p.uid, displayName: p.displayName })}
                                className="ml-1 flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 hover:border-red-300 transition-colors"
                              >
                                <Flag className="h-3 w-3" />
                                {t("reportNoShow")}
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="backdrop-blur-xl bg-white/70 border border-white/30 rounded-2xl shadow-lg">
            <CardHeader>
              <CardTitle className="text-sm">
                {t("waitingList")} ({match.waitingList.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {match.waitingList.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("noWaiting")}</p>
              ) : (
                <div className="space-y-2">
                  {[...match.waitingList].sort((a, b) => a.joinedAt.toMillis() - b.joinedAt.toMillis()).map((p, i) => {
                    const user = usersMap.get(p.uid);
                    const hasPenalty = user?.penalty?.active;
                    return (
                      <div
                        key={p.uid}
                        className="flex items-center gap-3 rounded-md p-2 hover:bg-white/50"
                      >
                        <span className="w-5 text-xs text-muted-foreground">
                          #{i + 1}
                        </span>
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={p.photoURL || undefined} />
                          <AvatarFallback className="text-xs">
                            {p.displayName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 text-sm">{p.displayName}</div>
                        <div className="flex items-center gap-1">
                          {user && (
                            <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                              <Ticket className="h-3 w-3" />
                              {user.quota.remaining}
                            </span>
                          )}
                          {hasPenalty && (
                            <Badge variant="destructive" className="text-[10px]">
                              {t("penalized")}
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Dialog open={!!reportingPlayer} onOpenChange={(open) => !open && setReportingPlayer(null)}>
          <DialogContent className="backdrop-blur-xl bg-white/90 border border-white/30 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <Flag className="h-5 w-5" />
                {reportingPlayer ? t("reportNoShowTitle", { name: reportingPlayer.displayName }) : ""}
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              {t("reportNoShowDescription")}
            </p>
            <DialogFooter className="gap-2 sm:gap-0">
              <DialogClose asChild>
                <Button variant="outline">{t("cancel")}</Button>
              </DialogClose>
              <Button
                variant="destructive"
                onClick={handleReportNoShow}
                disabled={reportSending}
              >
                {reportSending ? t("loading") : t("reportNoShow")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
      </div>
    </div>
  );
}
