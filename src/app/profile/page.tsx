"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera } from "lucide-react";
import { Header } from "@/components/header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useLocale } from "@/hooks/useLocale";
import { toast } from "sonner";

export default function ProfilePage() {
  const {
    user,
    profile,
    loading,
    updateUserDisplayName,
    updateUserPassword,
    uploadProfilePhoto,
  } = useAuth();
  const { t } = useLocale();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [photoLoading, setPhotoLoading] = useState(false);
  const [nameLoading, setNameLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [photoError, setPhotoError] = useState("");
  const [nameError, setNameError] = useState("");
  const [nameSuccess, setNameSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  useEffect(() => {
    if (!loading && !profile) {
      router.push("/login");
    }
  }, [loading, profile, router]);

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.displayName ?? "");
  }, [profile]);

  function getErrorMessage(error: unknown): string {
    const code = (error as { code?: string })?.code;
    if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
      return t("profileErrorReauth");
    }
    if (code === "auth/requires-recent-login") {
      return t("profileReauthRequired");
    }
    if (code === "auth/weak-password") {
      return t("authErrorWeakPassword");
    }
    if (code === "auth/email-already-in-use") {
      return t("authErrorEmailInUse");
    }
    if (code === "auth/invalid-email") {
      return t("authErrorInvalidEmail");
    }
    return t("authErrorGeneric");
  }

  async function onSelectPhoto(file: File) {
    setPhotoError("");
    setPhotoLoading(true);
    try {
      await uploadProfilePhoto(file);
      toast.success(t("profilePhotoUploaded"));
    } catch (error) {
      setPhotoError(getErrorMessage(error));
    } finally {
      setPhotoLoading(false);
    }
  }

  async function onSaveDisplayName() {
    setNameError("");
    setNameSuccess("");
    setNameLoading(true);
    try {
      await updateUserDisplayName(displayName.trim());
      setNameSuccess(t("profileSaved"));
      toast.success(t("profileSaved"));
    } catch (error) {
      setNameError(getErrorMessage(error));
    } finally {
      setNameLoading(false);
    }
  }

  async function onSavePassword() {
    setPasswordError("");
    setPasswordSuccess("");
    if (newPassword !== confirmPassword) {
      setPasswordError(t("profilePasswordMismatch"));
      return;
    }
    setPasswordLoading(true);
    try {
      await updateUserPassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess(t("profilePasswordChanged"));
      toast.success(t("profilePasswordChanged"));
    } catch (error) {
      setPasswordError(getErrorMessage(error));
    } finally {
      setPasswordLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">{t("loading")}</div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('https://images.unsplash.com/photo-1556056504-5c7696c4c28d?w=1920&q=80&auto=format')" }}
    >
      <div className="min-h-screen bg-gradient-to-b from-slate-900/70 via-slate-800/50 to-emerald-950/40 backdrop-blur-[2px]">
        <Header />
        <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-8">
          <Card className="w-full max-w-lg backdrop-blur-xl bg-white/80 border border-white/30 shadow-2xl rounded-2xl">
            <CardHeader className="space-y-4 pb-2">
              <Link href="/" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors">
                <ArrowLeft className="h-4 w-4" />
                {t("back")}
              </Link>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">{t("profileTitle")}</CardTitle>
            </CardHeader>

            <CardContent className="space-y-8">
              <section className="space-y-3">
                <Label>{t("profilePhoto")}</Label>
                <div className="flex flex-col items-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="group relative rounded-full"
                    disabled={photoLoading}
                  >
                    <Avatar className="h-24 w-24 ring-4 ring-emerald-300/50 transition group-hover:ring-emerald-400/80">
                      <AvatarImage src={profile.photoURL || undefined} alt={profile.displayName} />
                      <AvatarFallback className="text-2xl font-semibold text-emerald-700">
                        {profile.displayName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute bottom-0 right-0 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 p-1.5 text-white shadow-md">
                      <Camera className="h-4 w-4" />
                    </span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        void onSelectPhoto(file);
                      }
                      event.target.value = "";
                    }}
                  />
                  {photoLoading && (
                    <p className="text-sm text-muted-foreground">{t("loading")}</p>
                  )}
                  {photoError && <p className="text-sm text-red-600">{photoError}</p>}
                </div>
              </section>

              <section className="space-y-3">
                <Label htmlFor="profile-display-name">{t("profileDisplayName")}</Label>
                <div className="flex gap-2">
                  <Input
                    id="profile-display-name"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                  />
                  <Button
                    type="button"
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-md active:scale-[0.98] transition-all duration-300"
                    onClick={onSaveDisplayName}
                    disabled={nameLoading}
                  >
                    {nameLoading ? t("loading") : t("profileSave")}
                  </Button>
                </div>
                {nameError && <p className="text-sm text-red-600">{nameError}</p>}
                {nameSuccess && <p className="text-sm text-emerald-700">{nameSuccess}</p>}
              </section>

              <section className="space-y-3">
                <Label>{t("profileEmail")}</Label>
                <Input
                  type="email"
                  value={profile.email}
                  disabled
                  className="bg-white/50"
                />
              </section>

              <section className="space-y-3">
                <Label className="text-base font-semibold">{t("profileChangePassword")}</Label>
                <div className="space-y-2">
                  <Label htmlFor="profile-current-password">{t("profileCurrentPassword")}</Label>
                  <Input
                    id="profile-current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-new-password">{t("profileNewPassword")}</Label>
                  <Input
                    id="profile-new-password"
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-confirm-password">{t("profileConfirmPassword")}</Label>
                  <Input
                    id="profile-confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-md active:scale-[0.98] transition-all duration-300"
                  onClick={onSavePassword}
                  disabled={passwordLoading}
                >
                  {passwordLoading ? t("loading") : t("profileSave")}
                </Button>
                {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
                {passwordSuccess && <p className="text-sm text-emerald-700">{passwordSuccess}</p>}
              </section>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
