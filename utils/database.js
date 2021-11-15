import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({
  user: 'limjiahao',
  host: 'localhost',
  database: 'bird_watching',
  port: 5432,
});

export default pool;
