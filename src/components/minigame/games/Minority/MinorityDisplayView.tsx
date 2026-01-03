import React, { useEffect, useState } from 'react';
import type { MiniGameSyncState } from '../../containers/MiniGameOverlay';
import type { Socket } from 'socket.io-client';
import ProgressBar from '../../common/ProgressBar';

interface Props {
    miniGame: MiniGameSyncState;
    participants: { userId: number; displayName: string; avatar: string | null }[];
    socket: Socket | null;
}

const MinorityDisplayView: React.FC<Props> = ({ miniGame }) => {
    const normalizedPhase = (miniGame.phase || '').toUpperCase();
    const [countdown, setCountdown] = useState<number>(3);

    // COUNTDOWN 階段的倒數數字
    useEffect(() => {
        if (normalizedPhase !== 'COUNTDOWN') return;

        const endTime = miniGame.endTime || 0;
        const tick = () => {
            const remaining = Math.ceil((endTime - Date.now()) / 1000);
            setCountdown(Math.max(0, remaining));
        };

        tick();
        const interval = setInterval(tick, 100);
        return () => clearInterval(interval);
    }, [normalizedPhase, miniGame.endTime]);

    if (miniGame.gameType !== 'MINORITY') {
        return null;
    }

    // ========== PREPARE 階段：顯示題目 + 進度條 ==========
    if (normalizedPhase === 'PREPARE') {
        const questionTitle = miniGame.data?.question?.title || '載入中...';
        const endTime = miniGame.endTime || 0;
        const totalDuration = 5000;

        return (
            <div
                style={{
                    height: '100vh',
                    width: '100vw',
                    boxSizing: 'border-box',
                    backgroundImage: `linear-gradient(135deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.6) 100%), url('/background/minority.webp')`,
                    backgroundSize: 'cover',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    color: '#fff',
                    padding: 'clamp(24px, 4vh, 48px)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    gap: 'clamp(16px, 3vh, 32px)',
                }}
            >
                {/* Header */}
                <div style={{ flex: '0 0 auto', textAlign: 'center' }}>
                    <h1 style={{ margin: 0, fontSize: 'clamp(36px, 4.5vw, 64px)', fontWeight: 900, whiteSpace: 'nowrap' }}>⚖️ 全場少數決</h1>
                </div>

                {/* Question */}
                <div style={{ 
                    flex: '0 0 auto',
                    maxHeight: '45vh',
                    fontSize: 'clamp(28px, 4vw, 56px)',
                    fontWeight: 700,
                    textAlign: 'center',
                    lineHeight: 1.3,
                    animation: 'fadeIn 0.8s ease-in',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    {questionTitle}
                </div>

                {/* Progress Bar */}
                <div style={{ flex: '0 0 auto' }}>
                    <ProgressBar targetEndTime={endTime} totalDuration={totalDuration} color="#8B4513" height={16} />
                </div>

                {/* Status Text */}
                <div style={{ 
                    flex: '0 0 auto', 
                    fontSize: 'clamp(18px, 2vw, 24px)', 
                    textAlign: 'center', 
                    opacity: 0.7 
                }}>
                    請仔細閱讀題目...
                </div>

                {/* Spacer */}
                <div style={{ flex: 1 }} />
            </div>
        );
    }

    // ========== COUNTDOWN 階段：全螢幕倒數 ==========
    if (normalizedPhase === 'COUNTDOWN') {
        const questionTitle = miniGame.data?.question?.title || '';

        return (
            <div
                style={{
                    height: '100vh',
                    width: '100vw',
                    boxSizing: 'border-box',
                    backgroundImage: `linear-gradient(135deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.6) 100%), url('/background/minority.webp')`,
                    backgroundSize: 'cover',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    color: '#fff',
                    padding: 'clamp(24px, 4vh, 48px)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    gap: 'clamp(12px, 2vh, 24px)',
                }}
            >
                {/* Header */}
                <div style={{ flex: '0 0 auto', textAlign: 'center' }}>
                    <h1 style={{ margin: 0, fontSize: 'clamp(36px, 4.5vw, 64px)', fontWeight: 900, whiteSpace: 'nowrap' }}>⚖️ 全場少數決</h1>
                </div>

                {/* Question (Small) */}
                <div style={{ 
                    flex: '0 0 auto',
                    maxHeight: '15vh',
                    fontSize: 'clamp(18px, 2vw, 28px)',
                    textAlign: 'center',
                    opacity: 0.6,
                    lineHeight: 1.4,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                }}>
                    {questionTitle}
                </div>

                {/* Countdown Number */}
                <div style={{ 
                    flex: 1, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontSize: countdown > 0 ? 'clamp(100px, 18vw, 220px)' : 'clamp(70px, 12vw, 140px)',
                    fontWeight: 900,
                    animation: countdown > 0 ? 'pulse 0.5s ease-in-out' : 'none',
                }}>
                    {countdown > 0 ? countdown : '開始！'}
                </div>
            </div>
        );
    }

    // ========== GAMING 階段（預留）==========
    if (normalizedPhase === 'GAMING') {
        return (
            <div
                style={{
                    height: '100vh',
                    width: '100vw',
                    backgroundImage: `linear-gradient(135deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.6) 100%), url('/background/minority.webp')`,
                    backgroundSize: 'cover',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    color: '#fff',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <h1 style={{ margin: 0, fontSize: 64, fontWeight: 900, whiteSpace: 'nowrap' }}>⚖️ 全場少數決</h1>
                <div style={{ fontSize: 28, marginTop: 16, opacity: 0.85 }}>下注階段（下一步實作）</div>
            </div>
        );
    }

    // ========== IDLE 階段 ==========
    if (normalizedPhase === 'IDLE') {
        return (
            <div
                style={{
                    height: '100vh',
                    width: '100vw',
                    backgroundImage: `linear-gradient(135deg, rgba(139,69,19,0.65) 0%, rgba(101,67,33,0.65) 100%), url('/background/minority.webp')`,
                    backgroundSize: 'cover',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    color: '#fff',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <h1 style={{ margin: 0, fontSize: 80, fontWeight: 900 }}>⚖️ 全場少數決</h1>
                <div style={{ fontSize: 32, marginTop: 16, opacity: 0.85 }}>等待主持人出題...</div>
            </div>
        );
    }

    // ========== 其他階段（預留） ==========
    return (
        <div
            style={{
                height: '100vh',
                width: '100vw',
                backgroundImage: `linear-gradient(135deg, rgba(139,69,19,0.65) 0%, rgba(101,67,33,0.65) 100%), url('/background/minority.webp')`,
                backgroundSize: 'cover',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                color: '#fff',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <h1 style={{ margin: 0, fontSize: 64, fontWeight: 900 }}>⚖️ 全場少數決</h1>
            <div style={{ fontSize: 28, marginTop: 16, opacity: 0.85 }}>小遊戲進行中</div>
        </div>
    );
};

export default MinorityDisplayView;
