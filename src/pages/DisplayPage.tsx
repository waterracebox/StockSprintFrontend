import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Toast, DotLoading } from 'antd-mobile';
import { authAPI, type User } from '../services/auth';
import type { MiniGameSyncState } from '../components/MiniGameOverlay';
import StockChart from '../components/StockChart';
import Leaderboard from '../components/Leaderboard';
import type { StockData, GameState, FullSyncPayload } from '../types/game';

type LeaderboardItem = { userId: number; displayName: string; avatar: string | null; totalAssets: number; rank: number };

const PACKET_CENTER_X = 50;
const PACKET_CENTER_Y = 45;
const PACKET_WIDTH = 60;
const PACKET_HEIGHT = 78;
const RIGHT_SHIFT = 70; // 切牌時的右移距離
const GATHER_DELAY = 2500; // 先堆疊完成再切牌
const RIGHT_DURATION = 200; // 右移
const LEFT_DURATION = 200; // 回中
const PAUSE_DURATION = 300; // 停頓
const CUT_INTERVAL = RIGHT_DURATION + LEFT_DURATION + PAUSE_DURATION; // 900ms 迴圈

const DisplayPage: React.FC = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState<User | null>(null);
    const [miniGame, setMiniGame] = useState<MiniGameSyncState | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [stockHistory, setStockHistory] = useState<StockData[]>([]);
    const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [participants, setParticipants] = useState<{ userId: number; displayName: string; avatar: string | null }[]>([]);
    const [packets, setPackets] = useState<{ index: number; name?: string }[]>([]);
    const [shuffledPackets, setShuffledPackets] = useState<{ index: number; name?: string }[]>([]);
    const [isGathered, setIsGathered] = useState(false);
    const [cuttingIds, setCuttingIds] = useState<number[]>([]);
    const [isCuttingRight, setIsCuttingRight] = useState(false);
    const cutIntervalRef = useRef<number | null>(null);
    const gatherTimeoutRef = useRef<number | null>(null);
    const cutTimeoutsRef = useRef<number[]>([]);
    const shuffledRef = useRef(shuffledPackets);

    const resolveAvatar = (avatar?: string | null) => {
        if (!avatar) return '/avatars/default.png';
        if (avatar.startsWith('http')) return avatar;
        if (avatar.startsWith('/')) return avatar;
        return `/avatars/${avatar}`;
    };

    const clearCutTimers = useCallback(() => {
        if (cutIntervalRef.current) {
            window.clearInterval(cutIntervalRef.current);
            cutIntervalRef.current = null;
        }
        if (gatherTimeoutRef.current) {
            window.clearTimeout(gatherTimeoutRef.current);
            gatherTimeoutRef.current = null;
        }
        cutTimeoutsRef.current.forEach((id) => window.clearTimeout(id));
        cutTimeoutsRef.current = [];
        setCuttingIds([]);
        setIsCuttingRight(false);
    }, []);

    useEffect(() => {
        shuffledRef.current = shuffledPackets;
    }, [shuffledPackets]);

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

    // 初始狀態同步（避免載入時 participants 為空）
    useEffect(() => {
        const normalizedPhase = (miniGame?.phase || '').toUpperCase();
        setParticipants(miniGame?.data?.participants || []);

        const incoming = [...(miniGame?.data?.packets || [])].sort((a, b) => a.index - b.index);
        setPackets((prev) => {
            const sameLength = prev.length === incoming.length;
            const sameOrder = sameLength && prev.every((p, idx) => p.index === incoming[idx]?.index);
            const next = sameOrder ? prev : incoming;
            if (normalizedPhase !== 'SHUFFLE') {
                setShuffledPackets(next);
            }
            return next;
        });
    }, [miniGame?.data?.participants, miniGame?.data?.packets, miniGame?.phase]);

    // 使用 Framer Motion 取代舊的 chaos 動畫，因此不需要隨機座標。

    // 進入 SHUFFLE 時先集中到中心堆疊，再啟動持續切牌循環
    useEffect(() => {
        clearCutTimers();

        const normalizedPhase = (miniGame?.phase || '').toUpperCase();
        if (miniGame?.gameType === 'RED_ENVELOPE' && normalizedPhase === 'SHUFFLE') {
            setShuffledPackets(packets);
            setIsGathered(false);
            setIsCuttingRight(false);
            setCuttingIds([]);

            gatherTimeoutRef.current = window.setTimeout(() => {
                setIsGathered(true);
            }, GATHER_DELAY);
        } else {
            setIsGathered(false);
            setCuttingIds([]);
            setIsCuttingRight(false);
        }

        return () => clearCutTimers();
    }, [miniGame?.phase, miniGame?.gameType, packets, clearCutTimers]);

    // 切牌循環：每隔 CUT_INTERVAL 將底部元素移到頂部，並播放右移動畫
    useEffect(() => {
        const normalizedPhase = (miniGame?.phase || '').toUpperCase();
        if (normalizedPhase !== 'SHUFFLE' || miniGame?.gameType !== 'RED_ENVELOPE' || !isGathered || !shuffledRef.current.length)
            return undefined;

        const runCut = () => {
            const current = shuffledRef.current;
            if (!current.length) return;

            const batchSize = Math.max(1, Math.ceil(current.length / 3));
            const batch = current.slice(0, batchSize).map((p) => p.index);
            setCuttingIds(batch);
            setIsCuttingRight(true);

            // 右移結束時，將底牌搬到頂層，並開始回中
            const rightTimer = window.setTimeout(() => {
                setShuffledPackets((prev) => {
                    if (!prev.length) return prev;
                    const move = prev.slice(0, batchSize);
                    const rest = prev.slice(batchSize);
                    return [...rest, ...move];
                });
                setIsCuttingRight(false);
            }, RIGHT_DURATION);

            // 再回中，結束本輪切牌
            const centerTimer = window.setTimeout(() => {
                setCuttingIds([]);
            }, RIGHT_DURATION + LEFT_DURATION);

            cutTimeoutsRef.current.push(rightTimer, centerTimer);
        };

        runCut();
        cutIntervalRef.current = window.setInterval(runCut, CUT_INTERVAL);

        return () => {
            if (cutIntervalRef.current) {
                window.clearInterval(cutIntervalRef.current);
                cutIntervalRef.current = null;
            }
            cutTimeoutsRef.current.forEach((id) => window.clearTimeout(id));
            cutTimeoutsRef.current = [];
            setCuttingIds([]);
            setIsCuttingRight(false);
        };
    }, [miniGame?.phase, miniGame?.gameType, isGathered]);

    const currentPrice = stockHistory.length > 0 ? stockHistory[stockHistory.length - 1].price : 0;

    const renderPackets = (phaseClass: string) => {
        const isShuffling = phaseClass === 'shuffling';
        const renderList = isShuffling ? shuffledPackets : packets;

        return (
            <div className={`mini-packet-grid ${phaseClass}`}>
                {renderList.map((p, idx) => {
                    const isCutting = isShuffling && cuttingIds.includes(p.index);
                    return (
                        <motion.div
                            key={p.index}
                            layout
                            initial={false}
                            className='packet-item'
                            style={{
                                position: isShuffling ? 'absolute' : 'relative',
                                // 陣列前端視覺位於底層，方便將「底牌」取出再推到頂層
                                zIndex: isShuffling ? idx : undefined,
                            }}
                            animate={
                                isShuffling
                                    ? {
                                          top: `${PACKET_CENTER_Y}%`,
                                          left: `${PACKET_CENTER_X}%`,
                                          x: isCutting && isCuttingRight ? RIGHT_SHIFT : -PACKET_WIDTH / 2,
                                          y: -PACKET_HEIGHT / 2,
                                      }
                                    : {
                                          x: 0,
                                          y: 0,
                                      }
                            }
                            transition={{ duration: isShuffling ? (isCutting ? 0.3 : isGathered ? 0.3 : 1.0) : 0.35, ease: 'easeInOut' }}
                        >
                            <img src='/images/red-packet.webp' alt={p.name} className='packet-img' />
                        </motion.div>
                    );
                })}
            </div>
        );
    };

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
                    minHeight: '100vh',
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
                <div style={{ maxWidth: 900, width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
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

    if (miniGame.gameType === 'RED_ENVELOPE' && (miniGame.phase === 'IDLE' || miniGame.phase === 'SHUFFLE')) {
        const isShuffling = miniGame.phase === 'SHUFFLE';

        return (
            <div
                style={{
                    minHeight: '100vh',
                    backgroundImage: `linear-gradient(135deg, rgba(139,0,0,0.65) 0%, rgba(74,0,0,0.65) 100%), url('/background/idle.webp')`,
                    backgroundSize: 'cover',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    color: '#fff',
                    padding: 32,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 24,
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h1 style={{ margin: 0, fontSize: 32, fontWeight: 900 }}>🧧 尾牙抽獎</h1>
                    <div style={{ opacity: 0.85 }}>{isShuffling ? '洗牌中...' : '準備搶紅包'}</div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, opacity: 0.85 }}>員工</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, maxHeight: 2 * 56 + 12, overflowY: 'auto', alignContent: 'flex-start' }}>
                        {participants.map((p) => (
                            <div key={p.userId} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 4px', background: 'rgba(255,255,255,0.08)', borderRadius: 10 }}>
                                <img src={resolveAvatar(p.avatar)} alt={p.displayName} style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover', border: '1px solid rgba(255,255,255,0.18)' }} />
                                <span>{p.displayName}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ flex: 1 }}>
                    <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: 22, fontWeight: 800 }}>{isShuffling ? '洗牌動畫' : '紅包網格'}</div>
                        <span style={{ fontSize: 14, opacity: 0.8 }}>紅包數：{packets.length}</span>
                    </div>
                    {renderPackets(isShuffling ? 'shuffling' : 'idle')}
                </div>
            </div>
        );
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
