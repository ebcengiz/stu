-- İşlem tarihi (özellikle manuel hareketlerde); boşsa arayüz created_at kullanır
ALTER TABLE stock_movements
  ADD COLUMN IF NOT EXISTS transaction_date date;
