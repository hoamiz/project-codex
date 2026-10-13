-- Mở whitelist và thêm card PJ6 khi API nâng cấp DB5 project; không sửa migration đã áp dụng.
ALTER TABLE portfolio_projects DROP CONSTRAINT portfolio_projects_url_check;
ALTER TABLE portfolio_projects ADD CONSTRAINT portfolio_projects_url_check
 CHECK(url IN('/projects/autohub','/projects/memory-match','/projects/admin','/projects/room-studio','/projects/brick-playground','/projects/vietnamese-alphabet'));

INSERT INTO portfolio_projects(slug,title,summary,description,stack,url,image_path)
VALUES('vietnamese-alphabet','Bé vui học chữ','Chữ nhỏ. Thế giới to.','Khám phá29 chữ cái tiếng Việt qua hình minh họa và giọng đọc thân thiện.',ARRAY['React','TypeScript','Vietnamese audio'],'/projects/vietnamese-alphabet','/images/vietnamese-alphabet.svg')
ON CONFLICT(slug) DO NOTHING;
