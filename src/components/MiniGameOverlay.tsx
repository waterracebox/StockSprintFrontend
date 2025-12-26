import React from 'react';

export interface MiniGameSyncState {
    gameType: 'NONE' | 'RED_ENVELOPE' | 'QUIZ' | 'MINORITY';
    phase: string;
    startTime: number;
    endTime: number;
    data: any;
}

interface MiniGameOverlayProps {
    state: MiniGameSyncState | null;
    visible: boolean;
    totalAssets: number;
    currentPrice: number;
    onCollapse: () => void;
}

const MiniGameOverlay: React.FC<MiniGameOverlayProps> = ({ state, visible, totalAssets, currentPrice, onCollapse }) => {
    if (!visible || !state || state.gameType === 'NONE') return null;

    const normalizedGame = state.gameType;
    const normalizedPhase = (state.phase || '').toUpperCase();

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
            <div style={{ fontWeight: 800, fontSize: 18 }}>🧧 小遊戲</div>
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

    // 紅包待機畫面
    if (normalizedGame === 'RED_ENVELOPE' && normalizedPhase === 'IDLE') {
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
                    <div style={{ fontSize: 34, fontWeight: 900 }}>🧨 準備搶紅包</div>
                    <div style={{ fontSize: 18, opacity: 0.92 }}>等待主持人開始...</div>
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
