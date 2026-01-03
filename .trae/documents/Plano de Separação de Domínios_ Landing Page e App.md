# Plano de Implementação: Arquitetura de Domínios Separados

Este plano detalha as etapas para separar a Landing Page (Next.js) da Aplicação Principal (React), garantindo SEO otimizado e autenticação unificada.

## 1. Landing Page (LP) - `plannersystem.com.br`

### 1.1. Inicialização do Projeto Next.js
*   **Ação:** Criar novo diretório `landing-page` na raiz.
*   **Setup:** Inicializar projeto Next.js com TypeScript, Tailwind CSS e ESLint.
*   **Estrutura:** Utilizar diretório `src/` para manter consistência com o projeto atual.

### 1.2. Migração de Componentes e Estilos
*   **Componentes UI:** Copiar componentes base (Button, Card, Badge, etc.) de `agora-vai/src/components/ui` para `landing-page/src/components/ui`.
*   **Páginas:**
    *   Migrar `Landing.tsx` → `landing-page/src/app/page.tsx`.
    *   Migrar `SalesLanding.tsx` → `landing-page/src/app/oferta/page.tsx`.
    *   Migrar `PlansPage.tsx` → `landing-page/src/app/precos/page.tsx` (ou `/plans`).
    *   Migrar páginas institucionais (Termos, Privacidade, Quem Somos).
*   **Assets:** Copiar imagens e ícones de `agora-vai/public` para `landing-page/public`.
*   **Estilização:** Replicar configurações do Tailwind (`tailwind.config.js`) e variáveis CSS (`globals.css`) para garantir identidade visual idêntica.

### 1.3. Otimização e Links
*   **SEO:** Configurar metadados estáticos (título, descrição) no `layout.tsx` e páginas individuais.
*   **Navegação:** Substituir `react-router-dom/Link` por `next/link`.
*   **CTA Login:** Configurar botões de "Login" e "Acessar App" para apontar externamente para `https://app.plannersystem.com.br/auth`.

## 2. Aplicação Principal (App) - `app.plannersystem.com.br`

### 2.1. Limpeza de Rotas (`agora-vai`)
*   **Refatoração:** Remover rotas da Landing Page do `App.tsx` (`/`, `/oferta`, `/quem-somos`, etc.).
*   **Redirecionamento:** Configurar rota raiz `/` para redirecionar para `/app` (Dashboard) se autenticado, ou `/auth` (Login).

### 2.2. Configuração de Autenticação (Cookies Compartilhados)
*   **Adaptador de Storage:** Criar um adaptador de armazenamento customizado para o Supabase que utilize Cookies em vez de LocalStorage.
*   **Configuração:** Ajustar `src/integrations/supabase/client.ts` para usar este adaptador com a configuração `domain: '.plannersystem.com.br'`, permitindo que o cookie seja legível em ambos os subdomínios.
    *   *Nota:* Isso permitirá que o login persista se o usuário navegar entre os domínios, embora a validação principal ocorra no App.

## 3. Infraestrutura e Deploy

### 3.1. Preparação para Deploy
*   **Scripts:** Verificar e ajustar scripts de build em ambos os projetos.
*   **Configuração Vercel:** Criar/Ajustar `vercel.json` para suportar monorepo ou múltiplos projetos se necessário (neste caso, serão dois projetos Vercel distintos).

### 3.2. Instruções de DNS (Entrega Final)
*   Fornecer lista detalhada de registros DNS (Tipo A, CNAME) para configurar `plannersystem.com.br` e `app.plannersystem.com.br`.

---

**Próximo Passo:** Aguardo sua confirmação para iniciar a criação do projeto Next.js e a migração dos arquivos.
