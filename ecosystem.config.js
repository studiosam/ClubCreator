module.exports = {
  apps: [
    {
      name: "clubs",
      script: "server.js",
      exec_mode: "fork",
      instances: 1,
      watch: false,
      autorestart: true,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        UV_THREADPOOL_SIZE: "16"
      },
      listen_timeout: 8000,
      kill_timeout: 8000
    }
  ]
};
