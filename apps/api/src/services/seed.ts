import type { Pool } from 'pg';
export const examples = [
  ['toyota-camry', 'Toyota', 'Camry', 2023, 1180000000, 'hybrid', 'available'],
  ['mazda-cx5', 'Mazda', 'CX-5', 2024, 899000000, 'petrol', 'available'],
  ['bmw-320i', 'BMW', '320i', 2022, 1590000000, 'petrol', 'available'],
  ['mercedes-c200', 'Mercedes-Benz', 'C 200', 2023, 1780000000, 'petrol', 'available'],
  ['honda-civic', 'Honda', 'Civic', 2024, 870000000, 'petrol', 'available'],
  ['hyundai-tucson', 'Hyundai', 'Tucson', 2023, 825000000, 'diesel', 'available'],
  ['kia-seltos', 'Kia', 'Seltos', 2024, 689000000, 'petrol', 'available'],
  ['ford-everest', 'Ford', 'Everest', 2023, 1199000000, 'diesel', 'available'],
  ['vinfast-vf8', 'VinFast', 'VF 8', 2024, 1090000000, 'electric', 'available'],
  ['toyota-corolla', 'Toyota', 'Corolla Cross', 2022, 735000000, 'hybrid', 'reserved'],
  ['mazda-3', 'Mazda', 'Mazda 3', 2021, 599000000, 'petrol', 'sold'],
  ['honda-crv', 'Honda', 'CR-V', 2023, 1050000000, 'petrol', 'archived'],
] as const;
/** Seed chỉ thêm bản ghi chưa có; tái chạy không ghi đè dữ liệu admin đã chỉnh. */
export async function seed(pool: Pool) {
  const projects = [
    [
      'brick-playground',
      'Brick Playground 3D',
      'Từng viên gạch. Một thế giới mới.',
      'Lắp gạch 3D, chọn màu, kéo thả và chia sẻ công trình của bạn.',
      ['React Three Fiber', 'Three.js', 'PostgreSQL'],
      '/projects/brick-playground',
      '/images/brick-playground.svg',
    ],
    [
      'autohub',
      'AutoHub',
      'Tìm chiếc xe dành cho bạn.',
      'Tìm kiếm, so sánh và đặt lịch lái thử.',
      ['React', 'Node.js', 'PostgreSQL'],
      '/projects/autohub',
      '/images/car-1.svg',
    ],
    [
      'memory-match',
      'Memory Match',
      'Một thử thách nhỏ cho trí nhớ.',
      'Lật thẻ, tìm cặp và chinh phục bảng xếp hạng.',
      ['React', 'Game logic', 'PostgreSQL'],
      '/projects/memory-match',
      '/images/memory.svg',
    ],
    [
      'admin',
      'Control Center',
      'Mọi thứ trong tầm kiểm soát.',
      'Quản lý xe, yêu cầu khách hàng và thống kê.',
      ['TypeScript', 'Express', 'Authentication'],
      '/projects/admin',
      '/images/admin.svg',
    ],
    [
      'room-studio',
      'Room Studio 3D',
      'Một căn phòng. Vô vàn ý tưởng.',
      'Thiết kế phòng 3D, sắp xếp nội thất và chia sẻ không gian của bạn.',
      ['React Three Fiber', 'Three.js', 'PostgreSQL'],
      '/projects/room-studio',
      '/images/room-studio.svg',
    ],
  ];
  for (const p of projects)
    await pool.query(
      'INSERT INTO portfolio_projects(slug,title,summary,description,stack,url,image_path) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING',
      p,
    );
  for (const [i, c] of examples.entries())
    await pool.query(
      'INSERT INTO cars(slug,brand,model,year,price_vnd,fuel_type,status,mileage_km,transmission,seats,description,image_paths) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT DO NOTHING',
      [
        ...c,
        i * 3100,
        'automatic',
        c[0] === 'ford-everest' ? 7 : 5,
        `${c[1]} ${c[2]} — thiết kế tinh tế, vận hành êm ái. Xe được kiểm tra thông số và hồ sơ trước khi giới thiệu. Đây là dữ liệu minh họa của AutoHub.`,
        [`/images/car-${i + 1}.svg`, `/images/car-${((i + 3) % 12) + 1}.svg`],
      ],
    );
}
