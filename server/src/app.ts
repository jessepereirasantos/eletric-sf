import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import apiRoutes from './routes';
import { initializeDatabase } from './config/database';

dotenv.config();
// Tenta carregar do diretório server/ caso o processo inicie na raiz do domínio
if (!process.env.DB_HOST) {
  dotenv.config({ path: path.join(process.cwd(), 'server/.env') });
}
// Tenta carregar de caminhos relativos ao executável compiled (server/dist/app.js)
if (!process.env.DB_HOST) {
  dotenv.config({ path: path.join(__dirname, '../.env') });
}
if (!process.env.DB_HOST) {
  dotenv.config({ path: path.join(__dirname, '../../.env') });
}

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Acoplamento das Rotas da API
app.use('/api', apiRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Servidor elétrico rodando com sucesso!' });
});

// Em Produção (como na HostGator), servimos o frontend React a partir do mesmo servidor Node
if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
  const clientDistPath = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDistPath));
  
  // Qualquer rota que não seja /api será redirecionada ao index.html do React
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(clientDistPath, 'index.html'));
    }
  });
}

// Inicializar banco e abrir porta do servidor se não estiver na Vercel
const startServer = async () => {
  if (!process.env.VERCEL) {
    await initializeDatabase();
    app.listen(PORT, () => {
      console.log(`[servidor] Rodando na porta ${PORT}`);
    });
  }
};

startServer();

export default app;
