-- InsightAI MVP 데이터 구조 (Supabase)
-- 데모 모드에서는 클라이언트 메모리/localStorage로 동작하며,
-- NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 설정 시 이 스키마에 연결한다.

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  plan text default 'free',
  created_at timestamptz default now()
);

create table if not exists datasets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  name text not null,
  category text,
  source text default 'upload', -- upload | demo
  row_count int default 0,
  period_start date,
  period_end date,
  created_at timestamptz default now()
);

create table if not exists dataset_rows (
  id bigserial primary key,
  dataset_id uuid references datasets(id) on delete cascade,
  date date not null,
  channel text,
  product text,
  revenue numeric default 0,
  orders int default 0,
  visitors int default 0,
  customers int default 0,
  new_customers int default 0,
  returning_customers int default 0,
  conversion_rate numeric default 0,
  aov numeric default 0,
  ad_spend numeric default 0
);
create index if not exists idx_dataset_rows_dataset_date on dataset_rows(dataset_id, date);

create table if not exists analyses (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid references datasets(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  name text,
  range_days int default 30,
  status text default 'completed',
  key_insight text,
  created_at timestamptz default now()
);

create table if not exists insights (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid references analyses(id) on delete cascade,
  category text,
  title text,
  description text,
  detail text,
  impact text
);

create table if not exists anomalies (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid references analyses(id) on delete cascade,
  severity text,
  title text,
  description text,
  metric text,
  date date,
  delta_pct numeric
);

create table if not exists forecasts (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid references analyses(id) on delete cascade,
  metric text,
  date date,
  value numeric,
  lower numeric,
  upper numeric
);

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid references analyses(id) on delete cascade,
  summary text,
  body jsonb,
  created_at timestamptz default now()
);

create table if not exists ai_queries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  dataset_id uuid references datasets(id) on delete cascade,
  question text,
  answer text,
  created_at timestamptz default now()
);
