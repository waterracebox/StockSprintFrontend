import React, { useEffect, useState, useRef } from 'react';
import type { MiniGameSyncState } from '../../containers/MiniGameOverlay';
import type { Socket } from 'socket.io-client';
import ProgressBar from '../../common/ProgressBar';
import { Slider } from 'antd-mobile';

interface Props {
    state: MiniGameSyncState;
    totalAssets: number;
    userCash: number; // 【新增】使用者當下現金
    currentPrice: number;
    onCollapse: () => void;
    socket: Socket | null;
    selfUserId?: number | null;
}

const MinorityUserView: React.FC<Props> = ({ state, totalAssets, userCash, currentPrice, onCollapse, socket, selfUserId }) => {
    const normalizedPhase = (state.phase || '').toUpperCase();
    const [countdown, setCountdown] = useState<number>(3);

    // 【新增】下注狀態
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [betAmount, setBetAmount] = useState<number>(0);
    const [maxCash, setMaxCash] = useState<number>(0);

    // 【新增】Debounce Timer
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // 【新增】追蹤遊戲回合，每次進入 PREPARE 都重置
    const lastPhaseRef = useRef<string>('');
    
    // 【新增】独立追踪 Phase 变化（用于立即发送最终下注）
    const prevPhaseForBetRef = useRef<string>('');

    useEffect(() => {
        const currentPhase = normalizedPhase;
        
        // 當進入 PREPARE 階段時（新一輪遊戲開始），重置選擇和押注
        if (currentPhase === 'PREPARE' && lastPhaseRef.current !== 'PREPARE') {
            console.log(`[Minority] 進入 PREPARE 階段，重置選項和金額`);
            setSelectedOption(null);
            setBetAmount(0);
        }
        
        lastPhaseRef.current = currentPhase;
    }, [normalizedPhase]);

    // 【新增】監聽伺服器倒數廣播
    useEffect(() => {
        if (!socket || normalizedPhase !== 'COUNTDOWN') return;

        // 初始化倒數為 3
        setCountdown(3);

        const handler = (data: { countdown: number }) => {
            setCountdown(data.countdown);
        };

        socket.on('MINIGAME_COUNTDOWN', handler);
        return () => { 
            socket.off('MINIGAME_COUNTDOWN', handler); 
        };
    }, [socket, normalizedPhase]);

    // 【修改】從 userCash 取得現金上限（而非 totalAssets），使用 Math.floor 向下取整避免超額下注
    useEffect(() => {
        setMaxCash(Math.max(0, Math.floor(userCash)));
    }, [userCash]);

    // 【新增】狀態恢復：從 gameState 恢復下注記錄
    useEffect(() => {
        if (!selfUserId || !state.data?.minorityBets) return;

        const myBet = state.data.minorityBets.find(
            (bet: any) => Number(bet.userId) === selfUserId
        );

        if (myBet) {
            setSelectedOption(myBet.optionIndex);
            setBetAmount(myBet.amount);
        }
    }, [selfUserId, state.data?.minorityBets]);

    // 【新增】Debounced 下注邏輯
    useEffect(() => {
        if (normalizedPhase !== 'GAMING' || !socket || !selectedOption) return;

        // 清除舊 Timer
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        // 設定新 Timer（300ms 後送出）
        debounceTimerRef.current = setTimeout(() => {
            console.log(`[Minority] 送出下注: ${selectedOption}, $${betAmount}`);
            socket.emit('MINIGAME_ACTION', {
                type: 'PLACE_BET',
                option: selectedOption,
                amount: betAmount,
            });
        }, 300);

        // Cleanup
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, [selectedOption, betAmount, normalizedPhase, socket]);

    // 【新增】Phase 切換時立即送出最終下注（繞過 debounce，確保結算前資料送達）
    useEffect(() => {
        const previousPhase = prevPhaseForBetRef.current;

        // 當 Phase 從 GAMING 切換到其他階段時，立即送出當前下注
        if (previousPhase === 'GAMING' && normalizedPhase !== 'GAMING') {
            if (socket && selectedOption !== null && betAmount > 0) {
                console.log(`[Minority] Phase 切換 (${previousPhase} -> ${normalizedPhase})，立即送出最終下注:`, {
                    option: selectedOption,
                    amount: betAmount
                });
                
                // 立即清除 debounce timer
                if (debounceTimerRef.current) {
                    clearTimeout(debounceTimerRef.current);
                    debounceTimerRef.current = null;
                }
                
                // 立即發送
                socket.emit('MINIGAME_ACTION', {
                    type: 'PLACE_BET',
                    option: selectedOption,
                    amount: betAmount,
                });
            }
        }
        
        // 更新 ref 为当前 phase
        prevPhaseForBetRef.current = normalizedPhase;
    }, [normalizedPhase, socket, selectedOption, betAmount]);

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
                    backgroundImage: `linear-gradient(135deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.6) 100%), url('/background/minority.webp')`,
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
                    <div style={{ fontWeight: 800, fontSize: 18 }}>⚖️ 全場少數決</div>
                    <button onClick={onCollapse} style={{ border: 'none', background: 'rgba(255,255,255,0.18)', color: '#fff', padding: '6px 10px', borderRadius: 999, cursor: 'pointer', fontWeight: 600 }}>
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
                    <div style={{ fontSize: 28, fontWeight: 700, textAlign: 'center', lineHeight: 1.3 }}>
                        {questionTitle}
                    </div>
                    <ProgressBar targetEndTime={endTime} totalDuration={totalDuration} color="#8B4513" height={12} />
                    <div style={{ fontSize: 14, opacity: 0.7 }}>請仔細閱讀題目...</div>
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
                    backgroundImage: `linear-gradient(135deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.6) 100%), url('/background/minority.webp')`,
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
                    <div style={{ fontWeight: 800, fontSize: 18 }}>⚖️ 全場少數決</div>
                    <button onClick={onCollapse} style={{ border: 'none', background: 'rgba(255,255,255,0.18)', color: '#fff', padding: '6px 10px', borderRadius: 999, cursor: 'pointer', fontWeight: 600 }}>
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

    // ========== GAMING 階段：下注 UI ==========
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
                    backgroundImage: `linear-gradient(135deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.6) 100%), url('/background/minority.webp')`,
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
                    <div style={{ fontWeight: 800, fontSize: 18 }}>⚖️ 全場少數決</div>
                    <button onClick={onCollapse} style={{ border: 'none', background: 'rgba(255,255,255,0.18)', color: '#fff', padding: '6px 10px', borderRadius: 999, cursor: 'pointer', fontWeight: 600 }}>
                        收起
                    </button>
                </div>

                {/* Status Bar */}
                <div style={{ padding: '6px 14px', background: 'rgba(0,0,0,0.28)', color: '#fff', fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
                    <span>總資產: ${totalAssets.toFixed(2)}</span>
                    <span>股價: ${currentPrice.toFixed(2)}</span>
                </div>

                {/* 題目 */}
                <div style={{ padding: '12px 24px', fontSize: 18, fontWeight: 700, textAlign: 'center' }}>
                    {questionTitle}
                </div>

                {/* 進度條 */}
                <div style={{ padding: '0 24px' }}>
                    <ProgressBar targetEndTime={endTime} totalDuration={duration} color="#8B4513" height={10} />
                </div>

                {/* 選項 (2x2 Grid) */}
                <div style={{ 
                    flex: 1, 
                    padding: 24, 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 1fr',
                    gridTemplateRows: '1fr 1fr',
                    gap: 16,
                    minHeight: 0,
                }}>
                    {options.map((opt: string, idx: number) => {
                        const optionLetter = String.fromCharCode(65 + idx); // "A", "B", "C", "D"
                        const isSelected = selectedOption === optionLetter;
                        return (
                            <button
                                key={idx}
                                onClick={() => setSelectedOption(optionLetter)}
                                style={{
                                    background: isSelected ? 'linear-gradient(135deg, #8B4513, #A0522D)' : 'rgba(255,255,255,0.12)',
                                    color: '#fff',
                                    border: isSelected ? '3px solid #D2691E' : '1px solid rgba(255,255,255,0.3)',
                                    borderRadius: 12,
                                    fontSize: 16,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    textAlign: 'center',
                                    padding: 12,
                                    transition: 'all 0.2s ease',
                                    transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                                    boxShadow: isSelected ? '0 0 20px rgba(210, 105, 30, 0.6)' : 'none',
                                    overflow: 'auto',
                                    wordBreak: 'break-all',
                                    lineHeight: 1.4,
                                }}
                            >
                                {optionLetter}. {opt}
                            </button>
                        );
                    })}
                </div>

                {/* 下注區域 (Sticky Footer) */}
                <div style={{ 
                    padding: '16px 24px', 
                    background: 'rgba(0,0,0,0.4)', 
                    borderTop: '1px solid rgba(255,255,255,0.2)',
                }}>
                    <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 600 }}>
                        下注金額: ${betAmount.toFixed(0)} / ${maxCash.toFixed(0)}
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                            <Slider
                                min={0}
                                max={maxCash}
                                step={1}
                                value={Math.min(betAmount, maxCash)}
                                onChange={(val) => setBetAmount(typeof val === 'number' ? val : val[0])}
                                disabled={!selectedOption}
                                style={{
                                    '--fill-color': selectedOption ? '#D2691E' : '#ccc',
                                } as React.CSSProperties}
                            />
                        </div>
                        <input
                            type="number"
                            value={betAmount}
                            onChange={(e) => {
                                const val = Number(e.target.value);
                                setBetAmount(Math.min(maxCash, Math.max(0, val)));
                            }}
                            disabled={!selectedOption}
                            style={{
                                width: 70,
                                padding: '8px 12px',
                                borderRadius: 8,
                                border: '1px solid rgba(255,255,255,0.3)',
                                background: 'rgba(255,255,255,0.1)',
                                color: '#fff',
                                fontSize: 14,
                                textAlign: 'right',
                            }}
                        />
                    </div>
                    {!selectedOption ? (
                        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.6, textAlign: 'center' }}>
                            請先選擇選項
                        </div>
                    ) : (
                        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8, textAlign: 'center', color: '#FFD700' }}>
                            💡 貼心提醒: 記得要下注
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ========== RESULT 階段：顯示結果 ==========
    if (normalizedPhase === 'RESULT') {
        const settlementResult = state.data?.settlementResult;
        const myResult = settlementResult?.results?.find((r: any) => r.userId === selfUserId);
        const options = state.data?.question?.options || []; // 【新增】获取选项列表

        if (!myResult) {
            return (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 9999,
                    backgroundImage: `linear-gradient(135deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.6) 100%), url('/background/minority.webp')`,
                    backgroundSize: 'cover',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    color: '#fff',
                }}>
                    <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.25)' }}>
                        <div style={{ fontWeight: 800, fontSize: 18 }}>⚖️ 全場少數決</div>
                        <button onClick={onCollapse} style={{ border: 'none', background: 'rgba(255,255,255,0.18)', color: '#fff', padding: '6px 10px', borderRadius: 999, cursor: 'pointer', fontWeight: 600 }}>
                            收起
                        </button>
                    </div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                        <div style={{ fontSize: 18, opacity: 0.8 }}>你未參與本局</div>
                    </div>
                </div>
            );
        }

        const { option, betAmount, status, profit } = myResult;
        
        // 【新增】获取选项文本内容
        const optionIndex = option.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
        const optionText = options[optionIndex] || '';

        // 狀態顏色與訊息
        let statusColor = '#888';
        let statusMessage = '平局，退還本金';
        let amountText = '$0';
        let amountColor = '#888';

        if (status === 'WINNER') {
            statusColor = '#4CAF50';
            statusMessage = '恭喜！你是少數派 (Minority)！';
            amountText = `+$${profit}`;
            amountColor = '#4CAF50';
        } else if (status === 'LOSER') {
            if (settlementResult.status === 'HOUSE_WINS') {
                statusColor = '#B71C1C';
                statusMessage = '莊家通殺！所有人皆輸';
            } else {
                statusColor = '#F44336';
                statusMessage = '可惜！你是多數派 (Majority)！';
            }
            amountText = `-$${betAmount}`;
            amountColor = '#F44336';
        }

        return (
            <div style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                backgroundImage: `linear-gradient(135deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.6) 100%), url('/background/minority.webp')`,
                backgroundSize: 'cover',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                display: 'flex',
                flexDirection: 'column',
                color: '#fff',
            }}>
                {/* Header */}
                <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.25)' }}>
                    <div style={{ fontWeight: 800, fontSize: 18 }}>⚖️ 全場少數決</div>
                    <button onClick={onCollapse} style={{ border: 'none', background: 'rgba(255,255,255,0.18)', color: '#fff', padding: '6px 10px', borderRadius: 999, cursor: 'pointer', fontWeight: 600 }}>
                        收起
                    </button>
                </div>

                {/* Status Bar */}
                <div style={{ padding: '6px 14px', background: 'rgba(0,0,0,0.28)', color: '#fff', fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
                    <span>總資產: ${totalAssets.toFixed(2)}</span>
                    <span>股價: ${currentPrice.toFixed(2)}</span>
                </div>

                {/* 結果區域 */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }}>
                    {/* 選擇提示 */}
                    <div style={{ fontSize: 16, opacity: 0.8, textAlign: 'center', lineHeight: 1.5 }}>
                        你選擇了 <span style={{ fontWeight: 700, fontSize: 20 }}>[{option}]</span>
                        {optionText && (
                            <div style={{ marginTop: 8, fontSize: 18, fontWeight: 600, color: '#FFD700' }}>
                                {optionText}
                            </div>
                        )}
                    </div>

                    {/* 狀態訊息 */}
                    <div style={{
                        fontSize: 24,
                        fontWeight: 800,
                        color: statusColor,
                        textAlign: 'center',
                        lineHeight: 1.3,
                    }}>
                        {statusMessage}
                    </div>

                    {/* 金額變動 */}
                    <div style={{
                        fontSize: 48,
                        fontWeight: 900,
                        color: amountColor,
                        textShadow: `0 0 20px ${amountColor}`,
                    }}>
                        {amountText}
                    </div>
                </div>
            </div>
        );
    }

    // ========== IDLE 階段 ==========
    if (normalizedPhase === 'IDLE') {
        return (
            <div
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 9999,
                    backgroundImage: `linear-gradient(135deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.6) 100%), url('/background/minority.webp')`,
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
                    <div style={{ fontWeight: 800, fontSize: 18 }}>⚖️ 全場少數決</div>
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
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24, gap: 12 }}>
                    <div style={{ fontSize: 28, fontWeight: 900 }}>⚖️ 全場少數決</div>
                    <div style={{ fontSize: 16, opacity: 0.85 }}>等待主持人出題...</div>
                </div>
            </div>
        );
    }

    // ========== 其他階段（預留） ==========
    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                backgroundImage: `linear-gradient(135deg, rgba(139,69,19,0.75) 0%, rgba(101,67,33,0.75) 100%), url('/background/minority.webp')`,
                backgroundSize: 'cover',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                display: 'flex',
                flexDirection: 'column',
                color: '#fff',
            }}
        >
            <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.25)' }}>
                <div style={{ fontWeight: 800, fontSize: 18 }}>⚖️ 全場少數決</div>
                <button onClick={onCollapse} style={{ border: 'none', background: 'rgba(255,255,255,0.18)', color: '#fff', padding: '6px 10px', borderRadius: 999, cursor: 'pointer', fontWeight: 600 }}>
                    收起
                </button>
            </div>
            <div style={{ padding: '6px 14px', background: 'rgba(0,0,0,0.28)', color: '#fff', fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
                <span>總資產: ${totalAssets.toFixed(2)}</span>
                <span>股價: ${currentPrice.toFixed(2)}</span>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24 }}>
                <div style={{ fontSize: 20, fontWeight: 800 }}>小遊戲進行中</div>
                <div style={{ fontSize: 16, opacity: 0.85, marginTop: 8 }}>階段：{state.phase || '未設定'}</div>
            </div>
        </div>
    );
};

export default MinorityUserView;
