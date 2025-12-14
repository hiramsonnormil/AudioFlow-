import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { User } from './src/models/User.js';
import dotenv from 'dotenv';

dotenv.config();
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/audioflow';

async function resetPassword() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Conectado ao MongoDB');

    const userId = '693604a01ebeb7ec90bc483a';
    const newPassword = 'MinhaNovaSenh@123'; // Altere aqui
    
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    const result = await User.updateOne(
      { _id: userId },
      { $set: { password: hashedPassword } }
    );

    if (result.modifiedCount > 0) {
      console.log(`✓ Senha atualizada com sucesso para o usuário: ${userId}`);
      console.log(`  Nova senha: ${newPassword}`);
    } else {
      console.log('✗ Usuário não encontrado ou senha já é a mesma');
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('Erro:', error);
    process.exit(1);
  }
}

resetPassword();
