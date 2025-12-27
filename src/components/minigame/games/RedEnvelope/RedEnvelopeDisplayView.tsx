import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { MiniGameSyncState } from '../../containers/MiniGameOverlay';

type Participant = { userId: number; displayName: string; avatar: string | null };
type Packet = { index: number; name?: string };

const PACKET_CENTER_X = 50;
const PACKET_CENTER_Y = 45;
const PACKET_WIDTH = 60;
const PACKET_HEIGHT = 78;
const RIGHT_SHIFT = 70;
const GATHER_DELAY = 2500;
const RIGHT_DURATION = 200;
const LEFT_DURATION = 200;
const PAUSE_DURATION = 300;
const CUT_INTERVAL = RIGHT_DURATION + LEFT_DURATION + PAUSE_DURATION;

interface Props {
    miniGame: MiniGameSyncState;
    participants: Participant[];
}

const RedEnvelopeDisplayView: React.FC<Props> = ({ miniGame, participants }) => {
    const [packets, setPackets] = useState<Packet[]>([]);
    const [shuffledPackets, setShuffledPackets] = useState<Packet[]>([]);
    const [isGathered, setIsGathered] = useState(false);
    const [cuttingIds, setCuttingIds] = useState<number[]>([]);
    const [isCuttingRight, setIsCuttingRight] = useState(false);
    const cutIntervalRef = useRef<number | null>(null);
    const gatherTimeoutRef = useRef<number | null>(null);
    const cutTimeoutsRef = useRef<number[]>([]);
    const shuffledRef = useRef<Packet[]>(shuffledPackets);

    const normalizedPhase = (miniGame.phase || '').toUpperCase();
    const isShuffling = normalizedPhase === 'SHUFFLE';

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

    useEffect(() => {
        const incoming = [...(miniGame.data?.packets || [])].sort((a, b) => a.index - b.index);
        setPackets((prev) => {
            const sameLength = prev.length === incoming.length;
            const sameOrder = sameLength && prev.every((p, idx) => p.index === incoming[idx]?.index);
            const next = sameOrder ? prev : incoming;
            if (!isShuffling) {
                setShuffledPackets(next);
            }
            return next;
        });
    }, [miniGame.data?.packets, isShuffling]);

    // 進入洗牌時，先堆疊再開始切牌
    useEffect(() => {
        clearCutTimers();

        if (isShuffling) {
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
    }, [isShuffling, packets, clearCutTimers]);

    // 切牌動畫：穩定節奏，避免視覺暈眩
    useEffect(() => {
        if (!isShuffling || !isGathered || !shuffledRef.current.length) return undefined;

        const runCut = () => {
            const current = shuffledRef.current;
            if (!current.length) return;

            const batchSize = Math.max(1, Math.ceil(current.length / 3));
            const batch = current.slice(0, batchSize).map((p: Packet) => p.index);
            setCuttingIds(batch);
            setIsCuttingRight(true);

            const rightTimer = window.setTimeout(() => {
                setShuffledPackets((prev: Packet[]) => {
                    if (!prev.length) return prev;
                    const move = prev.slice(0, batchSize);
                    const rest = prev.slice(batchSize);
                    return [...rest, ...move];
                });
                setIsCuttingRight(false);
            }, RIGHT_DURATION);

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
    }, [isShuffling, isGathered]);

    const resolveAvatar = (avatar?: string | null) => {
        if (!avatar) return '/avatars/default.png';
        if (avatar.startsWith('http')) return avatar;
        if (avatar.startsWith('/')) return avatar;
        return `/avatars/${avatar}`;
    };

    const renderPackets = (phaseClass: string) => {
        const renderList = phaseClass === 'shuffling' ? shuffledPackets : packets;

        return (
            <div className={`mini-packet-grid ${phaseClass}`}>
                {renderList.map((p, idx) => {
                    const isCutting = phaseClass === 'shuffling' && cuttingIds.includes(p.index);
                    return (
                        <motion.div
                            key={p.index}
                            layout
                            initial={false}
                            className='packet-item'
                            style={{
                                position: phaseClass === 'shuffling' ? 'absolute' : 'relative',
                                zIndex: phaseClass === 'shuffling' ? idx : undefined,
                            }}
                            animate={
                                phaseClass === 'shuffling'
                                    ? {
                                          top: `${PACKET_CENTER_Y}%`,
                                          left: `${PACKET_CENTER_X}%`,
                                          x: isCutting && isCuttingRight ? RIGHT_SHIFT : -PACKET_WIDTH / 2,
                                          y: -PACKET_HEIGHT / 2,
                                      }
                                    : { x: 0, y: 0 }
                            }
                            transition={{ duration: phaseClass === 'shuffling' ? (isCutting ? 0.3 : isGathered ? 0.3 : 1.0) : 0.35, ease: 'easeInOut' }}
                        >
                            <img src='/images/red-packet.webp' alt={p.name} className='packet-img' />
                        </motion.div>
                    );
                })}
            </div>
        );
    };

    if (miniGame.gameType !== 'RED_ENVELOPE') {
        return null;
    }

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
};

export default RedEnvelopeDisplayView;
