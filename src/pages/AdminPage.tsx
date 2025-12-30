import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, NavBar, Badge, Button } from 'antd-mobile';
import { io } from 'socket.io-client';
import { authAPI } from '../services/auth';
import type { User } from '../services/auth';
import AdminControlTab from '../components/AdminControlTab';
import AdminParamsTab from '../components/AdminParamsTab';
import AdminUsersTab from '../components/AdminUsersTab';
import AdminUserModals from '../components/AdminUserModals';
import MonitorModal from '../components/MonitorModal';
import AdminScriptTab from '../components/admin/AdminScriptTab';
import AdminMiniGameTab from '../components/admin/AdminMiniGameTab';

// 解析 hash 以維持正確主頁籤（避免被子層 modal hash 影響）
const getTabFromHash = (hash: string): string => {
    const key = (hash || '').replace(/^#/, '').toLowerCase();
    if (key.startsWith('user')) return 'users';
    if (key.startsWith('script') || key.startsWith('event') || key.startsWith('json') || key.startsWith('ai')) return 'script';
    if (key === 'control' || key === 'params' || key === 'minigame') return key;
    return 'control';
};

const AdminPage: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [onlineCount, setOnlineCount] = useState<number>(0);
    const [showMonitor, setShowMonitor] = useState<boolean>(false);
    const [activeKey, setActiveKey] = useState<string>('control');
    const navigate = useNavigate();

    // 驗證 Admin 權限
    useEffect(() => {
        authAPI.getMe()
            .then((response) => {
                if (response.user.role !== 'ADMIN') {
                    navigate('/home');
                } else {
                    setUser(response.user);
                }
            })
            .catch(() => {
                navigate('/login');
            });
    }, [navigate]);

    // 建立 Socket 連接
    useEffect(() => {
        if (!user) return;

        const token = localStorage.getItem('token');
        if (!token) return;

        const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
        const newSocket = io(API_URL, {
            auth: { token },
            transports: ['websocket', 'polling'],
        });

        newSocket.on('connect', () => {
            console.log('[Admin] Socket 已連接');
        });

        newSocket.on('ONLINE_USERS_UPDATE', (payload: { count: number }) => {
            setOnlineCount(payload.count);
        });

        newSocket.on('disconnect', () => {
            console.log('[Admin] Socket 已斷開');
        });

        return () => {
            newSocket.disconnect();
        };
    }, [user]);

    // 監聽使用者列表刷新事件
    useEffect(() => {
        const handleRefresh = () => {
            console.log('[Admin] 使用者列表已刷新');
            // AdminUsersTab 會自動重新載入
        };

        window.addEventListener('user-list-refresh', handleRefresh);
        return () => window.removeEventListener('user-list-refresh', handleRefresh);
    }, []);

    // 初始化頁籤並監聽 hash 變化
    useEffect(() => {
        setActiveKey(getTabFromHash(window.location.hash));

        const handleHashChange = () => {
            setActiveKey(getTabFromHash(window.location.hash));
        };

        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    const handleTabChange = (key: string) => {
        setActiveKey(key);
        window.location.hash = key;
    };

    if (!user) {
        return <div style={{ textAlign: 'center', padding: '50px' }}>載入中...</div>;
    }

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', width: '100%', margin: 0, padding: 0 }}>
            {/* 頂部導覽列 */}
            <NavBar
                onBack={() => navigate('/home')}
                style={{ backgroundColor: '#1677ff', color: '#fff', position: 'sticky', top: 0, zIndex: 1000 }}
                right={
                    <div 
                        style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '10px',
                            padding: '0 8px'
                        }}
                    >
                        <Button
                            size='small'
                            color='primary'
                            fill='none'
                            style={{ fontSize: 12, color: '#8ec5ff', textDecoration: 'underline', padding: '0 6px', height: 'auto' }}
                            onClick={() => { window.open('/display', '_blank'); }}
                        >
                            投影頁
                        </Button>
                        <div 
                            style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '8px',
                                cursor: 'pointer'
                            }}
                            onClick={() => setShowMonitor(true)}
                        >
                            <span style={{ fontSize: '14px' }}>在線人數</span>
                            <Badge 
                                content={onlineCount} 
                                color='#52c41a'
                                style={{ '--right': '0px', '--top': '0px' }}
                            />
                        </div>
                    </div>
                }
            >
                Admin 後台
            </NavBar>

            {/* Tab 切換 */}
            <Tabs activeKey={activeKey} onChange={handleTabChange}>
                <Tabs.Tab title='遊戲控制' key='control'>
                    <AdminControlTab />
                </Tabs.Tab>
                <Tabs.Tab title='遊戲參數' key='params'>
                    <AdminParamsTab />
                </Tabs.Tab>
                <Tabs.Tab title='玩家管理' key='users'>
                    <AdminUsersTab />
                </Tabs.Tab>
                <Tabs.Tab title='遊戲劇本' key='script'>
                    <AdminScriptTab />
                </Tabs.Tab>
                <Tabs.Tab title='小遊戲' key='minigame'>
                    <AdminMiniGameTab />
                </Tabs.Tab>
            </Tabs>

            {/* 監控模態框 */}
            <MonitorModal 
                isOpen={showMonitor}
                onClose={() => setShowMonitor(false)}
            />

            {/* 使用者編輯/刪除浮動視窗 */}
            <AdminUserModals />
        </div>
    );
};

export default AdminPage;
