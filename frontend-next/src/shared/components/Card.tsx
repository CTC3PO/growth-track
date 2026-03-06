export function Card({ children, className = "" }: { children: React.ReactNode, className?: string }) {
    return (
        <div className={`bg-bg-card border border-border rounded-[var(--radius-custom)] p-6 mb-6 shadow-sm hover:-translate-y-0.5 hover:shadow-lg transition-all ${className}`}>
            {children}
        </div>
    );
}

export function CardHeader({
    title,
    icon,
    rightContent,
    className = "",
}: {
    title: string;
    icon?: string | React.ReactNode;
    rightContent?: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={`flex items-center gap-3 mb-6 ${rightContent ? 'justify-between' : ''} ${className}`}>
            <div className="flex items-center gap-2">
                {icon && <span className="text-3xl">{icon}</span>}
                <h3 className="text-[22px] font-extrabold tracking-tight text-text-primary m-0">
                    {title}
                </h3>
            </div>
            {rightContent}
        </div>
    );
}
