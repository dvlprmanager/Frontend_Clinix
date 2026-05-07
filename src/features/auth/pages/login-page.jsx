import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { LoginScreen } from '@/components/auth/login-screen'
import { logger } from '@/utils/logger'
import { useAuth } from '@/features/auth/use-auth'

export function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [clinicCode, setClinicCode] = useState('CLN001')
  const [username, setUsername] = useState('cmendez')
  const [password, setPassword] = useState('Diego2018+')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleLogin = async (event) => {
    event.preventDefault()
    setErrorMessage('')
    setIsSubmitting(true)
    try {
      await login({ clinicCode, username, password })
      navigate('/dashboard', { replace: true })
    } catch (error) {
      logger.warn('login_failed', { username, clinicCode, message: error.message })
      setErrorMessage(error.message || 'Error al iniciar sesion')
      toast.error(error.message || 'Error al iniciar sesion')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <LoginScreen
      clinicCode={clinicCode}
      username={username}
      password={password}
      errorMessage={errorMessage}
      isSubmitting={isSubmitting}
      onClinicCodeChange={setClinicCode}
      onUsernameChange={setUsername}
      onPasswordChange={setPassword}
      onSubmit={handleLogin}
    />
  )
}
