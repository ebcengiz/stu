-- Ödeme takvimi: Her Ay, İki Ayda Bir, … (haftalık seçenekler kaldırıldı)
ALTER TABLE loans DROP CONSTRAINT IF EXISTS loans_payment_schedule_check;

UPDATE loans SET payment_schedule = 'monthly'
  WHERE payment_schedule IN ('weekly', 'biweekly');

UPDATE loans SET payment_schedule = 'every_3_months'
  WHERE payment_schedule = 'quarterly';

ALTER TABLE loans ADD CONSTRAINT loans_payment_schedule_check CHECK (
  payment_schedule IN (
    'monthly',
    'every_2_months',
    'every_3_months',
    'every_4_months',
    'every_6_months',
    'yearly'
  )
);
