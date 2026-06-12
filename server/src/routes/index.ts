import { Router } from 'express';
import { register, login, getMe } from '../controllers/authController';
import { getProjects, getProjectById, saveProject, deleteProject } from '../controllers/projectController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Rotas de Autenticação (Públicas)
router.post('/auth/register', register);
router.post('/auth/login', login);

// Rota de Autenticação (Protegida)
router.get('/auth/me', authMiddleware as any, getMe as any);

// Rotas de Projetos (Todas Protegidas por JWT)
router.get('/projects', authMiddleware as any, getProjects as any);
router.get('/projects/:id', authMiddleware as any, getProjectById as any);
router.post('/projects', authMiddleware as any, saveProject as any);
router.delete('/projects/:id', authMiddleware as any, deleteProject as any);

export default router;
