import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { Toast, DotLoading } from 'antd-mobile';
import { authAPI, type User } from '../services/auth';
import type { MiniGameSyncState } from '../components/MiniGameOverlay';
import StockChart from '../components/StockChart';
import Leaderboard from '../components/Leaderboard';
import MiniGameDisplaySwitch from '../components/minigame/containers/MiniGameDisplaySwitch';
import EndingCeremony from '../components/display/EndingCeremony'; // 【Phase 4】結束儀式
import NewsFlashModal from '../components/display/NewsFlashModal'; // 【新增】新聞速報彈窗
import type { StockData, GameState, FullSyncPayload } from '../types/game';

type LeaderboardItem = { userId: number; displayName: string; avatar: string | null; totalAssets: number; rank: number };

const DisplayPage: React.FC = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState<User | null>(null);
    const [miniGame, setMiniGame] = useState<MiniGameSyncState | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [stockHistory, setStockHistory] = useState<StockData[]>([]);
    const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [participants, setParticipants] = useState<{ userId: number; displayName: string; avatar: string | null }[]>([]);
    const socketRef = useRef<Socket | null>(null);

    // 【新增】新聞速報狀態
    const [showNews, setShowNews] = useState(false);
    const [currentNews, setCurrentNews] = useState<{ title: string; content: string } | null>(null);

    // 驗證使用者，僅允許員工或管理員瀏覽投影頁
    useEffect(() => {
        authAPI
            .getMe()
            .then((res) => {
                const currentUser = res.user;
                if (!(currentUser.isEmployee || currentUser.role === 'ADMIN')) {
                    Toast.show({ icon: 'fail', content: '僅限工作人員可查看投影頁' });
                    navigate('/home', { replace: true });
                    return;
                }
                setUser(currentUser);
                setIsLoading(false);
            })
            .catch(() => {
                navigate('/login', { replace: true });
            });
    }, [navigate]);

    // 建立 socket 連線並監聽狀態
    useEffect(() => {
        if (!user) return;

        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login', { replace: true });
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
            setMiniGame(payload);
            setParticipants(payload.data?.participants || []);
        });

        s.on('MINIGAME_PARTICIPANTS', (payload: { participants: any[]; packets: any[]; updatedAt?: number }) => {
            console.log('[Display] 收到 MINIGAME_PARTICIPANTS 廣播', {
                participants: payload.participants?.length ?? 0,
                packets: payload.packets?.length ?? 0,
                updatedAt: payload.updatedAt,
            });

            setParticipants(payload.participants || []);
            setMiniGame((prev) =>
                prev
                    ? {
                          ...prev,
                          data: {
                              ...prev.data,
                              participants: payload.participants || prev.data?.participants || [],
                              packets: payload.packets?.length ? payload.packets : prev.data?.packets || [],
                          },
                      }
                    : prev
            );
        });

        s.on('MINIGAME_EVENT', (evt: any) => {
            if (!evt || evt.type !== 'PACKET_TAKEN') return;
            setMiniGame((prev) => {
                if (!prev || prev.gameType !== 'RED_ENVELOPE') return prev;
                const updatedPackets = (prev.data?.packets || []).map((p: any) =>
                    p.index === evt.index ? { ...p, isTaken: true, ownerId: evt.ownerId ?? p.ownerId } : p
                );
                return { ...prev, data: { ...prev.data, packets: updatedPackets } };
            });
        });

        s.on('FULL_SYNC_STATE', (payload: FullSyncPayload) => {
            setStockHistory(payload.price.history);
            setLeaderboard(payload.leaderboard || []);
            setGameState(payload.gameStatus);
        });

        s.on('PRICE_UPDATE', (payload: { day: number; price: number; history: StockData[] }) => {
            setStockHistory(payload.history);
        });

        s.on('LEADERBOARD_UPDATE', (payload: { data: LeaderboardItem[] }) => {
            setLeaderboard(payload.data);
        });

        // 【新增】監聽新聞廣播（即時更新 stockHistory 中的新聞數據）
        s.on('NEWS_UPDATE', (payload: { day: number; title: string; content: string }) => {
            console.log('[Display] 收到新聞廣播:', payload);
            
            // 更新 stockHistory 中對應天數的新聞數據
            setStockHistory((prev) => {
                return prev.map((item) => {
                    if (item.day === payload.day) {
                        return {
                            ...item,
                            title: payload.title,
                            news: payload.content,
                        };
                    }
                    return item;
                });
            });
        });

        // 【Phase 4】監聽遊戲狀態更新
        s.on('GAME_STATE_UPDATE', (payload: GameState) => {
            console.log('[DisplayPage] 收到 GAME_STATE_UPDATE:', payload);
            setGameState(payload);
        });

        s.on('connect', () => {
            console.log('[Display] Socket 連線成功');
        });

        s.on('disconnect', (reason) => {
            console.log('[Display] Socket 斷線', reason);
        });

        return () => {
            s.disconnect();
        };
    }, [user, navigate]);

    useEffect(() => {
        setParticipants(miniGame?.data?.participants || []);
    }, [miniGame?.data?.participants]);

    // 【新增】新聞速報觸發邏輯
    useEffect(() => {
        console.log('[NewsFlash Debug] 觸發檢查', {
            hasGameState: !!gameState,
            currentDay: gameState?.currentDay,
            historyLength: stockHistory.length,
            miniGameType: miniGame?.gameType,
            showNews,
        });

        // 條件 1：遊戲狀態或新聞數據未載入
        if (!gameState || !stockHistory.length) {
            console.log('[NewsFlash Debug] 數據未載入，跳過');
            return;
        }

        const currentDay = gameState.currentDay;
        const hasMiniGame = miniGame && miniGame.gameType !== 'NONE';

        // 條件 2：小遊戲進行中時，強制關閉新聞速報
        if (hasMiniGame) {
            if (showNews) {
                console.log('[Display] 小遊戲進行中，關閉新聞速報');
                setShowNews(false);
            }
            return;
        }

        // 條件 3：天數變化時，檢查新新聞
        const todayData = stockHistory.find((d) => d.day === currentDay);
        console.log('[NewsFlash Debug] 檢查當天數據', {
            currentDay,
            todayData: todayData ? { day: todayData.day, title: todayData.title, hasNews: !!todayData.news } : null,
        });

        if (todayData && todayData.title && todayData.news) {
            // 檢查是否為新新聞（避免重複顯示）
            const isNewNews = !currentNews || currentNews.title !== todayData.title;
            
            if (isNewNews) {
                console.log(`[Display] Day ${currentDay} 發現新新聞，準備顯示速報`, {
                    title: todayData.title,
                    news: todayData.news,
                });

                // 若舊新聞正在顯示，先關閉
                if (showNews) {
                    console.log('[Display] 關閉舊新聞');
                    setShowNews(false);
                }

                // 延遲 300ms 後顯示新新聞（避免閃爍）
                const timer = setTimeout(() => {
                    setCurrentNews({
                        title: todayData.title,
                        content: todayData.news || '',
                    });
                    setShowNews(true);
                    console.log('[Display] 新聞速報已顯示');
                }, showNews ? 300 : 0); // 如果已有舊新聞則延遲，否則立即顯示

                return () => clearTimeout(timer);
            } else {
                console.log('[NewsFlash Debug] 已顯示相同新聞，跳過');
            }
        }

        // 條件 4：天數變化但無新聞時，關閉舊新聞
        if (showNews && (!todayData || !todayData.title)) {
            console.log('[Display] 天數變化且無新聞，關閉速報');
            setShowNews(false);
        }
    }, [gameState?.currentDay, stockHistory, miniGame?.gameType, showNews, currentNews]);

    const currentPrice = stockHistory.length > 0 ? stockHistory[stockHistory.length - 1].price : 0;
    const miniGameView = miniGame ? <MiniGameDisplaySwitch miniGame={miniGame} participants={participants} socket={socketRef.current} /> : null;

    // 【Phase 4】判斷是否顯示結束儀式
    // 簡化邏輯：遊戲已停止（isGameStarted === false）且有進度（currentDay > 0）→ 顯示儀式
    const shouldShowCeremony = gameState && !gameState.isGameStarted && gameState.currentDay > 0;

    if (isLoading) {
        return (
            <div
                style={{
                    height: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#000',
                    color: '#fff',
                }}
            >
                <DotLoading color="white" />
                <span style={{ marginLeft: 8 }}>驗證中...</span>
            </div>
        );
    }

    // 【Phase 4】顯示結束儀式（優先級高於小遊戲和主遊戲）
    if (shouldShowCeremony) {
        return <EndingCeremony />;
    }

    if (!miniGame || miniGame.gameType === 'NONE') {
        return (
            <div
                style={{
                    position: 'fixed',
                    inset: 0,
                    width: '100vw',
                    minHeight: '100vh',
                    boxSizing: 'border-box',
                    overflow: 'auto',
                    backgroundImage: `linear-gradient(135deg, rgba(11,18,36,0.72) 0%, rgba(15,23,42,0.72) 100%), url('/background/idle.webp')`,
                    backgroundSize: 'cover',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    color: '#e2e8f0',
                    padding: 32,
                    display: 'flex',
                    justifyContent: 'center',
                }}
            >
                <div style={{ maxWidth: 1100, width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div
                        style={{
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 12,
                            padding: 16,
                            boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
                            backdropFilter: 'blur(6px)',
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#8ec5ff', textDecoration: 'underline' }}>📊 股市走勢</span>
                            <span style={{ fontSize: 12, color: '#8ec5ff', opacity: 0.9 }}>當前 ${currentPrice.toFixed(2)}</span>
                        </div>
                        <div style={{ height: 240 }}>
                            {stockHistory.length > 0 ? (
                                <StockChart data={stockHistory} isGameStarted={gameState?.isGameStarted} showAll />
                            ) : (
                                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.6)' }}>
                                    等待行情資料...
                                </div>
                            )}
                        </div>
                    </div>

                    <div
                        style={{
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 12,
                            padding: 16,
                            boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
                            backdropFilter: 'blur(6px)',
                        }}
                    >
                        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: '#8ec5ff', textDecoration: 'underline' }}>🏆 排行榜</div>
                        {leaderboard.length > 0 ? (
                            <Leaderboard data={leaderboard} currentUserId={user?.id || 0} />
                        ) : (
                            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, textAlign: 'center', padding: 24 }}>
                                等待排行榜資料...
                            </div>
                        )}
                    </div>
                </div>

                {/* 【新增】新聞速報彈窗 */}
                {currentNews && (
                    <NewsFlashModal
                        title={currentNews.title}
                        content={currentNews.content}
                        isVisible={showNews}
                        onClose={() => {
                            console.log('[DisplayPage] 調用 onClose，關閉新聞速報');
                            setShowNews(false);
                        }}
                        duration={10000}
                    />
                )}
            </div>
        );
    }

    if (miniGameView) {
        return miniGameView;
    }

    return (
        <div
            style={{
                height: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#000',
                color: '#fff',
                fontSize: 24,
            }}
        >
            {miniGame.gameType} / {miniGame.phase}
        </div>
    );
};

export default DisplayPage;
