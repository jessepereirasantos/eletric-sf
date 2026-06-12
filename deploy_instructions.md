# Manual de Deploy: Eletric SF na HostGator (cursoseloha.online)

Este manual descreve o passo a passo completo para hospedar e configurar a aplicação elétrica no servidor de hospedagem da HostGator usando o painel **cPanel**.

---

## 1. Configurando o Banco de Dados MySQL na HostGator

1. Acesse o **cPanel** da sua conta HostGator.
2. Na seção **Banco de Dados**, clique em **Bancos de dados MySQL** ou **Assistente de Banco de Dados MySQL**.
3. Crie um novo banco de dados. Exemplo de nome: `hg9a3205_eletric` (conforme já configurado no seu arquivo `.env`).
4. Crie um novo usuário para o banco. Exemplo de usuário: `hg9a3205_eletric-admin`. Defina uma senha forte.
5. Adicione o usuário recém-criado ao banco de dados com **Todos os Privilégios** (All Privileges).
6. Garanta que as credenciais coincidam com as configuradas no arquivo `server/.env`:
   - `DB_HOST=localhost`
   - `DB_USER=hg9a3205_eletric-admin`
   - `DB_PASS=sua_senha_aqui`
   - `DB_NAME=hg9a3205_eletric`

> [!NOTE]
> O servidor Node.js criará as tabelas `users` e `projects` automaticamente ao ser inicializado pela primeira vez no servidor da HostGator. Não é necessário rodar scripts SQL manuais!

---

## 2. Configurando o Aplicativo Node.js no cPanel

A HostGator permite rodar aplicações Node.js através da ferramenta **Setup Node.js App** (Configurar aplicativo Node.js).

1. No painel do **cPanel**, busque por **Setup Node.js App** e clique para abrir.
2. Clique no botão **Create Application** (Criar Aplicativo).
3. Preencha as configurações:
   - **Node.js version**: Selecione a versão recomendada estável (18.x, 20.x ou mais recente).
   - **Application mode**: Selecione **Production**.
   - **Application root**: Digite a pasta raiz onde o projeto será hospedado. Exemplo: `repositories/eletric-sf` ou `eletric-sf`.
   - **Application URL**: Selecione seu domínio `cursoseloha.online` (ou a subpasta que desejar).
   - **Application startup file**: Defina o arquivo de inicialização do servidor compilado: `server/dist/app.js` (ou `server/dist/app.js` se já compilado) ou configure para apontar para `server/src/app.ts` usando TypeScript no cPanel se preferir (porém, a build compilada `server/dist/app.js` é mais leve e performática para produção).
4. Clique em **Create** para salvar. A HostGator criará um arquivo de configuração básico e uma pasta virtual.
5. Role a tela para baixo até **Environment Variables** (Variáveis de Ambiente) e adicione as variáveis configuradas em seu `.env`:
   - `NODE_ENV = production`
   - `PORT = 3000` (ou a porta interna fornecida pela HostGator)
   - `DB_HOST = localhost`
   - `DB_USER = hg9a3205_eletric-admin`
   - `DB_PASS = password`
   - `DB_NAME = hg9a3205_eletric`
   - `JWT_SECRET = eletric_sf_super_secret_key_123` (ou uma frase secreta sua)
6. Clique em **Save** para salvar as variáveis.

---

## 3. Sincronização e Deploy via Git

Você pode usar o Git Version Control do cPanel para enviar os arquivos ou simplesmente fazer o deploy a partir do GitHub.

### Estrutura de Build Automatizada

Criamos um script unificado na raiz do repositório para gerar a build de produção de forma rápida:

1. No terminal do seu computador (na pasta raiz `eletric-sf`), execute:
   ```bash
   npm run build-all
   ```
   Isso compilará o frontend React em `client/dist` e compilará o backend TypeScript em `server/dist`.

2. Envie os arquivos atualizados para o GitHub usando o Git:
   ```bash
   git add .
   git commit -m "feat: login premium, persistencia MySQL nuvem e build unificada"
   git push -u origin main
   ```

3. No cPanel da HostGator, vá em **Git Version Control** e clique em **Pull/Update** ou atualize o repositório clonado `/home1/hg9a3205/repositories/eletric-sf` a partir do GitHub para puxar as novidades do seu repositório oficial (`https://github.com/jessepereirasantos/eletric-sf.git`).

4. No terminal SSH da HostGator (ou na ferramenta Setup Node.js App do cPanel, clicando em **Run JS Command** / **Run npm install**), instale as dependências executando:
   ```bash
   # Dentro de /home1/hg9a3205/repositories/eletric-sf/server
   npm install --production
   ```

5. Clique em **Restart** no Setup Node.js App do cPanel para reiniciar a aplicação e aplicar as alterações.

Pronto! Sua aplicação estará no ar no domínio `cursoseloha.online`.
Ao acessar o domínio, a HostGator rodará o backend Express, que por sua vez servirá o frontend React (`client/dist`) estaticamente e conectará ao banco de dados MySQL de forma totalmente segura.
