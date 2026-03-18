"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useLocale } from "@/hooks/useLocale";
import { Header } from "@/components/header";
import {
  subscribeToMatchesForWeek,
  subscribeToUsers,
  subscribeToNoShowReports,
  subscribeToPendingReportsCount,
  createWeekMatches,
  cancelMatch,
  declareNoShow,
  resolveNoShowReport,
  removePenalty,
  setUserRole,
  getWeekDates,
  joinMatch,
  leaveMatch,
  adminMoveToPlayers,
  adminMoveToWaitingList,
  deleteWeekMatches,
  setUserStatus,
  deleteUserAccount,
} from "@/lib/matches";
import { Match, UserProfile, DayOfWeek, MAX_PLAYERS, MIN_PLAYERS, CancellationReason, CancellationReasonType, NoShowReport } from "@/lib/types";
import { Timestamp } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Ban,
  AlertTriangle,
  Shield,
  ShieldOff,
  UserPlus,
  X,
  CheckCircle,
  Ticket,
  ArrowDown,
  ArrowUp,
  Trash2,
  UserCheck,
  Flag,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import type { TranslationKeys } from "@/lib/i18n";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Gavel } from "lucide-react";

function PenaltyDialog({
  playerName,
  playerUid,
  onApply,
  t,
}: {
  playerName: string;
  playerUid: string;
  onApply: (uid: string, reason: "no-show" | "late-cancellation") => void;
  t: (key: TranslationKeys, params?: Record<string, string>) => string;
}) {
  const [hovered, setHovered] = useState<"no-show" | "late-cancellation" | null>(null);

  const description = hovered === "no-show"
    ? t("noShowDescription")
    : hovered === "late-cancellation"
      ? t("lateCancellationDescription")
      : t("penaltyDefaultDescription");

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive">
          <Gavel className="mr-1 h-3 w-3" />
          {t("applyPenalty")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("penaltyDialogTitle", { name: playerName })}
          </DialogTitle>
        </DialogHeader>
        <p className={`text-sm min-h-[3rem] transition-colors duration-200 ${hovered ? "text-foreground" : "text-muted-foreground"}`}>
          {description}
        </p>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">{t("cancel")}</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button
              variant="destructive"
              onMouseEnter={() => setHovered("no-show")}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onApply(playerUid, "no-show")}
            >
              {t("confirmNoShow")}
            </Button>
          </DialogClose>
          <DialogClose asChild>
            <Button
              variant="destructive"
              onMouseEnter={() => setHovered("late-cancellation")}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onApply(playerUid, "late-cancellation")}
            >
              {t("lateCancellation")}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const dayTranslationKeys: Record<DayOfWeek, TranslationKeys> = {
  monday: "monday",
  tuesday: "tuesday",
  wednesday: "wednesday",
  thursday: "thursday",
  friday: "friday",
};

