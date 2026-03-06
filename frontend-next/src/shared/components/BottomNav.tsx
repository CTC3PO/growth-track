"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckSquare, Activity, BookOpen, PenTool, BarChart2 } from "lucide-react";

const NAV_ITEMS = [
    { name: "Check-In", path: "/", icon: CheckSquare },
    { name: "Running", path: "/running", icon: Activity },
    { name: "Reading", path: "/reading", icon: BookOpen },
    { name: "Journal", path: "/journal", icon: PenTool },
    { name: "Summary", path: "/summary", icon: BarChart2 },
];

export function BottomNav() {
    const pathname = usePathname();

    return (
        <nav className="fixed bottom-0 left-0 w-full bg-white/40 dark:bg-gray-900/90 backdrop-blur-md border-t border-white/30 dark:border-white/10 flex justify-around px-3 py-2 pb-safe z-50">
            {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.path;
                const Icon = item.icon;

                return (
                    <Link
                        key={item.name}
                        href={item.path}
                        className={`flex flex-col items-center justify-center min-w-[60px] flex-1 p-2 rounded-xl transition-all ${isActive
                                ? "bg-accent text-gray-900 scale-105"
                                : "text-text-muted hover:bg-bg-secondary hover:text-text-primary"
                            }`}
                    >
                        <Icon
                            className={`w-7 h-7 transition-all ${isActive ? "stroke-gray-900 opacity-100" : "opacity-60"
                                }`}
                        />
                    </Link>
                );
            })}
        </nav>
    );
}
