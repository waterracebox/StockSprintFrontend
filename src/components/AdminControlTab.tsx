import React, { useState, useEffect } from 'react';
import { Button, Dialog, Toast } from 'antd-mobile';
import apiClient from '../services/apiClient';

interface GameState {
    isGameStarted: boolean;
    pausedAt: string | null;
    currentDay: number;
}

const AdminControlTab: React.FC = () => {
    const [gameState, setGameState] = useState<GameState>({
        isGameStarted: false,
        pausedAt: null,
        currentDay: 0,
    });
    const [loading, setLoading] = useState(false);

    // 載入遊戲狀態
    const fetchGameState = async () => {
        try {
            const response = await apiClient.get('/admin/params');
            // 假設後端返回完整的 GameStatus
            setGameState({
                isGameStarted: response.data.isGameStarted || false,
                pausedAt: response.data.pausedAt || null,
                currentDay: response.data.currentDay || 0,
            });
        } catch (error) {
            console.error('[Admin] 載入遊戲狀態失敗:', error);
        }
    };

    useEffect(() => {
        fetchGameState();
        // 每 5 秒刷新一次狀態
        const interval = setInterval(fetchGameState, 5000);
        return () => clearInterval(interval);
    }, []);

    // 開始遊戲
    const handleStart = async () => {
        if (gameState.currentDay > 0) {
            const confirmed = await Dialog.confirm({
                content: '開始遊戲會將天數重置為 0，若要繼續遊戲請使用「恢復」按鈕。確定要開始嗎？',
            });
            if (!confirmed) return;
        }

        setLoading(true);
        try {
            await apiClient.post('/admin/game/start');
            Toast.show({ icon: 'success', content: '遊戲已開始' });
            await fetchGameState();
        } catch (error: any) {
            Toast.show({ icon: 'fail', content: error.response?.data?.error || '開始失敗' });
        } finally {
            setLoading(false);
        }
    };

    // 停止遊戲
    const handleStop = async () => {
        const confirmed = await Dialog.confirm({
            content: '確定要暫停遊戲嗎？',
        });
        if (!confirmed) return;

        setLoading(true);
        try {
            await apiClient.post('/admin/game/stop');
            Toast.show({ icon: 'success', content: '遊戲已暫停' });
            await fetchGameState();
        } catch (error: any) {
            Toast.show({ icon: 'fail', content: error.response?.data?.error || '暫停失敗' });
        } finally {
            setLoading(false);
        }
    };

    // 恢復遊戲
    const handleResume = async () => {
        setLoading(true);
        try {
            await apiClient.post('/admin/game/resume');
            Toast.show({ icon: 'success', content: '遊戲已恢復' });
            await fetchGameState();
        } catch (error: any) {
            Toast.show({ icon: 'fail', content: error.response?.data?.error || '恢復失敗' });
        } finally {
            setLoading(false);
        }
    };

    // 重啟遊戲
    const handleRestart = async () => {
        const confirmed = await Dialog.confirm({
            content: '重啟會清空所有玩家資產與合約，確定嗎？',
        });
        if (!confirmed) return;

        setLoading(true);
        try {
            await apiClient.post('/admin/game/restart');
            Toast.show({ icon: 'success', content: '遊戲已重啟' });
            await fetchGameState();
        } catch (error: any) {
            Toast.show({ icon: 'fail', content: error.response?.data?.error || '重啟失敗' });
        } finally {
            setLoading(false);
        }
    };

    // 重置遊戲
    const handleReset = async () => {
        const confirmed = await Dialog.confirm({
            content: '⚠️ 重置會刪除所有使用者與劇本資料（工廠設定），無法復原！確定嗎？',
        });
        if (!confirmed) return;

        setLoading(true);
        try {
            await apiClient.post('/admin/game/reset');
            Toast.show({ icon: 'success', content: '遊戲已重置（工廠設定）' });
            await fetchGameState();
        } catch (error: any) {
            Toast.show({ icon: 'fail', content: error.response?.data?.error || '重置失敗' });
        } finally {
            setLoading(false);
        }
    };

    // 【修正】按鈕啟用邏輯
    const canStart = !gameState.isGameStarted; // 只要遊戲未運行就能開始（包含暫停狀態）
    const canStop = gameState.isGameStarted;
    const canResume = !gameState.isGameStarted && !!gameState.pausedAt; // 必須在暫停狀態才能恢復

    return (
        <div style={{ padding: '20px', maxWidth: '100%', boxSizing: 'border-box' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 'bold' }}>
                遊戲控制
            </h3>

            <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f0f0f0', borderRadius: '8px' }}>
                <div style={{ fontSize: '14px', color: '#666' }}>
                    當前狀態：
                    <span style={{ marginLeft: '8px', fontWeight: 'bold', color: gameState.isGameStarted ? '#52c41a' : '#ff4d4f' }}>
                        {gameState.isGameStarted ? '運行中' : (gameState.pausedAt ? '已暫停' : '未開始')}
                    </span>
                </div>
                <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
                    當前天數：<span style={{ fontWeight: 'bold' }}>{gameState.currentDay}</span>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Button
                    block
                    color='primary'
                    size='large'
                    disabled={!canStart || loading}
                    onClick={handleStart}
                >
                    開 始 遊 戲 (START)
                </Button>

                <Button
                    block
                    color='warning'
                    size='large'
                    disabled={!canStop || loading}
                    onClick={handleStop}
                >
                    暫 停 遊 戲 (STOP)
                </Button>

                <Button
                    block
                    color='success'
                    size='large'
                    disabled={!canResume || loading}
                    onClick={handleResume}
                >
                    繼 續 遊 戲 (RESUME)
                </Button>

                <hr style={{ margin: '20px 0', borderColor: '#e5e5e5' }} />

                <p style={{ fontSize: '12px', color: '#666', textAlign: 'center' }}>
                    （以下用於測試或彩排）
                </p>

                <Button
                    block
                    color='default'
                    size='large'
                    onClick={handleRestart}
                    disabled={gameState.isGameStarted || loading}
                >
                    重開新局 (Restart)
                </Button>

                <Button
                    block
                    color='danger'
                    size='large'
                    onClick={handleReset}
                    disabled={gameState.isGameStarted || loading}
                >
                    系統初始化 (Reset)
                </Button>
            </div>
        </div>
    );
};

export default AdminControlTab;
