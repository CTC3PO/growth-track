"use client";

import { ComponentPropsWithoutRef, forwardRef } from "react";

interface InputProps extends ComponentPropsWithoutRef<"input"> {
    label?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, className = "", id, ...props }, ref) => {
        return (
            <div className="mb-[14px]">
                {label && (
                    <label
                        htmlFor={id}
                        className="block text-[13px] font-medium text-text-secondary mb-[6px]"
                    >
                        {label}
                    </label>
                )}
                <input
                    ref={ref}
                    id={id}
                    className={`
            w-full p-[14px_16px] bg-bg-input border-2 border-transparent 
            rounded-xl text-text-primary text-base font-medium 
            transition-all placeholder:text-text-muted
            focus:outline-none focus:border-text-primary focus:bg-bg-card focus:shadow-[0_4px_12px_rgba(0,0,0,0.05)]
            ${className}
          `}
                    {...props}
                />
            </div>
        );
    }
);
Input.displayName = "Input";

export const Select = forwardRef<HTMLSelectElement, ComponentPropsWithoutRef<"select"> & { label?: string }>(
    ({ label, className = "", id, children, ...props }, ref) => {
        return (
            <div className="mb-[14px] flex-1">
                {label && (
                    <label
                        htmlFor={id}
                        className="block text-[13px] font-medium text-text-secondary mb-[6px]"
                    >
                        {label}
                    </label>
                )}
                <select
                    ref={ref}
                    id={id}
                    className={`
            w-full p-[14px_16px] bg-bg-input border-2 border-transparent 
            rounded-xl text-text-primary text-base font-medium 
            transition-all
            focus:outline-none focus:border-text-primary focus:bg-bg-card focus:shadow-[0_4px_12px_rgba(0,0,0,0.05)]
            ${className}
          `}
                    {...props}
                >
                    {children}
                </select>
            </div>
        );
    }
);
Select.displayName = "Select";
