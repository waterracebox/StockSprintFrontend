import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import RedPacket, { type RedPacketStatus } from './RedPacket';
import type { MiniGameSyncState } from '../../containers/MiniGameOverlay';
import type { Socket } from 'socket.io-client';

type Participant = { userId: number; displayName: string; avatar: string | null };
type Packet = { index: number; name?: string; isTaken?: boolean; ownerId?: string | null; type?: string; prizeValue?: number; isScratched?: boolean; displayOrder?: number };

// ========== 動畫參數配置 ==========
const PACKET_WIDTH = 60;                // 紅包寬度（px）
const PACKET_HEIGHT = 78;               // 紅包高度（px）
const RIGHT_DURATION = 200;             // 切牌向右移動的持續時間（ms）
const LEFT_DURATION = 200;              // 切牌向左移動的持續時間（ms）
const CUT_SHIFT = 60;                   // 切牌時的水平偏移距離（px）
const CUT_INTERVAL = 1500;              // 切牌動作的間隔時間（ms）
const GATHER_DURATION = 1000;           // 紅包集中到中心的持續時間（ms）
const ANIMATION_DURATION = 3000;        // 紅包回位動畫持續時間（ms）
const DEAL_RETURN_DURATION = 0.75;      // 紅包回到 Grid 位置的持續時間（秒）
const MOVE_CENTER_DURATION = 1.0;       // 紅包移動到中心的持續時間（秒）

interface Props {
    miniGame: MiniGameSyncState;
    participants: Participant[];
    socket: Socket | null;
}

