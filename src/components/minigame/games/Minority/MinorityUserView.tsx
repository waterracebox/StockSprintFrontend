import React, { useEffect, useState } from 'react';
import type { MiniGameSyncState } from '../../containers/MiniGameOverlay';
import type { Socket } from 'socket.io-client';
import ProgressBar from '../../common/ProgressBar';

interface Props {
    state: MiniGameSyncState;
    totalAssets: number;
    currentPrice: number;
    onCollapse: () => void;
    socket: Socket | null;
    selfUserId?: number | null;
}

const MinorityUserView: React.FC<Props> = ({ state, totalAssets, currentPrice, onCollapse }) => {
    const normalizedPhase = (state.phase || '').toUpperCase();
    const [countdown, setCountdown] = useState<number>(3);

    // COUNTDOWN 階段倒數
    useEffect(() => {
        if (normalizedPhase !== 'COUNTDOWN') return;

        const endTime = state.endTime || 0;
        const tick = () => {
            const remaining = Math.ceil((endTime - Date.now()) / 1000);
            setCountdown(Math.max(0, remaining));
        };

        tick();
        const interval = setInterval(tick, 100);
        return () => clearInterval(interval);
    }, [normalizedPhase, state.endTime]);

    // ========== PREPARE 階段：僅顯示題目 + 進度條 ==========
    if (normalizedPhase === 'PREPARE') {
        const questionTitle = state.data?.question?.title || '載入中...';
        const endTime = state.endTime || 0;
        const totalDuration = 5000; // 5 秒讀題

        return (
            <div
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 9999,
                    backgroundImage: `linear-gradient(135deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.6) 100%), url('/background/minority.webp')`,
                    backgroundSize: 'cover',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    color: '#fff',
                }}
            >
                {/* Header */}
                <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.25)' }}>
                    <div style={{ fontWeight: 800, fontSize: 18 }}>⚖️ 全場少數決</div>
                    <button onClick={onCollapse} style={{ border: 'none', background: 'rgba(255,255,255,0.18)', color: '#fff', padding: '6px 10px', borderRadius: 999, cursor: 'pointer', fontWeight: 600 }}>
                        收起
                    </button>
                </div>

                {/* Status Bar */}
                <div style={{ padding: '6px 14px', background: 'rgba(0,0,0,0.28)', color: '#fff', fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
                    <span>總資產: ${totalAssets.toFixed(2)}</span>
                    <span>股價: ${currentPrice.toFixed(2)}</span>
                </div>

                {/* Content */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }}>
                    <div style={{ fontSize: 28, fontWeight: 700, textAlign: 'center', lineHeight: 1.3 }}>
                        {questionTitle}
                    </div>
                    <ProgressBar targetEndTime={endTime} totalDuration={totalDuration} color="#8B4513" height={12} />
                    <div style={{ fontSize: 14, opacity: 0.7 }}>請仔細閱讀題目...</div>
                </div>
            </div>
        );
    }

    // ========== COUNTDOWN 階段：全螢幕倒數 3→2→1 ==========
    if (normalizedPhase === 'COUNTDOWN') {
        const questionTitle = state.data?.question?.title || '';

        return (
            <div
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 9999,
                    backgroundImage: `linear-gradient(135deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.6) 100%), url('/background/minority.webp')`,
                    backgroundSize: 'cover',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    color: '#fff',
                }}
            >
                {/* Header */}
                <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.25)' }}>
                    <div style={{ fontWeight: 800, fontSize: 18 }}>⚖️ 全場少數決</div>
                    <button onClick={onCollapse} style={{ border: 'none', background: 'rgba(255,255,255,0.18)', color: '#fff', padding: '6px 10px', borderRadius: 999, cursor: 'pointer', fontWeight: 600 }}>
                        收起
                    </button>
                </div>

                {/* Status Bar */}
                <div style={{ padding: '6px 14px', background: 'rgba(0,0,0,0.28)', color: '#fff', fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
                    <span>總資產: ${totalAssets.toFixed(2)}</span>
                    <span>股價: ${currentPrice.toFixed(2)}</span>
                </div>

                {/* 題目（縮小） */}
                <div style={{ padding: '12px 24px', fontSize: 16, textAlign: 'center', opacity: 0.6 }}>
                    {questionTitle}
                </div>

                {/* 倒數數字（超大） */}
                <div style={{ 
                    flex: 1, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontSize: countdown > 0 ? 120 : 80,
                    fontWeight: 900,
                    animation: countdown > 0 ? 'pulse 0.5s ease-in-out' : 'none',
                }}>
                    {countdown > 0 ? countdown : '開始！'}
                </div>
            </div>
        );
    }

    // ========== GAMING 階段（預留，下一步實作下注 UI）==========
    if (normalizedPhase === 'GAMING') {
        return (
            <div
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 9999,
                    backgroundImage: `linear-gradient(135deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.6) 100%), url('/background/minority.webp')`,
                    backgroundSize: 'cover',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    color: '#fff',
                }}
            >
                {/* Header */}
                <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.25)' }}>
                    <div style={{ fontWeight: 800, fontSize: 18 }}>⚖️ 全場少數決</div>
                    <button onClick={onCollapse} style={{ border: 'none', background: 'rgba(255,255,255,0.18)', color: '#fff', padding: '6px 10px', borderRadius: 999, cursor: 'pointer', fontWeight: 600 }}>
                        收起
                    </button>
                </div>

                {/* Status Bar */}
                <div style={{ padding: '6px 14px', background: 'rgba(0,0,0,0.28)', color: '#fff', fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
                    <span>總資產: ${totalAssets.toFixed(2)}</span>
                    <span>股價: ${currentPrice.toFixed(2)}</span>
                </div>

                {/* Placeholder Content */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                    <div style={{ fontSize: 24, fontWeight: 700 }}>下注階段</div>
                    <div style={{ fontSize: 16, opacity: 0.7, marginTop: 8 }}>（下一步實作下注 UI）</div>
                </div>
            </div>
        );
    }

    // ========== IDLE 階段 ==========
    if (normalizedPhase === 'IDLE') {
        return (
            <div
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 9999,
                    backgroundImage: `linear-gradient(135deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.6) 100%), url('/background/minority.webp')`,
                    backgroundSize: 'cover',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    color: '#fff',
                }}
            >
                {/* Header */}
                <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.25)' }}>
                    <div style={{ fontWeight: 800, fontSize: 18 }}>⚖️ 全場少數決</div>
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

                {/* Status Bar */}
                <div style={{ padding: '6px 14px', background: 'rgba(0,0,0,0.28)', color: '#fff', fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
                    <span>總資產: ${totalAssets.toFixed(2)}</span>
                    <span>股價: ${currentPrice.toFixed(2)}</span>
                </div>

                {/* Content */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24, gap: 12 }}>
                    <div style={{ fontSize: 28, fontWeight: 900 }}>⚖️ 全場少數決</div>
                    <div style={{ fontSize: 16, opacity: 0.85 }}>等待主持人出題...</div>
                </div>
            </div>
        );
    }

    // ========== 其他階段（預留） ==========
    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                backgroundImage: `linear-gradient(135deg, rgba(139,69,19,0.75) 0%, rgba(101,67,33,0.75) 100%), url('/background/minority.webp')`,
                backgroundSize: 'cover',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                display: 'flex',
                flexDirection: 'column',
                color: '#fff',
            }}
        >
            <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.25)' }}>
                <div style={{ fontWeight: 800, fontSize: 18 }}>⚖️ 全場少數決</div>
                <button onClick={onCollapse} style={{ border: 'none', background: 'rgba(255,255,255,0.18)', color: '#fff', padding: '6px 10px', borderRadius: 999, cursor: 'pointer', fontWeight: 600 }}>
                    收起
                </button>
            </div>
            <div style={{ padding: '6px 14px', background: 'rgba(0,0,0,0.28)', color: '#fff', fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
                <span>總資產: ${totalAssets.toFixed(2)}</span>
                <span>股價: ${currentPrice.toFixed(2)}</span>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24 }}>
                <div style={{ fontSize: 20, fontWeight: 800 }}>小遊戲進行中</div>
                <div style={{ fontSize: 16, opacity: 0.85, marginTop: 8 }}>階段：{state.phase || '未設定'}</div>
            </div>
        </div>
    );
};

export default MinorityUserView;
