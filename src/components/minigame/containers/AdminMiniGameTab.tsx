import React, { useEffect, useRef, useState } from 'react';
import { Tabs, Card, Space, Tag, Button, Toast, Dialog } from 'antd-mobile';
import { io, Socket } from 'socket.io-client';
import RedEnvelopeAdminPanel from '../games/RedEnvelope/RedEnvelopeAdminPanel';
import QuizAdminPanel from '../games/Quiz/QuizAdminPanel';
import MinorityAdminPanel from '../games/Minority/MinorityAdminPanel';
import type { MiniGameSyncState } from './MiniGameOverlay';

const AdminMiniGameTab: React.FC = () => {
    const socketRef = useRef<Socket | null>(null);
    const [status, setStatus] = useState<MiniGameSyncState>({
        gameType: 'NONE',
        phase: 'IDLE',
        startTime: 0,
        endTime: 0,
        data: {},
    });
    const [allowGuest, setAllowGuest] = useState<boolean>(false);
    const [activeTab, setActiveTab] = useState<string>(() => localStorage.getItem('admin-minigame-subtab') || 'red-envelope');

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

        s.on('MINIGAME_SYNC', (payload: MiniGameSyncState) => {
            setStatus(payload);
            if (payload.gameType === 'RED_ENVELOPE' && typeof payload.data?.allowGuest === 'boolean') {
                setAllowGuest(Boolean(payload.data.allowGuest));
            }
        });

        s.on('connect', () => {
            console.log('[MiniGame][Admin] Socket 已連線', s.id);
        });

        s.on('disconnect', (reason) => {
            console.log('[MiniGame][Admin] Socket 已斷線', reason);
        });

        return () => {
            s.disconnect();
        };
    }, []);

    const handleReset = async () => {
        const confirmed = await Dialog.confirm({ content: '確定要強制結束本局嗎？', closeOnMaskClick: false });
        if (!confirmed) return;

        socketRef.current?.emit('ADMIN_MINIGAME_ACTION', { type: 'RESET_GAME' });
        Toast.show({ icon: 'success', content: '已送出重置指令' });
    };

    return (
        <div style={{ padding: 16 }}>
            <Card title='小遊戲狀態' style={{ marginBottom: 16 }}>
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
                    <Button color='danger' onClick={handleReset} disabled={status.gameType === 'NONE'}>
                        🔥 強制結束本局 (Panic)
                    </Button>
                </Space>
            </Card>

            <Tabs
                activeKey={activeTab}
                onChange={(key) => {
                    setActiveTab(key);
                    localStorage.setItem('admin-minigame-subtab', key);
                }}
            >
                <Tabs.Tab title='紅包' key='red-envelope'>
                    <RedEnvelopeAdminPanel
                        status={status}
                        socket={socketRef.current}
                        allowGuest={allowGuest}
                        setAllowGuest={setAllowGuest}
                    />
                </Tabs.Tab>
                <Tabs.Tab title='問答' key='quiz'>
                    <QuizAdminPanel status={status} socket={socketRef.current} />
                </Tabs.Tab>
                <Tabs.Tab title='少數決' key='minority'>
                    <MinorityAdminPanel status={status} socket={socketRef.current} />
                </Tabs.Tab>
            </Tabs>
        </div>
    );
};

export default AdminMiniGameTab;
