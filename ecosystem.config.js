module.exports = {
  apps: [
    {
      name: 'rbhs-clubs',
      script: 'server.js',
      instances: 'max',
      exec_mode: 'cluster',
      watch: false,
      env: {
        UV_THREADPOOL_SIZE: '32'
      }
    }
  ]
};

