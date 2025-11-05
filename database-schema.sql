-- ============================================
-- AudioFlow Database Schema
-- Para DigitalOcean PostgreSQL
-- ============================================

-- Tabela de Usuários
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Jobs
CREATE TABLE IF NOT EXISTS jobs (
  id VARCHAR(20) PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'PENDING',
  progress INTEGER DEFAULT 0,
  preset VARCHAR(50),
  title VARCHAR(255),
  filename VARCHAR(255),
  file_url VARCHAR(500),
  thumbnail VARCHAR(500),
  video_id VARCHAR(50),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '48 hours'),
  CONSTRAINT check_status CHECK (status IN ('PENDING', 'DOWNLOADING', 'EXTRACTING', 'PROCESSING', 'DONE', 'ERROR'))
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_expires_at ON jobs(expires_at);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Função para deletar jobs expirados
CREATE OR REPLACE FUNCTION delete_expired_jobs()
RETURNS void AS $$
BEGIN
  DELETE FROM jobs WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Trigger automático (executar a cada hora via cron job ou aplicação)
-- Alternatively, você pode usar o pg_cron extension:
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('delete_expired_jobs', '0 * * * *', 'SELECT delete_expired_jobs()');

-- Inserir usuário de teste (REMOVER EM PRODUÇÃO)
-- INSERT INTO users (email, password_hash) VALUES ('test@example.com', 'test123') ON CONFLICT DO NOTHING;
