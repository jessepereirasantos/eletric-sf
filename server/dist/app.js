"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const routes_1 = __importDefault(require("./routes"));
const database_1 = require("./config/database");
dotenv_1.default.config();
// Tenta carregar do diretório server/ caso o processo inicie na raiz do domínio
if (!process.env.DB_HOST) {
    dotenv_1.default.config({ path: path_1.default.join(process.cwd(), 'server/.env') });
}
// Tenta carregar de caminhos relativos ao executável compiled (server/dist/app.js)
if (!process.env.DB_HOST) {
    dotenv_1.default.config({ path: path_1.default.join(__dirname, '../.env') });
}
if (!process.env.DB_HOST) {
    dotenv_1.default.config({ path: path_1.default.join(__dirname, '../../.env') });
}
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Acoplamento das Rotas da API
app.use('/api', routes_1.default);
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', message: 'Servidor elétrico rodando com sucesso!' });
});
// Em Produção (como na HostGator), servimos o frontend React a partir do mesmo servidor Node
if (process.env.NODE_ENV === 'production') {
    const clientDistPath = path_1.default.join(__dirname, '../../client/dist');
    app.use(express_1.default.static(clientDistPath));
    // Qualquer rota que não seja /api será redirecionada ao index.html do React
    app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
            res.sendFile(path_1.default.join(clientDistPath, 'index.html'));
        }
    });
}
// Inicializar banco e abrir porta do servidor se não estiver na Vercel
const startServer = async () => {
    if (!process.env.VERCEL) {
        await (0, database_1.initializeDatabase)();
        app.listen(PORT, () => {
            console.log(`[servidor] Rodando na porta ${PORT}`);
        });
    }
};
startServer();
exports.default = app;
