import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import KidsLearning from '../features/kids-learning';
import '../styles.css';

// Bốn bài dùng route con; MemoryRouter không phụ thuộc URL file:// khi mở file trực tiếp.
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MemoryRouter initialEntries={['/projects/kids-learning']}>
      <div className="learning-shell">
        <main id="main">
          <Routes>
            <Route path="/projects/kids-learning/*" element={<KidsLearning />} />
          </Routes>
        </main>
      </div>
    </MemoryRouter>
  </React.StrictMode>,
);
