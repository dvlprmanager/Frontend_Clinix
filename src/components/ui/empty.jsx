import { cn } from '@/lib/utils'

export function Empty({ className, ...props }) {
  return <div className={cn('flex w-full justify-center rounded-lg border bg-card p-6', className)} {...props} />
}

export function EmptyHeader({ className, ...props }) {
  return <div className={cn('flex flex-col items-center gap-2 text-center', className)} {...props} />
}

export function EmptyMedia({ className, ...props }) {
  return <div className={cn('flex h-10 w-10 items-center justify-center rounded-full bg-muted', className)} {...props} />
}

export function EmptyTitle({ className, ...props }) {
  return <h3 className={cn('text-base font-semibold text-foreground', className)} {...props} />
}

export function EmptyDescription({ className, ...props }) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />
}

export function EmptyContent({ className, ...props }) {
  return <div className={cn('mt-4 flex items-center gap-2', className)} {...props} />
}

