-- Hesap silindiğinde müşteri/tedarikçi hareketlerindeki account_id engel olmasın (eski DB'lerde RESTRICT kalmış olabilir).
ALTER TABLE customer_transactions
  DROP CONSTRAINT IF EXISTS customer_transactions_account_id_fkey;

ALTER TABLE customer_transactions
  ADD CONSTRAINT customer_transactions_account_id_fkey
  FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE SET NULL;

ALTER TABLE supplier_transactions
  DROP CONSTRAINT IF EXISTS supplier_transactions_account_id_fkey;

ALTER TABLE supplier_transactions
  ADD CONSTRAINT supplier_transactions_account_id_fkey
  FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE SET NULL;
