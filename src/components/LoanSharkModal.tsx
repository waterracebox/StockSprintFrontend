import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Button, Toast, Dialog, Popup, Slider } from 'antd-mobile';
import { CloseOutline } from 'antd-mobile-icons';
import { Socket } from 'socket.io-client';
import DualColorSwitch from './common/DualColorSwitch';
import { useSound } from '../contexts/SoundContext';
import apiClient from '../services/apiClient';
import { LOAN_SHARK_TIERS, MAX_AFFINITY_THRESHOLD } from '../config/loanSharkDialogues';

interface LoanSharkModalProps {
    isOpen: boolean;
    onClose: () => void;
    socket: Socket | null;
    userAssets: {
        cash: number;
        debt: number;
        dailyBorrowed?: number;
        loanSharkVisitCount?: number; // 【新增】
    };
    gameConfig: {
        maxLoanAmount: number;
        dailyInterestRate: number;
    };
    currentDay?: number; // 【新增】從父組件傳入當前天數
}

// 預設問候語
const DEFAULT_GREETING = "我是沈梟，坐吧。說說看，你想要多少？";

// 將樣式提取為常量，避免每次渲染創建新物件
const POPUP_BODY_STYLE = {
    minHeight: '70vh',
    maxHeight: '85vh',
    padding: '0',
    backgroundColor: '#f5f5f5',
    borderTopLeftRadius: '16px',
    borderTopRightRadius: '16px',
    overflow: 'hidden'
} as const;

const HEADER_STYLE = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    backgroundColor: '#fff',
    borderBottom: '1px solid #f0f0f0',
    position: 'sticky' as const,
    top: 0,
    zIndex: 10
};

const CONTENT_STYLE = {
    padding: '24px 16px',
    overflowY: 'auto' as const,
    maxHeight: 'calc(85vh - 60px)'
};

