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
}

const MiniGameOverlay: React.FC<MiniGameOverlayProps> = ({ state }) => {
    if (!state || state.gameType === 'NONE') return null;

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 9999,
                background: 'rgba(0, 0, 0, 0.7)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '24px',
                fontWeight: 700,
                textAlign: 'center',
                padding: '24px',
            }}
        >
            <div style={{ marginBottom: 12 }}>MiniGame Active</div>
            <div style={{ fontSize: '16px', opacity: 0.85 }}>
                {state.gameType} / {state.phase}
            </div>
        </div>
    );
};

export default MiniGameOverlay;
