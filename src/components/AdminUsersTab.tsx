import React, { useState, useEffect } from 'react';
import { Input, Button, Toast } from 'antd-mobile';
import { SearchOutline } from 'antd-mobile-icons';
import apiClient from '../services/apiClient';

interface User {
    id: number;
    username: string;
    displayName: string;
    cash: number;
    stocks: number;
    debt: number;
    firstSignIn: boolean;
}

const AdminUsersTab: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [loading, setLoading] = useState(false);

    // 搜尋防抖（300ms）
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1); // 搜尋時重置為第一頁
        }, 300);

        return () => clearTimeout(timer);
    }, [search]);

    // 載入使用者列表
    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get('/admin/users', {
                params: { page, limit: 10, search: debouncedSearch },
            });
            setUsers(response.data.users);
            setTotalPages(response.data.totalPages);
        } catch (error: any) {
            console.error('[Admin] 載入使用者列表失敗:', error);
            Toast.show({ icon: 'fail', content: '載入失敗' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [page, debouncedSearch]);

    // 監聽刷新事件
    useEffect(() => {
        const handleRefresh = () => {
            fetchUsers();
        };
        window.addEventListener('user-list-refresh', handleRefresh);
        return () => window.removeEventListener('user-list-refresh', handleRefresh);
    }, [page, debouncedSearch]);

    // 編輯使用者
    const handleEdit = (userId: number) => {
        history.pushState(null, '', `#user-edit-${userId}`);
        window.dispatchEvent(new Event('hashchange'));
    };

    // 刪除使用者
    const handleDelete = (userId: number) => {
        history.pushState(null, '', `#user-delete-${userId}`);
        window.dispatchEvent(new Event('hashchange'));
    };

    return (
        <div style={{ padding: '20px' }}>
            {/* 標題列與 REFRESH 按鈕 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
                    C. 使用者設定 (玩家管理)
                </h3>
                <Button
                    size='small'
                    color='primary'
                    loading={loading}
                    onClick={fetchUsers}
                >
                    更新
                </Button>
            </div>

            {/* 搜尋框 */}
            <div style={{ position: 'relative', marginBottom: '16px' }}>
                <SearchOutline style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999', zIndex: 1 }} />
                <Input
                    placeholder='搜尋 username 或 displayName'
                    value={search}
                    onChange={setSearch}
                    style={{ paddingLeft: '36px' }}
                />
            </div>

            {/* 表格容器（水平滾動） */}
            <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
                <table style={{
                    width: '100%',
                    minWidth: '700px',
                    borderCollapse: 'collapse',
                    fontSize: '14px',
                }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f5f5f5' }}>
                            <th style={tableCellStyle}>ID</th>
                            <th style={tableCellStyle}>Username</th>
                            <th style={tableCellStyle}>DisplayName</th>
                            <th style={tableCellStyle}>持股</th>
                            <th style={tableCellStyle}>現金</th>
                            <th style={tableCellStyle}>負債</th>
                            <th style={tableCellStyle}>首次登入</th>
                            <th style={tableCellStyle}>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={8} style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                                    載入中...
                                </td>
                            </tr>
                        ) : users.length === 0 ? (
                            <tr>
                                <td colSpan={8} style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                                    無資料
                                </td>
                            </tr>
                        ) : (
                            users.map((user) => (
                                <tr key={user.id}>
                                    <td style={tableCellStyle}>{user.id}</td>
                                    <td style={tableCellStyle}>{user.username}</td>
                                    <td style={tableCellStyle}>{user.displayName}</td>
                                    <td style={tableCellStyle}>{user.stocks}</td>
                                    <td style={tableCellStyle}>${user.cash.toFixed(2)}</td>
                                    <td style={tableCellStyle}>${user.debt.toFixed(2)}</td>
                                    <td style={tableCellStyle}>{user.firstSignIn ? '是' : '否'}</td>
                                    <td style={tableCellStyle}>
                                        <Button
                                            size='mini'
                                            color='primary'
                                            fill='outline'
                                            style={{ marginRight: '8px' }}
                                            onClick={() => handleEdit(user.id)}
                                        >
                                            編輯
                                        </Button>
                                        <Button
                                            size='mini'
                                            color='danger'
                                            fill='outline'
                                            onClick={() => handleDelete(user.id)}
                                        >
                                            刪除
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* 分頁控制 */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px' }}>
                <Button
                    size='small'
                    disabled={page === 1 || loading}
                    onClick={() => setPage(page - 1)}
                >
                    上一頁
                </Button>
                <span style={{ fontSize: '14px', color: '#666' }}>
                    第 {page} / {totalPages} 頁
                </span>
                <Button
                    size='small'
                    disabled={page === totalPages || loading}
                    onClick={() => setPage(page + 1)}
                >
                    下一頁
                </Button>
            </div>
        </div>
    );
};

// 表格單元格樣式
const tableCellStyle: React.CSSProperties = {
    padding: '12px 8px',
    textAlign: 'left',
    borderBottom: '1px solid #f0f0f0',
};

export default AdminUsersTab;
