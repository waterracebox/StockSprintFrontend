import React, { useState, useEffect, useRef } from 'react';
import { Button, Dialog, Toast, Switch } from 'antd-mobile';
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

    // 【新增】暖機相關狀態
    const [isAutoWarmup, setIsAutoWarmup] = useState<boolean>(true);
    const [warmupLatency, setWarmupLatency] = useState<number | null>(null);
    const warmupIntervalRef = useRef<number | null>(null);
    const [isWarmupExpanded, setIsWarmupExpanded] = useState<boolean>(false); // 【新增】預設收合

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

    // 【新增】執行暖機請求的函數
    const performWarmup = async () => {
        try {
            const start = performance.now();
            const response = await apiClient.get('/admin/system/warmup');
            const end = performance.now();
            const clientLatency = Math.round(end - start);
            
            setWarmupLatency(clientLatency);
            console.log(`[Warmup] 完成，延遲: ${clientLatency}ms (伺服器回報: ${response.data.duration}ms)`);
        } catch (error: any) {
            console.error('[Warmup] 失敗:', error);
            Toast.show({ icon: 'fail', content: '暖機失敗' });
            setWarmupLatency(null);
        }
    };

    // 【新增】暖機按鈕處理器
    const handleWarmup = () => {
        // 清除任何現有的 interval
        if (warmupIntervalRef.current) {
            clearInterval(warmupIntervalRef.current);
            warmupIntervalRef.current = null;
        }

        if (isAutoWarmup) {
            // 自動模式：立即執行一次，然後每 10 秒執行一次
            performWarmup();
            warmupIntervalRef.current = setInterval(performWarmup, 10000);
            Toast.show({ icon: 'success', content: '已啟動自動暖機 (每 10 秒)' });
        } else {
            // 手動模式：僅執行一次
            performWarmup();
            Toast.show({ icon: 'success', content: '已執行單次暖機' });
        }
    };

    // 【新增】停止暖機的安全函數
    const stopWarmup = () => {
        if (warmupIntervalRef.current) {
            clearInterval(warmupIntervalRef.current);
            warmupIntervalRef.current = null;
            console.log('[Warmup] 已停止自動暖機');
        }
    };

    // 【新增】組件卸載時清理 interval
    useEffect(() => {
        return () => {
            stopWarmup();
        };
    }, []);

    // 【新增】延遲顏色計算
    const getLatencyColor = () => {
        if (warmupLatency === null) return '#999';
        if (warmupLatency < 100) return '#52c41a'; // 綠色
        if (warmupLatency < 500) return '#faad14'; // 黃色
        return '#ff4d4f'; // 紅色
    };

    const getLatencyEmoji = () => {
        if (warmupLatency === null) return '❓';
        if (warmupLatency < 100) return '🔥';
        if (warmupLatency < 500) return '⚠️';
        return '❄️';
    };

    // 開始遊戲
    const handleStart = async () => {
        if (gameState.currentDay > 0) {
            const confirmed = await Dialog.confirm({
                content: '開始遊戲會將天數重置為 0，若要繼續遊戲請使用「恢復」按鈕。確定要開始嗎？',
            });
            if (!confirmed) return;
        }

        // 【新增】停止暖機
        stopWarmup();

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

        // 【新增】停止暖機
        stopWarmup();

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
        // 【新增】停止暖機
        stopWarmup();

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

        // 【新增】停止暖機
        stopWarmup();

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

            {/* 【新增】系統暖機控制區 */}
            <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: '#fff7e6', borderRadius: '8px', border: '1px solid #ffd591' }}>
                <div 
                    onClick={() => setIsWarmupExpanded(!isWarmupExpanded)}
                    style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        marginBottom: isWarmupExpanded ? '12px' : '0'
                    }}
                >
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#d46b08' }}>
                        🔥 系統預熱 (System Warm-up)
                    </h4>
                    <span style={{ fontSize: '18px', color: '#d46b08' }}>
                        {isWarmupExpanded ? '▲' : '▼'}
                    </span>
                </div>
                
                {isWarmupExpanded && (
                    <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                            <span style={{ fontSize: '14px' }}>自動模式 (每 10 秒)：</span>
                            <Switch
                                checked={isAutoWarmup}
                                onChange={(checked) => {
                                    setIsAutoWarmup(checked);
                                    // 切換開關時停止現有的 interval
                                    stopWarmup();
                                }}
                            />
                        </div>

                        <Button
                            block
                            color='primary'
                            size='middle'
                            onClick={handleWarmup}
                            style={{ marginBottom: '12px' }}
                        >
                            🔥 啟動暖機 (Warm Up)
                        </Button>

                        {warmupLatency !== null && (
                            <div
                                style={{
                                    padding: '12px',
                                    backgroundColor: '#f5f5f5',
                                    borderRadius: '8px',
                                    textAlign: 'center',
                                    fontSize: '16px',
                                    marginBottom: '12px',
                                }}
                            >
                                <span>系統溫度：</span>
                                <span
                                    style={{
                                        fontWeight: 'bold',
                                        color: getLatencyColor(),
                                        marginLeft: '8px',
                                    }}
                                >
                                    {getLatencyEmoji()} {warmupLatency}ms
                                </span>
                            </div>
                        )}

                        <div style={{ fontSize: '12px', color: '#8c8c8c', lineHeight: '1.5' }}>
                            💡 提示：遊戲開始前5~10分鐘建議先執行暖機，可減少首次請求延遲。
                            自動模式會持續保持連線池活躍，直到開始遊戲為止。
                        </div>
                    </>
                )}
            </div>

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
