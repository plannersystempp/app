Clonagem de Banco (Supabase/Postgres)

1) Preparação
- Instale psql localmente.
- Abra psql apontando para o banco de destino.

2) Aplicar estrutura, funções, RLS e buckets
- Execute: psql -f db-clone/apply_all.psql

3) Importar dados (opcional)
- Coloque CSVs em db-clone/data/ com nomes: users.csv, teams.csv, team_members.csv, subscriptions.csv, personnel.csv, events.csv, event_personnel.csv, payroll_closings.csv, notifications.csv, audit_logs.csv.
- Execute: psql -f db-clone/import_data.psql

Observações
- Os scripts são idempotentes e em ordem cronológica das migrações.
- Se usar o SQL Editor do Supabase, cole o conteúdo dos arquivos diretamente (\i não é suportado).
