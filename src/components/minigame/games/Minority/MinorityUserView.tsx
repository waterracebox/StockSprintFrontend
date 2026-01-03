import React from 'react';
import type { MiniGameSyncState } from '../../containers/MiniGameOverlay';
import type { Socket } from 'socket.io-client';

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

    // ========== IDLE 階段 ==========
    if (normalizedPhase === 'IDLE') {
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
