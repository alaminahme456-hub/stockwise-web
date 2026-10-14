-- Keep customer credit-payment history usable under the same store-membership RLS rule as sales.
drop policy if exists "Store members can manage customer payments" on public.customer_payments;
create policy "Store members can manage customer payments"
  on public.customer_payments
  for all
  using (public.is_store_member(store_id))
  with check (public.is_store_member(store_id));
