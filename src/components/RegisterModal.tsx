import React, { useEffect, useState } from 'react';
import { CenterPopup, Form, Input, Button } from 'antd-mobile';
import { CloseOutline } from 'antd-mobile-icons';
import { message } from 'antd';
import { authAPI } from '../services/auth';
import type { RegisterData, RegisterAdminData } from '../services/auth';

interface RegisterModalProps {
    isAdmin: boolean; // 判斷是否為管理員註冊
}

const RegisterModal: React.FC<RegisterModalProps> = ({ isAdmin }) => {
    const [visible, setVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();
    const [messageApi, contextHolder] = message.useMessage();

    // 監聽 URL hash 變化
    useEffect(() => {
        const handleHashChange = () => {
            setVisible(window.location.hash === '#register');
        };

        // 初始檢查
        handleHashChange();

        // 監聽 popstate 事件（手機返回鍵）
        window.addEventListener('popstate', handleHashChange);
        window.addEventListener('hashchange', handleHashChange);

        return () => {
            window.removeEventListener('popstate', handleHashChange);
            window.removeEventListener('hashchange', handleHashChange);
        };
    }, []);

    // 開啟浮動視窗
    const openModal = () => {
        history.pushState(null, '', '#register');
        setVisible(true);
    };

    // 關閉浮動視窗
    const closeModal = () => {
        if (window.location.hash === '#register') {
            history.back();
        }
        setVisible(false);
    };

    // 提交註冊
    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            setLoading(true);

            if (isAdmin) {
                // 管理員註冊
                const data: RegisterAdminData = {
                    username: values.username?.trim(),
                    password: values.password,
                    displayName: values.displayName?.trim(),
                    adminSecret: values.adminSecret,
                };
                await authAPI.registerAdmin(data);
            } else {
                // 一般使用者註冊
                const data: RegisterData = {
                    username: values.username?.trim(),
                    password: values.password,
                    displayName: values.displayName?.trim(),
                };
                await authAPI.register(data);
            }

            messageApi.success('註冊成功！請使用新帳號登入');
            setTimeout(() => {
                closeModal();
                form.resetFields();
            }, 1500);
        } catch (error: any) {
            const msg = error.response?.data?.error || '註冊失敗，請稍後再試';
            messageApi.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {contextHolder}
            {/* 觸發按鈕 */}
            <Button
                color="default"
                fill="none"
                onClick={openModal}
                style={{ marginTop: '10px' }}
            >
                線上開戶
            </Button>

            {/* 浮動視窗 */}
            <CenterPopup
                visible={visible}
                onMaskClick={closeModal}
                style={{ width: '90%', maxWidth: '400px' }}
            >
                <div style={{ padding: '20px' }}>
                    {/* 標題列 */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h2 style={{ margin: 0 }}>
                            {isAdmin ? '管理員開戶' : '線上開戶'}
                        </h2>
                        <CloseOutline fontSize={24} onClick={closeModal} style={{ cursor: 'pointer' }} />
                    </div>

                    {/* 表單 */}
                    <Form
                        form={form}
                        layout="vertical"
                        footer={
                            <Button
                                block
                                type="submit"
                                color="primary"
                                loading={loading}
                                onClick={handleSubmit}
                            >
                                送出
                            </Button>
                        }
                    >
                        <Form.Item
                            name="displayName"
                            label="遊戲暱稱"
                        >
                            <Input placeholder="請輸入顯示名稱（選填）" />
                        </Form.Item>

                        <Form.Item
                            name="username"
                            label="帳號"
                            rules={[{ required: true, message: '請輸入帳號' }]}
                        >
                            <Input placeholder="請輸入帳號" autoComplete="username" />
                        </Form.Item>

                        <Form.Item
                            name="password"
                            label="密碼"
                            rules={[
                                { required: true, message: '請輸入密碼' },
                                { 
                                    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
                                    message: '密碼至少8碼，需包含大小寫英文及數字'
                                }
                            ]}
                            help="至少8碼，需包含大小寫英文及數字"
                        >
                            <Input type="password" placeholder="至少8碼，需包含大小寫英文及數字" autoComplete="new-password" />
                        </Form.Item>

                        {/* 管理員專屬欄位 */}
                        {isAdmin && (
                            <Form.Item
                                name="adminSecret"
                                label="管理員金鑰"
                                rules={[{ required: true, message: '請輸入管理員金鑰' }]}
                            >
                                <Input type="password" placeholder="請輸入管理員金鑰" />
                            </Form.Item>
                        )}
                    </Form>
                </div>
            </CenterPopup>
        </>
    );
};

export default RegisterModal;
