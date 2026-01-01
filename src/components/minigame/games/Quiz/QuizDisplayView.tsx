import React, { useEffect, useState } from 'react';
import type { MiniGameSyncState } from '../../containers/MiniGameOverlay';
import type { Socket } from 'socket.io-client';
import ProgressBar from '../../common/ProgressBar';

interface Props {
    miniGame: MiniGameSyncState;
    participants: { userId: number; displayName: string; avatar: string | null }[];
    socket: Socket | null;
}

const QuizDisplayView: React.FC<Props> = ({ miniGame }) => {
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

    if (miniGame.gameType !== 'QUIZ') {
        return null;
    }

    // ========== PREPARE 階段：顯示題目 + 進度條 ==========
    if (normalizedPhase === 'PREPARE') {
        const questionTitle = miniGame.data?.question?.title || '載入中...';
        const endTime = miniGame.endTime || 0;
        const totalDuration = 5000;

        // 【優化】根據題目長度動態調整字體大小（更細緻的分級）
        const questionLength = questionTitle.length;
        let questionFontSize = 'clamp(36px, 4.5vw, 64px)';
        if (questionLength > 150) {
            questionFontSize = 'clamp(18px, 2vw, 28px)';
        } else if (questionLength > 120) {
            questionFontSize = 'clamp(20px, 2.5vw, 32px)';
        } else if (questionLength > 90) {
            questionFontSize = 'clamp(24px, 3vw, 38px)';
        } else if (questionLength > 60) {
            questionFontSize = 'clamp(28px, 3.5vw, 48px)';
        } else if (questionLength > 40) {
            questionFontSize = 'clamp(32px, 4vw, 56px)';
        }

        return (
            <div
                style={{
                    height: '100vh',
                    width: '100vw',
                    boxSizing: 'border-box',
                    backgroundImage: `linear-gradient(135deg, rgba(75,0,130,0.65) 0%, rgba(25,25,112,0.65) 100%), url('/background/quiz.webp')`,
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
                    <h1 style={{ 
                        margin: 0, 
                        fontSize: 'clamp(40px, 5vw, 72px)', 
                        fontWeight: 900 
                    }}>
                        🧠 機智問答
                    </h1>
                </div>

                {/* Question */}
                <div style={{ 
                    flex: '0 0 auto',
                    maxHeight: '45vh', // 【調整】限制最大高度
                    fontSize: questionFontSize,
                    fontWeight: 700,
                    textAlign: 'center',
                    lineHeight: 1.3, // 【優化】更緊湊的行高
                    animation: 'fadeIn 0.8s ease-in',
                    overflow: 'hidden', // 【修改】不可捲動，依賴字體縮放
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    {questionTitle}
                </div>

                {/* Progress Bar */}
                <div style={{ flex: '0 0 auto' }}>
                    <ProgressBar targetEndTime={endTime} totalDuration={totalDuration} color="#4CAF50" height={16} />
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
                    backgroundImage: `linear-gradient(135deg, rgba(75,0,130,0.65) 0%, rgba(25,25,112,0.65) 100%), url('/background/quiz.webp')`,
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
                    <h1 style={{ margin: 0, fontSize: 'clamp(36px, 4.5vw, 60px)', fontWeight: 900 }}>
                        🧠 機智問答
                    </h1>
                </div>

                {/* Question (Small) */}
                <div style={{ 
                    flex: '0 0 auto',
                    maxHeight: '15vh', // 【新增】限制最大高度
                    fontSize: 'clamp(18px, 2vw, 28px)',
                    textAlign: 'center',
                    opacity: 0.6,
                    lineHeight: 1.4,
                    overflow: 'hidden', // 【新增】過長時隱藏
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
                    {countdown > 0 ? countdown : '開始搶答！'}
                </div>
            </div>
        );
    }

    // ========== GAMING 階段：顯示選項（長條圖佈局）==========
    if (normalizedPhase === 'GAMING') {
        const questionTitle = miniGame.data?.question?.title || '';
        const options = miniGame.data?.question?.options || [];
        const duration = (miniGame.data?.question?.duration || 10) * 1000;
        const endTime = miniGame.endTime || 0;

        // 【優化】根據題目長度動態調整字體大小（更細緻的分級）
        const questionLength = questionTitle.length;
        let questionFontSize = 'clamp(32px, 4vw, 56px)';
        if (questionLength > 150) {
            questionFontSize = 'clamp(16px, 1.8vw, 24px)';
        } else if (questionLength > 120) {
            questionFontSize = 'clamp(18px, 2.2vw, 28px)';
        } else if (questionLength > 90) {
            questionFontSize = 'clamp(22px, 2.8vw, 36px)';
        } else if (questionLength > 60) {
            questionFontSize = 'clamp(26px, 3.2vw, 44px)';
        } else if (questionLength > 40) {
            questionFontSize = 'clamp(28px, 3.6vw, 50px)';
        }

        return (
            <div
                style={{
                    height: '100vh',
                    width: '100vw',
                    boxSizing: 'border-box',
                    backgroundImage: `linear-gradient(135deg, rgba(75,0,130,0.65) 0%, rgba(25,25,112,0.65) 100%), url('/background/quiz.webp')`,
                    backgroundSize: 'cover',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    color: '#fff',
                    padding: 'clamp(16px, 3vh, 48px)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    gap: 'clamp(12px, 2vh, 24px)',
                }}
            >
                {/* Header (Question) */}
                <div style={{ 
                    flex: '0 0 auto',
                    maxHeight: '28vh', // 【調整】限制最大高度
                    fontSize: questionFontSize,
                    fontWeight: 700,
                    textAlign: 'center',
                    lineHeight: 1.25, // 【優化】更緊湊的行高
                    overflow: 'hidden', // 【修改】不可捲動，依賴字體縮放
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    {questionTitle}
                </div>

                {/* Progress Bar */}
                <div style={{ flex: '0 0 auto' }}>
                    <ProgressBar targetEndTime={endTime} totalDuration={duration} color="#FF9800" height={16} />
                </div>

                {/* Options Container (Vertical List) */}
                <div style={{ 
                    flex: 1,
                    minHeight: 0, // 【新增】確保 flexbox 正確收縮
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: 'clamp(12px, 2vh, 24px)',
                    overflow: 'hidden',
                }}>
                    {options.map((opt: string, idx: number) => (
                        <div 
                            key={idx}
                            style={{
                                flex: 1,
                                minHeight: 0, // 【新增】確保選項平均分配空間
                                background: 'rgba(255,255,255,0.15)',
                                border: '3px solid rgba(255,255,255,0.4)',
                                borderRadius: 16,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: 'clamp(12px, 2vh, 24px)',
                                fontSize: 'clamp(20px, 2.5vw, 36px)',
                                fontWeight: 700,
                                textAlign: 'center',
                                lineHeight: 1.3,
                                overflow: 'hidden', // 【新增】防止內容溢出
                            }}
                        >
                            {String.fromCharCode(65 + idx)}. {opt}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // ========== 其他階段 ==========
    if (normalizedPhase !== 'IDLE') {
        return (
            <div
                style={{
                    height: '100vh',
                    width: '100vw',
                    backgroundImage: `linear-gradient(135deg, rgba(75,0,130,0.65) 0%, rgba(25,25,112,0.65) 100%), url('/background/quiz.webp')`,
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
                <h1 style={{ margin: 0, fontSize: 64, fontWeight: 900 }}>🧠 機智問答</h1>
                <div style={{ fontSize: 28, marginTop: 16, opacity: 0.85 }}>小遊戲進行中</div>
            </div>
        );
    }

    // ========== IDLE 階段 ==========

    // ========== IDLE 階段 ==========
    return (
        <div
            style={{
                height: '100vh',
                width: '100vw',
                backgroundImage: `linear-gradient(135deg, rgba(75,0,130,0.65) 0%, rgba(25,25,112,0.65) 100%), url('/background/quiz.webp')`,
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
            <h1 style={{ margin: 0, fontSize: 80, fontWeight: 900 }}>🧠 機智問答</h1>
            <div style={{ fontSize: 32, marginTop: 16, opacity: 0.85 }}>等待主持人出題...</div>
        </div>
    );
};

export default QuizDisplayView;
