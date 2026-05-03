const LEVELS = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function createDarkSystemLogger(options = {}) {
  const configuredLevel = String(options.level || process.env.LOG_LEVEL || 'info').toLowerCase();
  const activeLevel = LEVELS[configuredLevel] ? configuredLevel : 'info';

  function write(level, message, meta) {
    if (LEVELS[level] < LEVELS[activeLevel]) return;
    const entry = {
      time: new Date().toISOString(),
      level,
      message,
    };
    if (meta && Object.keys(meta).length > 0) entry.meta = sanitizeMeta(meta);
    const line = JSON.stringify(entry);
    if (level === 'error') console.error(line);
    else if (level === 'warn') console.warn(line);
    else console.log(line);
  }

  return {
    debug: (message, meta) => write('debug', message, meta),
    info: (message, meta) => write('info', message, meta),
    warn: (message, meta) => write('warn', message, meta),
    error: (message, meta) => write('error', message, meta),
    child(extraMeta = {}) {
      return {
        debug: (message, meta) => write('debug', message, { ...extraMeta, ...meta }),
        info: (message, meta) => write('info', message, { ...extraMeta, ...meta }),
        warn: (message, meta) => write('warn', message, { ...extraMeta, ...meta }),
        error: (message, meta) => write('error', message, { ...extraMeta, ...meta }),
      };
    },
  };
}

function sanitizeMeta(meta) {
  const output = {};
  for (const [key, value] of Object.entries(meta)) {
    if (/token|secret|password|api_key|apikey/i.test(key)) {
      output[key] = '[redacted]';
    } else if (value instanceof Error) {
      output[key] = {
        name: value.name,
        message: value.message,
        stack: value.stack,
      };
    } else {
      output[key] = value;
    }
  }
  return output;
}

module.exports = { createDarkSystemLogger };
