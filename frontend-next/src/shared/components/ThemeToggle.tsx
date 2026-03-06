"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        // Check initial theme from localStorage or system preference
        const savedTheme = localStorage.getItem("theme");
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

        if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
            setIsDark(true);
            document.documentElement.classList.add("dark");
        }
    }, []);

    const toggleTheme = () => {
        const newDarkState = !isDark;
        setIsDark(newDarkState);

        if (newDarkState) {
            document.documentElement.classList.add("dark");
            localStorage.setItem("theme", "dark");
        } else {
            document.documentElement.classList.remove("dark");
            localStorage.setItem("theme", "light");
        }
    };

    return (
        <div className="flex items-center gap-2 bg-bg-card px-3 py-1 rounded-[20px] shadow-sm border border-border">
            <span className="text-[14px]">☀️</span>
            <button
                type="button"
                role="switch"
                aria-checked={isDark}
                onClick={toggleTheme}
                className={`
          relative w-[44px] h-[24px] rounded-full transition-colors cursor-pointer border-none flex-shrink-0
          ${isDark ? "bg-accent" : "bg-[#ddd]"}
        `}
            >
                <span
                    className={`
            absolute top-[2px] left-[2px] w-[20px] h-[20px] bg-white rounded-full 
            transition-all shadow-[0_1px_3px_rgba(0,0,0,0.15)]
            ${isDark ? "translate-x-[20px]" : "translate-x-0"}
          `}
                />
            </button>
            <span className="text-[14px]">🌙</span>
        </div>
    );
}
