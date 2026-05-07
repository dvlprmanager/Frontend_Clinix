import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export function IconTooltipButton({
  icon: Icon,
  label,
  variant = 'outline',
  size = 'icon',
  className = 'h-9 w-9 p-0',
  tooltipSide = 'top',
  ...buttonProps
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Button
            type="button"
            variant={variant}
            size={size}
            className={className}
            aria-label={label}
            title={label}
            {...buttonProps}
          >
            {Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}
          </Button>
        </TooltipTrigger>
        <TooltipContent side={tooltipSide}>
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