const RedEnvelopeDisplayView: React.FC<Props> = ({ miniGame, participants, socket }) => {
    const normalizedPhase = (miniGame.phase || '').toUpperCase();
    const isShuffling = normalizedPhase === 'SHUFFLE';
    const isRevealing = normalizedPhase === 'REVEAL';

    const [packets, setPackets] = useState<Packet[]>(miniGame.data?.packets || []);
    const [orderedPackets, setOrderedPackets] = useState<Packet[]>(miniGame.data?.packets || []);
    const [isGathered, setIsGathered] = useState(false);
    const [isCentering, setIsCentering] = useState(false);
    const [cuttingIds, setCuttingIds] = useState<number[]>([]);
    const [countdown, setCountdown] = useState<number>(0);
    const [remainingMs, setRemainingMs] = useState<number>(0);
    const [isRevealStarted, setIsRevealStarted] = useState(false);
    const [currentRevealGroup, setCurrentRevealGroup] = useState<number>(0);

    const cutIntervalRef = useRef<number | null>(null);
    const gatherTimeoutRef = useRef<number | null>(null);
    const cutTimeoutsRef = useRef<number[]>([]);
    const orderedRef = useRef<Packet[]>(orderedPackets);

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
        setIsCentering(false);
    }, []);

    useEffect(() => {
        orderedRef.current = orderedPackets;
    }, [orderedPackets]);

    useEffect(() => {
        const incoming = [...((miniGame.data?.packets as Packet[] | undefined) || [])].sort((a, b) => a.index - b.index);
        setPackets(incoming);
        if (!isShuffling) {
            setOrderedPackets(incoming);
        }
    }, [miniGame.data?.packets, isShuffling]);

    const runCut = useCallback(() => {
        const current = orderedRef.current;
        if (!current.length) return;

        const batchSize = Math.max(1, Math.ceil(current.length / 3));
        const batch = current.slice(0, batchSize);
        const batchIds = batch.map((p) => p.index);
        setCuttingIds(batchIds);

        const rotateTimer = window.setTimeout(() => {
            setOrderedPackets((prev) => {
                if (!prev.length) return prev;
                const move = prev.slice(0, batchSize);
                const rest = prev.slice(batchSize);
                return [...rest, ...move];
            });
            setCuttingIds([]);
        }, RIGHT_DURATION + LEFT_DURATION);

        cutTimeoutsRef.current.push(rotateTimer);
    }, []);

    // 進入洗牌：先集中到中心，再啟動固定節奏的切牌
    useEffect(() => {
        clearCutTimers();

        if (isShuffling) {
            setOrderedPackets((prev) => (prev.length ? prev : packets));
            setIsCentering(true);
            setIsGathered(false);
            setCuttingIds([]);

            gatherTimeoutRef.current = window.setTimeout(() => {
                setIsCentering(false);
                setIsGathered(true);

                const startCutTimer = window.setTimeout(() => {
                    runCut();
                    cutIntervalRef.current = window.setInterval(runCut, CUT_INTERVAL);
                }, 300);

                cutTimeoutsRef.current.push(startCutTimer);
            }, GATHER_DURATION);
        } else {
            setIsCentering(false);
            setIsGathered(false);
            setCuttingIds([]);
        }

        return () => clearCutTimers();
    }, [isShuffling, packets, clearCutTimers, runCut]);

    // 倒數同步
    useEffect(() => {
        if (normalizedPhase !== 'COUNTDOWN') {
            setCountdown(0);
            setRemainingMs(0);
            return undefined;
        }

        const tick = () => {
            const diff = Math.ceil(((miniGame.startTime || 0) - Date.now()) / 1000);
            setCountdown(diff > 0 ? diff : 0);
            setRemainingMs((miniGame.startTime || 0) - Date.now());
        };

        tick();
        const id = window.setInterval(tick, 200);
        return () => window.clearInterval(id);
    }, [normalizedPhase, miniGame.startTime]);

    // 【新增】監聽 ALL_SCRATCHED 事件
    useEffect(() => {
        if (!isRevealing || !socket) return;

        const handleMiniGameEvent = (evt: any) => {
            if (evt?.type === 'ALL_SCRATCHED') {
                console.log('[Display] 收到 ALL_SCRATCHED，開始揭曉動畫');
                setIsRevealStarted(true);
            }
        };

        socket.on('MINIGAME_EVENT', handleMiniGameEvent);

        return () => {
            socket.off('MINIGAME_EVENT', handleMiniGameEvent);
        };
    }, [isRevealing, socket]);

    // 【新增】分組邏輯：依 displayOrder 排序與分組
    const prizeGroups = useMemo(() => {
        if (!isRevealStarted) return [];
        
        const takenPackets = packets.filter((p) => p.isTaken);
        if (takenPackets.length === 0) return [];

        // 【DEBUG】顯示每個獎項的 displayOrder
        console.log('[Display] 所有已搶走的紅包:', takenPackets.map(p => ({
            index: p.index,
            name: p.name,
            displayOrder: p.displayOrder,
            ownerId: p.ownerId
        })));

        // 排序：displayOrder 升序（先開頭獎 1，2，3...，最後開安慰獎 0）
        const sorted = [...takenPackets].sort((a, b) => {
            const orderA = a.displayOrder ?? 0;
            const orderB = b.displayOrder ?? 0;

            // 將 0 視為 Infinity（安慰獎最後開）
            const valueA = orderA === 0 ? Infinity : orderA;
            const valueB = orderB === 0 ? Infinity : orderB;

            return valueA - valueB; // 升序：1, 2, 3, ..., Infinity(0)
        });

        console.log('[Display] 排序後的順序:', sorted.map(p => ({
            name: p.name,
            displayOrder: p.displayOrder
        })));

        // 分組：相同 displayOrder 的為一組
        const groups: Packet[][] = [];
        let currentGroup: Packet[] = [];
        let lastOrder: number | null = null;

        sorted.forEach((packet) => {
            const order = packet.displayOrder ?? 0;
            if (lastOrder !== null && order !== lastOrder) {
                groups.push(currentGroup);
                currentGroup = [];
            }
            currentGroup.push(packet);
            lastOrder = order;
        });

        if (currentGroup.length > 0) groups.push(currentGroup);

        return groups;
    }, [packets, isRevealStarted]);

    // 【新增】揭曉動畫序列控制器
    useEffect(() => {
        if (!isRevealStarted || prizeGroups.length === 0) return;

        let timer: NodeJS.Timeout;
        const revealNextGroup = async (groupIndex: number) => {
            if (groupIndex >= prizeGroups.length) {
                console.log('[Display] 所有獎項揭曉完畢');
                return;
            }

            console.log(`[Display] 揭曉第 ${groupIndex + 1} 組獎項`, prizeGroups[groupIndex]);
            setCurrentRevealGroup(groupIndex);

            // 等待 3 秒後開下一組
            timer = setTimeout(() => revealNextGroup(groupIndex + 1), 3000);
        };

        revealNextGroup(0);

        return () => clearTimeout(timer);
    }, [isRevealStarted, prizeGroups]);

    const resolveAvatar = (avatar?: string | null) => {
        if (!avatar) return '/avatars/default.png';
        if (avatar.startsWith('http')) return avatar;
        if (avatar.startsWith('/')) return avatar;
        return `/avatars/${avatar}`;
    };

    const renderPackets = (phaseClass: string) => {
        const isGridShuffling = phaseClass === 'shuffling';
        const renderList = orderedPackets;
        const isGatherPhase = isGridShuffling && (isCentering || !isGathered);

        return (
            <div className={`mini-packet-grid ${phaseClass}`} style={{ position: 'relative' }}>
                {renderList.map((p: Packet, idx: number) => {
                    const isCutting = isGridShuffling && cuttingIds.includes(p.index);
                    const status: RedPacketStatus = p.isTaken ? 'TAKEN' : 'NORMAL';
                    const ownerName = p.ownerId ? participants.find((pt) => String(pt.userId) === String(p.ownerId))?.displayName : undefined;

                    return (
                        <motion.div
                            key={`packet-${p.index}`}
                            layout
                            layoutId={`packet-${p.index}`}
                            initial={false}
                            className='packet-item'
                            style={{
                                position: isGridShuffling ? 'absolute' : 'relative',
                                top: isGridShuffling ? '50%' : 'auto',
                                left: isGridShuffling ? '50%' : 'auto',
                                zIndex: isGridShuffling ? (isCutting ? renderList.length + 1 : renderList.length - idx) : undefined,
                            }}
                            animate={
                                isGridShuffling
                                    ? {
                                          x: isCutting ? CUT_SHIFT : -PACKET_WIDTH / 2,
                                          y: -PACKET_HEIGHT / 2,
                                      }
                                    : {
                                          x: 0,
                                          y: 0,
                                      }
                            }
                            transition={{
                                duration: isGridShuffling
                                    ? isCutting
                                        ? 0.35
                                        : isGatherPhase
                                        ? MOVE_CENTER_DURATION
                                        : 0.35
                                    : phaseClass === 'idle'
                                    ? 0
                                    : DEAL_RETURN_DURATION,
                                ease: 'easeInOut',
                            }}
                        >
                            <RedPacket status={status} ownerName={ownerName} index={p.index} />
                        </motion.div>
                    );
                })}
            </div>
        );
    };

    if (miniGame.gameType !== 'RED_ENVELOPE') {
        return null;
    }

    const phaseClass = isShuffling ? 'shuffling' : normalizedPhase === 'COUNTDOWN' ? 'countdown' : 'idle';

    return (
        <div
            style={{
                minHeight: '100vh',
                width: '100vw',
                backgroundImage: `linear-gradient(135deg, rgba(139,0,0,0.65) 0%, rgba(74,0,0,0.65) 100%), url('/background/idle.webp')`,
                backgroundSize: 'cover',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                color: '#fff',
                padding: 32,
                display: 'flex',
                flexDirection: 'column',
                gap: 24,
                boxSizing: 'border-box',
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

            <div style={{ flex: 1, position: 'relative' }}>
                <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 800 }}>{isShuffling ? '洗牌動畫' : '紅包網格'}</div>
                    <span style={{ fontSize: 14, opacity: 0.8 }}>紅包數：{packets.length}</span>
                </div>
                {renderPackets(phaseClass)}
                {normalizedPhase === 'COUNTDOWN' && (
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 80,
                            fontWeight: 900,
                            color: '#fff',
                            background: 'rgba(0,0,0,0.28)',
                        }}
                    >
                        {remainingMs > ANIMATION_DURATION ? '準備開搶' : countdown > 0 ? countdown : '開搶！'}
                    </div>
                )}
                {/* 【新增】揭曉動畫層 */}
                {isRevealStarted && prizeGroups.length > 0 && (
                    <div 
                        id="reveal-animation-container"
                        style={{ position: 'absolute', inset: 0, zIndex: 100, pointerEvents: 'none' }}
                    >
                        {/* 渲染所有已開獎的組（0 到 currentRevealGroup） */}
                        {prizeGroups.slice(0, currentRevealGroup + 1).flatMap((group, groupIndex) =>
                            group.map((packet) => (
                                <PrizePullOut
                                    key={packet.index}
                                    packet={packet}
                                    packetHeight={PACKET_HEIGHT}
                                    participants={participants}
                                    shouldAnimate={groupIndex === currentRevealGroup}
                                />
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// 【新增】PrizePullOut 子組件
interface PrizePullOutProps {
    packet: Packet;
    packetHeight: number;
    participants: Participant[];
    shouldAnimate: boolean; // 【新增】控制是否播放動畫
}

const PrizePullOut: React.FC<PrizePullOutProps> = ({ packet, packetHeight, participants, shouldAnimate }) => {
    const owner = participants.find((p) => String(p.userId) === String(packet.ownerId));
    const ownerName = owner?.displayName || `User${packet.ownerId}`;
    const [position, setPosition] = useState<{ left: number; top: number; width: number; height: number } | null>(null);

    // 使用 useLayoutEffect 確保在渲染前獲取位置
    useEffect(() => {
        const packetElement = document.querySelector(`[data-packet-index="${packet.index}"]`);
        const containerElement = document.querySelector('#reveal-animation-container');
        
        if (!packetElement || !containerElement) {
            console.warn(`[Display] 找不到 packet ${packet.index} 或容器的 DOM 元素`);
            return;
        }

        const packetRect = packetElement.getBoundingClientRect();
        const containerRect = containerElement.getBoundingClientRect();
        
        // 計算相對於動畫容器的位置
        setPosition({
            left: packetRect.left - containerRect.left,
            top: packetRect.top - containerRect.top,
            width: packetRect.width || 60,
            height: packetRect.height || 78,
        });
    }, [packet.index]);

    if (!position) return null;

    return (
        <motion.div
            initial={shouldAnimate ? { y: 0, zIndex: 1 } : { y: 0, zIndex: 200 }}
            animate={
                shouldAnimate
                    ? {
                          y: [0, -(packetHeight + 10), 0], // 上 -> 下 -> 回到原位
                          zIndex: [1, 200, 200], // 切換到最前面並保持
                      }
                    : { y: 0, zIndex: 200 } // 已開獎的直接停留在最終狀態
            }
            transition={{
                duration: shouldAnimate ? 1.0 : 0,
                times: shouldAnimate ? [0, 0.5, 1] : undefined,
                ease: 'easeInOut',
            }}
            style={{
                position: 'absolute',
                left: position.left,
                top: position.top,
                width: position.width,
                height: position.height,
                backgroundImage: 'url(/images/open-packet-bg-small.webp)',
                backgroundSize: 'cover',
                borderRadius: 8,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 700,
                fontSize: 12,
                textAlign: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                zIndex: 200, // 確保最終覆蓋在原紅包上
            }}
        >
            <div>{packet.name}</div>
            <div style={{ fontSize: 10, opacity: 0.85 }}>{ownerName}</div>
        </motion.div>
    );
};

export default RedEnvelopeDisplayView;
