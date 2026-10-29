/**
 * Rotas de teste para integração com R2
 * 
 * Endpoints para testar upload e listagem de arquivos no Cloudflare R2
 */

import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import * as r2 from '../../storage/r2.js';

const router = express.Router();

/**
 * POST /api/r2-test/upload-test
 * 
 * Endpoint de teste para simular upload de arquivo processado para R2
 * Simula o fluxo de upload de um áudio processado
 */
router.post('/upload-test', async (req, res) => {
  try {
    // Simula um usuário fake ou pega do token de autenticação
    const userId = req.user?.id || req.body.userId || 'test-user-123';
    const jobId = req.body.jobId || `job-${Date.now()}`;
    const preset = req.body.preset || 'test-preset';
    
    // Para teste, vamos criar um arquivo temporário fake
    // Em produção, este seria o arquivo gerado pelo ffmpeg
    const testContent = Buffer.from(`Teste de áudio - Job: ${jobId} - Timestamp: ${new Date().toISOString()}`);
    const localPath = path.join('/tmp', `test-${jobId}.mp3`);
    
    // Cria arquivo temporário de teste
    await fs.writeFile(localPath, testContent);
    // Define a chave no formato padrão: audio/<userId>/<jobId>.mp3
    const key = `${r2.STORAGE_PREFIX}/${userId}/${jobId}.mp3`;
    
    // Faz upload para o R2
    const uploadResult = await r2.uploadFile(localPath, key, {
      userId,
      jobId,
      preset,
    });
    
    // Deleta o arquivo local após upload bem-sucedido
    await r2.deleteLocalFile(localPath);
    
    res.json({
      success: true,
      message: 'Upload de teste concluído com sucesso',
      data: {
        key: uploadResult.key,
        publicUrl: uploadResult.publicUrl,
        userId,
        jobId,
        preset,
        expiresIn: '24 horas',
      }
    });
    
  } catch (error) {
    console.error('[R2 Test] Erro no upload de teste:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/r2-test/recent
 * 
 * Simula a página de "processamentos recentes"
 * Lista apenas arquivos que ainda não expiraram
 */
router.get('/recent', async (req, res) => {
  try {
    // Pega userId do token ou query param para teste
    const userId = req.user?.id || req.query.userId || 'test-user-123';
    
    // Busca objetos válidos (não expirados) do usuário no R2
    const objects = await r2.listUserObjects(userId);
    
    // Formata resposta para o frontend
    const processamentos = objects.map(obj => ({
      jobId: obj.jobId,
      fileName: obj.fileName,
      createdAt: obj.createdAt,
      expiresInMinutes: Math.ceil(obj.expiresIn / 1000 / 60), // Converte ms para minutos
      size: obj.size,
      downloadUrl: obj.publicUrl,
    }));
    
    res.json({
      success: true,
      userId,
      totalProcessamentos: processamentos.length,
      processamentos,
      message: processamentos.length === 0 
        ? 'Nenhum processamento recente encontrado' 
        : `${processamentos.length} processamento(s) disponível(is) para download`,
    });
    
  } catch (error) {
    console.error('[R2 Test] Erro ao listar processamentos:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/r2-test/cleanup
 * 
 * Endpoint para testar limpeza manual de objetos expirados
 */
router.post('/cleanup', async (req, res) => {
  try {
    const userId = req.user?.id || req.body.userId || 'test-user-123';
    
    const result = await r2.cleanupExpiredObjects(userId);
    
    res.json({
      success: true,
      message: 'Limpeza concluída',
      userId,
      deleted: result.deleted,
      errors: result.errors,
    });
    
  } catch (error) {
    console.error('[R2 Test] Erro na limpeza:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * DELETE /api/r2-test/delete/:key
 * 
 * Endpoint para testar deleção manual de um objeto específico
 */
router.delete('/delete/:key(*)', async (req, res) => {
  try {
    const key = req.params.key;
    
    if (!key) {
      return res.status(400).json({
        success: false,
        error: 'Key do objeto é obrigatória',
      });
    }
    
    await r2.deleteObject(key);
    
    res.json({
      success: true,
      message: 'Objeto deletado com sucesso',
      key,
    });
    
  } catch (error) {
    console.error('[R2 Test] Erro ao deletar objeto:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
