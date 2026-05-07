import { Toaster } from 'sonner'

export function AppToaster() {
  return (
    <Toaster
      richColors
      closeButton
      expand
      visibleToasts={5}
      position="top-right"
      toastOptions={{
        duration: 3000,
      }}
    />
  )
}
