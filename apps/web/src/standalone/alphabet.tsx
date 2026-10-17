import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import VietnameseAlphabet from '../features/vietnamese-alphabet';
import '../styles.css';

// Link trong PJ6 cần router; MemoryRouter không phụ thuộc URL file:// khi mở file trực tiếp.
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MemoryRouter>
      <div className="alphabet-shell">
        <main id="main">
          <VietnameseAlphabet />
        </main>
      </div>
    </MemoryRouter>
  </React.StrictMode>,
);
