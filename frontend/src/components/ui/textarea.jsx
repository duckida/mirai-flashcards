import * as React from "react"
import { cn } from "@/lib/utils"

const Textarea = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-xl border border-border bg-bg px-4 py-3 text-sm text-text-primary placeholder:text-text-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:cursor-not:allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
