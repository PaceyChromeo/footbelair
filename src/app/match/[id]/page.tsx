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
import { Match, UserProfile, DayOfWeek, MAX_PLAYERS, MIN_PLAYERS } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { ArrowLeft, Users, Flag, Activity, ArrowRight } from "lucide-react";
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

type PlayerEntry = Match["players"][0];

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

      if (result.matchStatus === "confirmed" && result.promotedPlayers.length > 0) {
        const matchDate = format(match.date.toDate(), "d MMMM yyyy", { locale: dateFnsLocale });
        const matchDay = t(dayTranslationKeys[match.dayOfWeek]);

        const promotedPlayer = result.promotedPlayers[0];
        const promotedUser = usersMap.get(promotedPlayer.uid);
        const promotedRecipient = promotedUser?.email
          ? { email: promotedUser.email, locale: promotedUser.locale ?? "fr", displayName: promotedPlayer.displayName }
          : null;

        const existingPlayerEmails = result.players
          .filter((p) => !result.promotedPlayers.some((pp) => pp.uid === p.uid))
          .reduce<Array<{ email: string; locale: string; displayName: string }>>((acc, p) => {
            const user = usersMap.get(p.uid);
            if (user?.email) {
              acc.push({ email: user.email, locale: user.locale ?? "fr", displayName: p.displayName });
            }
            return acc;
          }, []);

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

  const isKicked =
    match && profile
      ? (match.kickedPlayers ?? []).includes(profile.uid)
      : false;

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
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=1920&q=80&auto=format')" }}
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
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=1920&q=80&auto=format')" }}
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

  const renderPlayerRow = (p: PlayerEntry, index: number) => {
    const user = usersMap.get(p.uid);
    const hasPenalty = user?.penalty?.active;

    return (
      <div key={p.uid} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors group/pl border border-transparent hover:border-white/10">
        <div className="w-5 text-xs font-bold text-white/30 group-hover/pl:text-white/70">
          #{index + 1}
        </div>
        <Avatar className="h-8 w-8 border border-white/10">
          <AvatarImage src={p.photoURL || undefined} />
          <AvatarFallback className="bg-black/50 text-white text-[10px]">
            {p.displayName.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white/90 truncate font-medium">{p.displayName}</p>
          {hasPenalty && (
            <Badge variant="destructive" className="text-[8px] px-1 py-0 h-3 border-0 mt-0.5">
              {t("penalized")}
            </Badge>
          )}
        </div>
        {match.status === "completed" && profile && p.uid !== profile.uid && (
          reportedPlayers.has(p.uid) ? (
            <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] px-2 py-0.5 gap-1">
              <Flag className="h-3 w-3" />
              {t("playerReported")}
            </Badge>
          ) : (
            <button
              onClick={() => setReportingPlayer({ uid: p.uid, displayName: p.displayName })}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-medium hover:bg-red-500/20 hover:border-red-500/30 transition-colors"
            >
              <Flag className="h-3 w-3" />
              {t("reportNoShow")}
            </button>
          )
        )}
      </div>
    );
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat bg-fixed"
      style={{ backgroundImage: "url('https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=1920&q=80&auto=format')" }}
    >
      <div className="min-h-screen bg-gradient-to-b from-slate-900/70 via-slate-800/50 to-emerald-950/40 backdrop-blur-[2px]">
        <Header />
        <main className="mx-auto max-w-5xl px-4 py-6">
          <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-white/70 hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4" />
            {t("back")}
          </Link>

          <Card className="mb-8 bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent opacity-50 pointer-events-none" />
            
            <CardContent className="p-6 md:p-8 relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-5 w-full md:w-auto">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 shadow-lg shadow-emerald-500/20 flex items-center justify-center">
                  <Activity className="w-8 h-8 text-white" />
                </div>
                <div className="flex flex-col">
                  <h1 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70 tracking-tight">
                    {t(dayTranslationKeys[match.dayOfWeek])}{" "}
                    {format(matchDate, "d MMMM yyyy", { locale: dateFnsLocale })}
                  </h1>
                  <div className="flex items-center gap-3 mt-2">
                    <Badge className={`px-3 py-1 text-xs font-bold border-0 shadow-lg ${
                      match.status === "cancelled" ? "bg-gradient-to-r from-red-500 to-rose-600 text-white"
                      : match.status === "completed" ? "bg-white/20 text-white"
                      : match.status === "confirmed" ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white"
                      : match.players.length >= MIN_PLAYERS ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
                      : "bg-gradient-to-r from-orange-500 to-red-500 text-white"
                    }`}>
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
                        : match.status === "confirmed"
                        ? t("confirmed")
                        : match.players.length >= MAX_PLAYERS
                        ? t("full")
                        : t("spotsAvailable")}
                    </Badge>
                    <div className="flex items-center gap-1.5 text-sm font-medium text-white/60">
                      <Users className="h-4 w-4" />
                      {match.players.length}/{MAX_PLAYERS}
                    </div>
                  </div>
                </div>
              </div>

              {match.status !== "cancelled" && match.status !== "completed" && (
                <div className="w-full md:w-[300px] flex-shrink-0">
                  {!isRegistered ? (
                    isKicked ? (
                     <div className="w-full h-12 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center text-sm font-bold tracking-wide">
                       {t("kickedFromMatch")}
                     </div>
                    ) : (
                    <Button 
                      onClick={handleJoin} 
                      className="w-full h-12 rounded-xl text-sm font-bold tracking-wide bg-white text-black hover:bg-emerald-50 hover:text-emerald-900 transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(16,185,129,0.3)]"
                    >
                      {t("register")}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                    )
                  ) : (
                    <div className="space-y-3">
                      {isInPlayers ? (
                        <div className="w-full h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm font-bold tracking-wide shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                          {t("registered")}
                        </div>
                      ) : (
                        <div className="w-full h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center text-sm font-bold tracking-wide shadow-[0_0_15px_rgba(249,115,22,0.15)]">
                          {t("waitingListPos", { pos: waitingPosition })}
                        </div>
                      )}
                      <Button
                        variant="outline"
                        onClick={handleLeave}
                        className="w-full h-10 rounded-xl bg-white text-black border-0 hover:bg-red-50 hover:text-red-600 transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                      >
                        {t("unregister")}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <Card className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2rem] shadow-2xl h-full flex flex-col">
                <CardHeader className="border-b border-white/5 pb-4">
                  <CardTitle className="text-sm font-semibold text-white flex justify-between items-center">
                    <span>{t("players")}</span>
                    <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 text-xs">
                      {match.players.length}/{MAX_PLAYERS}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 pt-4 space-y-2">
                  {match.players.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-white/30 h-full">
                      <Users className="h-12 w-12 mb-4 opacity-20" />
                      <p className="text-sm font-medium">{t("noPlayers")}</p>
                    </div>
                  ) : (
                    [...match.players].sort((a, b) => a.joinedAt.toMillis() - b.joinedAt.toMillis()).map((p, i) => renderPlayerRow(p, i))
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="w-full md:w-80 flex-shrink-0">
              <Card className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2rem] shadow-2xl h-full flex flex-col min-h-[300px]">
                <CardHeader className="border-b border-white/5 pb-4">
                  <CardTitle className="text-sm font-semibold text-white flex justify-between items-center">
                    <span>{t("waitingList")}</span>
                    <Badge className="bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-0.5 text-xs">
                      {match.waitingList.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 pt-4 space-y-2">
                  {match.waitingList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-white/30 h-full">
                      <Users className="h-8 w-8 mb-3 opacity-20" />
                      <p className="text-xs font-medium">{t("noWaiting")}</p>
                    </div>
                  ) : (
                    [...match.waitingList].sort((a, b) => a.joinedAt.toMillis() - b.joinedAt.toMillis()).map((p, i) => {
                      const user = usersMap.get(p.uid);
                      const hasPenalty = user?.penalty?.active;
                      return (
                        <div key={p.uid} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors group/wl border border-transparent hover:border-white/10">
                          <div className="w-5 text-xs font-bold text-white/30 group-hover/wl:text-white/70">
                            #{i + 1}
                          </div>
                          <Avatar className="h-8 w-8 border border-white/10">
                             <AvatarImage src={p.photoURL || undefined} />
                             <AvatarFallback className="bg-black/50 text-white text-[10px]">
                               {p.displayName.charAt(0)}
                             </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                             <p className="text-sm text-white/90 truncate font-medium">{p.displayName}</p>
                             {hasPenalty && (
                               <Badge variant="destructive" className="text-[8px] px-1 py-0 h-3 border-0 mt-0.5">
                                 {t("penalized")}
                               </Badge>
                             )}
                           </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <Dialog open={!!reportingPlayer} onOpenChange={(open) => !open && setReportingPlayer(null)}>
            <DialogContent className="backdrop-blur-xl bg-slate-900/90 border border-white/10 rounded-2xl text-white">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-red-500">
                  <Flag className="h-5 w-5" />
                  {reportingPlayer ? t("reportNoShowTitle", { name: reportingPlayer.displayName }) : ""}
                </DialogTitle>
              </DialogHeader>
              <p className="text-sm text-white/70">
                {t("reportNoShowDescription")}
              </p>
              <DialogFooter className="gap-2 sm:gap-0 mt-4">
                <DialogClose asChild>
                  <Button variant="outline" className="bg-transparent border-white/10 text-white hover:bg-white/10">{t("cancel")}</Button>
                </DialogClose>
                <Button
                  className="bg-red-600 text-white hover:bg-red-700"
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
