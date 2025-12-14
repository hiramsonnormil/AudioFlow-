/**
 * Script de Migração: Sincronizar dados existentes com nova estrutura
 * Execução: node migrate-sync-structure.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from './src/models/User.js';
import { Subscription } from './src/models/Subscription.js';
import { Payment } from './src/models/Payment.js';

dotenv.config();

async function migrateData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado ao MongoDB\n');

    // ===== PASSO 1: Adicionar campo plan aos Payments que não tem =====
    console.log('📝 PASSO 1: Atualizando Payments sem campo plan...');
    const paymentsWithoutPlan = await Payment.find({ plan: { $exists: false } });
    
    for (const payment of paymentsWithoutPlan) {
      const subscription = await Subscription.findById(payment.subscriptionId);
      if (subscription) {
        payment.plan = subscription.plan;
        await payment.save();
        console.log(`  ✓ Payment ${payment._id} atualizado com plan: ${payment.plan}`);
      }
    }
    console.log(`✅ ${paymentsWithoutPlan.length} pagamentos atualizados\n`);

    // ===== PASSO 2: Sincronizar Users com suas Subscriptions ativas =====
    console.log('📝 PASSO 2: Sincronizando Users com Subscriptions ativas...');
    const allUsers = await User.find({});
    let syncedCount = 0;
    
    for (const user of allUsers) {
      const activeSub = await Subscription.findOne({
        userId: user._id,
        status: 'active',
        expiresAt: { $gt: new Date() }
      }).sort({ expiresAt: -1 });
      
      if (activeSub) {
        // Tem assinatura ativa
        await user.updatePlanFromSubscription(activeSub);
        console.log(`  ✓ User ${user.email}: plan=${activeSub.plan}, expires=${activeSub.expiresAt}`);
        syncedCount++;
      } else {
        // Não tem assinatura ativa, garantir que está como free
        if (user.plan !== 'free' || user.subscriptionStatus !== 'none') {
          await user.updatePlanFromSubscription(null);
          console.log(`  ✓ User ${user.email}: resetado para free (sem assinatura ativa)`);
          syncedCount++;
        }
      }
    }
    console.log(`✅ ${syncedCount} usuários sincronizados\n`);

    // ===== PASSO 3: Expirar Subscriptions antigas =====
    console.log('📝 PASSO 3: Expirando Subscriptions vencidas...');
    const expiredCount = await Subscription.expireOldSubscriptions();
    console.log(`✅ ${expiredCount} assinaturas expiradas\n`);

    // ===== PASSO 4: Relatório final =====
    console.log('📊 RELATÓRIO FINAL:');
    
    const totalUsers = await User.countDocuments();
    const freeUsers = await User.countDocuments({ plan: 'free' });
    const premiumUsers = totalUsers - freeUsers;
    
    const activeSubscriptions = await Subscription.countDocuments({ 
      status: 'active',
      expiresAt: { $gt: new Date() }
    });
    
    const pendingSubscriptions = await Subscription.countDocuments({ status: 'pending' });
    
    const paidPayments = await Payment.countDocuments({ status: 'paid' });
    const pendingPayments = await Payment.countDocuments({ 
      status: { $in: ['created', 'pending'] }
    });
    
    console.log(`
┌─────────────────────────────────────────┐
│  USUÁRIOS                               │
├─────────────────────────────────────────┤
│  Total:              ${totalUsers.toString().padStart(15)} │
│  Free:               ${freeUsers.toString().padStart(15)} │
│  Premium:            ${premiumUsers.toString().padStart(15)} │
├─────────────────────────────────────────┤
│  ASSINATURAS                            │
├─────────────────────────────────────────┤
│  Ativas:             ${activeSubscriptions.toString().padStart(15)} │
│  Pendentes:          ${pendingSubscriptions.toString().padStart(15)} │
├─────────────────────────────────────────┤
│  PAGAMENTOS                             │
├─────────────────────────────────────────┤
│  Pagos:              ${paidPayments.toString().padStart(15)} │
│  Pendentes:          ${pendingPayments.toString().padStart(15)} │
└─────────────────────────────────────────┘
    `);

    console.log('\n✨ Migração concluída com sucesso!\n');
    
  } catch (error) {
    console.error('❌ Erro na migração:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

migrateData();
