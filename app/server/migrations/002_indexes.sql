create index if not exists idx_store_collection on store (collection);

create index if not exists idx_store_user on store ((data->>'user_id'))
  where data ? 'user_id';

create index if not exists idx_appeals_sponsor on store ((data->>'sponsor_org_id'))
  where collection = 'appeals';

create index if not exists idx_appeals_provider on store ((data->>'provider_org_id'))
  where collection = 'appeals';

create index if not exists idx_users_email on store ((lower(data->>'email')))
  where collection = 'users';

create index if not exists idx_store_data_gin on store using gin (data);
