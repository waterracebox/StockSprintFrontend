import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Toast } from 'antd-mobile';
import type { Socket } from 'socket.io-client';
import RedPacket, { type RedPacketStatus } from './RedPacket';
import type { MiniGameSyncState } from '../../containers/MiniGameOverlay';
import ScratchCard from './ScratchCard';

const PACKET_WIDTH = 60;
const PACKET_HEIGHT = 78;
const RIGHT_DURATION = 200;
const LEFT_DURATION = 200;
const CUT_SHIFT = 60;
const CUT_INTERVAL = 1500; // 切牌週期
const GATHER_DURATION = 1000; // 集中動畫時間（毫秒）
const ANIMATION_DURATION = 3000;
const DEAL_RETURN_DURATION = 0.75; // 平移回網格的時間（秒）
const MOVE_CENTER_DURATION = 1.0; // 從網格平移到中心堆疊的時間（秒）

type Participant = { userId: number; displayName: string; avatar: string | null };
type Packet = { index: number; name?: string; isTaken?: boolean; ownerId?: string | null; type?: string; prizeValue?: number };

interface Props {
    state: MiniGameSyncState;
    totalAssets: number;
    userCash: number; // 使用者當下現金
    currentPrice: number;
    onCollapse: () => void;
    socket: Socket | null;
    selfUserId?: number | null;
}

