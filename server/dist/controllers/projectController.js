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
exports.deleteProject = exports.saveProject = exports.getProjectById = exports.getProjects = void 0;
const database_1 = __importStar(require("../config/database"));
// Listar todos os projetos do usuário logado
const getProjects = async (req, res) => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Não autorizado.' });
        return;
    }
    // MODO FALLBACK LOCAL (Leitura em Arquivo)
    if (database_1.useLocalFallback) {
        try {
            const data = await (0, database_1.getFallbackData)();
            const userProjects = data.projects
                .filter((p) => p.user_id === req.user.id)
                .map((p) => ({
                id: p.id,
                name: p.name,
                created_at: p.created_at,
                updated_at: p.updated_at
            }));
            res.json({
                success: true,
                projects: userProjects
            });
            return;
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
            return;
        }
    }
    // MODO PRODUÇÃO (MySQL Real)
    try {
        const connection = await database_1.default.getConnection();
        const [rows] = await connection.query('SELECT id, name, created_at, updated_at FROM projects WHERE user_id = ? ORDER BY updated_at DESC', [req.user.id]);
        connection.release();
        res.json({
            success: true,
            projects: rows
        });
    }
    catch (error) {
        console.error('[getProjects] Erro:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getProjects = getProjects;
// Obter detalhes de um projeto específico
const getProjectById = async (req, res) => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Não autorizado.' });
        return;
    }
    const { id } = req.params;
    const numericId = Number(id);
    // MODO FALLBACK LOCAL (Leitura em Arquivo)
    if (database_1.useLocalFallback) {
        try {
            const data = await (0, database_1.getFallbackData)();
            const project = data.projects.find((p) => p.id === numericId && p.user_id === req.user.id);
            if (!project) {
                res.status(404).json({ success: false, message: 'Projeto local não encontrado ou acesso negado.' });
                return;
            }
            res.json({
                success: true,
                project
            });
            return;
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
            return;
        }
    }
    // MODO PRODUÇÃO (MySQL Real)
    try {
        const connection = await database_1.default.getConnection();
        const [rows] = await connection.query('SELECT * FROM projects WHERE id = ? AND user_id = ?', [id, req.user.id]);
        connection.release();
        if (rows.length === 0) {
            res.status(404).json({ success: false, message: 'Projeto não encontrado ou acesso negado.' });
            return;
        }
        res.json({
            success: true,
            project: rows[0]
        });
    }
    catch (error) {
        console.error('[getProjectById] Erro:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getProjectById = getProjectById;
// Salvar projeto (Criar ou Atualizar)
const saveProject = async (req, res) => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Não autorizado.' });
        return;
    }
    const { id, name, data } = req.body;
    if (!name || !data) {
        res.status(400).json({ success: false, message: 'Nome e dados do projeto são obrigatórios.' });
        return;
    }
    const dataString = typeof data === 'object' ? JSON.stringify(data) : data;
    // MODO FALLBACK LOCAL (Gravação em Arquivo)
    if (database_1.useLocalFallback) {
        try {
            const fallbackData = await (0, database_1.getFallbackData)();
            const now = new Date().toISOString();
            if (id) {
                const numericId = Number(id);
                const projectIndex = fallbackData.projects.findIndex((p) => p.id === numericId && p.user_id === req.user.id);
                if (projectIndex === -1) {
                    res.status(404).json({ success: false, message: 'Projeto local não encontrado para atualização.' });
                    return;
                }
                fallbackData.projects[projectIndex].name = name;
                fallbackData.projects[projectIndex].data = dataString;
                fallbackData.projects[projectIndex].updated_at = now;
                await (0, database_1.saveFallbackData)(fallbackData);
                res.json({
                    success: true,
                    message: 'Projeto local atualizado com sucesso!',
                    project: { id: numericId, name, updated_at: now }
                });
            }
            else {
                const newProjectId = Date.now();
                const newProject = {
                    id: newProjectId,
                    user_id: req.user.id,
                    name,
                    data: dataString,
                    created_at: now,
                    updated_at: now
                };
                fallbackData.projects.push(newProject);
                await (0, database_1.saveFallbackData)(fallbackData);
                res.status(201).json({
                    success: true,
                    message: 'Projeto local criado e salvo com sucesso!',
                    project: { id: newProjectId, name, created_at: now }
                });
            }
            return;
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
            return;
        }
    }
    // MODO PRODUÇÃO (MySQL Real)
    try {
        const connection = await database_1.default.getConnection();
        if (id) {
            // Atualiza projeto existente
            const [check] = await connection.query('SELECT id FROM projects WHERE id = ? AND user_id = ?', [id, req.user.id]);
            if (check.length === 0) {
                connection.release();
                res.status(404).json({ success: false, message: 'Projeto não encontrado para atualização.' });
                return;
            }
            await connection.query('UPDATE projects SET name = ?, data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [name, dataString, id]);
            connection.release();
            res.json({
                success: true,
                message: 'Projeto atualizado com sucesso!',
                project: { id, name, updated_at: new Date() }
            });
        }
        else {
            // Cria novo projeto
            const [result] = await connection.query('INSERT INTO projects (user_id, name, data) VALUES (?, ?, ?)', [req.user.id, name, dataString]);
            connection.release();
            res.status(201).json({
                success: true,
                message: 'Projeto criado e salvo com sucesso!',
                project: { id: result.insertId, name, created_at: new Date() }
            });
        }
    }
    catch (error) {
        console.error('[saveProject] Erro:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.saveProject = saveProject;
// Deletar um projeto
const deleteProject = async (req, res) => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Não autorizado.' });
        return;
    }
    const { id } = req.params;
    const numericId = Number(id);
    // MODO FALLBACK LOCAL (Remoção em Arquivo)
    if (database_1.useLocalFallback) {
        try {
            const fallbackData = await (0, database_1.getFallbackData)();
            const checkIndex = fallbackData.projects.findIndex((p) => p.id === numericId && p.user_id === req.user.id);
            if (checkIndex === -1) {
                res.status(404).json({ success: false, message: 'Projeto local não encontrado ou acesso negado.' });
                return;
            }
            fallbackData.projects.splice(checkIndex, 1);
            await (0, database_1.saveFallbackData)(fallbackData);
            res.json({
                success: true,
                message: 'Projeto local excluído com sucesso!'
            });
            return;
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
            return;
        }
    }
    // MODO PRODUÇÃO (MySQL Real)
    try {
        const connection = await database_1.default.getConnection();
        const [check] = await connection.query('SELECT id FROM projects WHERE id = ? AND user_id = ?', [id, req.user.id]);
        if (check.length === 0) {
            connection.release();
            res.status(404).json({ success: false, message: 'Projeto não encontrado ou acesso negado.' });
            return;
        }
        await connection.query('DELETE FROM projects WHERE id = ?', [id]);
        connection.release();
        res.json({
            success: true,
            message: 'Projeto excluído com sucesso!'
        });
    }
    catch (error) {
        console.error('[deleteProject] Erro:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.deleteProject = deleteProject;
