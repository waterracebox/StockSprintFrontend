import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button, Toast, Dialog, Popup, Slider } from 'antd-mobile';
import { CloseOutline } from 'antd-mobile-icons';
import { Socket } from 'socket.io-client';
import DualColorSwitch from './common/DualColorSwitch';

interface LoanSharkModalProps {
    isOpen: boolean;
    onClose: () => void;
    socket: Socket | null;
    userAssets: {
        cash: number;
        debt: number;
        dailyBorrowed?: number;
    };
    gameConfig: {
        maxLoanAmount: number;
        dailyInterestRate: number;
    };
}

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
    gameConfig
}) => {
    const [amount, setAmount] = useState<number>(100);
    const [amountInput, setAmountInput] = useState<string>('100');
    const [merchantState, setMerchantState] = useState<'NORMAL' | 'HAPPY'>('NORMAL');
    const [mode, setMode] = useState<'BORROW' | 'REPAY'>('BORROW');

    const { cash, debt, dailyBorrowed = 0 } = userAssets;
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

    // 使用 useMemo 緩存圖片路徑和訊息
    const { merchantImage, merchantMessage } = useMemo(() => ({
        merchantImage: merchantState === 'NORMAL' 
            ? '/images/merchant_normal.webp' 
            : '/images/merchant_happy.webp',
        merchantMessage: merchantState === 'NORMAL' 
            ? '我是沈梟。坐吧，你想要多少？' 
            : '合作愉快，歡迎下次光臨。'
    }), [merchantState]);

    // 監聽交易成功事件
    useEffect(() => {
        if (!socket) return;

        const handleTradeSuccess = (payload: any) => {
            if (payload.action === 'BORROW' || payload.action === 'REPAY') {
                setMerchantState('HAPPY');
                setTimeout(() => setMerchantState('NORMAL'), 3000);
            }
        };

        socket.on('TRADE_SUCCESS', handleTradeSuccess);
        return () => {
            socket.off('TRADE_SUCCESS', handleTradeSuccess);
        };
    }, [socket]);

    // 【Phase 4】追蹤地下錢莊訪問次數
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
                        <div style={{ width: '200px'}}>
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
                            maxWidth: '150px'
                        }}>
                            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#333' }}>
                                {merchantMessage}
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
