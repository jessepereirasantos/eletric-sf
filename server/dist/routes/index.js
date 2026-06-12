"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const projectController_1 = require("../controllers/projectController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// Rotas de Autenticação (Públicas)
router.post('/auth/register', authController_1.register);
router.post('/auth/login', authController_1.login);
// Rota de Autenticação (Protegida)
router.get('/auth/me', authMiddleware_1.authMiddleware, authController_1.getMe);
// Rotas de Projetos (Todas Protegidas por JWT)
router.get('/projects', authMiddleware_1.authMiddleware, projectController_1.getProjects);
router.get('/projects/:id', authMiddleware_1.authMiddleware, projectController_1.getProjectById);
router.post('/projects', authMiddleware_1.authMiddleware, projectController_1.saveProject);
router.delete('/projects/:id', authMiddleware_1.authMiddleware, projectController_1.deleteProject);
exports.default = router;
