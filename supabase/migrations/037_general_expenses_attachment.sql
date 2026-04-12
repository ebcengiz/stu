-- Masraf kaydına eklenen belge (Supabase Storage public URL)
ALTER TABLE general_expenses
  ADD COLUMN IF NOT EXISTS attachment_url TEXT;
