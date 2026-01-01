import React from 'react';
import type { MiniGameSyncState } from '../../containers/MiniGameOverlay';
import type { Socket } from 'socket.io-client';

interface Props {
    miniGame: MiniGameSyncState;
    participants: { userId: number; displayName: string; avatar: string | null }[];
    socket: Socket | null;
}

const QuizDisplayView: React.FC<Props> = ({ miniGame }) => {
    const normalizedPhase = (miniGame.phase || '').toUpperCase();

    if (miniGame.gameType !== 'QUIZ') {
        return null;
    }

    // 【新增】PREPARE 階段：大螢幕顯示題目
    if (normalizedPhase === 'PREPARE') {
        const questionTitle = miniGame.data?.question?.title || '載入中...';

        return (
            <div
                style={{
                    minHeight: '100vh',
                    width: '100vw',
                    backgroundImage: `linear-gradient(135deg, rgba(75,0,130,0.65) 0%, rgba(25,25,112,0.65) 100%), url('/background/quiz.webp')`,
                    backgroundSize: 'cover',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    color: '#fff',
                    padding: 32,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 24,
                    boxSizing: 'border-box',
                }}
            >
                <h1 style={{ margin: 0, fontSize: 64, fontWeight: 900 }}>🧠 機智問答</h1>
                <div 
                    style={{ 
                        fontSize: 36, 
                        textAlign: 'center',
                        animation: 'fadeIn 0.8s ease-in',
                        lineHeight: 1.6,
                        maxWidth: '80%',
                    }}
                >
                    {questionTitle}
                </div>
            </div>
        );
    }

    if (normalizedPhase !== 'IDLE') {
        return (
            <div
                style={{
                    minHeight: '100vh',
                    width: '100vw',
                    backgroundImage: `linear-gradient(135deg, rgba(75,0,130,0.65) 0%, rgba(25,25,112,0.65) 100%), url('/background/quiz.webp')`,
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
                <h1 style={{ margin: 0, fontSize: 48, fontWeight: 900, textAlign: 'center' }}>🧠 機智問答</h1>
                <div style={{ fontSize: 24, textAlign: 'center', opacity: 0.85 }}>小遊戲進行中</div>
            </div>
        );
    }

    return (
        <div
            style={{
                minHeight: '100vh',
                width: '100vw',
                backgroundImage: `linear-gradient(135deg, rgba(75,0,130,0.65) 0%, rgba(25,25,112,0.65) 100%), url('/background/quiz.webp')`,
                backgroundSize: 'cover',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                color: '#fff',
                padding: 32,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 24,
                boxSizing: 'border-box',
            }}
        >
            <h1 style={{ margin: 0, fontSize: 64, fontWeight: 900 }}>🧠 機智問答</h1>
            <div style={{ fontSize: 28, opacity: 0.85 }}>等待主持人出題...</div>
        </div>
    );
};

export default QuizDisplayView;
