import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool, { useLocalFallback, getFallbackData, saveFallbackData, getConnectionSafe } from '../config/database';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

const JWT_SECRET = process.env.JWT_SECRET || 'eletric_sf_super_secret_key_123';

// Registro de Novo Usuário
export const register = async (req: Request, res: Response): Promise<void> => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    res.status(400).json({ success: false, message: 'Por favor, preencha todos os campos obrigatórios.' });
    return;
  }

  const registerLocal = async () => {
    const data = await getFallbackData();
    const existing = data.users.find((u: any) => u.email === email);
    if (existing) {
      res.status(400).json({ success: false, message: 'Este e-mail já está cadastrado.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newUserId = Date.now();

    const newUser = {
      id: newUserId,
      name,
      email,
      password: hashedPassword,
      created_at: new Date().toISOString()
    };

    data.users.push(newUser);
    await saveFallbackData(data);

    const token = jwt.sign({ id: newUserId, email }, JWT_SECRET, { expiresIn: '7d' });

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

  if (useLocalFallback) {
    try {
      await registerLocal();
      return;
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Erro no banco local ao registrar usuário.', error: err.message });
      return;
    }
  }

  try {
    const connection = await getConnectionSafe();

    // Verifica se usuário já existe
    const [existingUsers] = await connection.query<any[]>(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      connection.release();
      res.status(400).json({ success: false, message: 'Este e-mail já está cadastrado.' });
      return;
    }

    // Criptografa a senha
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insere o novo usuário
    const [result] = await connection.query<any>(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name, email, hashedPassword]
    );

    const userId = result.insertId;

    // Gera o token JWT
    const token = jwt.sign({ id: userId, email }, JWT_SECRET, { expiresIn: '7d' });

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
  } catch (error: any) {
    if (error.message === 'MODO_FALLBACK') {
      try {
        await registerLocal();
        return;
      } catch (err: any) {
        res.status(500).json({ success: false, message: 'Erro no banco local ao registrar usuário.', error: err.message });
        return;
      }
    }
    console.error('[Auth register] Erro:', error);
    res.status(500).json({ success: false, message: 'Erro no servidor ao registrar usuário.', error: error.message });
  }
};

// Login de Usuário
export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ success: false, message: 'Por favor, informe e-mail e senha.' });
    return;
  }

  const loginLocal = async () => {
    const data = await getFallbackData();
    const user = data.users.find((u: any) => u.email === email);

    if (!user) {
      res.status(400).json({ success: false, message: 'Credenciais inválidas. E-mail não encontrado.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(400).json({ success: false, message: 'Credenciais inválidas. Senha incorreta.' });
      return;
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

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

  if (useLocalFallback) {
    try {
      await loginLocal();
      return;
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Erro no banco local ao efetuar login.', error: err.message });
      return;
    }
  }

  try {
    const connection = await getConnectionSafe();

    // Busca usuário pelo e-mail
    const [users] = await connection.query<any[]>(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      connection.release();
      res.status(400).json({ success: false, message: 'Credenciais inválidas. E-mail não encontrado.' });
      return;
    }

    const user = users[0];

    // Verifica a senha
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      connection.release();
      res.status(400).json({ success: false, message: 'Credenciais inválidas. Senha incorreta.' });
      return;
    }

    // Gera o token JWT
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

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
  } catch (error: any) {
    if (error.message === 'MODO_FALLBACK') {
      try {
        await loginLocal();
        return;
      } catch (err: any) {
        res.status(500).json({ success: false, message: 'Erro no banco local ao efetuar login.', error: err.message });
        return;
      }
    }
    console.error('[Auth login] Erro:', error);
    res.status(500).json({ success: false, message: 'Erro no servidor ao efetuar login.', error: error.message });
  }
};

// Retornar Usuário Atual (Verificar Sessão)
export const getMe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Não autorizado.' });
    return;
  }

  // MODO FALLBACK LOCAL (Leitura em Arquivo)
  if (useLocalFallback) {
    try {
      const data = await getFallbackData();
      const user = data.users.find((u: any) => u.id === req.user!.id);

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
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Erro no banco local ao carregar perfil.', error: error.message });
      return;
    }
  }

  // MODO PRODUÇÃO (MySQL Real)
  try {
    const connection = await pool.getConnection();
    const [users] = await connection.query<any[]>(
      'SELECT id, name, email, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    connection.release();

    if (users.length === 0) {
      res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
      return;
    }

    res.json({
      success: true,
      user: users[0]
    });
  } catch (error: any) {
    console.error('[Auth getMe] Erro:', error);
    res.status(500).json({ success: false, message: 'Erro no servidor ao obter perfil.', error: error.message });
  }
};
