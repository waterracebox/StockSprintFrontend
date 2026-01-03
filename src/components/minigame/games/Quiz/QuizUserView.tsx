import React, { useEffect, useState } from 'react';
import type { MiniGameSyncState } from '../../containers/MiniGameOverlay';
import type { Socket } from 'socket.io-client';
import ProgressBar from '../../common/ProgressBar';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
    state: MiniGameSyncState;
    totalAssets: number;
    userCash: number; // 使用者當下現金
    currentPrice: number;
    onCollapse: () => void;
    socket: Socket | null;
    selfUserId?: number | null;
}

const QuizUserView: React.FC<Props> = ({ state, totalAssets, currentPrice, onCollapse, socket, selfUserId }) => {
    const normalizedPhase = (state.phase || '').toUpperCase();
    const [countdown, setCountdown] = useState<number>(3);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [isSubmitted, setIsSubmitted] = useState(false); // 【新增】防止重複送出

    // 【新增】狀態恢復：從 gameState 恢復作答記錄
    useEffect(() => {
        if (!selfUserId || !state.data?.answers) return;

        const myAnswer = state.data.answers[String(selfUserId)];
        if (myAnswer && myAnswer.answer) {
            const optionIndex = myAnswer.answer.charCodeAt(0) - 'A'.charCodeAt(0); // "A" -> 0, "B" -> 1...
            setSelectedOption(optionIndex);
            setIsSubmitted(true); // 【鎖定選擇】
        }
    }, [selfUserId, state.data?.answers]);

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

    // 【修改】重置選擇：僅當題目變更時重置
    useEffect(() => {
        if (normalizedPhase === 'PREPARE') {
            setSelectedOption(null);
            setIsSubmitted(false); // 【重置鎖定】
        }
    }, [normalizedPhase, state.data?.currentQuizId]);

    // 【新增】處理選項點擊
    const handleOptionClick = (index: number) => {
        if (normalizedPhase !== 'GAMING' || isSubmitted || !socket) return;

        const optionLetter = String.fromCharCode(65 + index); // 0 -> "A", 1 -> "B"...
        socket.emit('MINIGAME_ACTION', {
            type: 'SUBMIT_ANSWER',
            answer: optionLetter,
        });

        setSelectedOption(index);
        setIsSubmitted(true); // 【立即鎖定】
        console.log(`[Quiz] 已提交答案：${optionLetter}`);
    };

    // ========== RESULT 階段：顯示答案與獲利 ==========
    if (normalizedPhase === 'RESULT') {
        const questionTitle = state.data?.question?.title || '';
        const correctAnswer = state.data?.question?.correctAnswer || 'A';
        const myAnswerData = state.data?.answers?.[String(selfUserId)];
        const isCorrect = myAnswerData?.answer === correctAnswer;
        const winners = (state.data?.winners || []) as Array<{ userId: number; reward: number; rank: number }>;
        const myReward = winners.find((w) => w.userId === selfUserId)?.reward || 0;

        return (
            <div
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 9999,
                    backgroundImage: `linear-gradient(135deg, rgba(75,0,130,0.78) 0%, rgba(25,25,112,0.75) 100%), url('/background/quiz.webp')`,
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
                    <div style={{ fontWeight: 800, fontSize: 18 }}>🧠 機智問答</div>
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

                {/* 題目（縮小） */}
                <div style={{ padding: '12px 24px', fontSize: 14, textAlign: 'center', opacity: 0.6 }}>
                    {questionTitle}
                </div>

                {/* 結果動畫 */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }}>
                    <AnimatePresence>
                        <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.5, ease: 'backOut' }}
                            style={{ fontSize: 120 }}
                        >
                            {isCorrect ? '✅' : '❌'}
                        </motion.div>
                    </AnimatePresence>

                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3, duration: 0.4 }}
                        style={{ fontSize: 24, fontWeight: 700, textAlign: 'center' }}
                    >
                        {isCorrect ? '答對了！' : '答錯了'}
                    </motion.div>

                    {isCorrect && myReward > 0 && (
                        <motion.div
                            initial={{ y: 0, opacity: 1, scale: 1 }}
                            animate={{ y: -50, opacity: 0, scale: 1.5 }}
                            transition={{ delay: 0.6, duration: 1.2, ease: 'easeOut' }}
                            style={{
                                fontSize: 32,
                                fontWeight: 900,
                                color: '#FFD700',
                                textShadow: '0 0 20px rgba(255, 215, 0, 0.8)',
                            }}
                        >
                            +${myReward}
                        </motion.div>
                    )}

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.0, duration: 0.5 }}
                        style={{ fontSize: 16, opacity: 0.75, marginTop: 16 }}
                    >
                        正確答案：{correctAnswer}
                    </motion.div>
                </div>
            </div>
        );
    }

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
                    backgroundImage: `linear-gradient(135deg, rgba(75,0,130,0.78) 0%, rgba(25,25,112,0.75) 100%), url('/background/quiz.webp')`,
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
                    <div style={{ fontWeight: 800, fontSize: 18 }}>🧠 機智問答</div>
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
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }}>
                    <div 
                        style={{ 
                            fontSize: 24, 
                            fontWeight: 700, 
                            textAlign: 'center',
                            animation: 'fadeIn 0.5s ease-in',
                            lineHeight: 1.5,
                            maxWidth: '90%',
                        }}
                    >
                        {questionTitle}
                    </div>
                    <div style={{ width: '80%', maxWidth: 400 }}>
                        <ProgressBar targetEndTime={endTime} totalDuration={totalDuration} color="#4CAF50" height={12} />
                    </div>
                    <div style={{ fontSize: 14, opacity: 0.7, marginTop: 8 }}>讀題時間...</div>
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
                    backgroundImage: `linear-gradient(135deg, rgba(75,0,130,0.78) 0%, rgba(25,25,112,0.75) 100%), url('/background/quiz.webp')`,
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
                    <div style={{ fontWeight: 800, fontSize: 18 }}>🧠 機智問答</div>
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

    // ========== GAMING 階段：顯示選項 + 進度條 ==========
    if (normalizedPhase === 'GAMING') {
        const questionTitle = state.data?.question?.title || '';
        const options = state.data?.question?.options || [];
        const duration = (state.data?.question?.duration || 10) * 1000;
        const endTime = state.endTime || 0;

        return (
            <div
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 9999,
                    backgroundImage: `linear-gradient(135deg, rgba(75,0,130,0.78) 0%, rgba(25,25,112,0.75) 100%), url('/background/quiz.webp')`,
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
                    <div style={{ fontWeight: 800, fontSize: 18 }}>🧠 機智問答</div>
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

                {/* 題目 */}
                <div style={{ padding: '16px 24px', fontSize: 20, fontWeight: 700, textAlign: 'center' }}>
                    {questionTitle}
                </div>

                {/* 進度條 */}
                <div style={{ padding: '0 24px' }}>
                    <ProgressBar targetEndTime={endTime} totalDuration={duration} color="#FF9800" height={10} />
                </div>

                {/* 選項 (2x2 Grid) */}
                <div style={{ 
                    flex: 1, 
                    padding: 24, 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 1fr',
                    gridTemplateRows: '1fr 1fr',
                    gap: 16,
                }}>
                    {options.map((opt: string, idx: number) => {
                        const isSelected = selectedOption === idx;
                        return (
                            <button
                                key={idx}
                                onClick={() => handleOptionClick(idx)}
                                disabled={isSubmitted} // 【鎖定】
                                style={{
                                    background: isSelected ? 'linear-gradient(135deg, #FFC107, #FF9800)' : 'rgba(255,255,255,0.12)',
                                    color: '#fff',
                                    border: isSelected ? '3px solid #FFD54F' : '1px solid rgba(255,255,255,0.3)',
                                    borderRadius: 12,
                                    fontSize: 16,
                                    fontWeight: 600,
                                    cursor: isSubmitted ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    textAlign: 'center',
                                    padding: 12,
                                    transition: 'all 0.2s ease',
                                    transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                                    boxShadow: isSelected ? '0 0 20px rgba(255, 193, 7, 0.6)' : 'none',
                                    opacity: isSubmitted && !isSelected ? 0.5 : 1, // 【淡化未選擇的選項】
                                }}
                            >
                                {String.fromCharCode(65 + idx)}. {opt}
                            </button>
                        );
                    })}
                </div>

                {/* 【新增】已提交提示 */}
                {isSubmitted && (
                    <div style={{ padding: '12px 24px', textAlign: 'center', fontSize: 14, opacity: 0.85 }}>
                        已提交答案，等待結算...
                    </div>
                )}
            </div>
        );
    }

    // ========== 其他階段 ==========
    if (normalizedPhase !== 'IDLE') {
        return (
            <div
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 9999,
                    backgroundImage: `linear-gradient(135deg, rgba(75,0,130,0.78) 0%, rgba(25,25,112,0.75) 100%), url('/background/quiz.webp')`,
                    backgroundSize: 'cover',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    color: '#fff',
                }}
            >
                <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.25)' }}>
                    <div style={{ fontWeight: 800, fontSize: 18 }}>🧠 機智問答</div>
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
                <div style={{ padding: '6px 14px', background: 'rgba(0,0,0,0.28)', color: '#fff', fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
                    <span>總資產: ${totalAssets.toFixed(2)}</span>
                    <span>股價: ${currentPrice.toFixed(2)}</span>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24 }}>
                    <div style={{ fontSize: 20, fontWeight: 800 }}>小遊戲進行中</div>
                    <div style={{ fontSize: 16, opacity: 0.85, marginTop: 8 }}>{state.gameType} / {state.phase}</div>
                </div>
            </div>
        );
    }

    // ========== IDLE 階段 ==========
    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                backgroundImage: `linear-gradient(135deg, rgba(75,0,130,0.78) 0%, rgba(25,25,112,0.75) 100%), url('/background/quiz.webp')`,
                backgroundSize: 'cover',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                display: 'flex',
                flexDirection: 'column',
                color: '#fff',
            }}
        >
            <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.25)' }}>
                <div style={{ fontWeight: 800, fontSize: 18 }}>🧠 機智問答</div>
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
            <div style={{ padding: '6px 14px', background: 'rgba(0,0,0,0.28)', color: '#fff', fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
                <span>總資產: ${totalAssets.toFixed(2)}</span>
                <span>股價: ${currentPrice.toFixed(2)}</span>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24, gap: 12 }}>
                <div style={{ fontSize: 28, fontWeight: 900 }}>🧠 機智問答</div>
                <div style={{ fontSize: 16, opacity: 0.85 }}>等待主持人出題...</div>
            </div>
        </div>
    );
};

export default QuizUserView;
