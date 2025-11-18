/**
 * Service: Database Connection
 * Gerencia conexão com MongoDB Atlas via Mongoose
 */

import mongoose from "mongoose";

export class DatabaseService {
  constructor() {
    this.isConnected = false;
  }

  /**
   * Conecta ao MongoDB Atlas
   */
  async connect() {
    try {
      const mongoUri = process.env.MONGODB_URI;

      if (!mongoUri) {
        throw new Error("MONGODB_URI não configurada no .env");
      }

      // Limpar URI de caracteres especiais em debug
      const displayUri = mongoUri
        .replace(/:[^:@]*@/, ":***@")
        .substring(0, 80);

      console.log(`🔗 Conectando ao MongoDB Atlas...`);
      console.log(`   ${displayUri}...`);

      await mongoose.connect(mongoUri, {
        retryWrites: true,
        w: "majority",
      });

      this.isConnected = true;
      console.log(`✅ Conectado ao MongoDB Atlas com sucesso!`);

      return true;
    } catch (error) {
      console.error("❌ Erro ao conectar ao MongoDB:", error.message);
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Desconecta do MongoDB
   */
  async disconnect() {
    try {
      await mongoose.disconnect();
      this.isConnected = false;
      console.log("✅ Desconectado do MongoDB");
    } catch (error) {
      console.error("❌ Erro ao desconectar do MongoDB:", error.message);
    }
  }

  /**
   * Verifica status da conexão
   */
  getStatus() {
    return {
      connected: this.isConnected,
      state: mongoose.connection.readyState, // 0: disconnected, 1: connected, 2: connecting, 3: disconnecting
    };
  }

  /**
   * Inicializa dados padrão (seeding)
   */
  async seed() {
    try {
      const { User } = await import("../models/schemas/User.js");
      const { Preset } = await import("../models/schemas/Preset.js");

      // Verificar se já existe usuário demo
      const demoUserExists = await User.findOne({ email: "demo@audioflow.local" });
      if (!demoUserExists) {
        await User.create({
          email: "demo@audioflow.local",
          username: "Demo User",
          password: "demo123", // Em produção, fazer hash!
          plan: "free",
          createdAt: new Date(),
        });
        console.log("✅ Usuário demo criado");
      }

      // Verificar se presets já existem
      const presetCount = await Preset.countDocuments();
      if (presetCount === 0) {
        const presets = [
          { presetId: "SLOWED", name: "Slowed", enabled: true },
          { presetId: "SPEED_125", name: "Speed Up", enabled: true },
          { presetId: "ULTRA_SLOWED", name: "Ultra Slowed", enabled: true },
          { presetId: "MUFFLED_SLOWED", name: "Muffled Slowed", enabled: true },
          { presetId: "MUFFLED_SPEED", name: "Muffled Speed", enabled: true },
          { presetId: "DAYCORE", name: "Daycore", enabled: true },
          { presetId: "NIGHTCORE", name: "Nightcore", enabled: true },
          { presetId: "8D", name: "8D", enabled: true },
        ];

        await Preset.insertMany(presets);
        console.log("✅ Presets padrão criados");
      }

      return true;
    } catch (error) {
      console.error("❌ Erro ao fazer seed:", error.message);
    }
  }
}

// Singleton instance
export const databaseService = new DatabaseService();
