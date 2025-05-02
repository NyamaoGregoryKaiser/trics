module.exports = {
  apps: [{
    name: "git-contributions",
    script: "./gencode.js",
    watch: false,
    autorestart: true,
    max_restarts: 10,
    restart_delay: 4000,
    env: {
      NODE_ENV: "production"
    },
    log_date_format: "YYYY-MM-DD HH:mm:ss",
    error_file: "./logs/error.log",
    out_file: "./logs/out.log",
    merge_logs: true
  }]
}; 