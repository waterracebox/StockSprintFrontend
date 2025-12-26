import React, { useEffect, useRef, useState } from 'react';
import { Button, Card, Checkbox, Dialog, Form, Input, List, Popup, Radio, Space, Tag, Toast, Tabs } from 'antd-mobile';
import { io, Socket } from 'socket.io-client';
import { redEnvelopeService, type RedEnvelopeItem } from '../../services/redEnvelopeService';

interface MiniGameSyncPayload {
    gameType: 'NONE' | 'RED_ENVELOPE' | 'QUIZ' | 'MINORITY';
    phase: string;
    startTime: number;
    endTime: number;
    data: any;
}

const AdminMiniGameTab: React.FC = () => {
    const socketRef = useRef<Socket | null>(null);
    const [status, setStatus] = useState<MiniGameSyncPayload>({
        gameType: 'NONE',
        phase: 'IDLE',
        startTime: 0,
        endTime: 0,
        data: {},
    });
    const [allowGuest, setAllowGuest] = useState<boolean>(false);
    const [items, setItems] = useState<RedEnvelopeItem[]>([]);
    const [itemModalOpen, setItemModalOpen] = useState<boolean>(false);
    const [editingItem, setEditingItem] = useState<RedEnvelopeItem | null>(null);
    const [itemForm] = Form.useForm<Record<string, any>>();

    const loadItems = async () => {
        try {
            const data = await redEnvelopeService.getItems();
            setItems(data);
        } catch (error: any) {
            console.error('[MiniGame][Admin] 讀取紅包獎項失敗:', error);
            Toast.show({ icon: 'fail', content: error?.response?.data?.error || '讀取紅包獎項失敗' });
        }
    };

    // 建立專用 Socket，避免干擾其他頁面連線
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            Toast.show({ icon: 'fail', content: '缺少授權，請重新登入後操作' });
            return;
        }

        let socketUrl: string;
        if (import.meta.env.PROD) {
            const apiUrl = (import.meta.env.VITE_API_URL as string) || '';
            socketUrl = apiUrl.replace(/\/?api$/, '');
        } else {
            socketUrl = 'http://127.0.0.1:8000';
        }

        const s = io(socketUrl, {
            auth: { token },
            transports: ['websocket', 'polling'],
        });
        socketRef.current = s;

        s.on('connect', () => {
            console.log('[MiniGame][Admin] Socket 已連線', s.id);
        });

        s.on('MINIGAME_SYNC', (payload: MiniGameSyncPayload) => {
            console.log('[MiniGame][Admin] 收到同步', payload);
            setStatus(payload);
            if (payload.gameType === 'RED_ENVELOPE' && typeof payload.data?.allowGuest === 'boolean') {
                setAllowGuest(Boolean(payload.data.allowGuest));
            }
        });

        s.on('disconnect', (reason) => {
            console.log('[MiniGame][Admin] Socket 已斷線', reason);
        });

        loadItems();

        return () => {
            s.disconnect();
        };
    }, []);

    const handleReset = async () => {
        const confirmed = await Dialog.confirm({
            content: '確定要強制結束本局嗎？',
            closeOnMaskClick: false,
        });
        if (!confirmed) return;

        socketRef.current?.emit('ADMIN_MINIGAME_ACTION', { type: 'RESET_GAME' });
        Toast.show({ icon: 'success', content: '已送出重置指令' });
    };

    const handleInitGame = () => {
        if (!socketRef.current) {
            Toast.show({ icon: 'fail', content: '尚未連線，請稍後重試' });
            return;
        }

        socketRef.current.emit('ADMIN_MINIGAME_ACTION', { type: 'INIT_GAME', allowGuest });
        Toast.show({ icon: 'success', content: '已送出初始化指令' });
    };

    const handleOpenCreate = () => {
        setEditingItem(null);
        itemForm.resetFields();
        itemForm.setFieldsValue({ type: 'PHYSICAL', prizeValue: 0, amount: 1, displayOrder: items.length, isActive: 'true' });
        setItemModalOpen(true);
    };

    const handleOpenEdit = (item: RedEnvelopeItem) => {
        setEditingItem(item);
        itemForm.setFieldsValue({ ...item, isActive: item.isActive ? 'true' : 'false' });
        setItemModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        const confirmed = await Dialog.confirm({ content: '確認刪除此獎項嗎？', closeOnMaskClick: false });
        if (!confirmed) return;

        try {
            await redEnvelopeService.deleteItem(id);
            Toast.show({ icon: 'success', content: '已刪除' });
            loadItems();
        } catch (error: any) {
            console.error('[MiniGame][Admin] 刪除獎項失敗:', error);
            Toast.show({ icon: 'fail', content: error?.response?.data?.error || '刪除獎項失敗' });
        }
    };

    const handleSubmitItem = async (values: any) => {
        try {
            if (values.type === 'CASH' && values.prizeValue === undefined) {
                Toast.show({ icon: 'fail', content: '現金獎項需填寫現金額度' });
                return;
            }

            const payload = {
                ...values,
                isActive: values.isActive === 'true' ? true : values.isActive === 'false' ? false : values.isActive,
            };

            if (editingItem) {
                await redEnvelopeService.updateItem(editingItem.id, payload);
                Toast.show({ icon: 'success', content: '已更新獎項' });
            } else {
                await redEnvelopeService.createItem(payload);
                Toast.show({ icon: 'success', content: '已新增獎項' });
            }

            setItemModalOpen(false);
            loadItems();
        } catch (error: any) {
            console.error('[MiniGame][Admin] 儲存獎項失敗:', error);
            Toast.show({ icon: 'fail', content: error?.response?.data?.error || '儲存獎項失敗' });
        }
    };

    const isCash = itemForm.getFieldValue('type') === 'CASH';

    const isRedEnvelope = status.gameType === 'RED_ENVELOPE';

    return (
        <div style={{ padding: 16 }}>
            <Card title='小遊戲狀態' style={{ marginBottom: 20 }}>
                <Space direction='vertical' block>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ minWidth: 72 }}>目前類型：</span>
                        <Tag color='primary'>
                            {status.gameType === 'RED_ENVELOPE' && '紅包抽獎'}
                            {status.gameType === 'QUIZ' && '機智問答'}
                            {status.gameType === 'MINORITY' && '少數決'}
                            {status.gameType === 'NONE' && '無進行遊戲'}
                        </Tag>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ minWidth: 72 }}>階段：</span>
                        <Tag color='warning'>
                            {status.phase?.toUpperCase() === 'IDLE' && '待機中'}
                            {status.phase?.toUpperCase() === 'SHUFFLE' && '洗牌'}
                            {status.phase?.toUpperCase() === 'PREPARE' && '準備'}
                            {status.phase?.toUpperCase() === 'GAMING' && '進行中'}
                            {status.phase?.toUpperCase() === 'REVEAL' && '揭曉'}
                            {status.phase?.toUpperCase() === 'RESULT' && '結算'}
                            {!status.phase && '未設定'}
                        </Tag>
                    </div>
                </Space>
            </Card>

            <Tabs>
                <Tabs.Tab title='紅包' key='red-envelope'>
                    <Space direction='vertical' block>
                        <Checkbox checked={allowGuest} disabled={isRedEnvelope} onChange={(val) => setAllowGuest(val)}>
                            允許非員工參與 (Allow Guest)
                        </Checkbox>

                        <Card
                            title='獎項列表'
                            extra={
                                <Button size='mini' color='primary' onClick={handleOpenCreate}>
                                    新增獎項
                                </Button>
                            }
                        >
                            <List>
                                {items.map((it) => (
                                    <List.Item
                                        key={it.id}
                                        description={`數量: ${it.amount} | 類型: ${it.type}${it.type === 'CASH' ? ` | 現金: ${it.prizeValue}` : ''}`}
                                        extra={
                                            <Space>
                                                <Button size='mini' color='primary' fill='outline' onClick={() => handleOpenEdit(it)}>
                                                    編輯
                                                </Button>
                                                <Button size='mini' color='danger' fill='outline' onClick={() => handleDelete(it.id)}>
                                                    刪除
                                                </Button>
                                            </Space>
                                        }
                                    >
                                        {it.name}
                                    </List.Item>
                                ))}
                                {items.length === 0 && <List.Item>尚無獎項，請新增。</List.Item>}
                            </List>
                        </Card>

                        <Button color='primary' onClick={handleInitGame} disabled={isRedEnvelope}>
                            初始化遊戲 (進入待機)
                        </Button>
                        <Button color='danger' onClick={handleReset} disabled={!isRedEnvelope}>
                            🔥 強制結束本局 (Panic)
                        </Button>
                    </Space>
                </Tabs.Tab>
                <Tabs.Tab title='問答' key='quiz'>
                    <div style={{ padding: '12px 0', color: '#888' }}>即將開放</div>
                </Tabs.Tab>
                <Tabs.Tab title='少數決' key='minority'>
                    <div style={{ padding: '12px 0', color: '#888' }}>即將開放</div>
                </Tabs.Tab>
            </Tabs>

            <Popup
                visible={itemModalOpen}
                onClose={() => setItemModalOpen(false)}
                closeOnMaskClick={false}
                bodyStyle={{ borderTopLeftRadius: 12, borderTopRightRadius: 12, padding: 16 }}
            >
                <h4 style={{ margin: 0, marginBottom: 12 }}>{editingItem ? '編輯獎項' : '新增獎項'}</h4>
                <Form
                    form={itemForm}
                    layout='horizontal'
                    onFinish={handleSubmitItem}
                    footer={
                        <Space justify='between' style={{ width: '100%' }}>
                            <Button onClick={() => setItemModalOpen(false)}>取消</Button>
                            <Button type='submit' color='primary'>儲存</Button>
                        </Space>
                    }
                >
                    <Form.Item name='name' label='名稱' rules={[{ required: true, message: '必填' }]}>
                        <Input placeholder='例如 iPad Pro' />
                    </Form.Item>
                    <Form.Item name='amount' label='數量' rules={[{ required: true, message: '必填' }]}>
                        <Input type='number' />
                    </Form.Item>
                    <Form.Item name='type' label='類型' initialValue='PHYSICAL'>
                        <Radio.Group>
                            <Radio value='PHYSICAL'>實體</Radio>
                            <Radio value='CASH'>現金</Radio>
                        </Radio.Group>
                    </Form.Item>
                    {isCash && (
                        <Form.Item name='prizeValue' label='現金額度' rules={[{ required: true, message: '必填' }]}>
                            <Input type='number' />
                        </Form.Item>
                    )}
                    <Form.Item name='displayOrder' label='價值排序'>
                        <Input type='number' />
                    </Form.Item>
                    <Form.Item name='isActive' label='啟用' initialValue={'true'}>
                        <Radio.Group>
                            <Radio value={'true'}>是</Radio>
                            <Radio value={'false'}>否</Radio>
                        </Radio.Group>
                    </Form.Item>
                </Form>
            </Popup>
        </div>
    );
};

export default AdminMiniGameTab;
