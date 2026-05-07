import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { CalendarCheck2, FileText, Share2 } from 'lucide-react'

export function LoginScreen({
  clinicCode,
  username,
  password,
  errorMessage,
  isSubmitting,
  onClinicCodeChange,
  onUsernameChange,
  onPasswordChange,
  onSubmit,
}) {
  return (
    <main className="min-h-screen lg:grid lg:grid-cols-2">
      <section className="hidden items-center justify-center bg-gradient-to-br from-primary via-cyan-700 to-accent p-8 text-white lg:flex">
        <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-6 text-center">
          <span className="w-fit rounded-full bg-white/15 px-5 py-2 text-lg font-bold uppercase tracking-[0.2em]">
            CLINIX
          </span>
          <h1 className="text-3xl font-bold leading-tight md:text-4xl">Plataforma Integral de Gestión Clínica</h1>
          <p className="text-base text-cyan-50">
            Gestiona agenda medica, expedientes clinicos y facturacion en una sola plataforma para operaciones diarias de clinica.
          </p>
          <div className="grid w-full gap-3">
            <div className="flex items-center gap-3 rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-sm text-cyan-50">
              <CalendarCheck2 className="h-4 w-4 shrink-0 text-cyan-100" />
              <span>Control integral de citas, consultas y seguimiento de pacientes</span>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-sm text-cyan-50">
              <FileText className="h-4 w-4 shrink-0 text-cyan-100" />
              <span>Historial clinico unificado con recetas, estudios y evolucion medica</span>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-sm text-cyan-50">
              <Share2 className="h-4 w-4 shrink-0 text-cyan-100" />
              <span>Intercambio de informacion clinica bajo estandar HL7 FHIR</span>
            </div>
          </div>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center bg-white/80 p-4 sm:p-6">
        <Card className="w-full max-w-md border-white/70 bg-white/90 shadow-xl backdrop-blur">
          <CardHeader className="space-y-2 text-center">
            <span className="mx-auto w-fit rounded-full bg-secondary px-4 py-1.5 text-base font-bold uppercase tracking-[0.12em] text-secondary-foreground lg:hidden">
              CLINIX
            </span>
            <CardTitle className="text-2xl sm:text-3xl">Iniciar sesion</CardTitle>
            <CardDescription>Ingresa con tus credenciales clinicas.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="clinicCode">Clinic Code</Label>
                <Input
                  id="clinicCode"
                  type="text"
                  placeholder="CLINICA_DEMO"
                  value={clinicCode}
                  onChange={(event) => onClinicCodeChange(event.target.value)}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="username">Usuario</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="admin"
                  value={username}
                  onChange={(event) => onUsernameChange(event.target.value)}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="password">Contrasena</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => onPasswordChange(event.target.value)}
                  required
                />
              </div>

              <Button type="submit" disabled={isSubmitting} size="lg" className="mt-2 w-full">
                {isSubmitting ? 'Validando...' : 'Entrar'}
              </Button>

              {errorMessage ? (
                <Alert variant="destructive">
                  <AlertTitle>Error de acceso</AlertTitle>
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              ) : null}
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
