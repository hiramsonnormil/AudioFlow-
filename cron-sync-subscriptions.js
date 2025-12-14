/**
 * Cron Job: Sincronização automática e limpeza
 * Executar a cada hora
 * 
 * Adicionar ao crontab:
 * 0 * * * * cd /path/to/project && node cron-sync-subscriptions.js >> logs/cron-sync.log 2>&1
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from './src/models/User.js';
import { Subscription } from './src/models/Subscription.js';

dotenv.config();

async function syncJob() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(`[${new Date().toISOString()}] 🔄 Iniciando job de sincronização...`);

    // 1. Expirar assinaturas vencidas
    const expiredCount = await Subscription.expireOldSubscriptions();
    console.log(`[${new Date().toISOString()}] ✅ ${expiredCount} assinaturas expiradas`);

    // 2. Sincronizar users com assinaturas expiradas
    const syncedCount = await User.syncExpiredSubscriptions();
    console.log(`[${new Date().toISOString()}] ✅ ${syncedCount} usuários sincronizados`);

    console.log(`[${new Date().toISOString()}] ✨ Job concluído com sucesso\n`);
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Erro no job:`, error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

syncJob();
