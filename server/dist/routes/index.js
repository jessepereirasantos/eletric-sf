"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const projectController_1 = require("../controllers/projectController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const database_1 = __importStar(require("../config/database"));
const router = (0, express_1.Router)();
// Rotas de Autenticação (Públicas)
router.post('/auth/register', authController_1.register);
router.post('/auth/login', authController_1.login);
// Rota de Diagnóstico
router.get('/test-db', async (_req, res) => {
    const diagnostics = {
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
        useLocalFallback: database_1.useLocalFallback,
    };
    try {
        const conn = await database_1.default.getConnection();
        diagnostics.mysql_connection = "OK";
        diagnostics.mysql_host_connected = process.env.DB_HOST || 'localhost';
        // Tenta rodar uma query simples
        const [rows] = await conn.query("SELECT 1 + 1 AS result");
        diagnostics.mysql_query_test = rows;
        // Verifica tabelas existentes
        const [tables] = await conn.query("SHOW TABLES");
        diagnostics.mysql_tables = tables;
        conn.release();
    }
    catch (err) {
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
        const fallbackData = await (0, database_1.getFallbackData)();
        diagnostics.fallback_file = "OK";
        diagnostics.fallback_users_count = fallbackData.users ? fallbackData.users.length : 0;
    }
    catch (err) {
        diagnostics.fallback_file = "FAILED";
        diagnostics.fallback_error = {
            message: err.message,
            stack: err.stack,
        };
    }
    res.json(diagnostics);
});
// Rota de Autenticação (Protegida)
router.get('/auth/me', authMiddleware_1.authMiddleware, authController_1.getMe);
// Rotas de Projetos (Todas Protegidas por JWT)
router.get('/projects', authMiddleware_1.authMiddleware, projectController_1.getProjects);
router.get('/projects/:id', authMiddleware_1.authMiddleware, projectController_1.getProjectById);
router.post('/projects', authMiddleware_1.authMiddleware, projectController_1.saveProject);
router.delete('/projects/:id', authMiddleware_1.authMiddleware, projectController_1.deleteProject);
exports.default = router;
