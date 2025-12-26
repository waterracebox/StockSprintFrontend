import React, { useEffect, useRef, useState } from 'react';
import { Button, Card, Dialog, Space, Tag, Toast } from 'antd-mobile';
import { io, Socket } from 'socket.io-client';

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
        });

        s.on('disconnect', (reason) => {
            console.log('[MiniGame][Admin] Socket 已斷線', reason);
        });

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

    return (
        <div style={{ padding: 16 }}>
            <Card title='小遊戲狀態' style={{ marginBottom: 20 }}>
                <Space direction='vertical' block size={12}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ minWidth: 72 }}>目前類型：</span>
                        <Tag color='primary'>{status.gameType}</Tag>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ minWidth: 72 }}>階段：</span>
                        <Tag color='warning'>{status.phase}</Tag>
                    </div>
                </Space>
            </Card>

            <Button color='danger' block style={{ marginTop: 4 }} onClick={handleReset}>
                強制結束本局 (Panic Button)
            </Button>
        </div>
    );
};

export default AdminMiniGameTab;
