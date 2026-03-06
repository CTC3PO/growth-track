import { create } from "zustand";

interface User {
    id: string;
    name: string;
    email: string;
}

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (user: User, token: string) => void;
    logout: () => void;
    setLoading: (isLoading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    login: (user, token) => {
        localStorage.setItem("authToken", token);
        set({ user, isAuthenticated: true, isLoading: false });
    },
    logout: () => {
        localStorage.removeItem("authToken");
        set({ user: null, isAuthenticated: false, isLoading: false });
    },
    setLoading: (isLoading) => set({ isLoading }),
}));
