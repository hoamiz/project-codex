-- Chỉ mở rộng whitelist và thêm card mới; không ghi đè sáu project hoặc dữ liệu người dùng đã chỉnh.
ALTER TABLE portfolio_projects DROP CONSTRAINT portfolio_projects_url_check;
ALTER TABLE portfolio_projects ADD CONSTRAINT portfolio_projects_url_check
 CHECK(url IN('/projects/autohub','/projects/memory-match','/projects/admin','/projects/room-studio','/projects/brick-playground','/projects/vietnamese-alphabet','/projects/kids-learning'));

INSERT INTO portfolio_projects(slug,title,summary,description,stack,url,image_path)
VALUES('kids-learning','Bé vui học tập','Mỗi nét vẽ. Một khám phá.','Nối số, tập đếm và đồ nét qua những chuyến đi nhỏ vui nhộn.',ARRAY['React','SVG','Vietnamese audio'],'/projects/kids-learning','/images/kids-learning.svg')
ON CONFLICT(slug) DO NOTHING;
