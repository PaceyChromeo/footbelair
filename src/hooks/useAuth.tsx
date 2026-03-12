"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  updateEmail as firebaseUpdateEmail,
  updatePassword as firebaseUpdatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  User,
} from "firebase/auth";
import { doc, getDoc, setDoc, Timestamp, collection, query, where, getDocs } from "firebase/firestore";
import { auth, googleProvider, db } from "@/lib/firebase";
import { UserProfile, MAX_QUOTA } from "@/lib/types";

export type SignupErrorCode = "email-already-exists" | "name-already-exists";

export class SignupError extends Error {
  code: SignupErrorCode;
  constructor(code: SignupErrorCode) {
    super(code);
    this.code = code;
    Object.setPrototypeOf(this, SignupError.prototype);
  }
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserDisplayName: (newName: string) => Promise<void>;
  updateUserEmail: (newEmail: string) => Promise<void>;
  updateUserPassword: (currentPassword: string, newPassword: string) => Promise<void>;
  uploadProfilePhoto: (file: File) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signInWithGoogle: async () => {},
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  resetPassword: async () => {},
  updateUserDisplayName: async () => {},
  updateUserEmail: async () => {},  updateUserPassword: async () => {},
  uploadProfilePhoto: async () => {},
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

async function syncUserToFirestore(user: User, displayNameOverride?: string): Promise<UserProfile> {
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  const currentMonth = getCurrentMonth();
  const resolvedName = displayNameOverride || user.displayName || "Unknown";

  if (userSnap.exists()) {
    const existing = userSnap.data() as UserProfile;

    const updates: Partial<UserProfile> = {
      displayName: resolvedName !== "Unknown" ? resolvedName : existing.displayName || "Unknown",
      email: user.email || "",
      photoURL: user.photoURL || existing.photoURL,
    };

    if (existing.quota.month !== currentMonth) {
      updates.quota = { remaining: MAX_QUOTA, month: currentMonth };
    }

    if (existing.penalty?.active && existing.penalty.until.toDate() <= new Date()) {
      updates.penalty = null;
    }

    await setDoc(userRef, updates, { merge: true });

    return {
      ...existing,
      ...updates,
      quota: updates.quota || existing.quota,
      penalty: updates.penalty === null ? null : existing.penalty,
    };
  }

  // No document for this UID — check if an orphaned profile exists for the same email
  // (e.g. Firebase Auth account was recreated and got a new UID).
  if (user.email) {
    const usersRef = collection(db, "users");
    const emailQuery = query(usersRef, where("email", "==", user.email));
    const emailSnap = await getDocs(emailQuery);

    if (!emailSnap.empty) {
      const orphaned = emailSnap.docs[0].data() as UserProfile;

      const migratedProfile: UserProfile = {
        ...orphaned,
        uid: user.uid,
        displayName: resolvedName !== "Unknown" ? resolvedName : orphaned.displayName,
        email: user.email,
        photoURL: user.photoURL || orphaned.photoURL,
        quota: orphaned.quota.month !== currentMonth
          ? { remaining: MAX_QUOTA, month: currentMonth }
          : orphaned.quota,
        penalty: orphaned.penalty?.active && orphaned.penalty.until.toDate() <= new Date()
          ? null
          : orphaned.penalty,
      };

      await setDoc(userRef, migratedProfile);
      return migratedProfile;
    }
  }

  const newProfile: UserProfile = {
    uid: user.uid,
    displayName: resolvedName,
    email: user.email || "",
    photoURL: user.photoURL,
    role: "player",
    quota: { remaining: MAX_QUOTA, month: currentMonth },
    penalty: null,
    createdAt: Timestamp.now(),
  };

  await setDoc(userRef, newProfile);
  return newProfile;
}

function compressAndEncodeImage(file: File, maxSize: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("canvas-context-failed")); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => reject(new Error("image-load-failed"));
    img.src = URL.createObjectURL(file);
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingUp, setSigningUp] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (signingUp) return;
      if (firebaseUser) {
        setUser(firebaseUser);
        const userProfile = await syncUserToFirestore(firebaseUser);
        setProfile(userProfile);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [signingUp]);

  const signInWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const signInWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUpWithEmail = async (email: string, password: string, displayName: string) => {
    setSigningUp(true);
    try {
      const usersRef = collection(db, "users");

      const emailQuery = query(usersRef, where("email", "==", email));
      const emailSnap = await getDocs(emailQuery);
      if (!emailSnap.empty) {
        throw new SignupError("email-already-exists");
      }

      const nameQuery = query(usersRef, where("displayName", "==", displayName));
      const nameSnap = await getDocs(nameQuery);
      if (!nameSnap.empty) {
        throw new SignupError("name-already-exists");
      }

      const credential = await createUserWithEmailAndPassword(auth, email, password);

      try {
        await updateProfile(credential.user, { displayName });
        const userProfile = await syncUserToFirestore(credential.user, displayName);
        setUser(credential.user);
        setProfile(userProfile);
      } catch (err) {
        try { await credential.user.delete(); } catch { /* best-effort cleanup */ }
        throw err;
      }
    } finally {
      setSigningUp(false);
    }
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const updateUserDisplayName = async (newName: string) => {
    if (!user) throw new Error("auth/no-current-user");

    await updateProfile(user, { displayName: newName });
    await setDoc(doc(db, "users", user.uid), { displayName: newName }, { merge: true });

    const userProfile = await syncUserToFirestore(user, newName);
    setProfile(userProfile);
  };

  const updateUserEmail = async (newEmail: string) => {
    if (!user || !user.email) throw new Error("auth/no-current-user");

    await firebaseUpdateEmail(user, newEmail);
    await setDoc(doc(db, "users", user.uid), { email: newEmail }, { merge: true });

    const userProfile = await syncUserToFirestore(user);
    setProfile(userProfile);
  };

  const updateUserPassword = async (currentPassword: string, newPassword: string) => {
    if (!user || !user.email) throw new Error("auth/no-current-user");

    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    await firebaseUpdatePassword(user, newPassword);
  };

  const uploadProfilePhoto = async (file: File) => {
    if (!user) throw new Error("auth/no-current-user");

    const dataUrl = await compressAndEncodeImage(file, 256, 0.8);

    await setDoc(doc(db, "users", user.uid), { photoURL: dataUrl }, { merge: true });

    setProfile((prev) => prev ? { ...prev, photoURL: dataUrl } : prev);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        resetPassword,
        updateUserDisplayName,
        updateUserEmail,
        updateUserPassword,
        uploadProfilePhoto,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
