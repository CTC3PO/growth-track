"use client";

import { ComponentPropsWithoutRef } from "react";

interface ButtonProps extends ComponentPropsWithoutRef<"button"> {
    variant?: "primary" | "secondary" | "strava";
    fullWidth?: boolean;
}

export function Button({
    children,
    variant = "primary",
    fullWidth = true,
    className = "",
    ...props
}: ButtonProps) {
    let variantClasses = "";

    if (variant === "primary") {
        variantClasses = "bg-accent text-[#0f172a] border border-black/10 text-base hover:bg-accent-dark hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)]";
    } else if (variant === "secondary") {
        variantClasses = "bg-bg-input text-text-primary border border-border hover:bg-[#e2e8f0] hover:border-[#cbd5e1]";
    } else if (variant === "strava") {
        variantClasses = "bg-[#fc4c02] text-white shadow-[0_4px_14px_rgba(252,76,2,0.3)] hover:bg-[#e34402] hover:shadow-[0_6px_20px_rgba(252,76,2,0.4)] hover:-translate-y-px";
    }

    return (
        <button
            className={`
        ${fullWidth ? "w-full" : ""}
        p-3 border-none rounded-lg font-semibold cursor-pointer 
        transition-all flex items-center justify-center gap-2 
        active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none
        ${variantClasses}
        ${className}
      `}
            {...props}
        >
            {children}
        </button>
    );
}
