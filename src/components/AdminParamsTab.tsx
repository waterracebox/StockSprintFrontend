import React, { useState, useEffect, useMemo } from 'react';
import { Form, Input, Button, Toast } from 'antd-mobile';
import apiClient from '../services/apiClient';

const AdminParamsTab: React.FC = () => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [lastSavedParams, setLastSavedParams] = useState<Record<string, number>>({});
    const [dirtyFlags, setDirtyFlags] = useState<Record<string, boolean>>({});

    const fieldsOrder = useMemo(
        () => [
            'totalDays',
            'timeRatio',
            'initialPrice',
            'initialCash',
            'maxLeverage',
            'dailyInterestRate',
            'maxLoanAmount',
        ],
        []
    );

    const renderLabel = (name: string, labelText: string) => (
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', paddingLeft: 4 }}>
            {dirtyFlags[name] ? (
                <span
                    style={{
                        position: 'absolute',
                        left: -10,
                        top: -6,
                        background: '#ff4d4f',
                        color: '#fff',
                        borderRadius: 12,
                        padding: '2px 8px',
                        fontSize: 12,
                        lineHeight: 1.2,
                        boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                    }}
                >
                    未儲存
                </span>
            ) : null}
            <span>{labelText}</span>
        </div>
    );

    const updateDirtyFlags = (values: Record<string, any>, baseline?: Record<string, any>) => {
        const base = baseline || lastSavedParams;
        const nextFlags: Record<string, boolean> = {};
        fieldsOrder.forEach((key) => {
            const saved = base[key];
            const current = values[key];
            // 以數值比較，避免字串/數字類型差異
            const savedNumber = saved === undefined ? undefined : Number(saved);
            const currentNumber = current === undefined || current === '' ? undefined : Number(current);
            nextFlags[key] = savedNumber !== currentNumber;
        });
        setDirtyFlags(nextFlags);
    };

    // 載入參數
    const loadParams = async () => {
        try {
            const response = await apiClient.get('/admin/params');
            form.setFieldsValue(response.data);
            setLastSavedParams(response.data);
            updateDirtyFlags(response.data, response.data);
        } catch (error) {
            console.error('[Admin] 載入參數失敗:', error);
            Toast.show({ icon: 'fail', content: '載入參數失敗' });
        }
    };

    useEffect(() => {
        loadParams();
    }, []);

    // 儲存參數
    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            
            // 轉換為正確的數值類型
            const params = {
                timeRatio: Number(values.timeRatio),
                totalDays: Number(values.totalDays),
                initialPrice: Number(values.initialPrice),
                initialCash: Number(values.initialCash),
                maxLeverage: Number(values.maxLeverage),
                dailyInterestRate: Number(values.dailyInterestRate),
                maxLoanAmount: Number(values.maxLoanAmount),
            };

            setLoading(true);
            await apiClient.put('/admin/params', params);
            Toast.show({ icon: 'success', content: '參數已儲存' });

            // 記錄最新儲存狀態並清除未儲存標記
            setLastSavedParams(params);
            updateDirtyFlags(params, params);
        } catch (error: any) {
            console.error('[Admin] 儲存失敗:', error);
            Toast.show({ icon: 'fail', content: error.response?.data?.error || '儲存失敗' });
        } finally {
            setLoading(false);
        }
    };

    // 恢復預設值
    const handleReset = () => {
        const defaults = {
            timeRatio: 60,
            totalDays: 120,
            initialPrice: 50,
            initialCash: 200,
            maxLeverage: 10,
            dailyInterestRate: 0.0001,
            maxLoanAmount: 1000,
        };
        form.setFieldsValue(defaults);
        updateDirtyFlags({ ...form.getFieldsValue(), ...defaults });
    };

    const handleValuesChange = () => {
        const allValues = form.getFieldsValue();
        updateDirtyFlags(allValues);
    };

    return (
        <div style={{ padding: '20px', maxWidth: '100%', boxSizing: 'border-box' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 'bold' }}>
                遊戲參數
            </h3>

            <Form 
                form={form} 
                layout='horizontal'
                style={{ '--border-bottom': 'none' }}
                onValuesChange={handleValuesChange}
            >
                <Form.Item 
                    name='totalDays' 
                    label={renderLabel('totalDays', '遊戲總天數')}
                    rules={[{ required: true, message: '請輸入遊戲總天數' }]}
                >
                    <Input type='number' placeholder='120' />
                </Form.Item>

                <Form.Item 
                    name='timeRatio' 
                    label={renderLabel('timeRatio', '遊戲/現實比例')}
                    extra='秒/遊戲天'
                    rules={[{ required: true, message: '請輸入時間比例' }]}
                >
                    <Input type='number' placeholder='60' />
                </Form.Item>

                <Form.Item 
                    name='initialCash' 
                    label={renderLabel('initialCash', '初始新台幣')}
                    extra='元'
                    rules={[{ required: true, message: '請輸入初始現金' }]}
                >
                    <Input type='number' placeholder='50' />
                </Form.Item>

                <Form.Item 
                    name='initialPrice' 
                    label={renderLabel('initialPrice', '股票初始價格')}
                    extra='元'
                    rules={[{ required: true, message: '請輸入初始價格' }]}
                >
                    <Input type='number' placeholder='50' />
                </Form.Item>

                <Form.Item 
                    name='maxLeverage' 
                    label={renderLabel('maxLeverage', '槓桿最高倍數')}
                    rules={[{ required: true, message: '請輸入最高槓桿' }]}
                >
                    <Input type='number' placeholder='10' />
                </Form.Item>

                <Form.Item 
                    name='dailyInterestRate' 
                    label={renderLabel('dailyInterestRate', '地下錢莊日利率')}
                    rules={[{ required: true, message: '請輸入日利率' }]}
                >
                    <Input type='number' placeholder='0.0001' step='0.0001' />
                </Form.Item>

                <Form.Item 
                    name='maxLoanAmount' 
                    label={renderLabel('maxLoanAmount', '最高借款金額')}
                    extra='元'
                    rules={[{ required: true, message: '請輸入最高借款金額' }]}
                >
                    <Input type='number' placeholder='10000' />
                </Form.Item>
            </Form>

            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <Button 
                    block 
                    color='primary' 
                    onClick={handleSave}
                    loading={loading}
                >
                    儲存參數
                </Button>
                <Button 
                    block 
                    color='default' 
                    onClick={handleReset}
                    disabled={loading}
                >
                    恢復初始參數
                </Button>
            </div>

            <div style={{ 
                fontSize: '12px', 
                color: '#ff4d4f', 
                marginTop: '12px',
                padding: '12px',
                backgroundColor: '#fff2e8',
                borderRadius: '8px',
                border: '1px solid #ffbb96'
            }}>
                <strong>⚠️ 注意事項：</strong>
                <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                    <li>修改 <strong>timeRatio</strong> 會即時調整遊戲速度，但<strong>不會</strong>改變當前天數與剩餘秒數。</li>
                    <li>修改 <strong>maxLeverage</strong>、<strong>dailyInterestRate</strong>、<strong>maxLoanAmount</strong> 會透過 WebSocket 即時更新所有玩家的介面。</li>
                    <li>管理員可以在遊戲<strong>運行中</strong>動態調整參數，無需停止遊戲。</li>
                </ul>
            </div>
        </div>
    );
};

export default AdminParamsTab;
