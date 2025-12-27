import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import RedPacket, { type RedPacketStatus } from './RedPacket';
import type { MiniGameSyncState } from '../../containers/MiniGameOverlay';

type Participant = { userId: number; displayName: string; avatar: string | null };
type Packet = { index: number; name?: string; isTaken?: boolean; ownerId?: string | null; type?: string; prizeValue?: number };

const PACKET_WIDTH = 60;
const PACKET_HEIGHT = 78;
const RIGHT_DURATION = 200;
const LEFT_DURATION = 200;
const CUT_SHIFT = 60;
const CUT_INTERVAL = 1500;
const GATHER_DURATION = 1000;
const ANIMATION_DURATION = 3000;
const DEAL_RETURN_DURATION = 0.75;
const MOVE_CENTER_DURATION = 1.0;

interface Props {
    miniGame: MiniGameSyncState;
    participants: Participant[];
}

const RedEnvelopeDisplayView: React.FC<Props> = ({ miniGame, participants }) => {
    const normalizedPhase = (miniGame.phase || '').toUpperCase();
    const isShuffling = normalizedPhase === 'SHUFFLE';

    const [packets, setPackets] = useState<Packet[]>(miniGame.data?.packets || []);
    const [orderedPackets, setOrderedPackets] = useState<Packet[]>(miniGame.data?.packets || []);
    const [isGathered, setIsGathered] = useState(false);
    const [isCentering, setIsCentering] = useState(false);
    const [cuttingIds, setCuttingIds] = useState<number[]>([]);
    const [countdown, setCountdown] = useState<number>(0);
    const [remainingMs, setRemainingMs] = useState<number>(0);

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
            </div>
        </div>
    );
};

export default RedEnvelopeDisplayView;
