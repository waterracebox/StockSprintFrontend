import React, { useEffect, useState } from 'react';
import type { MiniGameSyncState } from '../../containers/MiniGameOverlay';
import type { Socket } from 'socket.io-client';
import ProgressBar from '../../common/ProgressBar';
import { motion } from 'framer-motion';

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

    // ========== RESULT 階段：答案揭曉 + 排行榜 ==========
    if (normalizedPhase === 'RESULT') {
        const questionTitle = miniGame.data?.question?.title || '';
        const options = miniGame.data?.question?.options || [];
        const correctAnswer = miniGame.data?.question?.correctAnswer || 'A';
        const correctIndex = correctAnswer.charCodeAt(0) - 'A'.charCodeAt(0);
        const winners = (miniGame.data?.winners || []) as Array<{ 
            userId: number; 
            displayName: string; 
            avatar: string | null; 
            reward: number; 
            rank: number;
        }>;

        const resolveAvatar = (avatar?: string | null) => {
            if (!avatar) return '/avatars/default.png';
            if (avatar.startsWith('http')) return avatar;
            if (avatar.startsWith('/')) return avatar;
            return `/avatars/${avatar}`;
        };

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
                    <h1 style={{ margin: 0, fontSize: 'clamp(36px, 4.5vw, 60px)', fontWeight: 900 }}>
                        🧠 機智問答
                    </h1>
                </div>

                {/* Question (縮小) */}
                <div style={{ 
                    flex: '0 0 auto',
                    fontSize: 'clamp(18px, 2.2vw, 28px)',
                    fontWeight: 600,
                    textAlign: 'center',
                    lineHeight: 1.2,
                    maxHeight: '12vh',
                    overflow: 'hidden',
                    opacity: 0.7,
                }}>
                    {questionTitle}
                </div>

                {/* Correct Answer (突出顯示) */}
                <div style={{ 
                    flex: '0 0 auto',
                }}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        style={{
                            background: 'linear-gradient(135deg, #4CAF50, #66BB6A)',
                            color: '#fff',
                            border: '3px solid #81C784',
                            borderRadius: 16,
                            padding: 'clamp(16px, 2.5vh, 24px)',
                            fontSize: 'clamp(22px, 2.8vw, 40px)',
                            fontWeight: 700,
                            textAlign: 'center',
                            boxShadow: '0 4px 20px rgba(76, 175, 80, 0.6)',
                        }}
                    >
                        {correctAnswer}. {options[correctIndex]}
                    </motion.div>
                </div>

                {/* Leaderboard (擴大顯示區域) */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8, duration: 0.6 }}
                    style={{ 
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'clamp(12px, 2vh, 20px)',
                        minHeight: 0,
                        justifyContent: 'center',
                    }}
                >
                    <div style={{ 
                        fontSize: 'clamp(28px, 3.5vw, 44px)', 
                        fontWeight: 900, 
                        textAlign: 'center',
                        marginBottom: 'clamp(8px, 1vh, 16px)',
                    }}>
                        🏆 得獎名單
                    </div>
                    
                    {winners.length === 0 ? (
                        <div style={{ fontSize: 'clamp(20px, 2.5vw, 32px)', textAlign: 'center', opacity: 0.7 }}>
                            無人答對
                        </div>
                    ) : (
                        <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: winners.length >= 3 
                                ? 'repeat(auto-fit, minmax(min(100%, 110px), 1fr))' 
                                : `repeat(${winners.length}, 1fr)`,
                            gap: 'clamp(8px, 1.5vw, 24px)',
                            justifyItems: 'center',
                            alignItems: 'start',
                            padding: '0 clamp(8px, 2vw, 32px)',
                            maxWidth: '100%',
                            overflow: 'hidden',
                        }}>
                            {winners.slice(0, 3).map((winner, idx) => (
                                <motion.div
                                    key={winner.userId}
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: 1.0 + idx * 0.15, duration: 0.5, ease: 'backOut' }}
                                    style={{
                                        background: idx === 0 
                                            ? 'linear-gradient(135deg, #FFD700, #FFA500)' 
                                            : idx === 1 
                                            ? 'linear-gradient(135deg, #C0C0C0, #A9A9A9)'
                                            : 'linear-gradient(135deg, #CD7F32, #8B4513)',
                                        borderRadius: 'clamp(12px, 2vw, 16px)',
                                        padding: 'clamp(12px, 2vh, 24px)',
                                        textAlign: 'center',
                                        width: '100%',
                                        maxWidth: '100%',
                                        minWidth: 0,
                                        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                                        boxSizing: 'border-box',
                                    }}
                                >
                                    <img
                                        src={resolveAvatar(winner.avatar)}
                                        alt={winner.displayName}
                                        style={{
                                            width: 'clamp(50px, 12vw, 100px)',
                                            height: 'clamp(50px, 12vw, 100px)',
                                            borderRadius: '50%',
                                            border: 'clamp(2px, 0.4vw, 4px) solid #fff',
                                            marginBottom: 'clamp(6px, 1vh, 12px)',
                                            objectFit: 'cover',
                                        }}
                                    />
                                    <div style={{ fontSize: 'clamp(20px, 4vw, 36px)', fontWeight: 900 }}>
                                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                                    </div>
                                    <div style={{ 
                                        fontSize: 'clamp(14px, 2.5vw, 24px)', 
                                        fontWeight: 700, 
                                        marginTop: 'clamp(4px, 0.8vh, 8px)',
                                        wordBreak: 'break-word',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        padding: '0 4px',
                                    }}>
                                        {winner.displayName}
                                    </div>
                                    <div style={{ 
                                        fontSize: 'clamp(16px, 3vw, 28px)', 
                                        fontWeight: 900, 
                                        color: '#fff', 
                                        marginTop: 'clamp(2px, 0.5vh, 6px)',
                                    }}>
                                        ${winner.reward}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </motion.div>
            </div>
        );
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
