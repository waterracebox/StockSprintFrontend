import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Toast, DotLoading } from 'antd-mobile';
import { authAPI, type User } from '../services/auth';
import type { MiniGameSyncState } from '../components/MiniGameOverlay';
import StockChart from '../components/StockChart';
import Leaderboard from '../components/Leaderboard';
import MiniGameDisplaySwitch from '../components/minigame/containers/MiniGameDisplaySwitch';
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

    const currentPrice = stockHistory.length > 0 ? stockHistory[stockHistory.length - 1].price : 0;
    const miniGameView = miniGame ? <MiniGameDisplaySwitch miniGame={miniGame} participants={participants} /> : null;

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
