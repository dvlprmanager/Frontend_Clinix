import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/features/auth/use-auth'

const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/

export function ChangePasswordPage() {
  const navigate = useNavigate()
  const { changePassword, temporaryPassword } = useAuth()
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
    mode: 'onBlur',
  })

  useEffect(() => {
    if (temporaryPassword) {
      setValue('currentPassword', temporaryPassword)
    }
  }, [setValue, temporaryPassword])

  const onSubmit = async (values) => {
    setErrorMessage('')
    setIsChangingPassword(true)
    try {
      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      })
      reset({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
      navigate('/dashboard', { replace: true })
    } catch (error) {
      const message = error.message || 'No se pudo actualizar la contraseña'
      setErrorMessage(message)
      toast.error(message)
    } finally {
      setIsChangingPassword(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-white/80 p-4 sm:p-6">
      <Card className="w-full max-w-lg border-white/70 bg-white/90 shadow-xl backdrop-blur">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-2xl sm:text-3xl">Cambio obligatorio de contraseña</CardTitle>
          <CardDescription>Por seguridad, en tu primer ingreso debes definir una contraseña nueva.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-2">
              <Label htmlFor="currentPassword">Contraseña temporal</Label>
              <Input
                id="currentPassword"
                type="password"
                {...register('currentPassword', {
                  required: 'La contraseña temporal es requerida',
                })}
              />
              {errors.currentPassword ? <p className="text-xs text-destructive">{errors.currentPassword.message}</p> : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="newPassword">Nueva contraseña</Label>
              <Input
                id="newPassword"
                type="password"
                {...register('newPassword', {
                  required: 'La nueva contraseña es requerida',
                  pattern: {
                    value: STRONG_PASSWORD_REGEX,
                    message: 'Mínimo 8 caracteres, 1 mayúscula, 1 minúscula, 1 número y 1 símbolo',
                  },
                })}
              />
              <p className="text-xs text-muted-foreground">Mínimo 8, mayúscula, minúscula, número y símbolo.</p>
              {errors.newPassword ? <p className="text-xs text-destructive">{errors.newPassword.message}</p> : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
              <Input
                id="confirmPassword"
                type="password"
                {...register('confirmPassword', {
                  required: 'Confirma tu nueva contraseña',
                  validate: (value) =>
                    value === watch('newPassword') || 'La confirmación no coincide con la nueva contraseña',
                })}
              />
              {errors.confirmPassword ? <p className="text-xs text-destructive">{errors.confirmPassword.message}</p> : null}
            </div>
            {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
            <Button type="submit" disabled={isChangingPassword} size="lg" className="mt-2 w-full">
              {isChangingPassword ? 'Actualizando...' : 'Guardar nueva contraseña'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
