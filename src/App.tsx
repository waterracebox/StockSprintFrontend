import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import AdminPage from './pages/AdminPage';
import DisplayPage from './pages/DisplayPage';
import ProtectedRoute from './components/ProtectedRoute';
import { SoundProvider } from './contexts/SoundContext';
import './App.css';

const App: React.FC = () => {
    return (
        <BrowserRouter>
            <Routes>
                {/* 預設導向登入頁 */}
                <Route path="/" element={<Navigate to="/login" replace />} />

                {/* 一般使用者登入頁 */}
                <Route path="/login" element={<LoginPage />} />

                {/* 管理員登入頁 */}
                <Route path="/adminLogin" element={<LoginPage isAdmin />} />

                {/* 受保護的首頁（啟用 BGM）*/}
                <Route
                    path="/home"
                    element={
                        <ProtectedRoute>
                            <SoundProvider>
                                <HomePage />
                            </SoundProvider>
                        </ProtectedRoute>
                    }
                />

                {/* Admin 後台頁面（禁用 BGM，避免與投影頁衝突） */}
                <Route
                    path="/admin"
                    element={
                        <ProtectedRoute>
                            <SoundProvider disableBgm={true}>
                                <AdminPage />
                            </SoundProvider>
                        </ProtectedRoute>
                    }
                />

                {/* 大螢幕展示頁（啟用 BGM）*/}
                <Route
                    path="/display"
                    element={
                        <ProtectedRoute>
                            <SoundProvider>
                                <DisplayPage />
                            </SoundProvider>
                        </ProtectedRoute>
                    }
                />
            </Routes>
        </BrowserRouter>
    );
};

export default App;