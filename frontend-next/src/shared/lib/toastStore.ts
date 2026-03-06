import { create } from "zustand";
import { ToastType } from "../components/Toast";

interface ToastState {
    message: string;
    type: ToastType;
    isVisible: boolean;
    showToast: (message: string, type?: ToastType) => void;
    hideToast: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
    message: "",
    type: "success",
    isVisible: false,
    showToast: (message, type = "success") => set({ message, type, isVisible: true }),
    hideToast: () => set({ isVisible: false }),
}));
