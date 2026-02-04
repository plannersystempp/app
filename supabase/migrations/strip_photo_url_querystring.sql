UPDATE public.personnel
SET photo_url = NULLIF(trim(split_part(photo_url, '?', 1)), '')
WHERE photo_url IS NOT NULL
  AND position('?' in photo_url) > 0;
