-- Tekrarlayan masraf kayıtları için tekrar ayarları
ALTER TABLE general_expenses
  ADD COLUMN IF NOT EXISTS recurrence_start_date DATE,
  ADD COLUMN IF NOT EXISTS recurrence_end_date DATE,
  ADD COLUMN IF NOT EXISTS recurrence_frequency TEXT,
  ADD COLUMN IF NOT EXISTS recurrence_day TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'general_expenses_recurrence_frequency_check'
  ) THEN
    ALTER TABLE general_expenses
      ADD CONSTRAINT general_expenses_recurrence_frequency_check
      CHECK (
        recurrence_frequency IS NULL
        OR recurrence_frequency IN ('daily', 'weekly', 'monthly', 'yearly')
      );
  END IF;
END
$$;
