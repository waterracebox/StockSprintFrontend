import React from 'react';
import RedEnvelopeDisplayView from '../games/RedEnvelope/RedEnvelopeDisplayView';
import QuizDisplayView from '../games/Quiz/QuizDisplayView';
import type { MiniGameSyncState } from './MiniGameOverlay';
import type { Socket } from 'socket.io-client';

type Participant = { userId: number; displayName: string; avatar: string | null };

interface Props {
    miniGame: MiniGameSyncState | null;
    participants: Participant[];
    socket: Socket | null;
}

const MiniGameDisplaySwitch: React.FC<Props> = ({ miniGame, participants, socket }) => {
    if (!miniGame || miniGame.gameType === 'NONE') return null;

    switch (miniGame.gameType) {
        case 'RED_ENVELOPE':
            return <RedEnvelopeDisplayView miniGame={miniGame} participants={participants} socket={socket} />;
        case 'QUIZ':
            return <QuizDisplayView miniGame={miniGame} participants={participants} socket={socket} />;
        default:
            return (
                <div
                    style={{
                        height: '100vh',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#000',
                        color: '#fff',
                        fontSize: 22,
                        textAlign: 'center',
                        padding: 24,
                    }}
                >
                    <div>
                        <div style={{ fontWeight: 800, marginBottom: 8 }}>小遊戲進行中</div>
                        <div style={{ opacity: 0.85 }}>{miniGame.gameType} / {miniGame.phase || '未設定'}</div>
                    </div>
                </div>
            );
    }
};

export default MiniGameDisplaySwitch;
