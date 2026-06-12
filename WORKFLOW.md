# WORKFLOW.md

Este documento estabelece o ciclo de trabalho padrão e inquebrável para o desenvolvimento de novas funcionalidades e correções ao longo de todas as fases do projeto.

---

## Ciclo de Trabalho Padrão

Para cada nova feature ou tarefa, o processo de execução seguirá estritamente as 5 etapas abaixo de forma sequencial, sem desvios:

### 1. Planejamento da Feature
- **Ação:** Mapeamento do escopo da funcionalidade com base nos requisitos e especificações do `CORE_ARCHITECTURE.md`.
- **Registro:** Atualização do plano de tarefas (`task.md`) especificando as subtarefas e as dependências estruturais do código.

### 2. Identificação e Declaração de Skills
- **Ação:** Identificação de quais skills do diretório local de skills (ex: `threejs-skills`, `canvas-design`, `typescript-expert`) dão suporte técnico àquela tarefa.
- **Aviso ao Usuário:** Notificar explicitamente o usuário em português brasileiro sobre as skills que serão ativadas e o escopo da execução antes de iniciar qualquer modificação ou instalação.

### 3. Desenvolvimento e Execução Técnica
- **Ação:** Criação ou modificação de arquivos de código (HTML, CSS, TypeScript) de forma modular.
- **Coleta de Logs:** Geração e apresentação de logs do console, do terminal ou de compiladores (ex: erros do TypeScript, compilação do Vite, logs do servidor Node).

### 4. Formato de Teste Real no Navegador (Obrigatório)
- **Ação:** Criação de um caso de teste real que possa ser executado interativamente no browser.
- **Protocolo de Teste:**
  1. O servidor local (`npm run dev`) é iniciado.
  2. Um agente de automação de navegador (Browser Subagent) acessa a URL local.
  3. O agente executa ações de interação na interface (e.g. desenhar uma parede, arrastar uma tomada, clicar em calcular).
  4. Coleta de logs de erro do console do Chrome DevTools e captura de telas/vídeos para atestar visualmente que a funcionalidade está operando perfeitamente.
- **Validação:** A validação só é considerada concluída após a apresentação dos logs e evidências do navegador em funcionamento.

### 5. Pausa Obrigatória para Aprovação do Usuário
- **Ação:** Parar toda e qualquer execução de forma imediata após os testes do navegador.
- **Apresentação:** Demonstrar os resultados do teste e o código escrito.
- **Ponto de Controle:** Aguardar a aprovação formal e explícita do usuário para dar por concluída a tarefa e avançar para o próximo passo. **Está proibido avançar para novos ciclos sem esta aprovação.**
