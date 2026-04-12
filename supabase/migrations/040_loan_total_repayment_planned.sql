-- Çekilen tutar (total_loan_amount) ile ödenecek toplam planı ayrı saklanır
ALTER TABLE loans ADD COLUMN IF NOT EXISTS total_repayment_planned NUMERIC(15, 2);

COMMENT ON COLUMN loans.total_repayment_planned IS 'Ödenecek toplam tutar (sözleşme/plan); kalan borç ödemelerle düşer';
