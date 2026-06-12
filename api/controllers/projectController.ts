import { Response } from 'express';
import pool, { useLocalFallback, getFallbackData, saveFallbackData } from '../config/database';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

// Listar todos os projetos do usuário logado
export const getProjects = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Não autorizado.' });
    return;
  }

  // MODO FALLBACK LOCAL (Leitura em Arquivo)
  if (useLocalFallback) {
    try {
      const data = await getFallbackData();
      const userProjects = data.projects
          .filter((p: any) => p.user_id === req.user!.id)
          .map((p: any) => ({
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
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
      return;
    }
  }

  // MODO PRODUÇÃO (MySQL Real)
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query<any[]>(
      'SELECT id, name, created_at, updated_at FROM projects WHERE user_id = ? ORDER BY updated_at DESC',
      [req.user.id]
    );
    connection.release();

    res.json({
      success: true,
      projects: rows
    });
  } catch (error: any) {
    console.error('[getProjects] Erro:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Obter detalhes de um projeto específico
export const getProjectById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Não autorizado.' });
    return;
  }

  const { id } = req.params;
  const numericId = Number(id);

  // MODO FALLBACK LOCAL (Leitura em Arquivo)
  if (useLocalFallback) {
    try {
      const data = await getFallbackData();
      const project = data.projects.find((p: any) => p.id === numericId && p.user_id === req.user!.id);

      if (!project) {
        res.status(404).json({ success: false, message: 'Projeto local não encontrado ou acesso negado.' });
        return;
      }

      res.json({
        success: true,
        project
      });
      return;
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
      return;
    }
  }

  // MODO PRODUÇÃO (MySQL Real)
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query<any[]>(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );
    connection.release();

    if (rows.length === 0) {
      res.status(404).json({ success: false, message: 'Projeto não encontrado ou acesso negado.' });
      return;
    }

    res.json({
      success: true,
      project: rows[0]
    });
  } catch (error: any) {
    console.error('[getProjectById] Erro:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Salvar projeto (Criar ou Atualizar)
export const saveProject = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
  if (useLocalFallback) {
    try {
      const fallbackData = await getFallbackData();
      const now = new Date().toISOString();

      if (id) {
        const numericId = Number(id);
        const projectIndex = fallbackData.projects.findIndex((p: any) => p.id === numericId && p.user_id === req.user!.id);

        if (projectIndex === -1) {
          res.status(404).json({ success: false, message: 'Projeto local não encontrado para atualização.' });
          return;
        }

        fallbackData.projects[projectIndex].name = name;
        fallbackData.projects[projectIndex].data = dataString;
        fallbackData.projects[projectIndex].updated_at = now;

        await saveFallbackData(fallbackData);

        res.json({
          success: true,
          message: 'Projeto local atualizado com sucesso!',
          project: { id: numericId, name, updated_at: now }
        });
      } else {
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
        await saveFallbackData(fallbackData);

        res.status(201).json({
          success: true,
          message: 'Projeto local criado e salvo com sucesso!',
          project: { id: newProjectId, name, created_at: now }
        });
      }
      return;
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
      return;
    }
  }

  // MODO PRODUÇÃO (MySQL Real)
  try {
    const connection = await pool.getConnection();

    if (id) {
      // Atualiza projeto existente
      const [check] = await connection.query<any[]>(
        'SELECT id FROM projects WHERE id = ? AND user_id = ?',
        [id, req.user.id]
      );

      if (check.length === 0) {
        connection.release();
        res.status(404).json({ success: false, message: 'Projeto não encontrado para atualização.' });
        return;
      }

      await connection.query(
        'UPDATE projects SET name = ?, data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [name, dataString, id]
      );

      connection.release();
      res.json({
        success: true,
        message: 'Projeto atualizado com sucesso!',
        project: { id, name, updated_at: new Date() }
      });
    } else {
      // Cria novo projeto
      const [result] = await connection.query<any>(
        'INSERT INTO projects (user_id, name, data) VALUES (?, ?, ?)',
        [req.user.id, name, dataString]
      );

      connection.release();
      res.status(201).json({
        success: true,
        message: 'Projeto criado e salvo com sucesso!',
        project: { id: result.insertId, name, created_at: new Date() }
      });
    }
  } catch (error: any) {
    console.error('[saveProject] Erro:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Deletar um projeto
export const deleteProject = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Não autorizado.' });
    return;
  }

  const { id } = req.params;
  const numericId = Number(id);

  // MODO FALLBACK LOCAL (Remoção em Arquivo)
  if (useLocalFallback) {
    try {
      const fallbackData = await getFallbackData();
      const checkIndex = fallbackData.projects.findIndex((p: any) => p.id === numericId && p.user_id === req.user!.id);

      if (checkIndex === -1) {
        res.status(404).json({ success: false, message: 'Projeto local não encontrado ou acesso negado.' });
        return;
      }

      fallbackData.projects.splice(checkIndex, 1);
      await saveFallbackData(fallbackData);

      res.json({
        success: true,
        message: 'Projeto local excluído com sucesso!'
      });
      return;
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
      return;
    }
  }

  // MODO PRODUÇÃO (MySQL Real)
  try {
    const connection = await pool.getConnection();
    const [check] = await connection.query<any[]>(
      'SELECT id FROM projects WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

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
  } catch (error: any) {
    console.error('[deleteProject] Erro:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
