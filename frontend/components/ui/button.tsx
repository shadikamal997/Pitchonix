import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Pitchonix Dashboard (Phase Δ — Soft Sage)
//
// Default rounded soft button. Variants automatically pick up the new
// design tokens (sage / surface / surface-soft).
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F7563]/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[#4F7563] text-white shadow-[0_14px_30px_rgba(79,117,99,0.22)] hover:bg-[#355846]",
        destructive:
          "bg-[#D96A6A] text-white shadow-[0_14px_30px_rgba(217,106,106,0.22)] hover:bg-[#c44d4d]",
        outline:
          "border border-[#E3E1DA] bg-white text-[#111111] hover:bg-[#F7F6F2]",
        secondary:
          "bg-white text-[#111111] border border-[#E3E1DA] hover:bg-[#F7F6F2]",
        ghost:
          "text-[#111111] hover:bg-[#F1F0EC]",
        link:
          "text-[#4F7563] underline-offset-4 hover:underline",
        dark:
          "bg-[#111114] text-white hover:bg-black shadow-[0_14px_30px_rgba(0,0,0,0.18)]",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 rounded-xl px-3.5 text-[13px]",
        lg: "h-12 rounded-2xl px-6 text-[15px]",
        icon: "h-11 w-11 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
