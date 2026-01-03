import React from 'react';
import type { MiniGameSyncState } from '../../containers/MiniGameOverlay';
import type { Socket } from 'socket.io-client';

interface Props {
    miniGame: MiniGameSyncState;
    participants: { userId: number; displayName: string; avatar: string | null }[];
    socket: Socket | null;
}

const MinorityDisplayView: React.FC<Props> = ({ miniGame }) => {
    const normalizedPhase = (miniGame.phase || '').toUpperCase();

    if (miniGame.gameType !== 'MINORITY') {
        return null;
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
