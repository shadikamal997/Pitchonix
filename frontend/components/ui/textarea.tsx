import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[100px] w-full rounded-xl border-2 border-gray-200 bg-background px-4 py-3 text-base transition-colors placeholder:text-gray-400 focus:border-black focus:outline-none focus-visible:border-black focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:focus:border-white",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
