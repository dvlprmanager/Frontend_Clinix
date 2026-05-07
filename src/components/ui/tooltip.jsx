import * as React from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { cn } from '@/lib/utils'

function TooltipProvider({ delayDuration = 120, ...props }) {
  return <TooltipPrimitive.Provider delayDuration={delayDuration} {...props} />
}

function Tooltip({ ...props }) {
  return <TooltipPrimitive.Root {...props} />
}

function TooltipTrigger({ ...props }) {
  return <TooltipPrimitive.Trigger asChild {...props} />
}

function TooltipContent({ className, sideOffset = 8, ...props }) {
  return (
    <TooltipPrimitive.Content
      sideOffset={sideOffset}
      className={cn(
        'z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-xs text-popover-foreground shadow-md',
        className,
      )}
      {...props}
    />
  )
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger }
