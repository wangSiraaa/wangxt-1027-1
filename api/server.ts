/**
 * local server entry file, for local development
 */
import app from './app.js';
import { initDatabase } from './db/database.js';

/**
 * start server with port
 */
const PORT = process.env.API_PORT || process.env.PORT || 3001;

(async () => {
  await initDatabase();
  console.log('[DB] SQLite initialized (sql.js)');
  const server = app.listen(PORT, () => {
    console.log(`Server ready on port ${PORT}`);
    console.log(`  Health:  http://localhost:${PORT}/api/health`);
    console.log(`  APIs:    http://localhost:${PORT}/api/{auth|master|contract|biz}`);
  });

  /**
   * close server
   */
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT signal received');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
})();

export default app;