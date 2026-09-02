module.exports = {
  apps: [
    {
      name: 'customcliq',
      script: './server/index.js',
      instances: 1,                 // Running 1 instance is ideal for a standard VPS. Can set to 'max' for clustering.
      autorestart: true,            // Automatically restart if the app crashes
      watch: false,                 // Do not watch files for changes in production to save CPU cycles
      max_memory_restart: '1G',     // Restart if memory usage exceeds 1GB
      env: {
        NODE_ENV: 'development',
        PORT: 5000,
        MONGODB_URI: 'mongodb://127.0.0.1:27017/customcliq',
        JWT_SECRET: 'your_jwt_secret_here',
        JWT_REFRESH_SECRET: 'your_jwt_refresh_secret_here',
        CLIENT_URL: 'http://localhost:5000',
        DEFAULT_QR_DOMAIN: 'http://localhost:5000',
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,                 // Production port (or 80 / 443 with reverse proxy)
        MONGODB_URI: 'mongodb://127.0.0.1:27017/customcliq',
        JWT_SECRET: 'replace_with_strong_production_jwt_secret',
        JWT_REFRESH_SECRET: 'replace_with_strong_production_refresh_secret',
        CLIENT_URL: 'https://qr.customcliq.com',
        DEFAULT_QR_DOMAIN: 'https://qr.customcliq.com',
      }
    }
  ]
};
