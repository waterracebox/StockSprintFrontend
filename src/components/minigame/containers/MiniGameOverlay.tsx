import React from 'react';
import RedEnvelopeUserView from '../games/RedEnvelope/RedEnvelopeUserView';
import QuizUserView from '../games/Quiz/QuizUserView';
import MinorityUserView from '../games/Minority/MinorityUserView';
import type { Socket } from 'socket.io-client';

export interface MiniGameSyncState {
    gameType: 'NONE' | 'RED_ENVELOPE' | 'QUIZ' | 'MINORITY';
    phase: string;
    startTime: number;
    endTime: number;
    data: any;
}

export interface MiniGameOverlayProps {
    state: MiniGameSyncState | null;
    visible: boolean;
    totalAssets: number;
    userCash: number; // 【新增】使用者當下現金
    currentPrice: number;
    onCollapse: () => void;
    socket: Socket | null;
    selfUserId?: number | null;
}

const MiniGameOverlay: React.FC<MiniGameOverlayProps> = ({ state, visible, totalAssets, userCash, currentPrice, onCollapse, socket, selfUserId }) => {
    if (!visible || !state || state.gameType === 'NONE') return null;

    switch (state.gameType) {
        case 'RED_ENVELOPE':
            return (
                <RedEnvelopeUserView
                    state={state}
                    totalAssets={totalAssets}
                    userCash={userCash}
                    currentPrice={currentPrice}
                    onCollapse={onCollapse}
                    socket={socket}
                    selfUserId={selfUserId}
                />
            );
        case 'QUIZ':
            return (
                <QuizUserView
                    state={state}
                    totalAssets={totalAssets}
                    userCash={userCash}
                    currentPrice={currentPrice}
                    onCollapse={onCollapse}
                    socket={socket}
                    selfUserId={selfUserId}
                />
            );
        case 'MINORITY':
            return (
                <MinorityUserView
                    state={state}
                    totalAssets={totalAssets}
                    userCash={userCash}
                    currentPrice={currentPrice}
                    onCollapse={onCollapse}
                    socket={socket}
                    selfUserId={selfUserId}
                />
            );
        default:
            return (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 9999,
                        background: 'rgba(0,0,0,0.86)',
                        color: '#fff',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 24,
                        textAlign: 'center',
                    }}
                >
                    <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>小遊戲進行中</div>
                    <div style={{ opacity: 0.85 }}>類型：{state.gameType}，階段：{state.phase || '未設定'}</div>
                    <button
                        onClick={onCollapse}
                        style={{
                            marginTop: 16,
                            border: 'none',
                            background: 'rgba(255,255,255,0.14)',
                            color: '#fff',
                            padding: '8px 14px',
                            borderRadius: 10,
                            cursor: 'pointer',
                            fontWeight: 700,
                        }}
                    >
                        收起
                    </button>
                </div>
            );
    }
};

export default MiniGameOverlay;
