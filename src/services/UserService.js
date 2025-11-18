/**
 * Service: User Management
 * Gerencia usuários, autenticação e planos
 */

import { User } from "../models/schemas/User.js";

export class UserService {
  /**
   * Cria novo usuário
   */
  async createUser(email, username, password) {
    try {
      // Validações básicas
      if (!email || !username || !password) {
        throw new Error("Email, username e password são obrigatórios");
      }

      // Verificar se usuário já existe
      const existing = await User.findOne({ email });
      if (existing) {
        throw new Error("Email já cadastrado");
      }

      // TODO: Hash do password (usar bcrypt em produção)
      const user = await User.create({
        email,
        username,
        password, // Em produção: hash(password)
        plan: "free",
      });

      console.log(`✅ Usuário criado: ${email}`);
      return user;
    } catch (error) {
      console.error("Erro ao criar usuário:", error.message);
      throw error;
    }
  }

  /**
   * Obtém usuário por email
   */
  async getUserByEmail(email) {
    try {
      const user = await User.findOne({ email });
      return user;
    } catch (error) {
      console.error("Erro ao buscar usuário:", error.message);
      return null;
    }
  }

  /**
   * Obtém usuário por ID
   */
  async getUserById(id) {
    try {
      const user = await User.findById(id);
      return user;
    } catch (error) {
      console.error("Erro ao buscar usuário:", error.message);
      return null;
    }
  }

  /**
   * Autentica usuário (básico - melhorar em produção)
   */
  async authenticate(email, password) {
    try {
      const user = await User.findOne({ email, isActive: true });
      if (!user) {
        throw new Error("Usuário não encontrado");
      }

      // TODO: Comparar hash do password (usar bcrypt em produção)
      if (user.password !== password) {
        throw new Error("Senha incorreta");
      }

      return user;
    } catch (error) {
      console.error("Erro na autenticação:", error.message);
      throw error;
    }
  }

  /**
   * Atualiza plano do usuário
   */
  async updatePlan(userId, plan) {
    try {
      const validPlans = ["free", "pro", "premium"];
      if (!validPlans.includes(plan)) {
        throw new Error(`Plano inválido: ${plan}`);
      }

      const user = await User.findByIdAndUpdate(
        userId,
        {
          plan,
          subscriptionStart: new Date(),
        },
        { new: true }
      );

      console.log(`✅ Plano atualizado: ${userId} -> ${plan}`);
      return user;
    } catch (error) {
      console.error("Erro ao atualizar plano:", error.message);
      throw error;
    }
  }

  /**
   * Incrementa contador de jobs processados
   */
  async incrementJobsProcessed(userId) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { $inc: { jobsProcessed: 1 } },
        { new: true }
      );
      return user;
    } catch (error) {
      console.error("Erro ao incrementar jobs:", error.message);
      return null;
    }
  }

  /**
   * Atualiza espaço armazenado
   */
  async updateStorageUsed(userId, bytes) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { $inc: { storageUsed: bytes } },
        { new: true }
      );
      return user;
    } catch (error) {
      console.error("Erro ao atualizar storage:", error.message);
      return null;
    }
  }

  /**
   * Lista todos os usuários (admin)
   */
  async getAllUsers(limit = 100) {
    try {
      const users = await User.find().limit(limit).sort({ createdAt: -1 });
      return users;
    } catch (error) {
      console.error("Erro ao listar usuários:", error.message);
      return [];
    }
  }

  /**
   * Desativa usuário
   */
  async deactivateUser(userId) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { isActive: false },
        { new: true }
      );
      console.log(`✅ Usuário desativado: ${userId}`);
      return user;
    } catch (error) {
      console.error("Erro ao desativar usuário:", error.message);
      throw error;
    }
  }
}

// Singleton instance
export const userService = new UserService();
