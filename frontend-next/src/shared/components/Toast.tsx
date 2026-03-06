"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

export type ToastType = "success" | "error";

interface ToastProps {
    message: string;
    type?: ToastType;
    isVisible: boolean;
    onClose: () => void;
}

export function Toast({ message, type = "success", isVisible, onClose }: ToastProps) {
    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(() => {
                onClose();
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [isVisible, onClose]);

    if (!isVisible) return null;

    return (
        <div
            className={`
        fixed top-4 left-1/2 -translate-x-1/2 z-[1000] 
        px-6 py-3 rounded-full shadow-lg font-semibold text-[15px]
        flex items-center gap-2 animate-in fade-in slide-in-from-top-5 duration-300
        ${type === "success"
                    ? "bg-[#10b981] text-white"
                    : "bg-accent-rose text-white"
                }
      `}
        >
            {type === "success" ? (
                <CheckCircle2 className="w-5 h-5" />
            ) : (
                <XCircle className="w-5 h-5" />
            )}
            {message}
        </div>
    );
}

// Global Toast State Management using Zustand will be added next.
