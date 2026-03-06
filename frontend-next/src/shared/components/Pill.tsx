"use client";

interface PillProps {
    children: React.ReactNode;
    active?: boolean;
    onClick?: () => void;
    className?: string;
}

export function Pill({ children, active = false, onClick, className = "" }: PillProps) {
    return (
        <span
            onClick={onClick}
            className={`
        inline-block px-4 py-2 rounded-full text-[13px] font-bold cursor-pointer transition-all border
        ${active
                    ? "bg-accent text-[#111827] border-accent"
                    : "bg-bg-input text-text-secondary border-border hover:bg-bg-secondary hover:text-text-primary"
                }
        ${className}
      `}
        >
            {children}
        </span>
    );
}
