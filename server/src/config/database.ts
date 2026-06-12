import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

dotenv.config();

// Pool de conexões MySQL preparado para o HostGator / Ambiente Local
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'eletric_sf_db',
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Flag global de modo de banco de dados
export let useLocalFallback = false;

// Caminho do arquivo de banco de dados simulado local
const fallbackFilePath = path.join(__dirname, '../../../db_fallback.json');

export const initializeFallbackFile = async () => {
  try {
    await fs.access(fallbackFilePath);
  } catch {
    // Se o arquivo não existir, inicializa a estrutura básica
    await fs.writeFile(fallbackFilePath, JSON.stringify({ users: [], projects: [] }, null, 2));
  }
};

export const getFallbackData = async () => {
  await initializeFallbackFile();
  const data = await fs.readFile(fallbackFilePath, 'utf8');
  return JSON.parse(data);
};

export const saveFallbackData = async (data: any) => {
  await fs.writeFile(fallbackFilePath, JSON.stringify(data, null, 2));
};

export const initializeDatabase = async () => {
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
    useLocalFallback = false;
    console.log('[Banco de Dados] MODO ATIVO: MySQL de Produção.');
  } catch (error: any) {
    useLocalFallback = true;
    console.warn('[Banco de Dados] Não foi possível conectar ao MySQL local/remoto:', error.message);
    console.warn('[Banco de Dados] MODO ATIVO: Fallback Local (Armazenando em server/db_fallback.json).');
    await initializeFallbackFile();
  }
};

export default pool;
