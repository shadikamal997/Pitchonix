import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-xl border-2 border-gray-200 bg-background px-4 py-3 text-base transition-colors placeholder:text-gray-400 focus:border-black focus:outline-none focus-visible:border-black focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:focus:border-white",
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
