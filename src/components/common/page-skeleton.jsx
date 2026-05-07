import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function PageSkeleton({ variant = 'dashboard' }) {
  if (variant === 'auth') {
    return (
      <main className="min-h-screen lg:grid lg:grid-cols-2">
        <section className="hidden items-center justify-center bg-gradient-to-br from-primary via-cyan-700 to-accent p-8 lg:flex">
          <div className="w-full max-w-xl space-y-4">
            <Skeleton className="h-6 w-40 bg-white/30" />
            <Skeleton className="h-10 w-4/5 bg-white/30" />
            <Skeleton className="h-5 w-full bg-white/30" />
            <Skeleton className="h-5 w-5/6 bg-white/30" />
          </div>
        </section>
        <section className="flex min-h-screen items-center justify-center bg-white/80 p-4 sm:p-6">
          <Card className="w-full max-w-md">
            <CardHeader className="space-y-3">
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-4 w-56" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full" />
            </CardContent>
          </Card>
        </section>
      </main>
    )
  }

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardHeader className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-40" />
            </CardContent>
          </Card>
        ))}
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-10/12" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="space-y-2">
            <Skeleton className="h-6 w-44" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
