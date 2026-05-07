import { AppProviders } from '@/app/providers'
import { AppRouter } from '@/app/router'
import { logger } from '@/utils/logger'

if (!window.__ERP_HEALTH_APP_OPENED__) {
  logger.info('app_opened')
  window.__ERP_HEALTH_APP_OPENED__ = true
}

export default function App() {
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  )
}
