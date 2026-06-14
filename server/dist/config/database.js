"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConnectionSafe = exports.initializeDatabase = exports.saveFallbackData = exports.getFallbackData = exports.initializeFallbackFile = exports.useLocalFallback = void 0;
const promise_1 = __importDefault(require("mysql2/promise"));
const dotenv_1 = __importDefault(require("dotenv"));
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
// Pool de conexões MySQL preparado para o HostGator / Ambiente Local
const pool = promise_1.default.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'eletric_sf_db',
    port: 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 5000 // Limita espera de conexão a 5 segundos
});
// Adiciona listener de erro no pool para evitar quedas da função na Vercel
pool.on('error', (err) => {
    console.error('[Banco de Dados] Erro assíncrono inesperado no pool do MySQL:', err);
});
// Flag global de modo de banco de dados
exports.useLocalFallback = false;
// Caminho do arquivo de banco de dados simulado local
const fallbackFilePath = process.env.VERCEL
    ? path_1.default.join('/tmp', 'db_fallback.json')
    : path_1.default.join(__dirname, '../../../db_fallback.json');
const initializeFallbackFile = async () => {
    try {
        await promises_1.default.access(fallbackFilePath);
    }
    catch {
        // Se o arquivo não existir, inicializa a estrutura básica
        await promises_1.default.writeFile(fallbackFilePath, JSON.stringify({ users: [], projects: [] }, null, 2));
    }
};
exports.initializeFallbackFile = initializeFallbackFile;
const getFallbackData = async () => {
    await (0, exports.initializeFallbackFile)();
    const data = await promises_1.default.readFile(fallbackFilePath, 'utf8');
    return JSON.parse(data);
};
exports.getFallbackData = getFallbackData;
const saveFallbackData = async (data) => {
    await promises_1.default.writeFile(fallbackFilePath, JSON.stringify(data, null, 2));
};
exports.saveFallbackData = saveFallbackData;
const initializeDatabase = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('[Banco de Dados] Conexão com o MySQL realizada com sucesso!');
        // Tabela de usuários
        await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
        console.log('[Banco de Dados] Tabela "users" verificada/criada com sucesso.');
        // Seeding automático do Administrador
        const [userCheck] = await connection.query('SELECT id FROM users LIMIT 1');
        if (userCheck.length === 0) {
            const bcrypt = require('bcryptjs');
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('AdminPassword123!', salt);
            await connection.query('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', ['Administrador', 'admin@cursoseloha.online', hashedPassword]);
            console.log('[Banco de Dados] Seeding: Usuário administrador padrão criado com sucesso!');
        }
        // Tabela de projetos
        await connection.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        data LONGTEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
        console.log('[Banco de Dados] Tabela "projects" verificada/criada com sucesso.');
        connection.release();
        exports.useLocalFallback = false;
        console.log('[Banco de Dados] MODO ATIVO: MySQL de Produção.');
    }
    catch (error) {
        if (process.env.NODE_ENV === 'production') {
            exports.useLocalFallback = false;
            console.error('[Banco de Dados] ERRO CRÍTICO: Não foi possível conectar ao MySQL em produção:', error.message);
            return;
        }
        exports.useLocalFallback = true;
        console.warn('[Banco de Dados] Não foi possível conectar ao MySQL local/remoto:', error.message);
        console.warn('[Banco de Dados] MODO ATIVO: Fallback Local (Armazenando em server/db_fallback.json).');
        await (0, exports.initializeFallbackFile)();
    }
};
exports.initializeDatabase = initializeDatabase;
const getConnectionSafe = async () => {
    if (exports.useLocalFallback && process.env.NODE_ENV !== 'production') {
        throw new Error('MODO_FALLBACK');
    }
    try {
        return await pool.getConnection();
    }
    catch (error) {
        if (process.env.NODE_ENV === 'production') {
            console.error('[Banco de Dados] Erro ao obter conexão em produção:', error.message);
            throw error;
        }
        console.warn('[Banco de Dados] Erro ao obter conexão, ativando Fallback Local:', error.message);
        exports.useLocalFallback = true;
        await (0, exports.initializeFallbackFile)();
        throw new Error('MODO_FALLBACK');
    }
};
exports.getConnectionSafe = getConnectionSafe;
exports.default = pool;
