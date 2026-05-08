import React from 'react';
import { Link } from 'react-router-dom';

const Reports: React.FC = () => {
  const items = [
    {
      title: 'Danh sách bài báo cáo đang được cập nhật',
      desc: 'Trang này đã được giản lược để giữ đúng phong cách tinh tế, tập trung vào trải nghiệm điều hướng nhẹ nhàng.',
    },
    {
      title: 'Xem diễn giả',
      desc: 'Thông tin chi tiết của diễn giả và bài báo cáo hiện được tinh gọn vào các trang chuyên biệt khác.',
    },
    {
      title: 'Trình bày nội dung tối giản',
      desc: 'Thiết kế mới ưu tiên khoảng trắng, nhịp điệu đọc, và typography rõ ràng theo hệ thống toàn app.',
    },
  ];

  return (
    <div className="min-h-screen bg-surface text-gray-800">
      <header className="sticky top-0 z-50 border-b border-border-subtle bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-lg font-black text-white shadow-premium">VS</div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-academic-grey">VSAPS 2026</p>
              <p className="text-sm font-bold text-academic-navy">Bài báo cáo</p>
            </div>
          </Link>
          <Link to="/speakers-list" className="btn-premium btn-secondary-premium shadow-premium">Diễn giả</Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-4 inline-flex rounded-full border border-border-subtle bg-white px-4 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-academic-grey shadow-sm">
            Scientific Papers
          </p>
          <h1 className="text-4xl font-black tracking-tight text-academic-navy sm:text-5xl">Bài báo cáo khoa học</h1>
          <p className="mt-5 text-sm leading-7 text-academic-grey sm:text-base">
            Phiên bản mới được tối giản theo phong cách tinh tế của hệ thống, tập trung vào khả năng đọc và điều hướng.
          </p>
        </div>

        <section className="mt-12 grid gap-5 md:grid-cols-3">
          {items.map((item) => (
            <div key={item.title} className="card-premium p-6">
              <div className="mb-4 h-10 w-10 rounded-2xl bg-[#f6e8ef] text-secondary flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">description</span>
              </div>
              <h2 className="text-lg font-bold text-academic-navy">{item.title}</h2>
              <p className="mt-3 text-sm leading-7 text-academic-grey">{item.desc}</p>
            </div>
          ))}
        </section>

        <section className="mt-10 card-premium p-8 sm:p-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-academic-grey">Điều hướng nhanh</p>
              <h3 className="mt-2 text-2xl font-black text-academic-navy">Xem danh sách diễn giả</h3>
            </div>
            <Link to="/speakers-list" className="btn-premium btn-secondary-premium">Mở trang diễn giả</Link>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Reports;
