-- Room Studio là route đã triển khai, nên metadata phải được thêm khi nâng cấp DB,
-- không phụ thuộc việc người dùng chạy lại seed dữ liệu demo.
INSERT INTO portfolio_projects(slug,title,summary,description,stack,url,image_path)
VALUES (
  'room-studio',
  'Room Studio 3D',
  'Một căn phòng. Vô vàn ý tưởng.',
  'Thiết kế phòng 3D, sắp xếp nội thất và chia sẻ không gian của bạn.',
  ARRAY['React Three Fiber','Three.js','PostgreSQL'],
  '/projects/room-studio',
  '/images/room-studio.svg'
)
ON CONFLICT (slug) DO NOTHING;
