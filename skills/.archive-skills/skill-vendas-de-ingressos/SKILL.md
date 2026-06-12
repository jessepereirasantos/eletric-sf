---
name: skill-vendas-de-ingressos
description: "Diretrizes de checkout resiliente, webhooks do WhatsApp e painel administrativo mobile-first."
risk: low
source: local
date_added: "2026-05-25"
---

# Sovereign Sales & Ticket Protocol (Gabarito de Desenvolvimento)

Esta skill define o padrão de arquitetura de alta resiliência e o protocolo de desenvolvimento obrigatório para sistemas de vendas de ingressos, emissão de tickets e controle administrativo.

---

## 1. Diretrizes Técnicas de Arquitetura

### 1.1 Concorrência e Segurança Anti-Duplicação
- **Lock Otimista Obrigatório**: Qualquer processamento de webhook de pagamento (ex: Mercado Pago, Stripe) deve obter um lock lógico em nível de banco de dados (`tickets.id`) antes de executar ações externas como envio de mensagens.
- **Fail-Fast Mechanics**: Em plataformas serverless (ex: Vercel com limite de 10s), validações estáticas e tratamentos de erros não-reexecutáveis (como tokens de autenticação expirados) devem ser interrompidos imediatamente (`return Response`) para economizar computação.

### 1.2 Notificações Resilientes (Circuit Breaker)
- **Disjuntor de Rede**: Fazer o rastreamento de falhas de conexão de serviços externos (ex: APIs de envio de WhatsApp/SMS).
- **Cooldown**: Ao registrar 3 falhas consecutivas, o sistema deve **ABRIR o disjuntor** por 5 minutos, pulando tentativas automáticas subsequentes e liberando os locks de banco imediatamente.

### 1.3 UX Administrativo Adaptável (Mobile-First)
- **Transformação de Grids (Cards)**: Tabelas complexas de participantes devem ser ocultadas em resoluções móveis (`hidden md:block`) e convertidas em cartões flutuantes táteis (`block md:hidden`) com ações integradas.
- **Sincronismo de Paginação**: A paginação de tabelas deve redefinir o cursor para a página 1 em qualquer alteração de filtro ou termo de busca.

---

## 2. O Protocolo Soberano de Trabalho (Leis de Execução)

Ao atuar em projetos baseados nesta skill, o agente de IA e a equipe de desenvolvimento devem seguir rigidamente as seguintes fases:

1. **Transparência de Skills**: Declarar explicitamente os arquivos de skill locais de `./skills` antes de propor ou programar qualquer código.
2. **Diagnóstico Orientado a Logs Reais**: Proibição de palpites ou correções às cegas em integrações. É mandatório analisar previamente os logs brutos da infraestrutura (Vercel, Mercado Pago, Discloud).
3. **Isolamento de Estado**: Alterações na interface ou painel administrativo jamais devem tocar ou colocar em risco a API crítica de checkout e recebimento de webhooks ativos.
4. **Validação Estática Compulsória**: Rodar `npx tsc --noEmit` localmente antes de commits para garantir 0 erros de tipo.
5. **Validação Iterativa Gated**: Dividir a entrega em etapas lineares e só prosseguir após a confirmação visual e validação prática do cliente em ambiente de produção real.