const LoanSharkModal: React.FC<LoanSharkModalProps> = ({
    isOpen,
    onClose,
    socket,
    userAssets,
    gameConfig,
    currentDay = 0,
}) => {
    const [amount, setAmount] = useState<number>(100);
    const [amountInput, setAmountInput] = useState<string>('100');
    const [merchantState, setMerchantState] = useState<'NORMAL' | 'HAPPY'>('NORMAL');
    const [mode, setMode] = useState<'BORROW' | 'REPAY'>('BORROW');
    
    // 【新增】對話相關狀態
    const [dialogue, setDialogue] = useState<string>(DEFAULT_GREETING);
    const [lastDialogue, setLastDialogue] = useState<string>(''); // 【新增】記錄上一次的對話，避免重複
    // 【移除 visitCount local state，直接使用 props.loanSharkVisitCount 確保同步】
    const [predictionTrend, setPredictionTrend] = useState<'RISE' | 'FALL' | 'UNCERTAIN' | null>(null);
    const [isTransactionSuccess, setIsTransactionSuccess] = useState(false);
    const [isBlinking, setIsBlinking] = useState(false); // 【新增】眨眼狀態
    
    // 【新增】Debounce 控制（使用 useRef 避免重新渲染）
    const lastClickTimeRef = useRef<number>(0);
    const blinkTimeoutsRef = useRef<NodeJS.Timeout[]>([]); // 【新增】儲存眨眼計時器以便清除
    const DEBOUNCE_MS = 300;

    const { cash, debt, dailyBorrowed = 0, loanSharkVisitCount = 0 } = userAssets;
    const { maxLoanAmount, dailyInterestRate } = gameConfig;

    // 使用 useMemo 計算衍生狀態，避免每次渲染重複計算
    const { remainingLimit, repayMax, sliderMax, sliderStep } = useMemo(() => {
        const remainingLimit = maxLoanAmount - dailyBorrowed;
        const repayMax = Math.max(0, Math.min(cash, debt));
        const sliderMax = mode === 'BORROW' ? Math.max(0, remainingLimit) : repayMax;
        const sliderStep = 0.01;
        return { remainingLimit, repayMax, sliderMax, sliderStep };
    }, [maxLoanAmount, dailyBorrowed, cash, debt, mode]);

    const formatAmount = useCallback((val: number) => val.toFixed(2), []);

    // 【新增】清除所有眨眼計時器的函數
    const clearBlinkTimers = useCallback(() => {
        blinkTimeoutsRef.current.forEach(timer => clearTimeout(timer));
        blinkTimeoutsRef.current = [];
        setIsBlinking(false);
    }, []);

    // 【新增】觸發眨眼動畫的函數
    const triggerBlink = useCallback(() => {
        // 先清除舊的計時器
        clearBlinkTimers();

        // 眨眼時序：
        // T+500ms:  第一次閉眼
        // T+800ms:  第一次睜眼
        // T+1800ms: 第二次閉眼
        // T+2100ms: 第二次睜眼（結束）

        const timer1 = setTimeout(() => setIsBlinking(true), 500);    // 0.5 秒後開始第一次閉眼
        const timer2 = setTimeout(() => setIsBlinking(false), 800);   // 0.3 秒後睜眼
        const timer3 = setTimeout(() => setIsBlinking(true), 1800);   // 1 秒後開始第二次閉眼
        const timer4 = setTimeout(() => setIsBlinking(false), 2100);  // 0.3 秒後睜眼（結束）

        blinkTimeoutsRef.current = [timer1, timer2, timer3, timer4];
    }, [clearBlinkTimers]);

    // 使用 useMemo 緩存圖片路徑
    const merchantImage = useMemo(() => {
        // 交易成功時顯示開心圖片
        if (merchantState === 'HAPPY') {
            return '/images/merchant_happy.webp';
        }
        // 眨眼狀態顯示閉眼圖片
        if (isBlinking) {
            return '/images/merchant_normal_blink.webp';
        }
        // 正常狀態顯示睜眼圖片
        return '/images/merchant_normal.webp';
    }, [merchantState, isBlinking]);

    const { playSfx } = useSound();

    // 【新增】取得預測資料的函數
    const fetchPrediction = useCallback(async () => {
        try {
            const res = await apiClient.get('/game/script/prediction');
            setPredictionTrend(res.data.trend);
            console.log('[LoanShark] 已取得明牌:', res.data.trend);
        } catch (error: any) {
            console.error('[LoanShark] 取得預測失敗:', error);
            setPredictionTrend(null);
        }
    }, []);

    // 【新增】初始化對話與預測（只在開啟時執行一次）
    useEffect(() => {
        if (isOpen) {
            // 強制顯示預設問候語（只在開啟瞬間）
            setDialogue(DEFAULT_GREETING);
            setIsTransactionSuccess(false);

            // 若已達最高好感度，立即取得預測
            if (loanSharkVisitCount >= MAX_AFFINITY_THRESHOLD) {
                fetchPrediction();
            }
        }
    }, [isOpen, fetchPrediction]); // 移除 loanSharkVisitCount 依賴，避免訪問次數更新時重置對話

    // 【新增】監聽好感度變化，檢查是否需要取得預測（但不重置對話）
    useEffect(() => {
        if (isOpen && loanSharkVisitCount >= MAX_AFFINITY_THRESHOLD) {
            fetchPrediction();
        }
    }, [loanSharkVisitCount, isOpen, fetchPrediction]);

    // 【新增】監聽天數變化，重新取得預測
    useEffect(() => {
        if (isOpen && loanSharkVisitCount >= MAX_AFFINITY_THRESHOLD && currentDay > 0) {
            fetchPrediction();
        }
    }, [currentDay, isOpen, loanSharkVisitCount, fetchPrediction]);

    // 【新增】點擊頭像的互動邏輯
    const handlePortraitClick = useCallback(() => {
        // 1. Debounce 檢查（防止過度點擊）
        const now = Date.now();
        if (now - lastClickTimeRef.current < DEBOUNCE_MS) {
            console.log('[LoanShark] 點擊過快，已忽略');
            return;
        }
        lastClickTimeRef.current = now;

        // 2. 清除眨眼動畫（如果有的話）
        clearBlinkTimers();

        // 3. 交易成功時不允許點擊
        if (isTransactionSuccess) return;

        // 4. 發送 Socket 事件（後端會 +1 並透過 WebSocket 同步回來）
        if (socket) {
            socket.emit('VISIT_LOAN_SHARK');
        }

        // 5. 使用當前的 props 值（後端會同步更新，這裡先用當前值計算對話）
        // 注意：實際的 count 會在下次 render 時從 props 更新
        const currentCount = loanSharkVisitCount;

        // 6. 若已達門檻，取得預測
        if (currentCount >= MAX_AFFINITY_THRESHOLD) {
            fetchPrediction();
        }

        // 7. 選擇對話（基於當前值）
        let selectedDialogue = DEFAULT_GREETING;

        // 遍歷階層，找到符合的區間
        const tier = LOAN_SHARK_TIERS.find((t) => currentCount <= t.threshold || t.threshold === -1);
        
        if (tier && tier.lines.length > 0) {
            let availableLines = tier.lines;

            // 【對話去重】如果有多於一筆台詞，排除上一次的對話
            if (availableLines.length > 1 && lastDialogue) {
                availableLines = availableLines.filter(line => line !== lastDialogue);
            }

            // 若過濾後沒有可用台詞（理論上不會發生），則使用全部
            if (availableLines.length === 0) {
                availableLines = tier.lines;
            }

            const randomLine = availableLines[Math.floor(Math.random() * availableLines.length)];

            // 特殊處理：明牌預測
            if (randomLine === 'SPECIAL_PREDICTION') {
                if (predictionTrend === 'RISE') {
                    selectedDialogue = '這些內部消息我只告訴你，別讓第三個人知道。明天必漲！📈';
                } else if (predictionTrend === 'FALL') {
                    selectedDialogue = '這些內部消息我只告訴你，別讓第三個人知道。明天必跌！📉';
                } else {
                    selectedDialogue = '有些事，還是不知道比較幸福。';
                }
            } else {
                selectedDialogue = randomLine;
            }
        }

        setDialogue(selectedDialogue);
        setLastDialogue(selectedDialogue); // 記錄本次對話
    }, [loanSharkVisitCount, isTransactionSuccess, predictionTrend, socket, fetchPrediction, lastDialogue, clearBlinkTimers]);

    // 【新增】監聽對話變化，觸發眨眼效果
    useEffect(() => {
        // 檢查是否為明牌對話（包含「明天必漲」或「明天必跌」）
        const isPredictionDialogue = dialogue.includes('明天必漲') || dialogue.includes('明天必跌');
        
        if (isPredictionDialogue) {
            console.log('[LoanShark] 偵測到明牌對話，觸發眨眼動畫');
            triggerBlink();
        }

        // 清理函數：組件卸載或對話變化時清除計時器
        return () => {
            clearBlinkTimers();
        };
    }, [dialogue, triggerBlink, clearBlinkTimers]);

    // 監聽交易成功事件
    useEffect(() => {
        if (!socket) return;

        const handleTradeSuccess = (payload: any) => {
            if (payload.action === 'BORROW' || payload.action === 'REPAY') {
                playSfx('coins');
                setMerchantState('HAPPY');
                setIsTransactionSuccess(true);

                // 3 秒後恢復
                setTimeout(() => {
                    setMerchantState('NORMAL');
                    setIsTransactionSuccess(false);
                }, 3000);
            }
        };

        socket.on('TRADE_SUCCESS', handleTradeSuccess);
        return () => {
            socket.off('TRADE_SUCCESS', handleTradeSuccess);
        };
    }, [socket, playSfx]);

    // 【Phase 4】開啟地下錢莊時自動記錄訪問（進入就+1）
    useEffect(() => {
        if (isOpen && socket) {
            console.log('[LoanShark] Modal 開啟，發送 VISIT_LOAN_SHARK 事件');
            socket.emit('VISIT_LOAN_SHARK');
        }
    }, [isOpen, socket]);

    // 使用 useCallback 避免重複創建函數
    const clampAmount = useCallback((value: number) => {
        const minVal = 0;
        return Math.min(Math.max(value, minVal), sliderMax);
    }, [sliderMax]);

    // 初始化時調整金額到合理範圍
    useEffect(() => {
        if (amount > sliderMax) {
            const clamped = Math.min(amount, sliderMax);
            setAmount(clamped);
            setAmountInput(clamped > 0 ? formatAmount(clamped) : '');
        }
    }, [sliderMax]); // 只在 sliderMax 變化時執行，不依賴 amount

    const handleSliderChange = useCallback((value: number | [number, number]) => {
        const numValue = Array.isArray(value) ? value[0] : value;
        const clamped = clampAmount(numValue);
        setAmount(clamped);
        setAmountInput(formatAmount(clamped));
    }, [clampAmount, formatAmount]);

    const handleInputChange = useCallback((value: string) => {
        // 允許輸入任何內容（包括空字串、小數點等）
        setAmountInput(value);
        
        // 只在有效數字時同步更新 amount
        if (value !== '') {
            const num = parseFloat(value);
            if (!Number.isNaN(num) && num >= 0) {
                const clamped = clampAmount(num);
                setAmount(clamped);
            }
        }
    }, [clampAmount]);

    const handleInputBlur = useCallback(() => {
        const num = parseFloat(amountInput);
        if (isNaN(num) || num < 0) {
            // 無效輸入，重置為當前 amount
            setAmountInput(amount > 0 ? formatAmount(amount) : '');
        } else {
            // 有效輸入，格式化並限制範圍
            const clamped = clampAmount(num);
            setAmount(clamped);
            setAmountInput(clamped > 0 ? formatAmount(clamped) : '');
        }
    }, [amountInput, amount, sliderMax, formatAmount, clampAmount]);

    // 模式切換處理 - 簡化邏輯，直接更新
    const handleModeChange = useCallback((checked: boolean) => {
        const nextMode: 'BORROW' | 'REPAY' = checked ? 'BORROW' : 'REPAY';
        setMode(nextMode);
        
        // 計算新的上限
        const nextLimit = maxLoanAmount - dailyBorrowed;
        const nextRepayMax = Math.max(0, Math.min(cash, debt));
        const nextMax = nextMode === 'BORROW' ? Math.max(0, nextLimit) : nextRepayMax;
        const resetVal = nextMax > 0 ? Math.min(100, nextMax) : 0;
        
        // 直接更新，React 18 會自動批次處理
        setAmount(resetVal);
        setAmountInput(resetVal > 0 ? formatAmount(resetVal) : '');
    }, [maxLoanAmount, dailyBorrowed, cash, debt, formatAmount]);

    // 借款處理 - 使用 useCallback 優化
    const handleBorrow = useCallback(async () => {
        if (!socket) {
            Toast.show({ icon: 'fail', content: 'WebSocket 未連線' });
            return;
        }

        if (amount <= 0) {
            Toast.show({ icon: 'fail', content: '借款金額必須大於 0' });
            return;
        }

        if (amount > remainingLimit) {
            Toast.show({ icon: 'fail', content: `今日額度不足 (剩餘 ${remainingLimit})` });
            return;
        }

        const confirmed = await Dialog.confirm({
            content: `確定要借款 $${amount} 嗎？\n日利率: ${(dailyInterestRate * 100).toFixed(4)}%`,
            closeOnMaskClick: false,
        });

        if (confirmed) {
            socket.emit('BORROW_MONEY', { amount });
        }
    }, [socket, amount, remainingLimit, dailyInterestRate]);

    // 還款處理 - 使用 useCallback 優化
    const handleRepay = useCallback(async () => {
        if (!socket) {
            Toast.show({ icon: 'fail', content: 'WebSocket 未連線' });
            return;
        }

        if (amount <= 0) {
            Toast.show({ icon: 'fail', content: '還款金額必須大於 0' });
            return;
        }

        if (amount > repayMax) {
            Toast.show({ icon: 'fail', content: '現金或負債不足' });
            return;
        }

        // 計算實際還款金額
        const actualRepayAmount = Math.min(amount, debt);
        const confirmMessage = actualRepayAmount < amount 
            ? `負債總額為 $${debt}，實際還款 $${actualRepayAmount}，確定嗎？`
            : `確定要還款 $${amount} 嗎？`;

        const confirmed = await Dialog.confirm({
            content: confirmMessage,
            closeOnMaskClick: false,
        });

        if (confirmed) {
            socket.emit('REPAY_MONEY', { amount });
        }
    }, [socket, amount, repayMax, debt]);

    return (
        <Popup
            visible={isOpen}
            onClose={onClose}
            closeOnMaskClick={false}
            onMaskClick={undefined}
            position='bottom'
            bodyStyle={POPUP_BODY_STYLE}
        >
            {/* 標題列 */}
            <div style={HEADER_STYLE}>
                <span style={{ fontSize: '18px', fontWeight: 'bold' }}>地下錢莊</span>
                <CloseOutline 
                    fontSize={22}
                    onClick={onClose}
                    style={{ cursor: 'pointer', color: '#999' }}
                />
            </div>

            {/* 內容區域 */}
            <div style={CONTENT_STYLE}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                    {/* ==================== 黑心商人圖片 & 對話 ==================== */}
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'center', 
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '0'
                    }}>
                        <div 
                            style={{ 
                                width: '200px',
                                cursor: isTransactionSuccess ? 'not-allowed' : 'pointer',
                            }}
                            onClick={handlePortraitClick}
                        >
                            <img 
                                src={merchantImage} 
                                alt="黑心商人"
                                style={{ 
                                    width: '100%', 
                                    height: '100%', 
                                    objectFit: 'contain'
                                }}
                                loading="lazy"
                                onError={(e) => {
                                    e.currentTarget.src = '/images/avatar_00.webp'; // Fallback
                                }}
                            />
                        </div>
                        <div style={{
                            backgroundColor: '#fff',
                            padding: '12px 16px',
                            borderRadius: '12px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            position: 'relative',
                            maxWidth: '150px',
                            minHeight: '60px',
                            display: 'flex',
                            alignItems: 'center',
                        }}>
                            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#333' }}>
                                {dialogue}
                            </div>
                            {/* 對話框尖角 */}
                            <div style={{
                                position: 'absolute',
                                left: '-8px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                width: 0,
                                height: 0,
                                borderTop: '8px solid transparent',
                                borderBottom: '8px solid transparent',
                                borderRight: '8px solid #fff'
                            }} />
                        </div>
                    </div>

                    {/* 【新增】顯示當前好感度（測試用，正式環境可移除） */}
                    {/* <div style={{ 
                        textAlign: 'center', 
                        fontSize: '10px', 
                        color: '#999', 
                        marginTop: '4px' 
                    }}>
                        訪問次數: {loanSharkVisitCount} / {MAX_AFFINITY_THRESHOLD}
                    </div> */}

                    {/* 模式切換：借 / 還 */}
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        margin: '12px 0'
                    }}>
                        <span style={{ fontSize: '14px', color: '#666' }}>模式:</span>
                        <DualColorSwitch
                            checked={mode === 'BORROW'}
                            onChange={handleModeChange}
                            checkedText="借"
                            uncheckedText="還"
                            checkedColor="#1677ff"
                            uncheckedColor="#ff8f1f"
                        />
                    </div>

                    {/* ==================== 利率與額度資訊 ==================== */}
                    <div style={{
                        backgroundColor: '#fff',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                    }}>
                        <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between',
                            marginBottom: '8px'
                        }}>
                            <span style={{ color: '#666' }}>日利率:</span>
                            <span style={{ fontWeight: 'bold', color: '#ff3141' }}>
                                {(dailyInterestRate * 100).toFixed(4)}%
                            </span>
                        </div>
                        <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between'
                        }}>
                            <span style={{ color: '#666' }}>今日額度:</span>
                            <span style={{ fontWeight: 'bold', color: remainingLimit > 0 ? '#1677ff' : '#999' }}>
                                {remainingLimit} / {maxLoanAmount}
                            </span>
                        </div>
                    </div>

                    {/* ==================== 金額輸入（Slider + Input） ==================== */}
                    <div style={{
                        backgroundColor: '#fff',
                        padding: '16px',
                        borderRadius: '8px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                        marginTop: '16px'
                    }}>
                        <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            marginBottom: '8px'
                        }}>
                            <span style={{ fontSize: '14px', color: '#666' }}>金額 (元)</span>
                            <span style={{ fontSize: '12px', color: '#999' }}>上限 {formatAmount(sliderMax)}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ flex: 1 }}>
                                <Slider
                                    min={0}
                                    max={sliderMax}
                                    step={sliderStep}
                                    disabled={sliderMax <= 0}
                                    value={Math.min(amount, sliderMax)}
                                    onChange={handleSliderChange}
                                />
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#999', marginTop: 4 }}>
                                    <span>0</span>
                                    <span>{Math.floor(sliderMax / 2)}</span>
                                    <span>{sliderMax}</span>
                                </div>
                            </div>
                            <input
                                type="number"
                                min={0}
                                max={sliderMax}
                                step={sliderStep}
                                value={amountInput}
                                onChange={(e) => handleInputChange(e.target.value)}
                                onBlur={handleInputBlur}
                                style={{
                                    width: '60px',
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    textAlign: 'center',
                                    border: '1px solid #e5e5e5',
                                    borderRadius: '4px',
                                    padding: '4px 8px'
                                }}
                            />
                        </div>
                    </div>

                    {/* ==================== 操作按鈕 ==================== */}
                    <div style={{ marginTop: '12px' }}>
                        <Button 
                            block
                            color={mode === 'BORROW' ? 'primary' : 'warning'}
                            onClick={mode === 'BORROW' ? handleBorrow : handleRepay}
                            disabled={sliderMax <= 0}
                        >
                            {mode === 'BORROW' ? '借款' : '還款'}
                        </Button>
                    </div>

                    {/* ==================== 當前負債顯示 ==================== */}
                    <div style={{
                        textAlign: 'center',
                        fontSize: '12px',
                        color: '#999',
                        marginTop: '8px'
                    }}>
                        當前負債: <span style={{ 
                            fontWeight: 'bold', 
                            color: debt > 0 ? '#ff3141' : '#52c41a',
                            fontSize: '14px'
                        }}>
                            ${formatAmount(debt)}
                        </span>
                    </div>
                </div>
            </div>
        </Popup>
    );
};

export default LoanSharkModal;
