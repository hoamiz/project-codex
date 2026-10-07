ALTER TABLE portfolio_projects DROP CONSTRAINT portfolio_projects_url_check;
ALTER TABLE portfolio_projects ADD CONSTRAINT portfolio_projects_url_check
  CHECK (url IN ('/projects/autohub', '/projects/memory-match', '/projects/admin', '/projects/room-studio'));

CREATE TABLE room_designs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title varchar(80) NOT NULL CHECK (char_length(title) BETWEEN 2 AND 80),
  layout jsonb NOT NULL CHECK (
    jsonb_typeof(layout) = 'object' AND
    COALESCE(layout->>'schemaVersion', '') = '1' AND
    layout ? 'items' AND jsonb_typeof(layout->'items') = 'array'
  ),
  idempotency_key uuid NOT NULL UNIQUE,
  payload_hash varchar(64) NOT NULL CHECK (payload_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);
