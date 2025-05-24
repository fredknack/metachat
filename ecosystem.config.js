module.exports = {
    apps: [{
      name: "whatsapp-bot",
      script: "index.js",
      instances: 1,
      exec_mode: "fork",  // Stay in fork mode (no clustering for in-memory sessions)
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      error_file: "./logs/err.log",
      out_file: "./logs/out.log",
      merge_logs: true,
      time: true,
      env: {
        NODE_ENV: "production",
        PORT: "3001"
      },
      env_production: {
        NODE_ENV: "production",
        PORT: "3001"
      },
      env_development: {
        NODE_ENV: "development",
        PORT: "3001"
      }
    }]
  };
  