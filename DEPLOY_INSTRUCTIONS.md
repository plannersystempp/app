# Instruções de Deploy e Configuração de DNS

Este documento descreve os passos necessários para colocar no ar a nova arquitetura de domínios separados.

## 1. Visão Geral

*   **Landing Page (Marketing):** Projeto Next.js em `landing-page/` -> Deploy em `plannersystem.com.br`
*   **Aplicação (Sistema):** Projeto React (Vite) em `agora-vai/` -> Deploy em `app.plannersystem.com.br`

## 2. Configuração de Deploy (Vercel Recomendado)

### Projeto 1: Landing Page
1.  **Root Directory:** `landing-page`
2.  **Framework Preset:** Next.js
3.  **Build Command:** `npm run build`
4.  **Output Directory:** `.next` (padrão)
5.  **Variáveis de Ambiente:** Nenhuma obrigatória por enquanto (Supabase Key está pública no código, mas idealmente deve ir para ENV).

### Projeto 2: Aplicação Principal
1.  **Root Directory:** `agora-vai`
2.  **Framework Preset:** Vite
3.  **Build Command:** `npm run build`
4.  **Output Directory:** `dist`
5.  **Variáveis de Ambiente:**
    *   `VITE_SUPABASE_URL`: (Sua URL do Supabase)
    *   `VITE_SUPABASE_ANON_KEY`: (Sua Key do Supabase)

## 3. Configuração de DNS

Configure os registros DNS no seu provedor de domínio (Registro.br, GoDaddy, Cloudflare, etc.):

| Tipo | Nome (Host) | Valor (Destino) | Observação |
| :--- | :--- | :--- | :--- |
| **A** | `@` | `76.76.21.21` | Aponta `plannersystem.com.br` para Vercel (LP) |
| **CNAME** | `www` | `cname.vercel-dns.com` | Aponta `www.plannersystem.com.br` para Vercel (LP) |
| **CNAME** | `app` | `cname.vercel-dns.com` | Aponta `app.plannersystem.com.br` para Vercel (App) |

*Nota: Se usar Netlify ou outro provedor, consulte os IPs/CNAMEs específicos deles.*

## 4. Configuração Crítica do Supabase

Para que a autenticação funcione corretamente entre os domínios, você precisa configurar o Supabase:

1.  Acesse o Painel do Supabase > Authentication > URL Configuration.
2.  **Site URL:** Defina como `https://app.plannersystem.com.br` (é onde o usuário deve cair após login/reset de senha).
3.  **Redirect URLs:** Adicione as seguintes URLs:
    *   `https://plannersystem.com.br`
    *   `https://app.plannersystem.com.br/**`
    *   `http://localhost:3000` (para testes locais da LP)
    *   `http://localhost:8080` (para testes locais do App)

## 5. Testes Pós-Deploy

1.  Acesse `plannersystem.com.br` e verifique se a Landing Page carrega.
2.  Clique em "Login" ou "Acessar App". Você deve ser redirecionado para `app.plannersystem.com.br/auth`.
3.  Faça login no App.
4.  O cookie de sessão deve ser criado com o domínio `.plannersystem.com.br` (verifique no DevTools > Application > Cookies).
