## 6. Data Model

All tables live in Supabase Postgres with RLS enabled. Every table has `id uuid primary key default gen_random_uuid()` and `created_at timestamptz default now()`.

### profiles

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, references auth.users.id |
| username | text | unique, not null |
| name | text | not null |
| last_name | text | not null |
| xp | int | default 0 |
| level | int | default 1 |
| updated_at | timestamptz | |

### items

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | FK → profiles.id |
| name | text | not null |
| quantity | int | default 1 |
| photo_url | text | nullable, Supabase Storage URL |
| updated_at | timestamptz | |

### crafts

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | FK → profiles.id |
| title | text | not null |
| description | text | nullable |
| status | text | todo \| in_progress \| complete |
| photo_url | text | nullable |
| completed_at | timestamptz | nullable |
| updated_at | timestamptz | |

### suggestions (optional cache)

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | FK → profiles.id |
| title | text | not null |
| description | text | |
| required_materials | text[] | |
| source | text | llm \| curated |
| link | text | Link to tutorial |
| created_at | timestamptz | |

### XP Constants

- `XP_PER_CRAFT = 50`
- `level = floor(xp / 500) + 1` (recomputed on completion)

### xp_levels

| Column | Type | Notes |
|--------|------|-------|
| level | uuid | PK |
| min_xp | int8 | Minimum xp threshold |
| max_xp | int8 | Maximum xp threshold |
| title | text | not null |
| created_at | timestamptz | |