const RedEnvelopeUserView: React.FC<Props> = ({ state, totalAssets, currentPrice, onCollapse, socket, selfUserId }) => {
    const normalizedPhase = (state.phase || '').toUpperCase();
    const [participantList, setParticipantList] = useState<Participant[]>(state.data?.participants || []);
    const [packets, setPackets] = useState<Packet[]>(state.data?.packets || []);
    const [orderedPackets, setOrderedPackets] = useState<Packet[]>(state.data?.packets || []);
    const [cuttingIds, setCuttingIds] = useState<number[]>([]);
    const [isGathered, setIsGathered] = useState(false);
    const [isCentering, setIsCentering] = useState(false);
    const [countdown, setCountdown] = useState<number>(0);
    const [pendingIndex, setPendingIndex] = useState<number | null>(null);
    const [remainingMs, setRemainingMs] = useState<number>(0);
    const [showScratchCard, setShowScratchCard] = useState(false);
    const [showLoserMessage, setShowLoserMessage] = useState(false);
    const [revealPacketVisible, setRevealPacketVisible] = useState(false);
    const cutIntervalRef = useRef<number | null>(null);
    const gatherTimeoutRef = useRef<number | null>(null);
    const cutTimeoutsRef = useRef<number[]>([]);
    const orderedRef = useRef<Packet[]>(orderedPackets);

    const myPacket = packets.find(
        (p) => p.ownerId && selfUserId !== undefined && selfUserId !== null && String(p.ownerId) === String(selfUserId)
    );

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
        setParticipantList((state.data?.participants as Participant[] | undefined) || []);

        const incoming = [...((state.data?.packets as Packet[] | undefined) || [])].sort((a, b) => a.index - b.index);
        setPackets(incoming);
        if (normalizedPhase !== 'SHUFFLE') {
            setOrderedPackets(incoming);
        }
    }, [state.data?.participants, state.data?.packets, normalizedPhase]);

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

        if (normalizedPhase === 'SHUFFLE') {
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
    }, [normalizedPhase, packets, clearCutTimers, runCut]);

    useEffect(() => {
        if (normalizedPhase !== 'COUNTDOWN') {
            setCountdown(0);
            setRemainingMs(0);
            return undefined;
        }

        const tick = () => {
            const diff = Math.ceil(((state.startTime || 0) - Date.now()) / 1000);
            setCountdown(diff > 0 ? diff : 0);
            setRemainingMs((state.startTime || 0) - Date.now());
        };

        tick();
        const id = window.setInterval(tick, 200);
        return () => window.clearInterval(id);
    }, [normalizedPhase, state.startTime]);

    useEffect(() => {
        if (normalizedPhase === 'REVEAL') {
            setShowScratchCard(false);
            setShowLoserMessage(!myPacket);
            setRevealPacketVisible(!!myPacket);

            if (myPacket) {
                const exitTimer = window.setTimeout(() => setRevealPacketVisible(false), 50);
                const cardTimer = window.setTimeout(() => setShowScratchCard(true), 800);
                return () => {
                    window.clearTimeout(exitTimer);
                    window.clearTimeout(cardTimer);
                };
            }
            return;
        }

        setShowScratchCard(false);
        setShowLoserMessage(false);
        setRevealPacketVisible(false);
    }, [normalizedPhase, myPacket]);

    const handleGrab = (packetIndex: number) => {
        if (!socket) return;
        if (normalizedPhase !== 'GAMING') return;
        if (pendingIndex !== null) return;

        const alreadyTaken = packets.some((p) => p.ownerId && selfUserId !== undefined && selfUserId !== null && String(p.ownerId) === String(selfUserId));
        if (alreadyTaken) {
            Toast.show({ icon: 'fail', content: '每人限搶一包' });
            return;
        }

        setPendingIndex(packetIndex);
        socket.emit(
            'MINIGAME_ACTION',
            { type: 'GRAB_PACKET', packetIndex },
            (resp: any) => {
                setPendingIndex(null);
                if (resp?.status === 'SUCCESS') {
                    Toast.show({ icon: 'success', content: resp?.prize?.name ? `搶到：${resp.prize.name}` : '搶到紅包！' });
                    setPackets((prev) =>
                        prev.map((p) => (p.index === packetIndex ? { ...p, isTaken: true, ownerId: resp?.prize?.ownerId || (selfUserId ? String(selfUserId) : p.ownerId) } : p))
                    );
                    setOrderedPackets((prev) =>
                        prev.map((p) => (p.index === packetIndex ? { ...p, isTaken: true, ownerId: resp?.prize?.ownerId || (selfUserId ? String(selfUserId) : p.ownerId) } : p))
                    );
                } else {
                    Toast.show({ icon: 'fail', content: resp?.message || '手慢了' });
                }
            }
        );
    };

    const resolveAvatar = (avatar?: string | null) => {
        if (!avatar) return '/avatars/default.png';
        if (avatar.startsWith('http')) return avatar;
        if (avatar.startsWith('/')) return avatar;
        return `/avatars/${avatar}`;
    };

    const renderPackets = (phaseClass: string) => {
        const isShuffling = phaseClass === 'shuffling';
        const renderList = orderedPackets;
        const isGatherPhase = isShuffling && (isCentering || !isGathered);

        return (
            <div className={`mini-packet-grid ${phaseClass}`} style={{ position: 'relative' }}>
                {renderList.map((p: Packet, idx: number) => {
                    const isCutting = isShuffling && cuttingIds.includes(p.index);
                    const ownedBySelf = p.ownerId && selfUserId !== undefined && selfUserId !== null && String(p.ownerId) === String(selfUserId);
                    const status: RedPacketStatus = p.isTaken ? (ownedBySelf ? 'ACTIVE' : 'TAKEN') : pendingIndex === p.index ? 'ACTIVE' : 'NORMAL';
                    const ownerName = p.ownerId
                        ? ownedBySelf
                            ? '你'
                            : participantList.find((pt) => String(pt.userId) === String(p.ownerId))?.displayName
                        : undefined;

                    return (
                        <motion.div
                            key={`packet-${p.index}`}
                            layout
                            layoutId={`packet-${p.index}`}
                            initial={false}
                            className='packet-item'
                            style={{
                                position: isShuffling ? 'absolute' : 'relative',
                                top: isShuffling ? '50%' : 'auto',
                                left: isShuffling ? '50%' : 'auto',
                                zIndex: isShuffling ? (isCutting ? renderList.length + 1 : renderList.length - idx) : undefined,
                            }}
                            animate={
                                isShuffling
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
                                duration: isShuffling
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
                            <RedPacket
                                index={p.index}
                                status={status}
                                ownerName={ownerName}
                                onClick={status === 'NORMAL' && normalizedPhase === 'GAMING' ? () => handleGrab(p.index) : undefined}
                            />
                        </motion.div>
                    );
                })}
            </div>
        );
    };

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

    const isGridPhase = ['IDLE', 'SHUFFLE', 'COUNTDOWN', 'GAMING'].includes(normalizedPhase);

    if (normalizedPhase === 'REVEAL') {
        const prizeName = myPacket?.name || '神秘獎品';
        const prizeValue = myPacket?.prizeValue;
        const prizeType = (myPacket?.type as 'PHYSICAL' | 'CASH' | undefined) || 'PHYSICAL';

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
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        position: 'relative',
                        padding: 24,
                    }}
                >
                    <AnimatePresence>
                        {revealPacketVisible && myPacket && (
                            <motion.div
                                key={`reveal-packet-${myPacket.index}`}
                                initial={{ y: 0, opacity: 1 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: '100vh', opacity: 0 }}
                                transition={{ duration: 0.5, ease: 'easeInOut' }}
                                style={{ width: 120 }}
                            >
                                <RedPacket status='ACTIVE' index={myPacket.index} ownerName='你' />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <AnimatePresence>
                        {showScratchCard && (
                            <motion.div
                                key='scratch-card'
                                initial={{ y: '100vh', opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: '100vh', opacity: 0 }}
                                transition={{ duration: 0.5, ease: 'easeInOut' }}
                            >
                                <ScratchCard prizeName={prizeName} prizeValue={prizeValue} type={prizeType} socket={socket} />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {!showScratchCard && !revealPacketVisible && showLoserMessage && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.4 }}
                            style={{ fontSize: 22, fontWeight: 800, textAlign: 'center', padding: 12 }}
                        >
                            下次再接再厲 (Better luck next time!)
                        </motion.div>
                    )}
                </div>
            </div>
        );
    }

    if (isGridPhase) {
        const isShuffling = normalizedPhase === 'SHUFFLE';
        const phaseClass = isShuffling ? 'shuffling' : normalizedPhase === 'COUNTDOWN' ? 'countdown' : 'idle';
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

                    <div style={{ flex: 1, minHeight: 220, position: 'relative' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                            <div style={{ fontSize: 20, fontWeight: 900 }}>
                                {isShuffling ? '洗牌中...' : normalizedPhase === 'COUNTDOWN' ? '準備開搶' : normalizedPhase === 'GAMING' ? '開搶中！' : '準備搶紅包'}
                            </div>
                            <div style={{ opacity: 0.8, fontSize: 12 }}>紅包數：{packets.length}</div>
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
                                    color: '#fff',
                                    fontSize: 72,
                                    fontWeight: 900,
                                    background: 'rgba(0,0,0,0.35)',
                                }}
                            >
                                {remainingMs > ANIMATION_DURATION
                                    ? '準備開搶'
                                    : countdown > 0
                                    ? countdown
                                    : '開搶！'}
                            </div>
                        )}
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
                <div style={{ marginBottom: 8, fontSize: 20, fontWeight: 800 }}>小遊戲進行中</div>
                <div style={{ fontSize: 16, opacity: 0.85 }}>
                    {state.gameType} / {state.phase}
                </div>
            </div>
        </div>
    );
};

export default RedEnvelopeUserView;
