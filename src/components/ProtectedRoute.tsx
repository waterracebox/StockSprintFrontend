import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { authAPI } from '../services/auth';
import { DotLoading } from 'antd-mobile';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            setIsAuthenticated(false);
            return;
        }

        // 驗證 Token 是否有效
        authAPI
            .getMe()
            .then(() => setIsAuthenticated(true))
            .catch(() => {
                localStorage.removeItem('token');
                setIsAuthenticated(false);
            });
    }, []);

    if (isAuthenticated === null) {
        return (
            <div style={{ textAlign: 'center', padding: '50px' }}>
                <DotLoading />
            </div>
        );
    }

    return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
