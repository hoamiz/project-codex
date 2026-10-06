CREATE TABLE portfolio_projects (
 slug text PRIMARY KEY, title text NOT NULL, summary text NOT NULL, description text NOT NULL,
 stack text[] NOT NULL, url text NOT NULL CHECK(url IN('/projects/autohub','/projects/memory-match','/projects/admin')), image_path text NOT NULL
);
CREATE TABLE cars (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),slug text NOT NULL UNIQUE,brand text NOT NULL,model text NOT NULL,
 year integer NOT NULL CHECK(year BETWEEN 1900 AND 2100),price_vnd bigint NOT NULL CHECK(price_vnd BETWEEN 0 AND 9000000000000),
 mileage_km integer NOT NULL CHECK(mileage_km>=0),fuel_type text NOT NULL CHECK(fuel_type IN('petrol','diesel','electric','hybrid')),
 transmission text NOT NULL CHECK(transmission IN('automatic','manual')),seats integer NOT NULL CHECK(seats BETWEEN 2 AND 12),
 description text NOT NULL,status text NOT NULL DEFAULT 'available' CHECK(status IN('available','reserved','sold','archived')),
 image_paths text[] NOT NULL,version integer NOT NULL DEFAULT 1,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX cars_filter_idx ON cars(status,brand,price_vnd);
CREATE TABLE leads (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),car_id uuid NOT NULL REFERENCES cars(id),type text NOT NULL CHECK(type IN('consultation','test_drive')),
 name text NOT NULL,phone text NOT NULL,email text,preferred_at timestamptz,message text,
 status text NOT NULL DEFAULT 'new' CHECK(status IN('new','in_progress','completed','cancelled')),
 idempotency_key text NOT NULL UNIQUE,payload_hash text NOT NULL,version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(type!='test_drive' OR preferred_at IS NOT NULL)
);
CREATE INDEX leads_filter_idx ON leads(status,type,created_at);
CREATE TABLE admin_users(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),email text NOT NULL UNIQUE,password_hash text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE auth_sessions(sid varchar PRIMARY KEY,sess json NOT NULL,expire timestamp NOT NULL);
CREATE INDEX auth_sessions_expire_idx ON auth_sessions(expire);
CREATE TABLE game_sessions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),token_hash text NOT NULL,state jsonb NOT NULL,expires_at timestamptz NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE game_results(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),session_id uuid NOT NULL UNIQUE REFERENCES game_sessions(id),nickname varchar(30) NOT NULL,difficulty text NOT NULL CHECK(difficulty IN('easy','medium','hard')),moves integer NOT NULL CHECK(moves>0),elapsed_ms integer NOT NULL CHECK(elapsed_ms>=0),created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX leaderboard_idx ON game_results(difficulty,moves,elapsed_ms,created_at);
