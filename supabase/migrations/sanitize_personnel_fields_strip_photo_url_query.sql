CREATE OR REPLACE FUNCTION public.sanitize_personnel_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.cpf IS NOT NULL AND trim(NEW.cpf) = '' THEN
    NEW.cpf := NULL;
  END IF;

  IF NEW.cnpj IS NOT NULL AND trim(NEW.cnpj) = '' THEN
    NEW.cnpj := NULL;
  END IF;

  IF NEW.email IS NOT NULL AND trim(NEW.email) = '' THEN
    NEW.email := NULL;
  END IF;

  IF NEW.phone IS NOT NULL AND trim(NEW.phone) = '' THEN
    NEW.phone := NULL;
  END IF;

  IF NEW.phone_secondary IS NOT NULL AND trim(NEW.phone_secondary) = '' THEN
    NEW.phone_secondary := NULL;
  END IF;

  IF NEW.photo_url IS NOT NULL THEN
    NEW.photo_url := trim(split_part(NEW.photo_url, '?', 1));
    IF NEW.photo_url = '' THEN
      NEW.photo_url := NULL;
    END IF;
  END IF;

  IF NEW.shirt_size IS NOT NULL AND trim(NEW.shirt_size) = '' THEN
    NEW.shirt_size := NULL;
  END IF;

  IF NEW.address_zip_code IS NOT NULL AND trim(NEW.address_zip_code) = '' THEN
    NEW.address_zip_code := NULL;
  END IF;

  IF NEW.address_street IS NOT NULL AND trim(NEW.address_street) = '' THEN
    NEW.address_street := NULL;
  END IF;

  IF NEW.address_number IS NOT NULL AND trim(NEW.address_number) = '' THEN
    NEW.address_number := NULL;
  END IF;

  IF NEW.address_complement IS NOT NULL AND trim(NEW.address_complement) = '' THEN
    NEW.address_complement := NULL;
  END IF;

  IF NEW.address_neighborhood IS NOT NULL AND trim(NEW.address_neighborhood) = '' THEN
    NEW.address_neighborhood := NULL;
  END IF;

  IF NEW.address_city IS NOT NULL AND trim(NEW.address_city) = '' THEN
    NEW.address_city := NULL;
  END IF;

  IF NEW.address_state IS NOT NULL AND trim(NEW.address_state) = '' THEN
    NEW.address_state := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.sanitize_personnel_fields() IS
'Converte strings vazias em NULL e remove querystring de photo_url antes de INSERT/UPDATE';
