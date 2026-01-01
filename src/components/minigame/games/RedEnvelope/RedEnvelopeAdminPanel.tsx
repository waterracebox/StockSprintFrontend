import React, { useEffect, useState } from 'react';
import { Button, Card, Checkbox, Dialog, Form, Input, List, Popup, Radio, Space, Toast } from 'antd-mobile';
import type { Socket } from 'socket.io-client';
import type { MiniGameSyncState } from '../../containers/MiniGameOverlay';
import { redEnvelopeService, type RedEnvelopeItem } from '../../../../services/redEnvelopeService';

interface Props {
    status: MiniGameSyncState;
    socket: Socket | null;
    allowGuest: boolean;
    setAllowGuest: (val: boolean) => void;
}

const RedEnvelopeAdminPanel: React.FC<Props> = ({ status, socket, allowGuest, setAllowGuest }) => {
    const [items, setItems] = useState<RedEnvelopeItem[]>([]);
    const [itemModalOpen, setItemModalOpen] = useState<boolean>(false);
    const [editingItem, setEditingItem] = useState<RedEnvelopeItem | null>(null);
    const [itemForm] = Form.useForm<Record<string, any>>();
    const [consolation, setConsolation] = useState<{ name: string; type: 'PHYSICAL' | 'CASH'; value: number }>(
        {
            name: '參加獎',
            type: 'CASH',
            value: 100,
        }
    );

    const isRedEnvelope = status.gameType === 'RED_ENVELOPE';
    const isIdlePhase = status.phase?.toUpperCase() === 'IDLE';
    const isShufflePhase = status.phase?.toUpperCase() === 'SHUFFLE';
    const isGamingPhase = status.phase?.toUpperCase() === 'GAMING';
    const isRevealPhase = status.phase?.toUpperCase() === 'REVEAL';

    const loadItems = async () => {
        try {
            const data = await redEnvelopeService.getItems();
            setItems(data);
        } catch (error: any) {
            Toast.show({ icon: 'fail', content: error?.response?.data?.error || '讀取紅包獎項失敗' });
        }
    };

    useEffect(() => {
        loadItems();
    }, []);

    useEffect(() => {
        const savedConsolation = localStorage.getItem('miniGameConsolation');
        if (savedConsolation) {
            try {
                const parsed = JSON.parse(savedConsolation);
                setConsolation({
                    name: parsed.name || '參加獎',
                    type: parsed.type === 'CASH' ? 'CASH' : 'PHYSICAL',
                    value: Number.isFinite(Number(parsed.value)) ? Number(parsed.value) : 100,
                });
            } catch (_) {
                /* ignore */
            }
        }
    }, []);

    const handleInitGame = () => {
        if (!socket) {
            Toast.show({ icon: 'fail', content: '尚未連線，請稍後重試' });
            return;
        }

        const payload = {
            type: 'INIT_GAME',
            allowGuest,
            consolation: {
                name: consolation.name?.trim() || '參加獎',
                type: consolation.type,
                value: Number.isFinite(Number(consolation.value)) ? Number(consolation.value) : 0,
            },
        };

        socket.emit('ADMIN_MINIGAME_ACTION', payload);
        localStorage.setItem('miniGameConsolation', JSON.stringify(payload.consolation));
        Toast.show({ icon: 'success', content: '已送出初始化指令' });
    };

    const handleStartShuffle = () => {
        if (!socket) {
            Toast.show({ icon: 'fail', content: '尚未連線，請稍後重試' });
            return;
        }
        socket.emit('ADMIN_MINIGAME_ACTION', { type: 'START_SHUFFLE' });
        Toast.show({ icon: 'success', content: '已送出洗牌指令' });
    };

    const handleStartGrab = () => {
        if (!socket) {
            Toast.show({ icon: 'fail', content: '尚未連線，請稍後重試' });
            return;
        }
        socket.emit('ADMIN_MINIGAME_ACTION', { type: 'START_GRAB' });
        Toast.show({ icon: 'success', content: '已送出開搶指令' });
    };

    const handleStartReveal = () => {
        if (!socket) {
            Toast.show({ icon: 'fail', content: '尚未連線，請稍後重試' });
            return;
        }
        socket.emit('ADMIN_MINIGAME_ACTION', { type: 'REVEAL_RESULT' });
        Toast.show({ icon: 'success', content: '已送出揭曉指令' });
    };

    const handleForceReveal = async () => {
        if (!socket) {
            Toast.show({ icon: 'fail', content: '尚未連線，請稍後重試' });
            return;
        }

        const confirmed = await Dialog.confirm({
            content: '確定要強制揭曉嗎？這將會忽略尚未刮完的玩家，直接開始大螢幕動畫。',
            closeOnMaskClick: false,
        });

        if (!confirmed) return;

        socket.emit('ADMIN_MINIGAME_ACTION', { type: 'FORCE_REVEAL' });
        Toast.show({ icon: 'success', content: '已送出強制揭曉指令' });
    };

    const handleOpenCreate = () => {
        if (isRedEnvelope) {
            Toast.show({ icon: 'fail', content: '遊戲進行中，無法修改獎項' });
            return;
        }
        setEditingItem(null);
        itemForm.resetFields();
        itemForm.setFieldsValue({ type: 'PHYSICAL', prizeValue: 0, amount: 1, displayOrder: items.length, isActive: 'true' });
        setItemModalOpen(true);
    };

    const handleOpenEdit = (item: RedEnvelopeItem) => {
        if (isRedEnvelope) {
            Toast.show({ icon: 'fail', content: '遊戲進行中，無法修改獎項' });
            return;
        }
        setEditingItem(item);
        itemForm.setFieldsValue({ ...item, isActive: item.isActive ? 'true' : 'false' });
        setItemModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (isRedEnvelope) {
            Toast.show({ icon: 'fail', content: '遊戲進行中，無法刪除獎項' });
            return;
        }

        const confirmed = await Dialog.confirm({ content: '確認刪除此獎項嗎？', closeOnMaskClick: false });
        if (!confirmed) return;

        try {
            await redEnvelopeService.deleteItem(id);
            Toast.show({ icon: 'success', content: '已刪除' });
            loadItems();
        } catch (error: any) {
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
                prizeValue: values.type === 'CASH' ? Number(values.prizeValue) : undefined,
                amount: Number(values.amount),
                displayOrder: values.displayOrder !== undefined ? Number(values.displayOrder) : items.length,
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
            Toast.show({ icon: 'fail', content: error?.response?.data?.error || '儲存獎項失敗' });
        }
    };

    const watchedType = Form.useWatch('type', itemForm);
    const isCash = (watchedType || 'PHYSICAL') === 'CASH';

    return (
        <div style={{ padding: '16px 0' }}>
            <Space direction='vertical' block>
                <Checkbox checked={allowGuest} disabled={isRedEnvelope} onChange={(val) => setAllowGuest(val)}>
                    允許非員工參與 (Allow Guest)
                </Checkbox>

                <Card title='安慰獎設定' style={{ borderColor: '#f0a020' }}>
                    <Space direction='vertical' block>
                        <Input
                            value={consolation.name}
                            disabled={isRedEnvelope}
                            onChange={(val) => {
                                const nextState = { ...consolation, name: val ?? '' };
                                setConsolation(nextState);
                                localStorage.setItem('miniGameConsolation', JSON.stringify(nextState));
                            }}
                            placeholder='安慰獎名稱'
                        />
                        <Radio.Group
                            value={consolation.type}
                            disabled={isRedEnvelope}
                            onChange={(val) => {
                                const nextType = (val as 'PHYSICAL' | 'CASH') || 'PHYSICAL';
                                const nextState = { ...consolation, type: nextType };
                                setConsolation(nextState);
                                localStorage.setItem('miniGameConsolation', JSON.stringify(nextState));
                            }}
                        >
                            <Space>
                                <Radio value='PHYSICAL'>實體</Radio>
                                <Radio value='CASH'>遊戲現金</Radio>
                            </Space>
                        </Radio.Group>
                        <Input
                            type='number'
                            value={consolation.value?.toString() ?? ''}
                            disabled={isRedEnvelope || consolation.type !== 'CASH'}
                            onChange={(val) => {
                                const num = Number(val);
                                const nextState = { ...consolation, value: Number.isFinite(num) ? num : 0 };
                                setConsolation(nextState);
                                localStorage.setItem('miniGameConsolation', JSON.stringify(nextState));
                            }}
                            placeholder='金額 (僅現金時啟用)'
                        />
                    </Space>
                </Card>

                <Card
                    title='獎項列表'
                    extra={
                        <Button size='mini' color='primary' onClick={handleOpenCreate} disabled={isRedEnvelope}>
                            新增獎項
                        </Button>
                    }
                >
                    <List>
                        {items.map((it) => {
                            const typeLabel = it.type === 'CASH' ? '遊戲現金' : '實體';
                            const displayOrderText = it.displayOrder !== undefined && it.displayOrder !== null 
                                ? ` | 開獎順序: ${it.displayOrder === 0 ? '最後(安慰獎)' : it.displayOrder}`
                                : '';
                            return (
                                <List.Item
                                    key={it.id}
                                    description={`數量: ${it.amount} | 類型: ${typeLabel}${it.type === 'CASH' ? ` | 現金: ${it.prizeValue}` : ''}${displayOrderText}`}
                                    extra={
                                        <Space direction='vertical' style={{ gap: 4 }}>
                                            <Button size='mini' color='primary' fill='outline' onClick={() => handleOpenEdit(it)} disabled={isRedEnvelope}>
                                                編輯
                                            </Button>
                                            <Button size='mini' color='danger' fill='outline' onClick={() => handleDelete(it.id)} disabled={isRedEnvelope}>
                                                刪除
                                            </Button>
                                        </Space>
                                    }
                                >
                                    {it.name}
                                </List.Item>
                            );
                        })}
                        {items.length === 0 && <List.Item>尚無獎項，請新增。</List.Item>}
                    </List>
                </Card>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12 }}>
                    <Button
                        color='primary'
                        onClick={handleInitGame}
                        disabled={isRedEnvelope}
                        style={{ width: 230, maxWidth: '100%' }}
                    >
                        初始化遊戲 (進入待機)
                    </Button>
                    <Button
                        color='warning'
                        onClick={handleStartShuffle}
                        disabled={!isRedEnvelope || !isIdlePhase}
                        style={{ width: 230, maxWidth: '100%' }}
                    >
                        開始洗牌
                    </Button>
                    <Button
                        color='success'
                        onClick={handleStartGrab}
                        disabled={!isRedEnvelope || !isShufflePhase}
                        style={{ width: 230, maxWidth: '100%' }}
                    >
                        開始搶紅包
                    </Button>
                    <Button
                        color='primary'
                        onClick={handleStartReveal}
                        disabled={!isRedEnvelope || !isGamingPhase}
                        style={{ width: 230, maxWidth: '100%' }}
                    >
                        揭曉結果
                    </Button>
                    <Button
                        color='danger'
                        onClick={handleForceReveal}
                        disabled={!isRedEnvelope || !isRevealPhase}
                        style={{ width: 230, maxWidth: '100%' }}
                    >
                        強制揭曉
                    </Button>
                </div>
            </Space>

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
                    onValuesChange={() => itemForm.validateFields(['prizeValue'])}
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
                            <Radio value='CASH'>遊戲現金</Radio>
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

export default RedEnvelopeAdminPanel;
