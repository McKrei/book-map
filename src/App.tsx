import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Header } from './components/Layout/Header';
import { UploadPage } from './components/Upload/UploadPage';
import { BookList } from './components/BookList/BookList';
import { MapPage } from './pages/MapPage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="h-screen flex flex-col bg-slate-900">
        <Header />
        <main className="flex-1 overflow-hidden">
          <Routes>
            <Route path="/" element={<UploadPage />} />
            <Route path="/books" element={<BookList />} />
            <Route path="/map/:bookId" element={<MapPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
