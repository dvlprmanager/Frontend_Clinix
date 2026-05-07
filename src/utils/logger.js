const LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
}

const configuredLevel = (import.meta.env.VITE_LOG_LEVEL || 'info').toLowerCase()
const activeLevel = LEVELS[configuredLevel] ?? LEVELS.info

function shouldLog(level) {
  return LEVELS[level] <= activeLevel
}

function write(level, message, meta) {
  if (!shouldLog(level)) return

  const payload = {
    ts: new Date().toISOString(),
    level,
    message,
  }

  if (meta && Object.keys(meta).length > 0) {
    payload.meta = meta
  }

  const line = JSON.stringify(payload)

  if (level === 'error') {
    console.error(line)
    return
  }

  if (level === 'warn') {
    console.warn(line)
    return
  }

  console.log(line)
}

export const logger = {
  error: (message, meta = {}) => write('error', message, meta),
  warn: (message, meta = {}) => write('warn', message, meta),
  info: (message, meta = {}) => write('info', message, meta),
  debug: (message, meta = {}) => write('debug', message, meta),
}

