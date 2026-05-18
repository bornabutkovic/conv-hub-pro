DROP VIEW IF EXISTS public.attendee_invoice_summary;
CREATE VIEW public.attendee_invoice_summary AS
SELECT DISTINCT ON (a.id) a.id AS attendee_id,
    a.first_name,
    a.last_name,
    a.email,
    a.event_id,
    a.payment_status,
    a.status AS registration_status,
    a.checked_in,
    a.ticket_tier_id,
    a.created_at AS registered_at,
    a.price_paid,
    COALESCE(o_items.id, o_direct.id) AS order_id,
    COALESCE(o_items.order_number, o_direct.order_number) AS order_number,
    COALESCE(o_items.bc_invoice_id, o_direct.bc_invoice_id) AS bc_invoice_id,
    COALESCE(o_items.bc_quote_number, o_direct.bc_quote_number) AS bc_quote_number,
    COALESCE(o_items.fiscal_invoice_number, o_direct.fiscal_invoice_number) AS fiscal_invoice_number,
    COALESCE(o_items.bc_customer_no, o_direct.bc_customer_no) AS bc_customer_no,
    COALESCE(o_items.status, o_direct.status) AS order_status,
    COALESCE(o_items.payment_method, o_direct.payment_method) AS payment_method,
    COALESCE(o_items.payer_type, o_direct.payer_type) AS payer_type,
    COALESCE(o_items.payer_name, o_direct.payer_name) AS payer_name,
    COALESCE(o_items.total_amount, o_direct.total_amount) AS total_amount,
    COALESCE(o_items.is_group_order, o_direct.is_group_order) AS is_group_order,
    COALESCE(o_items.paid_at, o_direct.paid_at) AS paid_at,
    e.payment_due_days
   FROM attendees a
     LEFT JOIN order_items oi ON oi.attendee_id = a.id
     LEFT JOIN orders o_items ON o_items.id = oi.order_id AND (o_items.status IS NULL OR o_items.status <> 'cancelled'::payment_status)
     LEFT JOIN orders o_direct ON o_direct.attendee_id = a.id AND (o_direct.status IS NULL OR o_direct.status <> 'cancelled'::payment_status)
     LEFT JOIN events e ON e.id = a.event_id
  ORDER BY a.id, (COALESCE(o_items.created_at, o_direct.created_at)) DESC NULLS LAST;