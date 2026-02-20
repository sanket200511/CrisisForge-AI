import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { User } from "firebase/auth";
import { auth, googleProvider, isFirebaseConfigured } from "../firebase";

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signInWithGoogle: () => Promise<void>;
    signInWithEmail: (e: string, p: string) => Promise<void>;
    registerWithEmail: (e: string, p: string) => Promise<void>;
    resetPassword: (e: string) => Promise<void>;
    logOut: () => Promise<void>;
    isAuthEnabled: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // If Firebase is not configured, skip auth entirely and let users in
        if (!isFirebaseConfigured || !auth) {
            setLoading(false);
            return;
        }

        // Firebase IS configured — listen for auth state
        let unsubscribe: (() => void) | undefined;

        import("firebase/auth").then(({ onAuthStateChanged }) => {
            unsubscribe = onAuthStateChanged(auth!, (currentUser: User | null) => {
                setUser(currentUser);
                setLoading(false);
            });
        });

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, []);

    const signInWithGoogle = async () => {
        if (!isFirebaseConfigured || !auth || !googleProvider) {
            console.warn("Firebase is not configured. Skipping Google sign-in.");
            return;
        }
        try {
            const { signInWithPopup } = await import("firebase/auth");
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error("Error signing in with Google", error);
            throw error;
        }
    };

    const signInWithEmail = async (email: string, pass: string) => {
        if (!isFirebaseConfigured || !auth) {
            console.warn("Firebase is not configured. Skipping Email sign-in.");
            return;
        }
        try {
            const { signInWithEmailAndPassword } = await import("firebase/auth");
            await signInWithEmailAndPassword(auth, email, pass);
        } catch (error) {
            console.error("Error signing in with Email", error);
            throw error;
        }
    };

    const registerWithEmail = async (email: string, pass: string) => {
        if (!isFirebaseConfigured || !auth) {
            console.warn("Firebase is not configured. Skipping Registration.");
            return;
        }
        try {
            const { createUserWithEmailAndPassword } = await import("firebase/auth");
            await createUserWithEmailAndPassword(auth, email, pass);
        } catch (error) {
            console.error("Error registering with Email", error);
            throw error;
        }
    };

    const resetPassword = async (email: string) => {
        if (!isFirebaseConfigured || !auth) {
            console.warn("Firebase is not configured. Skipping password reset.");
            return;
        }
        try {
            const { sendPasswordResetEmail } = await import("firebase/auth");
            await sendPasswordResetEmail(auth, email);
        } catch (error) {
            console.error("Error sending password reset email", error);
            throw error;
        }
    };

    const logOut = async () => {
        if (!isFirebaseConfigured || !auth) {
            return;
        }
        try {
            const { signOut } = await import("firebase/auth");
            await signOut(auth);
        } catch (error) {
            console.error("Error signing out", error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, signInWithGoogle, signInWithEmail, registerWithEmail, resetPassword, logOut, isAuthEnabled: isFirebaseConfigured }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
