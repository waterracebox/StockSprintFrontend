// components/display/EndingCeremony.tsx
// 【Phase 4】遊戲結束儀式組件 - Display 頁面專用

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';
import './EndingCeremony.css';

interface Award {
    userId: number;
    displayName: string;
    avatar: string;
    value?: number; // 通用數值欄位（可能是 totalAssets, cash, stockValue, debt 等）
}

interface FinalStatsData {
    top3: Award[];
    cashKing: Award | null;
    stockTycoon: Award | null;
    debtKing: Award | null;
    fashionista: Award | null;
    loanSharkLover: Award | null;
}

type CeremonyStep = 
    | 'INTRO' 
    | 'TOP_3' 
    | 'CASH_KING' 
    | 'STOCK_TYCOON' 
    | 'DEBT_KING' 
    | 'FASHIONISTA' 
    | 'LOAN_SHARK_LOVER' 
    | 'OUTRO';

const EndingCeremony: React.FC = () => {
    const [step, setStep] = useState<CeremonyStep>('INTRO');
    const [statsData, setStatsData] = useState<FinalStatsData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [showConfetti, setShowConfetti] = useState<boolean>(true);

    // 載入統計資料
    useEffect(() => {
        const fetchStats = async () => {
            try {
                const token = localStorage.getItem('token');
                const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
                
                const response = await fetch(`${API_URL}/api/admin/final-stats`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch final stats');
                }

                const data = await response.json();
                setStatsData(data);
                setLoading(false);
            } catch (error) {
                console.error('[EndingCeremony] 載入統計資料失敗:', error);
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    // 點擊任意處前進到下一步
    const handleNext = () => {
        const steps: CeremonyStep[] = [
            'INTRO',
            'TOP_3',
            'CASH_KING',
            'STOCK_TYCOON',
            'DEBT_KING',
            'FASHIONISTA',
            'LOAN_SHARK_LOVER',
            'OUTRO',
        ];

        const currentIndex = steps.indexOf(step);
        if (currentIndex < steps.length - 1) {
            setStep(steps[currentIndex + 1]);
        } else if (step === 'OUTRO') {
            // OUTRO 階段停留，不再前進（等待遊戲重新開始）
            setShowConfetti(false);
        }
    };

    // 最後一步時關閉彩帶
    useEffect(() => {
        if (step === 'OUTRO') {
            setShowConfetti(false);
        }
    }, [step]);

    if (loading) {
        return (
            <div className="ceremony-overlay">
                <div className="ceremony-loading">載入中...</div>
            </div>
        );
    }

    if (!statsData) {
        return (
            <div className="ceremony-overlay">
                <div className="ceremony-error">無法載入結束儀式資料</div>
            </div>
        );
    }

    return (
        <div className="ceremony-overlay" onClick={handleNext}>
            {showConfetti && <Confetti />}

            <AnimatePresence mode="wait">
                {step === 'INTRO' && (
                    <motion.div
                        key="intro"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.6 }}
                        className="ceremony-slide"
                    >
                        <h1 className="ceremony-title">🎉 遊戲結束了！</h1>
                        <p className="ceremony-subtitle">新的一年加油！</p>
                    </motion.div>
                )}

                {step === 'TOP_3' && (
                    <motion.div
                        key="top3"
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                        transition={{ duration: 0.6 }}
                        className="ceremony-slide"
                    >
                        <h2 className="ceremony-award-title">🏆 總資產排行榜 Top 3</h2>
                        <div className="podium">
                            {statsData.top3.map((winner, index) => (
                                <div key={winner.userId} className={`podium-place place-${index + 1}`}>
                                    <img 
                                        src={`/avatars/${winner.avatar}`} 
                                        alt={winner.displayName} 
                                        className="podium-avatar"
                                    />
                                    <div className="podium-rank">#{index + 1}</div>
                                    <div className="podium-name">{winner.displayName}</div>
                                    <div className="podium-value">${(winner as any).totalAssets?.toFixed(2)}</div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {step === 'CASH_KING' && statsData.cashKing && (
                    <motion.div
                        key="cashking"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.6 }}
                        className="ceremony-slide"
                    >
                        <h2 className="ceremony-award-title">💰 現金王 (Cash King)</h2>
                        <div className="spotlight-card">
                            <img 
                                src={`/avatars/${statsData.cashKing.avatar}`} 
                                alt={statsData.cashKing.displayName} 
                                className="spotlight-avatar"
                            />
                            <div className="spotlight-name">{statsData.cashKing.displayName}</div>
                            <div className="spotlight-value">持有現金: ${(statsData.cashKing as any).cash?.toFixed(2)}</div>
                        </div>
                    </motion.div>
                )}

                {step === 'STOCK_TYCOON' && statsData.stockTycoon && (
                    <motion.div
                        key="stocktycoon"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.6 }}
                        className="ceremony-slide"
                    >
                        <h2 className="ceremony-award-title">📈 股票大亨 (Stock Tycoon)</h2>
                        <div className="spotlight-card">
                            <img 
                                src={`/avatars/${statsData.stockTycoon.avatar}`} 
                                alt={statsData.stockTycoon.displayName} 
                                className="spotlight-avatar"
                            />
                            <div className="spotlight-name">{statsData.stockTycoon.displayName}</div>
                            <div className="spotlight-value">股票價值: ${(statsData.stockTycoon as any).stockValue?.toFixed(2)}</div>
                        </div>
                    </motion.div>
                )}

                {step === 'DEBT_KING' && statsData.debtKing && (
                    <motion.div
                        key="debtking"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.6 }}
                        className="ceremony-slide"
                    >
                        <h2 className="ceremony-award-title">💸 負債王 (Debt King)</h2>
                        <div className="spotlight-card debt">
                            <img 
                                src={`/avatars/${statsData.debtKing.avatar}`} 
                                alt={statsData.debtKing.displayName} 
                                className="spotlight-avatar"
                            />
                            <div className="spotlight-name">{statsData.debtKing.displayName}</div>
                            <div className="spotlight-value red">負債: ${(statsData.debtKing as any).debt?.toFixed(2)}</div>
                        </div>
                    </motion.div>
                )}

                {step === 'FASHIONISTA' && statsData.fashionista && (
                    <motion.div
                        key="fashionista"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.6 }}
                        className="ceremony-slide"
                    >
                        <h2 className="ceremony-award-title">👗 時尚達人 (Fashionista)</h2>
                        <div className="spotlight-card">
                            <img 
                                src={`/avatars/${statsData.fashionista.avatar}`} 
                                alt={statsData.fashionista.displayName} 
                                className="spotlight-avatar"
                            />
                            <div className="spotlight-name">{statsData.fashionista.displayName}</div>
                            <div className="spotlight-value">更換頭像 {(statsData.fashionista as any).avatarUpdateCount} 次</div>
                        </div>
                    </motion.div>
                )}

                {step === 'LOAN_SHARK_LOVER' && statsData.loanSharkLover && (
                    <motion.div
                        key="loansharklover"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.6 }}
                        className="ceremony-slide"
                    >
                        <h2 className="ceremony-award-title">💘 是誰暗戀沈梟？</h2>
                        <div className="spotlight-card">
                            <img 
                                src={`/avatars/${statsData.loanSharkLover.avatar}`} 
                                alt={statsData.loanSharkLover.displayName} 
                                className="spotlight-avatar"
                            />
                            <div className="spotlight-name">{statsData.loanSharkLover.displayName}</div>
                            <div className="spotlight-value">訪問地下錢莊 {(statsData.loanSharkLover as any).loanSharkVisitCount} 次</div>
                        </div>
                    </motion.div>
                )}

                {step === 'OUTRO' && (
                    <motion.div
                        key="outro"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.6 }}
                        className="ceremony-slide"
                    >
                        <h1 className="ceremony-title">🙏 感謝大家參與</h1>
                        <p className="ceremony-subtitle">期待下次再見！</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {step !== 'OUTRO' && (
                <div className="ceremony-hint">
                    <span className="blink">點擊任意處繼續...</span>
                </div>
            )}
        </div>
    );
};

export default EndingCeremony;
