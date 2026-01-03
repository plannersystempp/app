-- Criar bucket público para screenshots de erros
INSERT INTO storage.buckets (id, name, public)
VALUES ('error-screenshots', 'error-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policy: Usuários autenticados podem fazer upload
CREATE POLICY "Users can upload error screenshots"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'error-screenshots');

-- RLS Policy: Usuários autenticados podem visualizar
CREATE POLICY "Users can view error screenshots"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'error-screenshots');
