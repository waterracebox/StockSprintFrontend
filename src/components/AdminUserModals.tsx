import React, { useState, useEffect } from 'react';
import { CenterPopup, Form, Input, Switch, Button, Toast, Dialog } from 'antd-mobile';
import { CloseOutline } from 'antd-mobile-icons';
import apiClient from '../services/apiClient';

interface User {
    id: number;
    username: string;
    displayName: string;
    cash: number;
    stocks: number;
    debt: number;
    firstSignIn: boolean;
    isEmployee: boolean;
}

const AdminUserModals: React.FC = () => {
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();

    // 監聽 Hash 變化
    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash;

            // 編輯視窗
            const editMatch = hash.match(/#user-edit-(\d+)/);
            if (editMatch) {
                const userId = parseInt(editMatch[1]);
                fetchUser(userId);
                setEditModalVisible(true);
                return;
            }

            // 刪除視窗
            const deleteMatch = hash.match(/#user-delete-(\d+)/);
            if (deleteMatch) {
                const userId = parseInt(deleteMatch[1]);
                fetchUser(userId);
                setDeleteModalVisible(true);
                return;
            }

            // 關閉所有視窗
            setEditModalVisible(false);
            setDeleteModalVisible(false);
        };

        handleHashChange(); // 初始檢查
        window.addEventListener('hashchange', handleHashChange);
        window.addEventListener('popstate', handleHashChange);

        return () => {
            window.removeEventListener('hashchange', handleHashChange);
            window.removeEventListener('popstate', handleHashChange);
        };
    }, []);

    // 載入使用者資料
    const fetchUser = async (userId: number) => {
        try {
            const response = await apiClient.get(`/admin/users?search=&page=1&limit=1000`);
            const user = response.data.users.find((u: User) => u.id === userId);
            if (user) {
                setCurrentUser(user);
                form.setFieldsValue({
                    displayName: user.displayName,
                    cash: user.cash,
                    stocks: user.stocks,
                    debt: user.debt,
                    firstSignIn: user.firstSignIn,
                    isEmployee: user.isEmployee,
                    password: '', // 密碼欄位留空
                });
            }
        } catch (error) {
            console.error('[Admin] 載入使用者資料失敗:', error);
            Toast.show({ icon: 'fail', content: '載入失敗' });
        }
    };

    // 關閉視窗
    const closeModal = () => {
        if (window.location.hash) {
            history.back();
        }
    };

    // 儲存編輯
    const handleSaveEdit = async () => {
        try {
            const values = await form.validateFields();
            setLoading(true);

            await apiClient.put(`/admin/users/${currentUser!.id}`, {
                displayName: values.displayName,
                cash: parseFloat(values.cash),
                stocks: parseInt(values.stocks),
                debt: parseFloat(values.debt),
                firstSignIn: values.firstSignIn,
                isEmployee: values.isEmployee,
                password: values.password || undefined, // 若為空，後端不更新密碼
            });

            Toast.show({ icon: 'success', content: '使用者資料已更新' });
            closeModal();

            // 刷新列表（觸發父元件重新載入）
            window.dispatchEvent(new Event('user-list-refresh'));
        } catch (error: any) {
            console.error('[Admin] 更新使用者失敗:', error);
            Toast.show({ icon: 'fail', content: error.response?.data?.error || '更新失敗' });
        } finally {
            setLoading(false);
        }
    };

    // 確認刪除
    const handleConfirmDelete = async () => {
        const confirmed = await Dialog.confirm({
            content: `您確定要刪除使用者「${currentUser?.username}」嗎？此操作無法復原！`,
            confirmText: '確定刪除',
            cancelText: '取消',
        });

        if (!confirmed) return;

        try {
            setLoading(true);
            await apiClient.delete(`/admin/users/${currentUser!.id}`);
            Toast.show({ icon: 'success', content: '使用者已刪除' });
            closeModal();

            // 刷新列表
            window.dispatchEvent(new Event('user-list-refresh'));
        } catch (error: any) {
            console.error('[Admin] 刪除使用者失敗:', error);
            Toast.show({ icon: 'fail', content: error.response?.data?.error || '刪除失敗' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* 編輯視窗 */}
            <CenterPopup
                visible={editModalVisible}
                onMaskClick={undefined} // 禁止點擊遮罩關閉
                style={{ width: '90%', maxWidth: '500px', maxHeight: '90vh' }}
            >
                <div style={{ padding: '20px', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                    {/* 標題列 */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 1, paddingBottom: '10px' }}>
                        <h2 style={{ margin: 0 }}>編輯玩家: {currentUser?.username}</h2>
                        <CloseOutline fontSize={24} onClick={closeModal} style={{ cursor: 'pointer' }} />
                    </div>

                    {/* 表單容器 */}
                    <div style={{ flex: 1, overflowY: 'auto', marginBottom: '16px' }}>
                        <Form form={form} layout='vertical'>
                        <Form.Item label='Username'>
                            <Input value={currentUser?.username} disabled />
                        </Form.Item>
                        <Form.Item name='displayName' label='DisplayName' rules={[{ required: true }]}>
                            <Input placeholder='顯示名稱' />
                        </Form.Item>
                        <Form.Item name='stocks' label='持股' rules={[{ required: true }]}>
                            <Input type='number' placeholder='張數' />
                        </Form.Item>
                        <Form.Item name='cash' label='現金' rules={[{ required: true }]}>
                            <Input type='number' placeholder='元' />
                        </Form.Item>
                        <Form.Item name='debt' label='負債' rules={[{ required: true }]}>
                            <Input type='number' placeholder='元' />
                        </Form.Item>
                        <Form.Item name='password' label='密碼'>
                            <Input type='password' placeholder='留空 = 不變更' />
                        </Form.Item>
                        <Form.Item name='firstSignIn' label='首次登入' valuePropName='checked'>
                            <Switch />
                        </Form.Item>
                        <Form.Item name='isEmployee' label='員工身份' valuePropName='checked'>
                            <Switch />
                        </Form.Item>
                    </Form>
                    </div>

                    {/* 按鈕固定在底部 */}
                    <div style={{ position: 'sticky', bottom: 0, backgroundColor: 'white', paddingTop: '10px' }}>
                        <Button
                            block
                            color='primary'
                            loading={loading}
                            onClick={handleSaveEdit}
                        >
                            儲存變更
                        </Button>
                    </div>
                </div>
            </CenterPopup>

            {/* 刪除視窗 */}
            <CenterPopup
                visible={deleteModalVisible}
                onMaskClick={undefined} // 禁止點擊遮罩關閉
                style={{ width: '90%', maxWidth: '400px' }}
            >
                <div style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h2 style={{ margin: 0, color: '#ff4d4f' }}>警告！</h2>
                        <CloseOutline fontSize={24} onClick={closeModal} style={{ cursor: 'pointer' }} />
                    </div>

                    <p style={{ fontSize: '15px', marginBottom: '20px' }}>
                        您確定要刪除這位玩家嗎？<br />
                        <strong>Username:</strong> {currentUser?.username}<br />
                        <strong>DisplayName:</strong> {currentUser?.displayName}
                    </p>

                    <p style={{ fontSize: '13px', color: '#ff4d4f', marginBottom: '20px' }}>
                        ⚠️ 此操作無法復原！
                    </p>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <Button
                            block
                            color='danger'
                            loading={loading}
                            onClick={handleConfirmDelete}
                        >
                            確定刪除
                        </Button>
                        <Button
                            block
                            fill='outline'
                            onClick={closeModal}
                        >
                            取消
                        </Button>
                    </div>
                </div>
            </CenterPopup>
        </>
    );
};

export default AdminUserModals;
