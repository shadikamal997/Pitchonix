import * as React from "react"

import { cn } from "@/lib/utils"

// Pitchonix Dashboard (Phase Δ — Soft Sage)
export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-[14px] border border-[#E3E1DA] bg-white px-4 py-2.5 text-sm text-[#111111] transition-colors placeholder:text-[#9A9A9A] focus:border-[#4F7563] focus:shadow-[0_0_0_3px_rgba(79,117,99,0.15)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
