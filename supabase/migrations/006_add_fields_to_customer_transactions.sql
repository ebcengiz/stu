-- Add new fields to customer_transactions table
ALTER TABLE customer_transactions 
ADD COLUMN document_number TEXT,
ADD COLUMN waybill_number TEXT,
ADD COLUMN shipment_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN order_date TIMESTAMP WITH TIME ZONE;

-- Add comment to explain the fields
COMMENT ON COLUMN customer_transactions.document_number IS 'Belge numarası';
COMMENT ON COLUMN customer_transactions.waybill_number IS 'İrsaliye numarası';
COMMENT ON COLUMN customer_transactions.shipment_date IS 'Sevk tarihi';
COMMENT ON COLUMN customer_transactions.order_date IS 'Sipariş tarihi';
