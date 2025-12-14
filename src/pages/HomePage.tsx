import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Toast, Avatar, Dialog, Popup, Grid, Modal } from 'antd-mobile';
import { RightOutline, CloseOutline } from 'antd-mobile-icons';
import { io, Socket } from 'socket.io-client';
import { authAPI } from '../services/auth';
import type { User } from '../services/auth';
import type { GameState, StockData, FullSyncPayload, PersonalAssets } from '../types/game';
import StockChart from '../components/StockChart';
import TradingBar from '../components/TradingBar';
import Leaderboard from '../components/Leaderboard';

/**
 * 格式化倒數計時（秒數轉 MM:SS）
 */
const formatCountdown = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

interface LeaderboardItem {
    userId: number;
    displayName: string;
    avatar: string | null;
    totalAssets: number;
    rank: number;
}

const HomePage: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isSocketConnected, setIsSocketConnected] = useState(false);
    
    // 遊戲狀態
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [stockHistory, setStockHistory] = useState<StockData[]>([]);
    const [assets, setAssets] = useState<PersonalAssets>({ cash: 0, stocks: 0, debt: 0 });
    const [leaderboardData, setLeaderboardData] = useState<LeaderboardItem[]>([]);
    
    // 新增：合約訂單狀態
    const [activeContracts, setActiveContracts] = useState<any[]>([]);
    
    // 交易操作狀態
    const [isTrading, setIsTrading] = useState(false); // 交易鎖定狀態
    
    // 使用者選單與頭像選擇狀態
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showAvatarSelector, setShowAvatarSelector] = useState(false);
    const [selectedAvatar, setSelectedAvatar] = useState<string>('');
    
    // Modal 狀態
    const [showFullChartModal, setShowFullChartModal] = useState(false);
    const [showNewsModal, setShowNewsModal] = useState(false);
    
    const navigate = useNavigate();

    // 取得使用者資訊
    useEffect(() => {
        authAPI
            .getMe()
            .then((response) => setUser(response.user))
            .catch((error) => {
                console.error('[Auth] 無法取得使用者資訊:', error);
            });
    }, []);

    // WebSocket 連線與事件監聽
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('[Socket] 缺少 Token，無法建立連線');
            return;
        }

        // 決定 Socket.io 連線 URL
        let socketUrl: string;
        if (import.meta.env.PROD) {
            const apiUrl = import.meta.env.VITE_API_URL || '';
            socketUrl = apiUrl.replace(/\/api$/, '');
        } else {
            socketUrl = 'http://127.0.0.1:8000';
        }

        console.log(`[Socket] 正在連線至: ${socketUrl}`);

        const newSocket = io(socketUrl, {
            auth: { token },
            transports: ['websocket', 'polling'],
        });

        // ==================== 連線事件 ====================
        newSocket.on('connect', () => {
            console.log(`[Socket] 連線成功 (Socket ID: ${newSocket.id})`);
            setIsSocketConnected(true);
        });

        newSocket.on('connect_error', (error) => {
            console.error('[Socket] 連線錯誤:', error.message);
            setIsSocketConnected(false);
            
            if (error.message.includes('Authentication')) {
                console.error('[Socket] 認證失敗，導向登入頁');
                Toast.show({
                    icon: 'fail',
                    content: '認證失敗，請重新登入',
                });
                localStorage.removeItem('token');
                setTimeout(() => navigate('/login'), 1500);
            }
        });

        newSocket.on('disconnect', (reason) => {
            console.log(`[Socket] 已斷線 (原因: ${reason})`);
            setIsSocketConnected(false);
        });

        // ==================== 遊戲事件監聽 ====================
        
        // 1. 完整狀態同步（連線/重連時收到）
        newSocket.on('FULL_SYNC_STATE', (payload: FullSyncPayload) => {
            console.log('[Socket] 收到完整狀態同步:', payload);
            
            // 更新遊戲狀態
            setGameState(payload.gameStatus);
            
            // 更新股價歷史（完整覆蓋）
            setStockHistory(payload.price.history);
            
            // 更新個人資產
            setAssets(payload.personal);
            
            // 更新活躍合約（CRITICAL: 修復 refresh 後保證金消失的問題）
            if (payload.activeContracts) {
                setActiveContracts(payload.activeContracts);
            }
            
            // 更新排行榜（若有）
            if (payload.leaderboard) {
                setLeaderboardData(payload.leaderboard);
            }
            
            Toast.show({
                icon: 'success',
                content: '狀態同步完成',
                duration: 1000,
            });
        });

        // 2. 遊戲狀態更新（每秒廣播）
        newSocket.on('GAME_STATE_UPDATE', (data: GameState) => {
            console.log('[Socket] 遊戲狀態更新:', data);
            setGameState(data);
        });

        // 3. 股價更新（換日時廣播）
        newSocket.on('PRICE_UPDATE', (payload: { day: number; price: number; history: StockData[] }) => {
            console.log('[Socket] 股價更新:', payload);
            
            // 完整覆蓋歷史資料（後端已提供完整 history）
            setStockHistory(payload.history);
            
            Toast.show({
                icon: 'success',
                content: `Day ${payload.day}: $${payload.price.toFixed(2)}`,
                duration: 2000,
            });
        });

        // 4. 排行榜更新（換日時廣播）
        newSocket.on('LEADERBOARD_UPDATE', (payload: { data: LeaderboardItem[] }) => {
            console.log('[Socket] 排行榜更新:', payload);
            setLeaderboardData(payload.data);
        });

        // ==================== 交易事件監聽 ====================

        // 交易成功
        newSocket.on('TRADE_SUCCESS', (payload: any) => {
            console.log('[Socket] 交易成功:', payload);

            // 處理現貨交易
            if (payload.action === 'BUY' || payload.action === 'SELL') {
                setAssets({
                    cash: payload.newCash,
                    stocks: payload.newStocks,
                    debt: payload.newDebt ?? assets.debt,
                });

                playSound('/sounds/coin.mp3');

                Toast.show({
                    icon: 'success',
                    content: `交易成功！${payload.action === 'BUY' ? '買入' : '賣出'} ${payload.amount} 張，成交價 $${payload.price.toFixed(2)}`,
                    duration: 2000,
                });
            }

            // 處理合約下單
            if (payload.action === 'BUY_CONTRACT') {
                setAssets(prev => ({
                    ...prev,
                    cash: payload.newCash,
                }));

                // 更新活躍合約列表
                setActiveContracts(prev => [...prev, payload.contractOrder]);

                Toast.show({
                    icon: 'success',
                    content: `合約下單成功！${payload.type === 'LONG' ? '做多' : '做空'} ${payload.quantity} 張，槓桿 ${payload.leverage}x`,
                    duration: 2000,
                });
            }

            // 處理合約撤銷
            if (payload.action === 'CANCEL_CONTRACT') {
                setAssets(prev => ({
                    ...prev,
                    cash: payload.newCash,
                }));

                // 清空今日活躍合約（已撤銷）
                setActiveContracts([]);

                Toast.show({
                    icon: 'success',
                    content: payload.message || '合約撤銷成功',
                    duration: 2000,
                });
            }

            // 解除交易鎖定
            setIsTrading(false);
        });

        // 合約結算通知
        newSocket.on('CONTRACT_SETTLED', (payload: any) => {
            console.log('[Socket] 合約結算:', payload);

            // 更新資產
            setAssets(prev => ({
                ...prev,
                cash: payload.newCash,
                debt: payload.newDebt,
            }));

            // 清空活躍合約（已結算）
            setActiveContracts([]);

            // 顯示結算結果
            const profitLoss = payload.pnl >= 0 ? `+${payload.pnl.toFixed(2)}` : payload.pnl.toFixed(2);
            Toast.show({
                icon: payload.pnl >= 0 ? 'success' : 'fail',
                content: `合約結算：${payload.type === 'LONG' ? '做多' : '做空'} ${payload.quantity} 張，損益 ${profitLoss}`,
                duration: 3000,
            });
        });

        // 交易失敗
        newSocket.on('TRADE_ERROR', (payload: any) => {
            console.error('[Socket] 交易失敗:', payload);

            // 解除交易鎖定
            setIsTrading(false);

            // 顯示錯誤提示
            Toast.show({
                icon: 'fail',
                content: payload.message || '交易失敗',
                duration: 2000,
            });
        });

        setSocket(newSocket);

        // 清理函數：移除所有監聽器並斷開連線
        return () => {
            console.log('[Socket] 正在清理監聽器並斷開連線...');
            newSocket.off('connect');
            newSocket.off('connect_error');
            newSocket.off('disconnect');
            newSocket.off('FULL_SYNC_STATE');
            newSocket.off('GAME_STATE_UPDATE');
            newSocket.off('PRICE_UPDATE');
            newSocket.off('LEADERBOARD_UPDATE');
            newSocket.off('TRADE_SUCCESS');
            newSocket.off('TRADE_ERROR');
            newSocket.off('CONTRACT_SETTLED');
            newSocket.disconnect();
        };
    }, [navigate]);

    const handleLogout = () => {
        if (socket) {
            socket.disconnect();
        }
        localStorage.removeItem('token');
        navigate('/login');
    };

    // 音效播放輔助函數
    const playSound = (soundPath: string) => {
        try {
            const audio = new Audio(soundPath);
            audio.play().catch((error) => {
                console.warn('[Sound] 音效播放失敗 (可能被瀏覽器阻擋):', error);
            });
        } catch (error) {
            console.warn('[Sound] 音效檔案不存在:', soundPath);
        }
    };

    // 計算當前股價
    const currentPrice = stockHistory.length > 0
        ? stockHistory[stockHistory.length - 1].price
        : 0;

    // 處理頭像更新
    const handleAvatarUpdate = async () => {
        if (!selectedAvatar) {
            Toast.show({ icon: 'fail', content: '請選擇頭像' });
            return;
        }

        try {
            const response = await authAPI.updateAvatar(selectedAvatar);
            setUser(response.user);
            Toast.show({ icon: 'success', content: '頭像更新成功' });
            setShowAvatarSelector(false);
            setShowUserMenu(false);
        } catch (error: any) {
            console.error('[Avatar] 更新失敗:', error);
            Toast.show({ 
                icon: 'fail', 
                content: error.response?.data?.error || '頭像更新失敗' 
            });
        }
    };

    // 生成所有頭像選項 (avatar_00.webp 到 avatar_50.webp)
    const avatarOptions = Array.from({ length: 51 }, (_, i) => 
        `avatar_${i.toString().padStart(2, '0')}.webp`
    );

    // 計算總資產（現金 + 股票現值 + 合約保證金 - 負債）
    const activeContractsMargin = activeContracts.reduce((sum, contract) => sum + contract.margin, 0);
    const totalAssets = assets.cash + (assets.stocks * currentPrice) + activeContractsMargin - assets.debt;

    if (!user) {
        return (
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100vh',
                fontSize: '16px',
                color: '#999'
            }}>
                載入中...
            </div>
        );
    }

    return (
        <div style={{ 
            minHeight: '100vh', 
            display: 'flex', 
            flexDirection: 'column',
            backgroundColor: '#f5f5f5'
        }}>
            {/* ==================== (0) 頂部資訊列 ==================== */}
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '12px 16px',
                backgroundColor: '#fff',
                position: 'sticky',
                top: 0,
                zIndex: 100,
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
            }}>
                {/* 左側：遊戲狀態 */}
                <div style={{ flex: 1 }}>
                    {gameState ? (
                        <div style={{ 
                            fontSize: '14px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '12px'
                        }}>
                            <span style={{ 
                                fontWeight: 'bold',
                                color: gameState.isGameStarted ? '#1677ff' : '#999'
                            }}>
                                第 {gameState.currentDay} 天
                            </span>
                            <span style={{ color: '#ccc' }}>|</span>
                            <span style={{ 
                                fontSize: '13px', 
                                color: gameState.countdown <= 10 ? '#ff3141' : '#666',
                                fontWeight: gameState.countdown <= 10 ? 'bold' : 'normal'
                            }}>
                                {formatCountdown(gameState.countdown)}
                            </span>
                        </div>
                    ) : (
                        <div style={{ fontSize: '14px', color: '#999' }}>
                            載入中...
                        </div>
                    )}
                </div>

                {/* 右側：使用者頭像（可點擊） */}
                <div 
                    style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        cursor: 'pointer'
                    }}
                    onClick={() => setShowUserMenu(true)}
                >
                    <span style={{ fontSize: '14px', fontWeight: 'bold' }}>
                        {user.displayName}
                    </span>
                    <Avatar 
                        src={user.avatar ? `/avatars/${user.avatar}` : ''} 
                        style={{ '--size': '32px', backgroundColor: '#1677ff' }}
                        fallback={user.displayName.charAt(0)}
                    />
                </div>
            </div>

            {/* ==================== 主內容區域（可滾動） ==================== */}
            <div style={{ 
                flex: 1, 
                overflowY: 'auto', 
                padding: '12px 16px',
                paddingBottom: '250px' // 預留底部交易欄空間（加大避免被遮擋）
            }}>
                {/* ==================== (1) 資產區域 ==================== */}
                <div style={{ 
                    borderRadius: '12px',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
                    backgroundColor: '#fff',
                    padding: '20px',
                    marginBottom: '12px'
                }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', color: '#999' }}>
                            總資產
                        </div>
                        <div style={{ 
                            fontSize: '36px', 
                            fontWeight: 'bold',
                            color: totalAssets >= 0 ? '#00b578' : '#ff3141',
                            marginBottom: '8px'
                        }}>
                            ${totalAssets.toFixed(2)}
                        </div>
                        <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-around',
                            fontSize: '12px',
                            color: '#666',
                            paddingTop: '12px',
                            borderTop: '1px solid #f0f0f0'
                        }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ marginBottom: '4px', color: '#999' }}>現金</div>
                                <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                                    ${assets.cash.toFixed(2)}
                                </div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ marginBottom: '4px', color: '#999' }}>股票</div>
                                <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                                    {assets.stocks} 股
                                </div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ marginBottom: '4px', color: '#999' }}>股票現值</div>
                                <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                                    ${(assets.stocks * currentPrice).toFixed(2)}
                                </div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ marginBottom: '4px', color: '#999' }}>負債</div>
                                <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#ff3141' }}>
                                    ${assets.debt.toFixed(2)}
                                </div>
                            </div>
                        </div>
                        
                        {/* 合約保證金詳細顯示（橫向滾動） */}
                        {activeContracts.length > 0 && (
                            <div style={{
                                paddingTop: '12px',
                                borderTop: '1px solid #f0f0f0',
                                marginTop: '12px',
                                display: 'flex',
                            }}>
                                {/* 合約保證金標籤和總金額（固定在左側） */}
                                <div style={{ 
                                    flex: '0 0 auto',
                                    textAlign: 'center',
                                    paddingRight: '12px',
                                    minWidth: '90px',
                                    position: 'relative'
                                }}>
                                    <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>
                                        合約保證金
                                    </div>
                                    <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#1677ff' }}>
                                        ${activeContractsMargin.toFixed(2)}
                                    </div>
                                    {/* 漸層邊框 */}
                                    <div style={{
                                        position: 'absolute',
                                        right: 0,
                                        top: 0,
                                        bottom: 0,
                                        width: '12px',
                                        background: 'linear-gradient(to right, #f0f0f0, transparent)'
                                    }}></div>
                                </div>

                                {/* 合約詳細卡片（可橫向滾動） */}
                                <div style={{
                                    flex: 1,
                                    overflowX: 'auto',
                                    WebkitOverflowScrolling: 'touch',
                                    display: 'flex',
                                    gap: '6px'
                                }}>
                                    {activeContracts.map((contract, index) => (
                                        <div 
                                            key={contract.id || index}
                                            style={{
                                                flex: '0 0 auto',
                                                textAlign: 'center',
                                                minWidth: '70px'
                                            }}
                                        >
                                            <div style={{ 
                                                fontSize: '11px', 
                                                color: contract.type === 'LONG' ? '#1890ff' : '#ff4d4f',
                                                fontWeight: 'bold',
                                                marginBottom: '4px'
                                            }}>
                                                {contract.type === 'LONG' ? '做多' : '做空'} {contract.leverage}倍
                                            </div>
                                            <div style={{ 
                                                fontSize: '14px', 
                                                fontWeight: 'bold',
                                                color: '#333'
                                            }}>
                                                {contract.quantity}張
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ==================== (2) 股票訊息（兩欄佈局） ==================== */}
                <div style={{ 
                    marginBottom: '12px'
                }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {/* 左欄：趨勢圖 */}
                        <div 
                            style={{ 
                                flex: 1,
                                cursor: 'pointer',
                                borderRadius: '12px',
                                backgroundColor: '#fff',
                                padding: '12px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                            }}
                            onClick={() => setShowFullChartModal(true)}
                        >
                            <div style={{ 
                                fontSize: '12px', 
                                fontWeight: 'bold', 
                                color: '#333',
                                marginBottom: '8px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <span>股價趨勢圖 (近28天)</span>
                                <span style={{ fontSize: '14px' }}>📈</span>
                            </div>
                            <div style={{ 
                                width: '100%',
                                height: '120px',
                                position: 'relative'
                            }}>
                                <StockChart data={stockHistory} />
                            </div>
                            {stockHistory.length > 0 && (
                                <div style={{ 
                                    textAlign: 'center', 
                                    marginTop: '8px', 
                                    fontSize: '11px', 
                                    color: '#666' 
                                }}>
                                    當前: ${currentPrice.toFixed(2)}
                                </div>
                            )}
                        </div>

                        {/* 右欄：相關新聞 */}
                        <div 
                            style={{ 
                                flex: 1,
                                cursor: 'pointer',
                                borderRadius: '12px',
                                backgroundColor: '#fff',
                                padding: '12px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                            }}
                            onClick={() => setShowNewsModal(true)}
                        >
                            <div style={{ 
                                fontSize: '12px', 
                                fontWeight: 'bold', 
                                color: '#333',
                                marginBottom: '8px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <span>股票相關新聞</span>
                                <span style={{ fontSize: '14px' }}>📰</span>
                            </div>
                            <div style={{ 
                                height: '120px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                fontSize: '11px',
                                color: '#999',
                                lineHeight: '1.8'
                            }}>
                                <div>• 新產品發表</div>
                                <div>• 財報亮眼</div>
                                <div>• 市場傳聞</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ==================== (3) 排行榜 ==================== */}
                <div style={{ 
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    backgroundColor: '#fff',
                    padding: '16px',
                    marginBottom: '12px'
                }}>
                    <div style={{ 
                        fontSize: '14px', 
                        fontWeight: 'bold', 
                        marginBottom: '12px'
                    }}>
                        排行榜 🏆
                    </div>
                    {leaderboardData.length > 0 ? (
                        <Leaderboard data={leaderboardData} currentUserId={user?.id || 0} />
                    ) : (
                        <div style={{ 
                            textAlign: 'center', 
                            padding: '20px 0',
                            fontSize: '12px',
                            color: '#999'
                        }}>
                            等待排行榜資料...
                        </div>
                    )}
                </div>

                {/* WebSocket 連線狀態（Debug 用） */}
                {!isSocketConnected && (
                    <div style={{ 
                        padding: '12px',
                        backgroundColor: '#fff3cd',
                        border: '1px solid #ffc107',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#856404',
                        textAlign: 'center'
                    }}>
                        ⚠️ WebSocket 未連線
                    </div>
                )}
            </div>

            {/* ==================== (4) 股票操作（固定在底部） ==================== */}
            <TradingBar
                socket={socket}
                currentPrice={currentPrice}
                isTrading={isTrading}
                isGameStarted={gameState?.isGameStarted ?? false}
                onTradingStart={() => setIsTrading(true)}
                maxLeverage={gameState?.maxLeverage ?? 100}
                cash={assets.cash}
            />

            {/* ==================== 使用者選單 Popup ==================== */}
            <Popup
                visible={showUserMenu}
                onMaskClick={() => setShowUserMenu(false)}
                position='right'
                // showCloseButton
                bodyStyle={{ 
                    width: '280px',
                    minHeight: '100vh',
                    padding: '0'
                }}
            >
                <div style={{ padding: '20px' }}>
                    {/* 關閉按鈕 */}
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'flex-end',
                        marginBottom: '12px'
                    }}>
                        <CloseOutline 
                            fontSize={24} 
                            style={{ cursor: 'pointer', color: '#999' }}
                            onClick={() => setShowUserMenu(false)}
                        />
                    </div>

                    {/* 使用者資訊區塊 */}
                    <div style={{ 
                        textAlign: 'center', 
                        paddingBottom: '20px',
                        borderBottom: '1px solid #f0f0f0'
                    }}>
                        <Avatar 
                            src={user?.avatar ? `/avatars/${user.avatar}` : ''} 
                            style={{ 
                                '--size': '64px', 
                                backgroundColor: '#1677ff',
                                margin: '0 auto 12px'
                            }}
                            fallback={user?.displayName.charAt(0)}
                        />
                        <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                            {user?.displayName}
                        </div>
                        <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                            @{user?.username}
                        </div>
                    </div>

                    {/* 選單選項 */}
                    <div style={{ marginTop: '20px' }}>
                        {/* 更改頭像 */}
                        <div 
                            style={{
                                padding: '16px 12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                cursor: 'pointer',
                                borderRadius: '8px',
                                transition: 'background-color 0.2s'
                            }}
                            onClick={() => {
                                setSelectedAvatar(user?.avatar || '');
                                setShowAvatarSelector(true);
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            <span style={{ fontSize: '15px' }}>更改頭像</span>
                            <RightOutline fontSize={16} color='#999' />
                        </div>

                        {/* 遊戲設定（僅 Admin 可見） */}
                        {user?.role === 'ADMIN' && (
                            <div 
                                style={{
                                    padding: '16px 12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    cursor: 'pointer',
                                    borderRadius: '8px',
                                    transition: 'background-color 0.2s'
                                }}
                                onClick={() => {
                                    setShowUserMenu(false);
                                    navigate('/admin');
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <span style={{ fontSize: '15px' }}>遊戲設定</span>
                                <RightOutline fontSize={16} color='#999' />
                            </div>
                        )}

                        {/* 登出 */}
                        <div 
                            style={{
                                padding: '16px 12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                cursor: 'pointer',
                                borderRadius: '8px',
                                transition: 'background-color 0.2s',
                                color: '#ff3141'
                            }}
                            onClick={() => {
                                Dialog.confirm({
                                    content: '確定要登出嗎？',
                                    confirmText: '登出',
                                    cancelText: '取消',
                                    onConfirm: () => {
                                        setShowUserMenu(false);
                                        handleLogout();
                                    }
                                });
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fff1f0'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            <span style={{ fontSize: '15px' }}>登出</span>
                            <RightOutline fontSize={16} />
                        </div>
                    </div>
                </div>
            </Popup>

            {/* ==================== 完整股票趨勢圖 Modal ==================== */}
            <Modal
                visible={showFullChartModal}
                onClose={() => setShowFullChartModal(false)}
                closeOnMaskClick={true}
                title={
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center'
                    }}>
                        <span>完整股票趨勢圖</span>
                        <CloseOutline 
                            fontSize={20}
                            onClick={() => setShowFullChartModal(false)}
                            style={{ cursor: 'pointer', color: '#999' }}
                        />
                    </div>
                }
                content={
                    <div style={{ 
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        {stockHistory.length > 0 ? (
                            <>
                                <div style={{ 
                                    fontSize: '12px', 
                                    color: '#666',
                                    marginBottom: '8px',
                                    textAlign: 'center'
                                }}>
                                    顯示從第 1 天到第 {gameState?.currentDay || 0} 天的完整趨勢
                                </div>
                                <div style={{ 
                                    width: '100%',
                                    height: '200px', 
                                    position: 'relative', 
                                    marginBottom: '8px',
                                    backgroundColor: '#fff',
                                    borderRadius: '8px',
                                    padding: '8px'
                                }}>
                                    <StockChart data={stockHistory} showAll={true} />
                                </div>
                                <div style={{ 
                                    textAlign: 'center',
                                    fontSize: '14px',
                                    fontWeight: 'bold',
                                    color: '#1677ff',
                                    padding: '8px',
                                    backgroundColor: '#f0f8ff',
                                    borderRadius: '8px'
                                }}>
                                    當前價格: ${currentPrice.toFixed(2)}
                                </div>
                            </>
                        ) : (
                            <div style={{ 
                                minHeight: '240px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#999',
                                fontSize: '14px'
                            }}>
                                等待遊戲開始...
                            </div>
                        )}
                    </div>
                }
            />

            {/* ==================== 新聞列表 Modal ==================== */}
            <Modal
                visible={showNewsModal}
                onClose={() => setShowNewsModal(false)}
                closeOnMaskClick={true}
                title={
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center'
                    }}>
                        <span>股票相關新聞</span>
                        <CloseOutline 
                            fontSize={20}
                            onClick={() => setShowNewsModal(false)}
                            style={{ cursor: 'pointer', color: '#999' }}
                        />
                    </div>
                }
                content={
                    <div style={{ 
                        minHeight: '400px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        padding: '40px 20px'
                    }}>
                        <div>
                            <div style={{ fontSize: '64px', marginBottom: '20px' }}>📰</div>
                            <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px', color: '#333' }}>
                                新聞功能尚未實作
                            </div>
                            <div style={{ fontSize: '14px', color: '#999', lineHeight: '1.6' }}>
                                此功能將在未來版本中推出<br />
                                敬請期待
                            </div>
                        </div>
                    </div>
                }
            />

            {/* ==================== 頭像選擇器 Popup ==================== */}
            <Popup
                visible={showAvatarSelector}
                onMaskClick={() => setShowAvatarSelector(false)}
                position='right'
                bodyStyle={{ 
                    width: '320px',
                    height: '100vh',
                    padding: '0',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                {/* 固定的標題列 */}
                <div style={{ 
                    padding: '16px 20px',
                    borderBottom: '1px solid #f0f0f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexShrink: 0
                }}>
                    <div style={{ 
                        fontSize: '18px', 
                        fontWeight: 'bold'
                    }}>
                        選擇頭像
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <Button 
                            size='small'
                            color='primary'
                            onClick={handleAvatarUpdate}
                            disabled={!selectedAvatar}
                        >
                            儲存
                        </Button>
                        <CloseOutline 
                            fontSize={24} 
                            style={{ cursor: 'pointer', color: '#999' }}
                            onClick={() => setShowAvatarSelector(false)}
                        />
                    </div>
                </div>

                {/* 可滾動的頭像網格 */}
                <div style={{ 
                    flex: 1,
                    overflowY: 'auto',
                    padding: '20px'
                }}>
                    <Grid columns={4} gap={12}>
                        {avatarOptions.map((avatar) => (
                            <Grid.Item key={avatar}>
                                <div
                                    onClick={() => setSelectedAvatar(avatar)}
                                    style={{
                                        position: 'relative',
                                        cursor: 'pointer',
                                        borderRadius: '8px',
                                        overflow: 'hidden',
                                        border: selectedAvatar === avatar 
                                            ? '3px solid #1677ff' 
                                            : '2px solid #f0f0f0',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <img 
                                        src={`/avatars/${avatar}`}
                                        alt={avatar}
                                        style={{
                                            width: '100%',
                                            height: 'auto',
                                            display: 'block',
                                            aspectRatio: '1'
                                        }}
                                        onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                        }}
                                    />
                                    {selectedAvatar === avatar && (
                                        <div style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            right: 0,
                                            bottom: 0,
                                            backgroundColor: 'rgba(22, 119, 255, 0.2)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <div style={{
                                                width: '20px',
                                                height: '20px',
                                                borderRadius: '50%',
                                                backgroundColor: '#1677ff',
                                                color: 'white',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '14px',
                                                fontWeight: 'bold'
                                            }}>
                                                ✓
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Grid.Item>
                        ))}
                    </Grid>
                </div>
            </Popup>
        </div>
    );
};

export default HomePage;
