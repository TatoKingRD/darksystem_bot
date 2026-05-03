module.exports = {
  apps: [
    {
      name: 'darksystem-bot',
      script: 'index.js',
      cwd: __dirname,
      exec_mode: 'fork',
      instances: 1,
      watch: false,
      max_memory_restart: '512M',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      out_file: './logs/darksystem-out.log',
      error_file: './logs/darksystem-error.log',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
