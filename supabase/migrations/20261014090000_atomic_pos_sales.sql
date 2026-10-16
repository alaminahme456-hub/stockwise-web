-- Make POS checkout atomic and idempotent; keep sales, line items, stock, and stock history consistent.
alter table public.sales
  add column if not exists amount_tendered numeric,
  add column if not exists change_due numeric,
  add column if not exists amount_paid numeric,
  add column if not exists balance_due numeric,
  add column if not exists due_date date,
  add column if not exists checkout_key text;

alter table public.sales drop constraint if exists sales_payment_method_check;
alter table public.sales
  add constraint sales_payment_method_check
  check (payment_method = any (array['cash','bank_transfer','pos','card','mixed','credit']::text[]));

create unique index if not exists sales_store_checkout_key_uidx
  on public.sales (store_id, checkout_key)
  where checkout_key is not null;

create table if not exists public.customer_payments (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  customer_id uuid not null references public.customers(id),
  customer_name text,
  sale_id uuid references public.sales(id) on delete set null,
  amount numeric not null check (amount >= 0),
  payment_method text not null default 'cash'
    check (payment_method = any (array['cash','bank_transfer','pos','card','other']::text[])),
  payment_date timestamptz not null default timezone('utc'::text, now()),
  notes text,
  reference_id text,
  recorded_by text,
  created_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.customer_payments enable row level security;

create or replace function public.complete_pos_sale(
  p_store_id uuid,
  p_sale jsonb,
  p_items jsonb,
  p_checkout_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_sale public.sales%rowtype;
  v_item record;
  v_product public.products%rowtype;
  v_new_stock numeric;
  v_items_count integer;
begin
  if v_user_id is null then
    raise exception 'You must be signed in to complete a sale';
  end if;

  if not exists (
    select 1 from public.stores s
    where s.id = p_store_id
      and (
        s.owner_id = v_user_id
        or exists (
          select 1 from public.store_members sm
          where sm.store_id = s.id
            and sm.user_id = v_user_id
            and coalesce(sm.status, 'active') = 'active'
        )
      )
  ) then
    raise exception 'You do not have access to this store';
  end if;

  if p_checkout_key is null or length(trim(p_checkout_key)) = 0 then
    raise exception 'A checkout idempotency key is required';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'A sale must contain at least one item';
  end if;

  select * into v_sale
  from public.sales
  where store_id = p_store_id and checkout_key = p_checkout_key;

  if found then
    return jsonb_build_object(
      'sale', to_jsonb(v_sale),
      'items', coalesce((
        select jsonb_agg(to_jsonb(si) order by si.created_at)
        from public.sale_items si where si.sale_id = v_sale.id
      ), '[]'::jsonb)
    );
  end if;

  select count(*) into v_items_count
  from jsonb_to_recordset(p_items) as i(product_id uuid, quantity numeric);
  if v_items_count = 0 then
    raise exception 'A sale must contain at least one item';
  end if;

  if exists (
    select 1 from jsonb_to_recordset(p_items) as i(product_id uuid, quantity numeric)
    where i.product_id is null or i.quantity is null or i.quantity <= 0
  ) then
    raise exception 'Each sale item must have a product and a positive quantity';
  end if;

  insert into public.sales (
    store_id, customer_id, customer_name, subtotal, discount, tax, total_amount,
    payment_method, status, staff_name, notes, amount_tendered, change_due,
    amount_paid, balance_due, due_date, checkout_key
  ) values (
    p_store_id,
    nullif(p_sale->>'customerId', '')::uuid,
    nullif(p_sale->>'customerName', ''),
    coalesce(nullif(p_sale->>'subtotal', '')::numeric, 0),
    coalesce(nullif(p_sale->>'discount', '')::numeric, 0),
    coalesce(nullif(p_sale->>'tax', '')::numeric, 0),
    coalesce(nullif(p_sale->>'totalAmount', '')::numeric, 0),
    p_sale->>'paymentMethod',
    'completed',
    nullif(p_sale->>'staffName', ''),
    nullif(p_sale->>'notes', ''),
    nullif(p_sale->>'amountTendered', '')::numeric,
    nullif(p_sale->>'changeDue', '')::numeric,
    nullif(p_sale->>'amountPaid', '')::numeric,
    nullif(p_sale->>'balanceDue', '')::numeric,
    nullif(p_sale->>'dueDate', '')::date,
    p_checkout_key
  )
  returning * into v_sale;

  for v_item in
    select *
    from jsonb_to_recordset(p_items) as i(
      product_id uuid, product_name text, sku text, quantity numeric,
      unit_price numeric, cost_price numeric, subtotal numeric
    )
  loop
    select * into v_product
    from public.products
    where id = v_item.product_id and store_id = p_store_id
    for update;

    if not found then
      raise exception 'A product in this sale does not belong to this store';
    end if;

    if coalesce(v_product.current_stock, 0) < v_item.quantity then
      raise exception 'Insufficient stock for % (available %, requested %)',
        v_product.name, coalesce(v_product.current_stock, 0), v_item.quantity;
    end if;

    v_new_stock := v_product.current_stock - v_item.quantity;

    update public.products
    set current_stock = v_new_stock, updated_at = timezone('utc'::text, now())
    where id = v_product.id and store_id = p_store_id;

    insert into public.inventory_movements (
      store_id, product_id, type, quantity, previous_stock, new_stock, reason, performed_by
    ) values (
      p_store_id, v_product.id, 'sale', v_item.quantity,
      v_product.current_stock, v_new_stock,
      'POS Sale #' || left(v_sale.id::text, 8) || ': ' || v_item.quantity || ' ' || v_product.name,
      coalesce(nullif(p_sale->>'staffName', ''), 'Cashier')
    );

    insert into public.sale_items (
      sale_id, product_id, product_name, sku, quantity, unit_price, cost_price, subtotal
    ) values (
      v_sale.id, v_product.id, coalesce(v_item.product_name, v_product.name),
      coalesce(v_item.sku, v_product.sku), v_item.quantity, v_item.unit_price,
      coalesce(v_item.cost_price, 0), v_item.subtotal
    );
  end loop;

  if p_sale->>'paymentMethod' = 'credit'
    and coalesce(nullif(p_sale->>'amountPaid', '')::numeric, 0) > 0
    and nullif(p_sale->>'customerId', '') is not null then
    insert into public.customer_payments (
      store_id, customer_id, customer_name, sale_id, amount, payment_method,
      payment_date, notes, reference_id, recorded_by
    ) values (
      p_store_id,
      (p_sale->>'customerId')::uuid,
      nullif(p_sale->>'customerName', ''),
      v_sale.id,
      (p_sale->>'amountPaid')::numeric,
      'cash',
      timezone('utc'::text, now()),
      'Upfront deposit for Credit Sale #' || upper(left(v_sale.id::text, 8)),
      'DEP-' || upper(left(v_sale.id::text, 8)),
      coalesce(nullif(p_sale->>'staffName', ''), 'Cashier')
    );
  end if;

  return jsonb_build_object(
    'sale', to_jsonb(v_sale),
    'items', coalesce((
      select jsonb_agg(to_jsonb(si) order by si.created_at)
      from public.sale_items si where si.sale_id = v_sale.id
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.complete_pos_sale(uuid, jsonb, jsonb, text) from public;
grant execute on function public.complete_pos_sale(uuid, jsonb, jsonb, text) to authenticated;
