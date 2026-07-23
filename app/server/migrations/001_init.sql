create table if not exists store (
  collection text not null,
  id bigint not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  primary key (collection, id)
);

create table if not exists seq (
  collection text primary key,
  val bigint not null default 0
);
