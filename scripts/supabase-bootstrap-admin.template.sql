create extension if not exists pgcrypto;

do $$
declare
  v_user_id text;
  v_month int := extract(month from current_date)::int;
  v_year int := extract(year from current_date)::int;
begin
  select id
  into v_user_id
  from "User"
  where username = '{{ADMIN_USERNAME}}'
  limit 1;

  if v_user_id is null then
    v_user_id := gen_random_uuid()::text;

    insert into "User" (
      id,
      username,
      password,
      name,
      email,
      role,
      "createdAt",
      "updatedAt"
    )
    values (
      v_user_id,
      '{{ADMIN_USERNAME}}',
      crypt('{{ADMIN_PASSWORD}}', gen_salt('bf', 12)),
      '{{ADMIN_NAME}}',
      '{{ADMIN_EMAIL}}',
      'admin',
      now(),
      now()
    );
  else
    update "User"
    set
      password = crypt('{{ADMIN_PASSWORD}}', gen_salt('bf', 12)),
      role = 'admin',
      name = '{{ADMIN_NAME}}',
      email = '{{ADMIN_EMAIL}}',
      "updatedAt" = now()
    where id = v_user_id;
  end if;

  insert into "UserSettings" (
    id,
    "monthlyIncome",
    "savingsPercentage",
    "createdAt",
    "updatedAt",
    "userId"
  )
  values (
    gen_random_uuid()::text,
    15000000,
    20,
    now(),
    now(),
    v_user_id
  )
  on conflict ("userId") do update
  set
    "updatedAt" = now();

  insert into "Category" (
    id,
    name,
    icon,
    color,
    type,
    budget,
    "allocationPercentage",
    "createdAt",
    "updatedAt",
    "userId"
  )
  select
    gen_random_uuid()::text,
    x.name,
    x.icon,
    x.color,
    x.type,
    x.budget,
    x.allocation_percentage,
    now(),
    now(),
    v_user_id
  from (
    values
      ('Gaji', 'Wallet', '#10b981', 'income', null::double precision, 0::double precision),
      ('Freelance', 'Laptop', '#06b6d4', 'income', null::double precision, 0::double precision),
      ('Investasi', 'TrendingUp', '#8b5cf6', 'income', null::double precision, 0::double precision),
      ('Lainnya', 'Plus', '#6b7280', 'income', null::double precision, 0::double precision),
      ('Makanan', 'Utensils', '#f97316', 'expense', 3000000::double precision, 15::double precision),
      ('Transportasi', 'Car', '#3b82f6', 'expense', 1500000::double precision, 10::double precision),
      ('Belanja', 'ShoppingBag', '#ec4899', 'expense', 2000000::double precision, 12::double precision),
      ('Hiburan', 'Gamepad2', '#14b8a6', 'expense', 1000000::double precision, 8::double precision),
      ('Tagihan', 'Receipt', '#ef4444', 'expense', 2500000::double precision, 15::double precision),
      ('Kesehatan', 'Heart', '#f43f5e', 'expense', 500000::double precision, 5::double precision),
      ('Pendidikan', 'GraduationCap', '#6366f1', 'expense', 1000000::double precision, 10::double precision),
      ('Lainnya', 'MoreHorizontal', '#9ca3af', 'expense', 500000::double precision, 5::double precision),
      ('Dana Darurat', 'Shield', '#0ea5e9', 'savings', null::double precision, 10::double precision),
      ('Investasi', 'TrendingUp', '#22c55e', 'savings', null::double precision, 10::double precision)
  ) as x(name, icon, color, type, budget, allocation_percentage)
  where not exists (
    select 1
    from "Category" c
    where c."userId" = v_user_id
      and c.name = x.name
      and c.type = x.type
  );

  insert into "Budget" (
    id,
    amount,
    period,
    month,
    year,
    "createdAt",
    "updatedAt",
    "categoryId",
    "userId"
  )
  select
    gen_random_uuid()::text,
    c.budget,
    'monthly',
    v_month,
    v_year,
    now(),
    now(),
    c.id,
    v_user_id
  from "Category" c
  where c."userId" = v_user_id
    and c.type = 'expense'
    and c.budget is not null
  on conflict ("userId", "categoryId", month, year) do update
  set
    amount = excluded.amount,
    period = excluded.period,
    "updatedAt" = now();

  if not exists (
    select 1
    from "Transaction"
    where "userId" = v_user_id
  ) then
    insert into "Transaction" (
      id,
      amount,
      description,
      type,
      date,
      notes,
      "createdAt",
      "updatedAt",
      "categoryId",
      "userId"
    )
    select
      gen_random_uuid()::text,
      t.amount,
      t.description,
      t.type,
      now() - make_interval(days => t.days_ago),
      null,
      now(),
      now(),
      c.id,
      v_user_id
    from (
      values
        ('Gaji Bulanan', 15000000::double precision, 'income', 'Gaji', 25),
        ('Project Website', 5000000::double precision, 'income', 'Freelance', 15),
        ('Dividen Saham', 500000::double precision, 'income', 'Investasi', 10),
        ('Bonus', 2000000::double precision, 'income', 'Lainnya', 5),
        ('Makan Siang', 45000::double precision, 'expense', 'Makanan', 0),
        ('Groceries', 350000::double precision, 'expense', 'Makanan', 2),
        ('Gojek ke Kantor', 25000::double precision, 'expense', 'Transportasi', 1),
        ('Bensin', 150000::double precision, 'expense', 'Transportasi', 5),
        ('Baju Baru', 450000::double precision, 'expense', 'Belanja', 7),
        ('Netflix', 54000::double precision, 'expense', 'Hiburan', 20),
        ('Spotify', 54990::double precision, 'expense', 'Hiburan', 20),
        ('Listrik', 350000::double precision, 'expense', 'Tagihan', 15),
        ('Internet', 450000::double precision, 'expense', 'Tagihan', 12),
        ('Vitamin', 150000::double precision, 'expense', 'Kesehatan', 8),
        ('Kursus Online', 500000::double precision, 'expense', 'Pendidikan', 18),
        ('Tabungan Dana Darurat', 1500000::double precision, 'savings', 'Dana Darurat', 25),
        ('Investasi Bulanan', 1500000::double precision, 'savings', 'Investasi', 25)
    ) as t(description, amount, type, category_name, days_ago)
    join "Category" c
      on c."userId" = v_user_id
     and c.name = t.category_name
     and c.type = t.type;
  end if;
end
$$;

select
  id,
  username,
  role,
  name,
  email,
  "createdAt",
  "updatedAt"
from "User"
where username = '{{ADMIN_USERNAME}}';
