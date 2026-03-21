import * as React from "react"
import { cn } from "@/lib/utils"

function Spinner({ className, size = "md", ...props }) {
  const sizeClasses = {
    sm: "h-5 w-5 border-2",
    md: "h-8 w-8 border-[3px]",
    lg: "h-12 w-12 border-4",
  }

  return (
    <div
      className={cn(
        "animate-spin rounded-full border-border border-t-primary",
        sizeClasses[size],
        className
      )}
      {...props}
    />
  )
}

export { Spinner }
