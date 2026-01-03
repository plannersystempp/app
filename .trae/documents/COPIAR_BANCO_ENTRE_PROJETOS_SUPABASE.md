# Copiar Banco de Dados entre Projetos Supabase

## Pré-requisitos
- Variáveis de ambiente:
  - `SRC_SUPABASE_URL`
  - `SRC_SERVICE_ROLE_KEY`
  - `DEST_SUPABASE_URL`
  - `DEST_SERVICE_ROLE_KEY`
- Opcional:
  - `TABLES` (lista separada por vírgula)
  - `LIMIT_PER_TABLE` (padrão 100000)
  - `CHUNK_SIZE` (padrão 1000)
  - `DRY_RUN` (`true` para simulação)

## Execução
```
SRC_SUPABASE_URL=... \
SRC_SERVICE_ROLE_KEY=... \
DEST_SUPABASE_URL=... \
DEST_SERVICE_ROLE_KEY=... \
npm run db:copy
```

## Observações
- As chaves de serviço não devem ser compartilhadas.
- Execute preferencialmente em ambiente seguro.
- O script realiza `upsert` quando a tabela possui coluna `id`.
