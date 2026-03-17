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
} from "@/lib/matches";
import { Match, UserProfile, DayOfWeek, MAX_PLAYERS } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Clock, Users, Ticket, AlertTriangle } from "lucide-react";
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
      const message = err instanceof Error ? err.message : t("error");
      toast.error(message);
    }
  };

  const handleLeave = async () => {
    if (!profile || !match) return;
    try {
      await leaveMatch(match.id, profile.uid, usersMap);
      toast.success(t("unregisteredToast"));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("error");
      toast.error(message);
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
        <div className="min-h-screen bg-white/50">
          <Header />
          <div className="flex items-center justify-center py-20">
            <div className="text-muted-foreground">{t("loading")}</div>
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
        <div className="min-h-screen bg-white/50">
          <Header />
          <div className="mx-auto max-w-5xl px-6 py-10">
            <p className="text-center text-muted-foreground">{t("matchNotFound")}</p>
            <div className="mt-4 text-center">
              <Link href="/">
                <Button variant="outline">{t("back")}</Button>
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
      <div className="min-h-screen bg-white/50">
        <Header />
        <main className="mx-auto max-w-5xl px-6 py-6">
        <Link href="/" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          {t("back")}
        </Link>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>
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
                  <Button onClick={handleJoin} className="w-full bg-emerald-600 hover:bg-emerald-700">
                    {t("register")}
                  </Button>
                ) : (
                  <div className="space-y-2">
                    {isInPlayers ? (
                      <Badge className="w-full justify-center py-2 bg-emerald-600" variant="default">
                        {t("registered")}
                      </Badge>
                    ) : (
                      <Badge className="w-full justify-center py-2 bg-amber-500 text-white" variant="secondary">
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
          <Card>
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
                        className="flex items-center gap-3 rounded-md p-2 hover:bg-muted"
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
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
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
                        className="flex items-center gap-3 rounded-md p-2 hover:bg-muted"
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
      </main>
      </div>
    </div>
  );
}
