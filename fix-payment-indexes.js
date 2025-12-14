import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

/**
 * Script para limpar índices órfãos da collection payments
 * Execute: node fix-payment-indexes.js
 */

async function fixPaymentIndexes() {
  try {
    console.log("🔧 Conectando ao MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Conectado!");

    const db = mongoose.connection.db;
    const collection = db.collection("payments");

    console.log("\n📋 Índices atuais:");
    const indexes = await collection.indexes();
    indexes.forEach((index) => {
      console.log(`  - ${index.name}:`, JSON.stringify(index.key));
    });

    // Índices órfãos para remover (não estão no schema atual)
    const orphanIndexes = [
      "reference_1",
      "gatewayChargeId_1",
      "status_1_createdAt_-1",
    ];

    console.log("\n🗑️  Removendo índices órfãos...");
    for (const indexName of orphanIndexes) {
      try {
        await collection.dropIndex(indexName);
        console.log(`  ✅ Índice '${indexName}' removido com sucesso!`);
      } catch (error) {
        if (error.code === 27 || error.codeName === "IndexNotFound") {
          console.log(`  ⚠️  Índice '${indexName}' não encontrado (já foi removido)`);
        } else {
          console.error(`  ❌ Erro ao remover '${indexName}':`, error.message);
        }
      }
    }

    // Verificar índices após limpeza
    console.log("\n📋 Índices após limpeza:");
    const newIndexes = await collection.indexes();
    newIndexes.forEach((index) => {
      console.log(`  - ${index.name}:`, JSON.stringify(index.key));
    });

    console.log("\n✅ Índices corrigidos com sucesso!");
    console.log("\n💡 Agora você pode reiniciar o servidor sem erros.");

  } catch (error) {
    console.error("\n❌ Erro ao corrigir índices:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\n👋 Desconectado do MongoDB");
    process.exit(0);
  }
}

// Executar
fixPaymentIndexes();
