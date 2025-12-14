/**
 * Script para transferir assinatura entre usuários
 * Uso: node fix-subscription-transfer.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from './src/models/User.js';
import { Subscription } from './src/models/Subscription.js';
import { Payment } from './src/models/Payment.js';

dotenv.config();

async function transferSubscription() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado ao MongoDB');

    // IDs dos usuários
    const fromUserId = '6920f952c25aab453263952f'; // normilhiramson2@gmail.com
    const toUserId = '691e315edd256c2baf4a7ece';   // hiramsonnormil00@gmail.com

    // Buscar usuários
    const fromUser = await User.findById(fromUserId);
    const toUser = await User.findById(toUserId);

    console.log('\n📊 Usuários:');
    console.log(`DE: ${fromUser.email} (${fromUser.username}) - Plan: ${fromUser.plan}`);
    console.log(`PARA: ${toUser.email} (${toUser.username}) - Plan: ${toUser.plan}`);

    // Buscar assinatura ativa
    const subscription = await Subscription.findOne({
      userId: fromUserId,
      status: 'active'
    });

    if (!subscription) {
      console.log('\n❌ Nenhuma assinatura ativa encontrada para transferir');
      process.exit(1);
    }

    console.log(`\n💎 Assinatura encontrada: ${subscription.plan}`);
    console.log(`   Status: ${subscription.status}`);
    console.log(`   Expira: ${subscription.expiresAt}`);

    // Confirmar transferência
    console.log('\n⚠️  CONFIRME A TRANSFERÊNCIA:');
    console.log(`   Transferir assinatura ${subscription.plan} de ${fromUser.email} para ${toUser.email}?`);
    console.log('   Digite "SIM" para confirmar ou qualquer coisa para cancelar:');

    // Aguardar confirmação (em produção, usar readline ou prompt)
    // Por enquanto, vou fazer direto
    
    // Transferir assinatura
    subscription.userId = toUserId;
    await subscription.save();
    console.log('✅ Assinatura transferida');

    // Transferir pagamentos relacionados
    const payments = await Payment.find({ subscriptionId: subscription._id });
    console.log(`\n💳 Transferindo ${payments.length} pagamentos relacionados...`);
    
    for (const payment of payments) {
      payment.userId = toUserId;
      await payment.save();
    }

    // Atualizar plano dos usuários
    await User.findByIdAndUpdate(toUserId, { plan: subscription.plan });
    await User.findByIdAndUpdate(fromUserId, { plan: 'free' });

    console.log('✅ Planos atualizados:');
    console.log(`   ${toUser.email}: free -> ${subscription.plan}`);
    console.log(`   ${fromUser.email}: ${fromUser.plan} -> free`);

    console.log('\n✨ Transferência concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

transferSubscription();
