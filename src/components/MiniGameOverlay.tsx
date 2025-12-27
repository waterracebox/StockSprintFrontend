import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

const PACKET_CENTER_X = 50;
const PACKET_CENTER_Y = 45;
const PACKET_WIDTH = 60;
const PACKET_HEIGHT = 78;
const GATHER_DELAY = 2500; // 1s 集中動畫 + 0.2s 緩衝，確保堆疊完成再切牌
const RIGHT_DURATION = 200; // 0.3s 右移
const LEFT_DURATION = 200; // 0.3s 回中
const PAUSE_DURATION = 300; // 0.3s 停頓
const CUT_INTERVAL = RIGHT_DURATION + LEFT_DURATION + PAUSE_DURATION; // 900ms 迴圈

export interface MiniGameSyncState {
    gameType: 'NONE' | 'RED_ENVELOPE' | 'QUIZ' | 'MINORITY';
    phase: string;
    startTime: number;
    endTime: number;
    data: any;
}

type Participant = { userId: number; displayName: string; avatar: string | null };
type Packet = { index: number; name?: string; isTaken?: boolean; ownerId?: string | null; type?: string; prizeValue?: number };

interface MiniGameOverlayProps {
    state: MiniGameSyncState | null;
    visible: boolean;
    totalAssets: number;
    currentPrice: number;
    onCollapse: () => void;
}

// 使用 Framer Motion 取代舊的 chaos 動畫，因此不需要額外隨機座標函式。

