"use client";

import { useToastStore } from "../lib/toastStore";
import { Toast } from "./Toast";

export function ToastProvider() {
    const { message, type, isVisible, hideToast } = useToastStore();

    return (
        <Toast
            message={message}
            type={type}
            isVisible={isVisible}
            onClose={hideToast}
        />
    );
}
