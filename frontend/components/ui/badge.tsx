import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

// Pitchonix Dashboard (Phase Δ — Soft Sage)
const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#4F7563]/40 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#E6F0EA] text-[#4F7563] hover:bg-[#DDE8E1]",
        secondary:
          "border-transparent bg-[#F1F0EC] text-[#6B6B6B] hover:bg-[#E3E1DA]/60",
        destructive:
          "border-transparent bg-[#F7E3E3] text-[#9a3737] hover:bg-[#F1D2D2]",
        outline: "border-[#E3E1DA] text-[#111111] bg-white",
        success:
          "border-transparent bg-[#E6F0EA] text-[#4F7563]",
        warn:
          "border-transparent bg-[#FAEEDB] text-[#8c6210]",
        sage:
          "border-transparent bg-[#4F7563] text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={badgeVariants({ variant, className })} {...props} />
  )
}

export { Badge, badgeVariants }
