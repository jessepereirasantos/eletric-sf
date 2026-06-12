import { Router } from 'express';
import { register, login, getMe } from '../controllers/authController';
import { getProjects, getProjectById, saveProject, deleteProject } from '../controllers/projectController';
import { authMiddleware } from '../middleware/authMiddleware';
import pool, { useLocalFallback, getFallbackData } from '../config/database';

const router = Router();

// Rotas de Autenticação (Públicas)
router.post('/auth/register', register);
router.post('/auth/login', login);

// Rota de Diagnóstico
router.get('/test-db', async (_req, res) => {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    env: {
      DB_HOST: process.env.DB_HOST,
      DB_USER: process.env.DB_USER,
      DB_NAME: process.env.DB_NAME,
      DB_PASS_DEFINED: !!process.env.DB_PASS,
      DB_PASS_LENGTH: process.env.DB_PASS ? process.env.DB_PASS.length : 0,
      VERCEL: process.env.VERCEL,
      NODE_ENV: process.env.NODE_ENV,
    },
    useLocalFallback,
  };

  try {
    const conn = await pool.getConnection();
    diagnostics.mysql_connection = "OK";
    diagnostics.mysql_host_connected = process.env.DB_HOST || 'localhost';
    
    // Tenta rodar uma query simples
    const [rows] = await conn.query("SELECT 1 + 1 AS result");
    diagnostics.mysql_query_test = rows;
    
    // Verifica tabelas existentes
    const [tables] = await conn.query("SHOW TABLES");
    diagnostics.mysql_tables = tables;
    
    conn.release();
  } catch (err: any) {
    diagnostics.mysql_connection = "FAILED";
    diagnostics.mysql_error = {
      message: err.message,
      code: err.code,
      errno: err.errno,
      sqlState: err.sqlState,
      stack: err.stack,
    };
  }

  try {
    const fallbackData = await getFallbackData();
    diagnostics.fallback_file = "OK";
    diagnostics.fallback_users_count = fallbackData.users ? fallbackData.users.length : 0;
  } catch (err: any) {
    diagnostics.fallback_file = "FAILED";
    diagnostics.fallback_error = {
      message: err.message,
      stack: err.stack,
    };
  }

  res.json(diagnostics);
});

// Rota de Autenticação (Protegida)
router.get('/auth/me', authMiddleware as any, getMe as any);

// Rotas de Projetos (Todas Protegidas por JWT)
router.get('/projects', authMiddleware as any, getProjects as any);
router.get('/projects/:id', authMiddleware as any, getProjectById as any);
router.post('/projects', authMiddleware as any, saveProject as any);
router.delete('/projects/:id', authMiddleware as any, deleteProject as any);

export default router;