const MiniGameOverlay: React.FC<MiniGameOverlayProps> = ({ state, visible, totalAssets, currentPrice, onCollapse }) => {
    if (!visible || !state || state.gameType === 'NONE') return null;

    const normalizedGame = state.gameType;
    const normalizedPhase = (state.phase || '').toUpperCase();
    const [participantList, setParticipantList] = useState<Participant[]>(state.data?.participants || []);
    const [packets, setPackets] = useState<Packet[]>(state.data?.packets || []);
    const [shuffledPackets, setShuffledPackets] = useState<Packet[]>(state.data?.packets || []);
    const [isGathered, setIsGathered] = useState(false);
    const [cuttingIds, setCuttingIds] = useState<number[]>([]);
    const [isCuttingRight, setIsCuttingRight] = useState(false);
    const cutIntervalRef = useRef<number | null>(null);
    const gatherTimeoutRef = useRef<number | null>(null);
    const cutTimeoutsRef = useRef<number[]>([]);
    const shuffledRef = useRef<Packet[]>(shuffledPackets);

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

    // 依照父層同步的資料更新本地顯示，無需自行輪詢
    useEffect(() => {
        setParticipantList((state.data?.participants as Participant[] | undefined) || []);

        const incoming = [...((state.data?.packets as Packet[] | undefined) || [])].sort((a, b) => a.index - b.index);
        setPackets((prev: Packet[]) => {
            const sameLength = prev.length === incoming.length;
            const sameOrder = sameLength && prev.every((p: Packet, idx: number) => p.index === incoming[idx]?.index);
            const next = sameOrder ? prev : incoming;
            if (normalizedPhase !== 'SHUFFLE') {
                setShuffledPackets(next);
            }
            return next;
        });
    }, [state.data?.participants, state.data?.packets, normalizedPhase]);

    const header = (
        <div
            style={{
                width: '100%',
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(0,0,0,0.25)',
                backdropFilter: 'blur(4px)',
                boxSizing: 'border-box',
            }}
        >
            <div style={{ fontWeight: 800, fontSize: 18 }}>🧧 尾牙抽獎</div>
            <button
                onClick={onCollapse}
                style={{
                    border: 'none',
                    background: 'rgba(255,255,255,0.18)',
                    color: '#fff',
                    padding: '6px 10px',
                    borderRadius: 999,
                    cursor: 'pointer',
                    fontWeight: 600,
                }}
            >
                收起
            </button>
        </div>
    );

    const miniStatusBar = (
        <div
            style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '6px 14px',
                background: 'rgba(0,0,0,0.28)',
                color: '#fff',
                fontSize: 12,
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
            }}
        >
            <span>總資產: ${totalAssets.toFixed(2)}</span>
            <span>股價: ${currentPrice.toFixed(2)}</span>
        </div>
    );

    // 進入 SHUFFLE 時先集中到中心堆疊，再啟動持續切牌循環
    useEffect(() => {
        clearCutTimers();

        if (normalizedPhase === 'SHUFFLE') {
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
    }, [normalizedPhase, packets, clearCutTimers]);

    // 切牌循環：每隔 CUT_INTERVAL 將底部元素移到頂部，並播放右移動畫
    useEffect(() => {
        if (normalizedPhase !== 'SHUFFLE' || !isGathered || !shuffledRef.current.length) return undefined;

        const runCut = () => {
            const current = shuffledRef.current;
            if (!current.length) return;

            const batchSize = Math.max(1, Math.ceil(current.length / 3));
            const batch = current.slice(0, batchSize).map((p: Packet) => p.index);
            setCuttingIds(batch);
            setIsCuttingRight(true);

            // 0.3s 右移結束時，將底牌搬到頂層，並開始回中
            const rightTimer = window.setTimeout(() => {
                setShuffledPackets((prev: Packet[]) => {
                    if (!prev.length) return prev;
                    const move = prev.slice(0, batchSize);
                    const rest = prev.slice(batchSize);
                    return [...rest, ...move];
                });
                setIsCuttingRight(false);
            }, RIGHT_DURATION);

            // 再 0.3s 回中，結束本輪切牌
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
    }, [normalizedPhase, isGathered]);

    const resolveAvatar = (avatar?: string | null) => {
        if (!avatar) return '/avatars/default.png';
        if (avatar.startsWith('http')) return avatar;
        if (avatar.startsWith('/')) return avatar;
        return `/avatars/${avatar}`;
    };

    const renderPackets = (phaseClass: string) => {
        const isShuffling = phaseClass === 'shuffling';
        const renderList = isShuffling ? shuffledPackets : packets;

        return (
            <div className={`mini-packet-grid ${phaseClass}`}>
                {renderList.map((p: Packet, idx: number) => {
                    const isCutting = isShuffling && cuttingIds.includes(p.index);
                    return (
                        <motion.div
                            key={p.index}
                            layout
                            initial={false}
                            className='packet-item'
                            style={{
                                position: isShuffling ? 'absolute' : 'relative',
                                // 讓陣列前端成為視覺最底層，便於將「底牌」取出後推到頂層
                                zIndex: isShuffling ? idx : undefined,
                            }}
                            animate={
                                isShuffling
                                    ? {
                                          top: `${PACKET_CENTER_Y}%`,
                                          left: `${PACKET_CENTER_X}%`,
                                          x: isCutting && isCuttingRight ? 60 : -PACKET_WIDTH / 2,
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

    // 紅包待機/洗牌畫面：保持網格 DOM 不卸載，僅切換 class
    if (normalizedGame === 'RED_ENVELOPE' && (normalizedPhase === 'IDLE' || normalizedPhase === 'SHUFFLE')) {
        const isShuffling = normalizedPhase === 'SHUFFLE';
        return (
            <div
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 9999,
                    backgroundImage: `linear-gradient(135deg, rgba(139,0,0,0.65) 0%, rgba(74,0,0,0.65) 100%), url('/background/idle.webp')`,
                    backgroundSize: 'cover',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    color: '#fff',
                }}
            >
                {header}
                {miniStatusBar}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 16, gap: 12, overflow: 'auto' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, opacity: 0.85 }}>員工</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', maxHeight: 2 * 48 + 12, overflowY: 'auto', alignContent: 'flex-start' }}>
                        {participantList.length === 0 && <span style={{ opacity: 0.8 }}>載入參與者中...</span>}
                        {participantList.map((p: Participant) => (
                            <div key={p.userId} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 4px', background: 'rgba(255,255,255,0.08)', borderRadius: 8 }}>
                                <img
                                    src={resolveAvatar(p.avatar)}
                                    alt={p.displayName}
                                    style={{ width: 30, height: 30, borderRadius: 8, objectFit: 'cover', border: '1px solid rgba(255,255,255,0.18)' }}
                                />
                                <span style={{ fontSize: 13 }}>{p.displayName}</span>
                            </div>
                        ))}
                    </div>
                </div>

                    <div style={{ flex: 1, minHeight: 220 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                            <div style={{ fontSize: 20, fontWeight: 900 }}>{isShuffling ? '洗牌中...' : '準備搶紅包'}</div>
                            <div style={{ opacity: 0.8, fontSize: 12 }}>紅包數：{packets.length}</div>
                        </div>
                        {renderPackets(isShuffling ? 'shuffling' : 'idle')}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                backgroundImage: `linear-gradient(135deg, rgba(0,0,0,0.78) 0%, rgba(10,10,10,0.75) 100%), url('/background/idle.webp')`,
                backgroundSize: 'cover',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                display: 'flex',
                flexDirection: 'column',
                color: '#fff',
            }}
        >
            {header}
            {miniStatusBar}
            <div
                style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    padding: 24,
                    gap: 12,
                }}
            >
                <div style={{ marginBottom: 8, fontSize: 20, fontWeight: 800 }}>MiniGame Active</div>
                <div style={{ fontSize: 16, opacity: 0.85 }}>
                    {state.gameType} / {state.phase}
                </div>
            </div>
        </div>
    );
};

export default MiniGameOverlay;
