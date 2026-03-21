import * as React from "react"
import { cn } from "@/lib/utils"

function Progress({ value = 0, className, indicatorClassName, ...props }) {
  const percentage = Math.min(Math.max(value, 0), 100)

  return (
    <div
      className={cn(
        "h-2.5 w-full overflow-hidden rounded-full bg-bg-muted",
        className
      )}
      {...props}
    >
      <div
        className={cn(
          "h-full rounded-full transition-all duration-500 ease-in-out",
          indicatorClassName || "bg-primary"
        )}
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}

export { Progress }
