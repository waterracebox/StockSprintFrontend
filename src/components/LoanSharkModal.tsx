import React, { useState, useEffect } from 'react';
import { Button, Toast, Dialog, Popup, Switch, Slider } from 'antd-mobile';
import { CloseOutline } from 'antd-mobile-icons';
import { Socket } from 'socket.io-client';

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

    // 計算剩餘額度 / 還款上限
    const remainingLimit = maxLoanAmount - dailyBorrowed;
    const repayMax = Math.max(0, Math.min(cash, debt));
    const sliderMax = mode === 'BORROW' ? Math.max(0, remainingLimit) : repayMax;
    const sliderStep = 0.01; // 固定 0.01 以便精確還款到上限
    const formatAmount = (val: number) => val.toFixed(2);

    // 黑心商人圖片與對話
    const merchantImage = merchantState === 'NORMAL' 
        ? '/images/merchant_normal.webp' 
        : '/images/merchant_happy.webp';
    const merchantMessage = merchantState === 'NORMAL' 
        ? '歡迎光臨' 
        : '歡迎您下次光臨';

    // 監聽交易成功事件
    useEffect(() => {
        if (!socket) return;

        const handleTradeSuccess = (payload: any) => {
            if (payload.action === 'BORROW' || payload.action === 'REPAY') {
                // 切換到 HAPPY 狀態
                setMerchantState('HAPPY');

                // 3 秒後恢復 NORMAL
                setTimeout(() => {
                    setMerchantState('NORMAL');
                }, 3000);
            }
        };

        socket.on('TRADE_SUCCESS', handleTradeSuccess);

        return () => {
            socket.off('TRADE_SUCCESS', handleTradeSuccess);
        };
    }, [socket]);

    // 依上限修正金額
    useEffect(() => {
        const minVal = 0;
        const clamped = Math.min(Math.max(amount, minVal), sliderMax);
        setAmount(clamped);
        setAmountInput(clamped > 0 ? formatAmount(clamped) : '');
    }, [sliderMax, amount]);

    const handleSliderChange = (value: number) => {
        const minVal = 0;
        const clamped = Math.min(Math.max(value, minVal), sliderMax);
        setAmount(clamped);
        setAmountInput(formatAmount(clamped));
    };

    const handleInputChange = (value: string) => {
        setAmountInput(value);
        if (value === '') return;
        const num = parseFloat(value);
        if (!Number.isNaN(num)) {
            handleSliderChange(num);
        }
    };

    const handleInputBlur = () => {
        const minVal = 0;
        const num = parseFloat(amountInput || '0');
        const clamped = Math.min(Math.max(!Number.isNaN(num) ? num : minVal, minVal), sliderMax);
        setAmount(clamped);
        setAmountInput(clamped > 0 ? formatAmount(clamped) : '');
    };

    // 借款處理
    const handleBorrow = async () => {
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
    };

    // 還款處理
    const handleRepay = async () => {
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
    };

    return (
        <Popup
            visible={isOpen}
            onClose={onClose}
            closeOnMaskClick={false}
            onMaskClick={undefined}
            position='bottom'
            bodyStyle={{
                minHeight: '70vh',
                maxHeight: '85vh',
                padding: '0',
                backgroundColor: '#f5f5f5',
                borderTopLeftRadius: '16px',
                borderTopRightRadius: '16px',
                overflow: 'hidden'
            }}
        >
            {/* 标题栏 */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 20px',
                backgroundColor: '#fff',
                borderBottom: '1px solid #f0f0f0',
                position: 'sticky',
                top: 0,
                zIndex: 10
            }}>
                <span style={{ fontSize: '18px', fontWeight: 'bold' }}>地下錢莊</span>
                <CloseOutline 
                    fontSize={22}
                    onClick={onClose}
                    style={{ cursor: 'pointer', color: '#999' }}
                />
            </div>

            {/* 内容区域 */}
            <div style={{ 
                padding: '24px 16px',
                overflowY: 'auto',
                maxHeight: 'calc(85vh - 60px)'
            }}>
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
                        <Switch
                            checked={mode === 'BORROW'}
                            onChange={(checked) => {
                                const nextMode: 'BORROW' | 'REPAY' = checked ? 'BORROW' : 'REPAY';
                                setMode(nextMode);
                                const nextMax = nextMode === 'BORROW' ? Math.max(0, remainingLimit) : repayMax;
                                const nextStep = 0.01;
                                const resetVal = nextMax > 0 ? Math.min(Math.max(nextStep, 0), nextMax) : 0; // 切換時預設回最小刻度
                                setAmount(resetVal);
                                setAmountInput(resetVal > 0 ? formatAmount(resetVal) : '');
                            }}
                            checkedText="借"
                            uncheckedText="還"
                            style={{ '--checked-color': mode === 'BORROW' ? '#1677ff' : '#faad14' } as React.CSSProperties}
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
                                    ticks
                                    disabled={sliderMax <= 0}
                                    value={Math.min(amount, sliderMax)}
                                    onChange={(val) => handleSliderChange(val as number)}
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
