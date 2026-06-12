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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMe = exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = __importStar(require("../config/database"));
const JWT_SECRET = process.env.JWT_SECRET || 'eletric_sf_super_secret_key_123';
// Registro de Novo Usuário
const register = async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        res.status(400).json({ success: false, message: 'Por favor, preencha todos os campos obrigatórios.' });
        return;
    }
    const registerLocal = async () => {
        const data = await (0, database_1.getFallbackData)();
        const existing = data.users.find((u) => u.email === email);
        if (existing) {
            res.status(400).json({ success: false, message: 'Este e-mail já está cadastrado.' });
            return;
        }
        const salt = await bcryptjs_1.default.genSalt(10);
        const hashedPassword = await bcryptjs_1.default.hash(password, salt);
        const newUserId = Date.now();
        const newUser = {
            id: newUserId,
            name,
            email,
            password: hashedPassword,
            created_at: new Date().toISOString()
        };
        data.users.push(newUser);
        await (0, database_1.saveFallbackData)(data);
        const token = jsonwebtoken_1.default.sign({ id: newUserId, email }, JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({
            success: true,
            message: 'Usuário registrado com sucesso (Modo Local)!',
            token,
            user: {
                id: newUserId,
                name,
                email
            }
        });
    };
    if (database_1.useLocalFallback) {
        try {
            await registerLocal();
            return;
        }
        catch (err) {
            res.status(500).json({ success: false, message: 'Erro no banco local ao registrar usuário.', error: err.message });
            return;
        }
    }
    try {
        const connection = await (0, database_1.getConnectionSafe)();
        // Verifica se usuário já existe
        const [existingUsers] = await connection.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existingUsers.length > 0) {
            connection.release();
            res.status(400).json({ success: false, message: 'Este e-mail já está cadastrado.' });
            return;
        }
        // Criptografa a senha
        const salt = await bcryptjs_1.default.genSalt(10);
        const hashedPassword = await bcryptjs_1.default.hash(password, salt);
        // Insere o novo usuário
        const [result] = await connection.query('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, hashedPassword]);
        const userId = result.insertId;
        // Gera o token JWT
        const token = jsonwebtoken_1.default.sign({ id: userId, email }, JWT_SECRET, { expiresIn: '7d' });
        connection.release();
        res.status(201).json({
            success: true,
            message: 'Usuário registrado com sucesso!',
            token,
            user: {
                id: userId,
                name,
                email
            }
        });
    }
    catch (error) {
        if (error.message === 'MODO_FALLBACK') {
            try {
                await registerLocal();
                return;
            }
            catch (err) {
                res.status(500).json({ success: false, message: 'Erro no banco local ao registrar usuário.', error: err.message });
                return;
            }
        }
        console.error('[Auth register] Erro:', error);
        res.status(500).json({ success: false, message: 'Erro no servidor ao registrar usuário.', error: error.message });
    }
};
exports.register = register;
// Login de Usuário
const login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        res.status(400).json({ success: false, message: 'Por favor, informe e-mail e senha.' });
        return;
    }
    const loginLocal = async () => {
        const data = await (0, database_1.getFallbackData)();
        const user = data.users.find((u) => u.email === email);
        if (!user) {
            res.status(400).json({ success: false, message: 'Credenciais inválidas. E-mail não encontrado.' });
            return;
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.password);
        if (!isMatch) {
            res.status(400).json({ success: false, message: 'Credenciais inválidas. Senha incorreta.' });
            return;
        }
        const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
        res.json({
            success: true,
            message: 'Login realizado com sucesso (Modo Local)!',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });
    };
    if (database_1.useLocalFallback) {
        try {
            await loginLocal();
            return;
        }
        catch (err) {
            res.status(500).json({ success: false, message: 'Erro no banco local ao efetuar login.', error: err.message });
            return;
        }
    }
    try {
        const connection = await (0, database_1.getConnectionSafe)();
        // Busca usuário pelo e-mail
        const [users] = await connection.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            connection.release();
            res.status(400).json({ success: false, message: 'Credenciais inválidas. E-mail não encontrado.' });
            return;
        }
        const user = users[0];
        // Verifica a senha
        const isMatch = await bcryptjs_1.default.compare(password, user.password);
        if (!isMatch) {
            connection.release();
            res.status(400).json({ success: false, message: 'Credenciais inválidas. Senha incorreta.' });
            return;
        }
        // Gera o token JWT
        const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
        connection.release();
        res.json({
            success: true,
            message: 'Login realizado com sucesso!',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });
    }
    catch (error) {
        if (error.message === 'MODO_FALLBACK') {
            try {
                await loginLocal();
                return;
            }
            catch (err) {
                res.status(500).json({ success: false, message: 'Erro no banco local ao efetuar login.', error: err.message });
                return;
            }
        }
        console.error('[Auth login] Erro:', error);
        res.status(500).json({ success: false, message: 'Erro no servidor ao efetuar login.', error: error.message });
    }
};
exports.login = login;
// Retornar Usuário Atual (Verificar Sessão)
const getMe = async (req, res) => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Não autorizado.' });
        return;
    }
    // MODO FALLBACK LOCAL (Leitura em Arquivo)
    if (database_1.useLocalFallback) {
        try {
            const data = await (0, database_1.getFallbackData)();
            const user = data.users.find((u) => u.id === req.user.id);
            if (!user) {
                res.status(404).json({ success: false, message: 'Usuário não encontrado no banco local.' });
                return;
            }
            res.json({
                success: true,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    created_at: user.created_at
                }
            });
            return;
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Erro no banco local ao carregar perfil.', error: error.message });
            return;
        }
    }
    // MODO PRODUÇÃO (MySQL Real)
    try {
        const connection = await database_1.default.getConnection();
        const [users] = await connection.query('SELECT id, name, email, created_at FROM users WHERE id = ?', [req.user.id]);
        connection.release();
        if (users.length === 0) {
            res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
            return;
        }
        res.json({
            success: true,
            user: users[0]
        });
    }
    catch (error) {
        console.error('[Auth getMe] Erro:', error);
        res.status(500).json({ success: false, message: 'Erro no servidor ao obter perfil.', error: error.message });
    }
};
exports.getMe = getMe;
