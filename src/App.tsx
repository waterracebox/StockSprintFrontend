import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import ProtectedRoute from './components/ProtectedRoute';
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

                {/* 受保護的首頁 */}
                <Route
                    path="/home"
                    element={
                        <ProtectedRoute>
                            <HomePage />
                        </ProtectedRoute>
                    }
                />
            </Routes>
        </BrowserRouter>
    );
};

export default App;