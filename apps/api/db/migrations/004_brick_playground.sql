ALTER TABLE portfolio_projects DROP CONSTRAINT portfolio_projects_url_check;
ALTER TABLE portfolio_projects ADD CONSTRAINT portfolio_projects_url_check
 CHECK(url IN('/projects/autohub','/projects/memory-match','/projects/admin','/projects/room-studio','/projects/brick-playground'));

CREATE TABLE brick_designs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 title varchar(80) NOT NULL CHECK(char_length(title) BETWEEN 2 AND 80),
 layout jsonb NOT NULL CHECK(jsonb_typeof(layout)='object' AND COALESCE(layout->>'schemaVersion','')='1' AND layout ? 'bricks' AND jsonb_typeof(layout->'bricks')='array'),
 idempotency_key uuid NOT NULL UNIQUE,
 payload_hash varchar(64) NOT NULL CHECK(payload_hash ~ '^[0-9a-f]{64}$'),
 created_at timestamptz NOT NULL DEFAULT now()
);

-- Đăng ký card khi nâng cấp, không cần seed; giữ metadata người dùng đã chỉnh.
INSERT INTO portfolio_projects(slug,title,summary,description,stack,url,image_path)
VALUES('brick-playground','Brick Playground 3D','Từng viên gạch. Một thế giới mới.','Lắp gạch 3D, chọn màu, kéo thả và chia sẻ công trình của bạn.',ARRAY['React Three Fiber','Three.js','PostgreSQL'],'/projects/brick-playground','/images/brick-playground.svg')
ON CONFLICT(slug) DO NOTHING;