export default function AdminPage() {
  const { profile, loading: authLoading } = useAuth();
  const { t, dateFnsLocale } = useLocale();
  const router = useRouter();
  const [weekOffset, setWeekOffset] = useState(0);
  const [matches, setMatches] = useState<Match[]>([]);
  const [usersMap, setUsersMap] = useState<Map<string, UserProfile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelMatchId, setCancelMatchId] = useState<string | null>(null);
  const [cancelReasonType, setCancelReasonType] = useState<CancellationReasonType>("not_enough_players");
  const [cancelCustomText, setCancelCustomText] = useState("");
  const [noShowReports, setNoShowReports] = useState<NoShowReport[]>([]);
  const [pendingReportsCount, setPendingReportsCount] = useState(0);

  const weekDates = getWeekDates(weekOffset);

  useEffect(() => {
    if (!authLoading && (!profile || profile.role !== "admin")) {
      router.push("/");
    }
  }, [authLoading, profile, router]);

  useEffect(() => {
    setLoading(true);
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

  useEffect(() => {
    const unsubReports = subscribeToNoShowReports(setNoShowReports);
    const unsubCount = subscribeToPendingReportsCount(setPendingReportsCount);
    return () => {
      unsubReports();
      unsubCount();
    };
  }, []);

  const handleCreateWeek = async () => {
    if (!profile) return;
    setCreating(true);
    try {
      await createWeekMatches(weekOffset, profile.uid);
      toast.success(t("weekCreated"));

      const recipients = approvedUsers
        .filter((u) => u.email)
        .map((u) => ({ email: u.email, locale: u.locale || "fr" }));
      if (recipients.length > 0) {
        try {
          const res = await fetch("/api/notify-matches", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ recipients, weekLabel }),
          });
          if (res.ok) {
            toast.success(t("emailsSent", { count: String(recipients.length) }));
          } else {
            toast.error(t("emailsSendError"));
          }
        } catch {
          toast.error(t("emailsSendError"));
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("error");
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteWeek = async () => {
    setDeleting(true);
    try {
      await deleteWeekMatches(weekOffset);
      toast.success(t("weekDeleted"));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("error");
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

  const openCancelDialog = (matchId: string) => {
    setCancelMatchId(matchId);
    setCancelReasonType("not_enough_players");
    setCancelCustomText("");
    setCancelDialogOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!cancelMatchId) return;
    const reason: CancellationReason = {
      type: cancelReasonType,
      ...(cancelReasonType === "custom" && cancelCustomText.trim()
        ? { customText: cancelCustomText.trim() }
        : {}),
    };
    try {
      await cancelMatch(cancelMatchId, reason);
      toast.success(t("matchCancelled"));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("error");
      toast.error(message);
    } finally {
      setCancelDialogOpen(false);
      setCancelMatchId(null);
    }
  };

  const handleNoShow = async (
    targetUid: string,
    reason: "no-show" | "late-cancellation"
  ) => {
    if (!profile) return;
    try {
      await declareNoShow(targetUid, profile.uid, reason);
      toast.success(t("penaltyApplied"));

      const targetUser = usersMap.get(targetUid);
      if (targetUser?.email) {
        const now = new Date();
        const penaltyUntil = new Date(now);
        let bannedUntil: string | undefined;

        if (reason === "no-show") {
          const banned = new Date(now);
          banned.setDate(banned.getDate() + 14);
          bannedUntil = banned.toISOString();
          penaltyUntil.setDate(penaltyUntil.getDate() + 28);
        } else {
          penaltyUntil.setDate(penaltyUntil.getDate() + 14);
        }

        fetch("/api/penalty-notification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playerEmail: targetUser.email,
            playerName: targetUser.displayName,
            playerLocale: targetUser.locale || "fr",
            reason,
            bannedUntil,
            penaltyUntil: penaltyUntil.toISOString(),
          }),
        }).catch(() => {});
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("error");
      toast.error(message);
    }
  };

  const handleRemovePenalty = async (targetUid: string) => {
    try {
      await removePenalty(targetUid);
      toast.success(t("penaltyRemoved"));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("error");
      toast.error(message);
    }
  };

  const handleToggleAdmin = async (targetUid: string, currentRole: string) => {
    const newRole = currentRole === "admin" ? "player" : "admin";
    try {
      await setUserRole(targetUid, newRole);
      toast.success(t("roleChanged", { role: newRole }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("error");
      toast.error(message);
    }
  };

  const handleAdminAddPlayer = async (matchId: string, user: UserProfile) => {
    try {
      await joinMatch(
        matchId,
        {
          uid: user.uid,
          displayName: user.displayName,
          photoURL: user.photoURL,
          joinedAt: Timestamp.now(),
        },
        usersMap
      );
      toast.success(t("playerAdded", { name: user.displayName }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("error");
      toast.error(message);
    }
  };

  const handleAdminRemovePlayer = async (matchId: string, uid: string, displayName: string) => {
    try {
      await leaveMatch(matchId, uid, usersMap);
      toast.success(t("playerRemoved", { name: displayName }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("error");
      toast.error(message);
    }
  };

  const handleMoveToWaitingList = async (matchId: string, uid: string, displayName: string) => {
    try {
      await adminMoveToWaitingList(matchId, uid, usersMap);
      toast.success(t("movedToWaitingList", { name: displayName }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("error");
      toast.error(message);
    }
  };

  const handleMoveToPlayers = async (matchId: string, uid: string, displayName: string) => {
    try {
      await adminMoveToPlayers(matchId, uid, usersMap);
      toast.success(t("movedToPlayers", { name: displayName }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("error");
      toast.error(message);
    }
  };

  const handleApproveUser = async (user: UserProfile) => {
    try {
      await setUserStatus(user.uid, "approved");
      toast.success(t("userApproved", { name: user.displayName }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("error");
      toast.error(message);
    }
  };

  const handleDeleteUser = async (user: UserProfile) => {
    try {
      await deleteUserAccount(user.uid);
      toast.success(t("userDeleted", { name: user.displayName }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("error");
      toast.error(message);
    }
  };

  const handleConfirmReport = async (report: NoShowReport) => {
    if (!profile) return;
    try {
      await declareNoShow(report.reportedPlayerUid, profile.uid, "no-show");

      const targetUser = usersMap.get(report.reportedPlayerUid);
      if (targetUser?.email) {
        const now = new Date();
        const banned = new Date(now);
        banned.setDate(banned.getDate() + 14);
        const penaltyUntil = new Date(now);
        penaltyUntil.setDate(penaltyUntil.getDate() + 28);

        fetch("/api/penalty-notification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playerEmail: targetUser.email,
            playerName: targetUser.displayName,
            playerLocale: targetUser.locale || "fr",
            reason: "no-show",
            bannedUntil: banned.toISOString(),
            penaltyUntil: penaltyUntil.toISOString(),
          }),
        }).catch(() => {});
      }

      await resolveNoShowReport(report.id, "confirmed", profile.uid);
      toast.success(t("reportConfirmed"));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("error");
      toast.error(message);
    }
  };

  const handleDismissReport = async (report: NoShowReport) => {
    if (!profile) return;
    try {
      await resolveNoShowReport(report.id, "dismissed", profile.uid);
      toast.success(t("reportDismissed"));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("error");
      toast.error(message);
    }
  };

  const weekLabel = (() => {
    const mon = weekDates[0].date;
    const fri = weekDates[4].date;
    return `${format(mon, "d MMM", { locale: dateFnsLocale })} — ${format(fri, "d MMM yyyy", { locale: dateFnsLocale })}`;
  })();

  const allUsers = Array.from(usersMap.values()).sort((a, b) =>
    a.displayName.localeCompare(b.displayName)
  );

  const pendingUsers = allUsers.filter((u) => u.status === "pending");
  const approvedUsers = allUsers.filter((u) => u.status !== "pending");

  if (authLoading || !profile || profile.role !== "admin") {
    return null;
  }

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat bg-fixed"
      style={{ backgroundImage: "url('https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1920&q=80&auto=format')" }}
    >
      <div className="min-h-screen bg-gradient-to-b from-slate-900/70 via-slate-800/50 to-emerald-950/40 backdrop-blur-[2px]">
        <Header />
        <main className="mx-auto max-w-7xl px-6 py-6">
        <h1 className="mb-6 text-2xl font-bold text-white drop-shadow-lg">{t("administration")}</h1>

        <Tabs defaultValue="matches">
          <TabsList className="mb-4 backdrop-blur-xl bg-white/60 border border-white/30 rounded-xl">
            <TabsTrigger value="matches">{t("matchesTab")}</TabsTrigger>
            <TabsTrigger value="users" className="relative">
              {t("usersTab")}
              {pendingUsers.length > 0 && (
                <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white">
                  {pendingUsers.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="reports" className="relative">
              {t("reportsTab")}
              {pendingReportsCount > 0 && (
                <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white">
                  {pendingReportsCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="matches" className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="bg-white/20 border-white/30 text-white hover:bg-white/30 backdrop-blur-sm"
                  onClick={() => setWeekOffset((w) => w - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="font-medium text-white">{weekLabel}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="bg-white/20 border-white/30 text-white hover:bg-white/30 backdrop-blur-sm"
                  onClick={() => setWeekOffset((w) => w + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="destructive" disabled={deleting || matches.length === 0}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      {t("deleteWeek")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t("deleteWeek")}</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                      {t("deleteWeekConfirm")}
                    </p>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="outline">{t("cancel")}</Button>
                      </DialogClose>
                      <DialogClose asChild>
                        <Button variant="destructive" onClick={handleDeleteWeek}>
                          {t("confirm")}
                        </Button>
                      </DialogClose>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Button onClick={handleCreateWeek} disabled={creating} className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md">
                  <Plus className="mr-2 h-4 w-4" />
                  {t("createWeek")}
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="text-center text-white/70">{t("loading")}</div>
            ) : matches.length === 0 ? (
              <Card className="backdrop-blur-xl bg-white/70 border border-white/30 rounded-2xl">
                <CardContent className="py-8 text-center text-muted-foreground">
                  {t("noMatchesThisWeek")}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {weekDates.map(({ day, date }) => {
                  const match = matches.find((m) => {
                    const matchDate = m.date.toDate();
                    return (
                      m.dayOfWeek === day &&
                      matchDate.toDateString() === date.toDateString()
                    );
                  });

                  if (!match) return null;

                  return (
                    <Card key={match.id} className="backdrop-blur-xl bg-white/70 border border-white/30 rounded-2xl shadow-lg">
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center justify-between text-base">
                          <span>
                            {t(dayTranslationKeys[day])} {format(date, "d/MM")} — 12h30
                          </span>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                match.status === "cancelled"
                                  ? "destructive"
                                  : match.status === "completed"
                                  ? "secondary"
                                  : "default"
                              }
                              className={
                                match.status !== "cancelled" && match.status !== "completed"
                                  ? match.players.length >= MIN_PLAYERS
                                    ? "bg-gradient-to-r from-emerald-500 to-teal-500 border-0"
                                    : "bg-gradient-to-r from-red-500 to-orange-500 border-0"
                                  : ""
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
                                : `${match.players.length}/${MAX_PLAYERS}`}
                            </Badge>
                            {(match.status === "open" || match.status === "full") && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => openCancelDialog(match.id)}
                              >
                                <Ban className="mr-1 h-3 w-3" />
                                {t("cancel")}
                              </Button>
                            )}
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-1">
                          {[...match.players].sort((a, b) => a.joinedAt.toMillis() - b.joinedAt.toMillis()).map((p) => {
                            const user = usersMap.get(p.uid);
                            return (
                              <div
                                key={p.uid}
                                className="flex items-center justify-between rounded p-1.5 hover:bg-white/50"
                              >
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage src={p.photoURL || undefined} />
                                    <AvatarFallback className="text-[10px]">
                                      {p.displayName.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm">{p.displayName}</span>
                                  {user?.penalty?.active && (
                                    <Badge variant="destructive" className="text-[10px]">
                                      {t("penalized")}
                                    </Badge>
                                  )}
                                </div>
                                {(match.status === "open" || match.status === "full") && (
                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 w-7 p-0 text-muted-foreground hover:text-amber-600"
                                      title={t("moveToWaitingList")}
                                      onClick={() => handleMoveToWaitingList(match.id, p.uid, p.displayName)}
                                    >
                                      <ArrowDown className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                      onClick={() => handleAdminRemovePlayer(match.id, p.uid, p.displayName)}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                    <PenaltyDialog
                                      playerName={p.displayName}
                                      playerUid={p.uid}
                                      onApply={handleNoShow}
                                      t={t}
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {match.waitingList.length > 0 && (
                            <>
                              <Separator className="my-2" />
                              <p className="text-xs font-medium text-muted-foreground mb-1">
                                {t("waitingList")}
                              </p>
                              {[...match.waitingList].sort((a, b) => a.joinedAt.toMillis() - b.joinedAt.toMillis()).map((p) => {
                                const user = usersMap.get(p.uid);
                                return (
                                   <div
                                    key={p.uid}
                                    className="flex items-center justify-between rounded p-1.5 text-muted-foreground hover:bg-white/50"
                                  >
                                    <div className="flex items-center gap-2">
                                      <Avatar className="h-6 w-6">
                                        <AvatarImage src={p.photoURL || undefined} />
                                        <AvatarFallback className="text-[10px]">
                                          {p.displayName.charAt(0)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="text-sm">{p.displayName}</span>
                                      {user?.penalty?.active && (
                                        <Badge variant="destructive" className="text-[10px]">
                                          {t("penalized")}
                                        </Badge>
                                      )}
                                    </div>
                                    {(match.status === "open" || match.status === "full") && (
                                      <div className="flex gap-1">
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-7 w-7 p-0 text-muted-foreground hover:text-emerald-600"
                                          title={t("moveToPlayers")}
                                          onClick={() => handleMoveToPlayers(match.id, p.uid, p.displayName)}
                                        >
                                          <ArrowUp className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                          onClick={() => handleAdminRemovePlayer(match.id, p.uid, p.displayName)}
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </>
                          )}
                          {(match.status === "open" || match.status === "full") && (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button size="sm" variant="outline" className="mt-3 w-full text-xs">
                                  <UserPlus className="mr-1 h-3 w-3" />
                                  {t("addPlayer")}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="max-h-64 overflow-y-auto p-2" align="start">
                                {(() => {
                                  const inMatch = new Set([
                                    ...match.players.map((p) => p.uid),
                                    ...match.waitingList.map((p) => p.uid),
                                  ]);
                                  const available = allUsers.filter((u) => !inMatch.has(u.uid));
                                  if (available.length === 0) {
                                    return (
                                      <p className="p-2 text-xs text-muted-foreground">
                                        {t("noPlayers")}
                                      </p>
                                    );
                                  }
                                  return available.map((u) => (
                                    <button
                                      key={u.uid}
                                      className="flex w-full items-center gap-2 rounded p-2 text-sm hover:bg-white/50"
                                      onClick={() => handleAdminAddPlayer(match.id, u)}
                                    >
                                      <Avatar className="h-6 w-6">
                                        <AvatarImage src={u.photoURL || undefined} />
                                        <AvatarFallback className="text-[10px]">
                                          {u.displayName.charAt(0)}
                                        </AvatarFallback>
                                      </Avatar>
                                      {u.displayName}
                                    </button>
                                  ));
                                })()}
                              </PopoverContent>
                            </Popover>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <Card className="backdrop-blur-xl bg-white/70 border border-white/30 rounded-2xl shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  {t("pendingUsers")} ({pendingUsers.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pendingUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("noPendingUsers")}</p>
                ) : (
                  <div className="space-y-2">
                    {pendingUsers.map((user) => (
                      <div
                        key={user.uid}
                        className="flex items-center justify-between rounded-md p-2 hover:bg-white/50"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.photoURL || undefined} />
                            <AvatarFallback>
                              {user.displayName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="text-sm font-medium">{user.displayName}</span>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleApproveUser(user)}
                            className="h-7 text-xs bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 border-0"
                          >
                            <UserCheck className="mr-1 h-3 w-3" />
                            {t("approveUser")}
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="destructive" className="h-7 text-xs">
                                <Trash2 className="mr-1 h-3 w-3" />
                                {t("deleteUser")}
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>{t("deleteUser")}</DialogTitle>
                              </DialogHeader>
                              <p className="text-sm text-muted-foreground">
                                {t("deleteUserConfirm", { name: user.displayName })}
                              </p>
                              <DialogFooter>
                                <DialogClose asChild>
                                  <Button variant="outline">{t("cancel")}</Button>
                                </DialogClose>
                                <DialogClose asChild>
                                  <Button variant="destructive" onClick={() => handleDeleteUser(user)}>
                                    {t("confirm")}
                                  </Button>
                                </DialogClose>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="backdrop-blur-xl bg-white/70 border border-white/30 rounded-2xl shadow-lg">
              <CardHeader>
                <CardTitle className="text-base">
                  {t("approvedUsers")} ({approvedUsers.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {approvedUsers.map((user) => (
                    <div
                      key={user.uid}
                      className="flex items-center justify-between rounded-md p-2 hover:bg-white/50"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.photoURL || undefined} />
                          <AvatarFallback>
                            {user.displayName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {user.displayName}
                            </span>
                            {user.role === "admin" && (
                              <Badge variant="default" className="text-[10px]">
                                Admin
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-0.5">
                              <Ticket className="h-3 w-3" />
                              {user.quota.remaining}/10
                            </span>
                            {user.penalty?.active && user.penalty.bannedUntil && user.penalty.bannedUntil.toDate() > new Date() && (
                              <span className="flex items-center gap-0.5 text-red-700 font-semibold">
                                <AlertTriangle className="h-3 w-3" />
                                {t("bannedUntil", {
                                  date: format(user.penalty.bannedUntil.toDate(), "d MMM", {
                                    locale: dateFnsLocale,
                                  }),
                                })}
                              </span>
                            )}
                            {user.penalty?.active && (
                              <span className="flex items-center gap-0.5 text-destructive">
                                <AlertTriangle className="h-3 w-3" />
                                {t("penalizedUntil", {
                                  date: format(user.penalty.until.toDate(), "d MMM", {
                                    locale: dateFnsLocale,
                                  }),
                                })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-1">
                        {user.penalty?.active && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRemovePenalty(user.uid)}
                            className="h-7 text-xs"
                          >
                            {t("removePenalty")}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleAdmin(user.uid, user.role)}
                          className="h-7 text-xs"
                        >
                          {user.role === "admin" ? (
                            <>
                              <ShieldOff className="mr-1 h-3 w-3" />
                              {t("removeAdmin")}
                            </>
                          ) : (
                            <>
                              <Shield className="mr-1 h-3 w-3" />
                              {t("makeAdmin")}
                            </>
                          )}
                        </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive">
                              <Trash2 className="mr-1 h-3 w-3" />
                              {t("deleteUser")}
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>{t("deleteUser")}</DialogTitle>
                            </DialogHeader>
                            <p className="text-sm text-muted-foreground">
                              {t("deleteUserConfirm", { name: user.displayName })}
                            </p>
                            <DialogFooter>
                              <DialogClose asChild>
                                <Button variant="outline">{t("cancel")}</Button>
                              </DialogClose>
                              <DialogClose asChild>
                                <Button variant="destructive" onClick={() => handleDeleteUser(user)}>
                                  {t("confirm")}
                                </Button>
                              </DialogClose>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <Card className="backdrop-blur-xl bg-white/70 border border-white/30 rounded-2xl shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Flag className="h-4 w-4 text-red-500" />
                  {t("pendingReports")} ({noShowReports.filter((r) => r.status === "pending").length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {noShowReports.filter((r) => r.status === "pending").length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("noPendingReports")}</p>
                ) : (
                  <div className="space-y-2">
                    {noShowReports.filter((r) => r.status === "pending").map((report) => (
                      <div
                        key={report.id}
                        className="flex items-center justify-between rounded-md p-2 hover:bg-white/50"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>{report.reportedPlayerName.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="text-sm font-medium">{report.reportedPlayerName}</span>
                            <p className="text-xs text-muted-foreground">
                              {t("reportedBy", { name: report.reporterName })}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {t("reportMatch", { day: report.matchDay, date: report.matchDate })}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="default"
                                className="h-7 text-xs bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 border-0"
                              >
                                <CheckCircle className="mr-1 h-3 w-3" />
                                {t("confirmReport")}
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>{t("confirmReport")}</DialogTitle>
                              </DialogHeader>
                              <p className="text-sm text-muted-foreground">
                                {t("confirmReportDescription", { name: report.reportedPlayerName })}
                              </p>
                              <DialogFooter>
                                <DialogClose asChild>
                                  <Button variant="outline">{t("cancel")}</Button>
                                </DialogClose>
                                <DialogClose asChild>
                                  <Button
                                    variant="destructive"
                                    onClick={() => handleConfirmReport(report)}
                                  >
                                    {t("confirm")}
                                  </Button>
                                </DialogClose>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => handleDismissReport(report)}
                          >
                            {t("dismissReport")}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("cancelMatchTitle")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="cancelReason"
                  checked={cancelReasonType === "not_enough_players"}
                  onChange={() => setCancelReasonType("not_enough_players")}
                  className="accent-emerald-600"
                />
                <span className="text-sm">{t("cancelReasonNotEnoughPlayers")}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="cancelReason"
                  checked={cancelReasonType === "unplayable_field"}
                  onChange={() => setCancelReasonType("unplayable_field")}
                  className="accent-emerald-600"
                />
                <span className="text-sm">{t("cancelReasonUnplayableField")}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="cancelReason"
                  checked={cancelReasonType === "custom"}
                  onChange={() => setCancelReasonType("custom")}
                  className="accent-emerald-600"
                />
                <span className="text-sm">{t("cancelReasonCustom")}</span>
              </label>
              {cancelReasonType === "custom" && (
                <textarea
                  value={cancelCustomText}
                  onChange={(e) => setCancelCustomText(e.target.value)}
                  placeholder={t("cancelReasonCustomPlaceholder")}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  rows={3}
                />
              )}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">{t("cancel")}</Button>
              </DialogClose>
              <Button
                variant="destructive"
                onClick={handleConfirmCancel}
                disabled={cancelReasonType === "custom" && !cancelCustomText.trim()}
              >
                {t("confirm")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
      </div>
    </div>
  );
}
