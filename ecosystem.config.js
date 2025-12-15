/**
 * AudioFlow - PM2 Ecosystem Configuration
 * 
 * Este arquivo configura o PM2 para gerenciar a aplicação Node.js
 * PM2 é um process manager que mantém a aplicação rodando,
 * faz auto-restart em caso de crash e facilita o deploy
 */

module.exports = {
  apps: [
    {
      // Configuração da aplicação principal
      name: 'audioflow',
      script: './server.js',
      
      // Modo de execução
      instances: 2, // Número de instâncias (usar 'max' para usar todos os CPUs)
      exec_mode: 'cluster', // Modo cluster para load balancing
      
      // Variáveis de ambiente
      env: {
        NODE_ENV: 'production',
        PORT: 8080
      },
      
      // Auto-restart configuration
      autorestart: true,
      watch: false, // Não assistir mudanças em produção
      max_memory_restart: '1G', // Reiniciar se exceder 1GB de RAM
      
      // Logs
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Restart delays
      min_uptime: '10s', // Considera "iniciado" após 10 segundos
      max_restarts: 10, // Máximo de restarts em listen_timeout
      listen_timeout: 3000, // Timeout para a aplicação aceitar conexões
      kill_timeout: 5000, // Tempo para matar processo após SIGINT
      
      // Advanced features
      instance_var: 'INSTANCE_ID',
      
      // Cron restart (opcional - reiniciar diariamente às 3AM)
      // cron_restart: '0 3 * * *',
      
      // Exponential backoff restart delay
      exp_backoff_restart_delay: 100,
      
      // Ignore some env variables
      filter_env: ['npm_*', 'SSH_*'],
    },
    
    // Configuração para worker de jobs em background (se necessário)
    {
      name: 'audioflow-worker',
      script: './server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 8081,
        WORKER_MODE: 'true'
      },
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      error_file: './logs/worker-error.log',
      out_file: './logs/worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Desabilitar este worker se não for necessário
      enabled: false
    }
  ],
  
  // Deploy configuration (opcional)
  deploy: {
    production: {
      user: 'root',
      host: 'your-server-ip',
      ref: 'origin/main',
      repo: 'https://github.com/hiramsonnormil/AudioFlow-.git',
      path: '/var/www/audioflow',
      'post-deploy': 'npm install --production && pm2 reload ecosystem.config.js --env production',
      'pre-deploy-local': 'echo "Iniciando deploy..."'
    }
  }
};
