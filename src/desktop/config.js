require('dotenv').config();

const config = {
    port: process.env.SERVER_PORT || 3000,
    host: process.env.SERVER_HOST || 'localhost',
    corsOrigin: process.env.SERVER_CORS_ORIGIN || 'http://localhost:3001',
    sessionTimeout: parseInt(process.env.SESSION_TIMEOUT, 10) || 5 * 60 * 1000, // 5 minutes
};

module.exports = config;
