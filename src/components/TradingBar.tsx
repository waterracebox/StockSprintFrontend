import React, { useEffect, useMemo, useState } from 'react';
import { Button, Toast, Dialog, Modal, Slider } from 'antd-mobile';
import { QuestionCircleOutline, CloseOutline } from 'antd-mobile-icons';
import { Socket } from 'socket.io-client';
import LoanSharkModal from './LoanSharkModal';
import DualColorSwitch from './common/DualColorSwitch';

interface TradingBarProps {
    socket: Socket | null;
    currentPrice: number;
    isTrading: boolean;
    isGameStarted: boolean;
    onTradingStart: () => void;
    onOpenMiniGame: () => void;
    miniGameState?: { gameType: string } | null;
    maxLeverage?: number; // 新增：從後端取得的最大槓桿倍數
    cash?: number; // 新增：使用者現金
    // 【新增】地下錢莊相關 props
    debt?: number;
    dailyBorrowed?: number;
    maxLoanAmount?: number;
    dailyInterestRate?: number;
    stocks?: number; // 使用者持股數量，供賣出上限計算
    loanSharkVisitCount?: number; // 【新增】地下錢莊訪問次數
    currentDay?: number; // 【新增】當前遊戲天數
    onTradeModeChange?: (mode: 'spot' | 'contract') => void; // 【新增】交易模式切換回調（教學系統用）
}

const TradingBar: React.FC<TradingBarProps> = ({ 
    socket, 
    currentPrice,
    isTrading,
    isGameStarted,
    onTradingStart,
    onOpenMiniGame,
    miniGameState,
    maxLeverage = 100, // 預設值 100（向後相容）
    cash = 0, // 預設值 0
    debt = 0,
    dailyBorrowed = 0,
    maxLoanAmount = 1000,
    dailyInterestRate = 0.0001,
    stocks = 0,
    loanSharkVisitCount = 0, // 【新增】
    currentDay = 0, // 【新增】
    onTradeModeChange, // 【新增】交易模式切換回調
}) => {
    const [tradeMode, setTradeModeState] = useState<'spot' | 'contract'>('spot');

    // 封裝 setTradeMode，同時通知父組件（教學系統自動推進用）
    const setTradeMode = (mode: 'spot' | 'contract') => {
        setTradeModeState(mode);
        onTradeModeChange?.(mode);
    };
    const [spotMode, setSpotMode] = useState<'BUY' | 'SELL'>('BUY');
    const [spotQuantity, setSpotQuantity] = useState<number>(1);
    const [spotQuantityInput, setSpotQuantityInput] = useState<string>('1');
    const [contractQuantity, setContractQuantity] = useState<number>(1);
    const [contractQuantityInput, setContractQuantityInput] = useState<string>('1');
    
    // 合約交易專用狀態
    const [contractDirection, setContractDirection] = useState<'LONG' | 'SHORT'>('LONG');
    const [leverage, setLeverage] = useState<number>(2);
    const [customLeverage, setCustomLeverage] = useState<string>('2');
    const [showTutorial, setShowTutorial] = useState(false);

    // 【新增】地下錢莊浮動視窗狀態
    const [showLoanShark, setShowLoanShark] = useState(false);

    // ==================== Hash 錨點管理函數 ====================
    
    /**
     * 打開教學彈窗並添加 Hash 錨點
     */
    const openTutorialWithHash = () => {
        if (window.location.hash !== '#contract-tutorial') {
            window.history.pushState(null, '', `${window.location.pathname}#contract-tutorial`);
        }
        setShowTutorial(true);
    };

    /**
     * 關閉教學彈窗並移除 Hash 錨點
     */
    const closeTutorialWithHash = () => {
        setShowTutorial(false);
        if (window.location.hash === '#contract-tutorial') {
            window.history.back();
        }
    };

    /**
     * 打開地下錢莊浮動視窗並添加 Hash 錨點
     */
    const openLoanSharkWithHash = () => {
        if (window.location.hash !== '#loanshark') {
            window.history.pushState(null, '', `${window.location.pathname}#loanshark`);
        }
        setShowLoanShark(true);
    };

    /**
     * 關閉地下錢莊浮動視窗並移除 Hash 錨點
     */
    const closeLoanSharkWithHash = () => {
        setShowLoanShark(false);
        if (window.location.hash === '#loanshark') {
            window.history.back();
        }
    };

    /**
     * 監聽 popstate 事件（手機返回按鈕）
     */
    useEffect(() => {
        const handlePopState = () => {
            const hash = window.location.hash;
            
            if (hash === '#contract-tutorial') {
                setShowTutorial(true);
            } else {
                setShowTutorial(false);
            }

            if (hash === '#loanshark') {
                setShowLoanShark(true);
            } else {
                setShowLoanShark(false);
            }
        };

        // 頁面載入時檢查 Hash
        handlePopState();

        // 監聽 popstate 事件
        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, []);

    // ==================== 合約交易 ====================
    const handlePlaceContract = async () => {
        if (!socket) {
            Toast.show({ icon: 'fail', content: 'WebSocket 未連線' });
            return;
        }
        if (!isGameStarted) {
            Toast.show({ icon: 'fail', content: '遊戲尚未開始' });
            return;
        }

        const confirmed = await Dialog.confirm({
            content: `方向：${contractDirection === 'LONG' ? '做多' : '做空'}，張數 ${contractQuantity}，槓桿 ${leverage}x，保證金約 $${estimatedMargin.toFixed(2)}，確定下單嗎？`,
            closeOnMaskClick: false,
        });
        if (!confirmed) return;

        onTradingStart();
        socket.emit('BUY_CONTRACT', {
            type: contractDirection,
            leverage: parseFloat(customLeverage),
            quantity: contractQuantity,
        });
    };

    const handleCancelContract = async () => {
        if (!socket) {
            Toast.show({ icon: 'fail', content: 'WebSocket 未連線' });
            return;
        }
        if (!isGameStarted) {
            Toast.show({ icon: 'fail', content: '遊戲尚未開始' });
            return;
        }

        const confirmed = await Dialog.confirm({
            title: '確認撤銷',
            content: '確定要撤銷今日所有未結算的合約嗎？',
            closeOnMaskClick: false,
        });

        if (confirmed) {
            onTradingStart();
            socket.emit('CANCEL_CONTRACT');
        }
    };

    // 槓桿切換邏輯
    const handleLeverageChange = (value: number) => {
        setLeverage(value);
        setCustomLeverage(value.toString());
    };

    const handleCustomLeverageChange = (value: string) => {
        setCustomLeverage(value);
        const num = parseFloat(value);
        // 動態驗證：不得超過後端設定的最大槓桿
        if (!isNaN(num) && num >= 1.0 && num <= maxLeverage) {
            setLeverage(num);
        }
    };

    // 現貨最大張數（依模式切換）
    const spotMax = useMemo(() => {
        if (spotMode === 'BUY') {
            if (currentPrice <= 0) return 0;
            return Math.max(0, Math.floor(cash / currentPrice));
        }
        return Math.max(0, stocks);
    }, [spotMode, cash, currentPrice, stocks]);

    // 合約最大張數（依保證金計算）
    const contractMax = useMemo(() => {
        const parsedLev = parseFloat(customLeverage || '1');
        const safeLev = !isNaN(parsedLev) && parsedLev > 0 ? Math.min(parsedLev, maxLeverage) : 1;
        const marginPerShare = safeLev > 0 ? currentPrice / safeLev : 0;
        if (marginPerShare <= 0) return 0;
        return Math.max(0, Math.floor(cash / marginPerShare));
    }, [cash, currentPrice, customLeverage, maxLeverage]);

    // 【修復】比例 step：保持離散位置 ≤ 5000，支援任意大小的 max（含一億）
    const calcSafeStep = (max: number) =>
        max <= 0 ? 1 : Math.max(1, Math.pow(10, Math.floor(Math.log10(max)) - 3));
    const spotSliderStep = calcSafeStep(spotMax);
    const contractSliderStep = calcSafeStep(contractMax);
    // 超過 20 就不顯示 ticks，避免 DOM 節點爆炸
    const showSpotTicks = spotMax <= 20;
    const showContractTicks = contractMax <= 20;

    // Slider 變動同步輸入框
    const handleSliderChange = (
        value: number,
        setter: (v: number) => void,
        inputSetter: (v: string) => void,
        max: number
    ) => {
        const minVal = 0; // Slider 按需求 0~Max
        const clamped = Math.min(Math.max(value, minVal), max);
        setter(clamped);
        inputSetter(clamped.toString());
    };

    // 現貨模式切換（同步重算上下限與數值）
    const handleSpotModeChange = (checked: boolean) => {
        const nextMode: 'BUY' | 'SELL' = checked ? 'BUY' : 'SELL';
        setSpotMode(nextMode);
        const nextMax = nextMode === 'BUY'
            ? (currentPrice > 0 ? Math.max(0, Math.floor(cash / currentPrice)) : 0)
            : Math.max(0, stocks);
        const minVal = nextMax > 0 ? 1 : 0;
        const resetVal = Math.min(Math.max(1, minVal), nextMax); // 切換時預設回 1 張
        setSpotQuantity(resetVal);
        setSpotQuantityInput(resetVal > 0 ? resetVal.toString() : '');
    };

    // 現貨輸入欄位處理
    const handleSpotInputChange = (value: string) => {
        setSpotQuantityInput(value);
        if (value === '') return;
        const num = parseInt(value, 10);
        if (!Number.isNaN(num)) {
            handleSliderChange(num, setSpotQuantity, setSpotQuantityInput, spotMax);
        }
    };

    const handleSpotInputBlur = () => {
        const minVal = spotMax > 0 ? 1 : 0;
        const num = parseInt(spotQuantityInput || '0', 10);
        const clamped = Math.min(Math.max(num || minVal, minVal), spotMax);
        setSpotQuantity(clamped);
        setSpotQuantityInput(clamped > 0 ? clamped.toString() : '');
    };

    // 合約輸入欄位處理
    const handleContractInputChange = (value: string) => {
        setContractQuantityInput(value);
        if (value === '') return;
        const num = parseInt(value, 10);
        if (!Number.isNaN(num)) {
            handleSliderChange(num, setContractQuantity, setContractQuantityInput, contractMax);
        }
    };

    const handleContractInputBlur = () => {
        const minVal = contractMax > 0 ? 1 : 0;
        const num = parseInt(contractQuantityInput || '0', 10);
        const clamped = Math.min(Math.max(num || minVal, minVal), contractMax);
        setContractQuantity(clamped);
        setContractQuantityInput(clamped > 0 ? clamped.toString() : '');
    };

    // 依上限修正現貨/合約張數
    useEffect(() => {
        const minVal = spotMax > 0 ? 1 : 0;
        const clamped = Math.min(Math.max(spotQuantity, minVal), spotMax);
        setSpotQuantity(clamped);
        setSpotQuantityInput(clamped > 0 ? clamped.toString() : '');
    }, [spotMax]);

    useEffect(() => {
        const minVal = contractMax > 0 ? 1 : 0;
        const clamped = Math.min(Math.max(contractQuantity, minVal), contractMax);
        setContractQuantity(clamped);
        setContractQuantityInput(clamped > 0 ? clamped.toString() : '');
    }, [contractMax]);

    // 預估數值
    const spotEstimatedTotal = currentPrice * spotQuantity;
    const estimatedMargin = (currentPrice * contractQuantity) / parseFloat(customLeverage || '1');

    // 現貨下單確認
    const handleConfirmSpot = async () => {
        if (!socket) {
            Toast.show({ icon: 'fail', content: 'WebSocket 未連線' });
            return;
        }
        if (!isGameStarted) {
            Toast.show({ icon: 'fail', content: '遊戲尚未開始' });
            return;
        }
        const actionText = spotMode === 'BUY' ? '買入' : '賣出';
        const confirmed = await Dialog.confirm({
            content: `${actionText} ${spotQuantity} 張，${spotMode === 'BUY' ? '預估支出' : '預估收入'} $${spotEstimatedTotal.toFixed(2)}，確定嗎？`,
            closeOnMaskClick: false,
        });
        if (!confirmed) return;
        onTradingStart();
        if (spotMode === 'BUY') {
            socket.emit('BUY_STOCK', { quantity: spotQuantity });
        } else {
            socket.emit('SELL_STOCK', { quantity: spotQuantity });
        }
    };

    const hasMiniGame = !!miniGameState && miniGameState.gameType !== 'NONE';

    return (
        <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: '#fff',
            borderTop: '1px solid #e5e5e5',
            padding: '12px 16px',
            boxShadow: '0 -2px 8px rgba(0,0,0,0.08)',
            zIndex: 100
        }}>
            {/* 模式切換：現貨 / 合約 + 小遊戲按鈕 */}
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px'
            }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div id="tutorial-tab-spot">
                        <Button 
                            size="small"
                            fill={tradeMode === 'spot' ? 'solid' : 'none'}
                            color={tradeMode === 'spot' ? 'primary' : 'default'}
                            onClick={() => setTradeMode('spot')}
                        >
                            現貨
                        </Button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <div  id="tutorial-tab-futures">
                            <Button 
                                size="small"
                                fill={tradeMode === 'contract' ? 'solid' : 'none'}
                                color={tradeMode === 'contract' ? 'primary' : 'default'}
                                onClick={() => setTradeMode('contract')}
                            >
                                合約
                            </Button>
                        </div>
                        {tradeMode === 'contract' && (
                            <QuestionCircleOutline 
                                fontSize={16}
                                style={{ cursor: 'pointer', color: '#1677ff' }}
                                onClick={openTutorialWithHash}
                            />
                        )}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ position: 'relative' }}>
                        <Button 
                            size="small"
                            color="warning"
                            onClick={onOpenMiniGame}
                            disabled={!hasMiniGame}
                            style={!hasMiniGame ? { opacity: 0.6 } : undefined}
                        >
                            🎮 小遊戲
                        </Button>
                        {hasMiniGame && (
                            <span
                                style={{
                                    position: 'absolute',
                                    top: -2,
                                    right: -2,
                                    width: 10,
                                    height: 10,
                                    borderRadius: '50%',
                                    background: '#ff3141',
                                    boxShadow: '0 0 0 4px rgba(255,49,65,0.25)',
                                }}
                            />
                        )}
                    </div>
                    
                    {/* 【新增】地下錢莊按鈕 */}
                    <div id="tutorial-btn-loan-shark">
                        <Button
                            size="small"
                            fill="none"
                            style={{
                                padding: '4px 8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            onClick={openLoanSharkWithHash}
                        >
                            <img 
                                src="/images/loan_sharking.webp" 
                                alt="地下錢莊"
                                style={{
                                    width: '28px',
                                    height: '28px',
                                    objectFit: 'contain',
                                    filter: debt > 0 ? 'none' : 'grayscale(100%)',
                                    display: 'block'
                                }}
                            />
                        </Button>
                    </div>
                </div>
            </div>

            {/* 現貨交易 UI */}
            {tradeMode === 'spot' && (
                <>
                    {/* 買 / 賣切換 */}
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '12px'
                    }}>
                        <span style={{ fontSize: '14px', color: '#666' }}>模式:</span>
                        <div id="tutorial-trade-switch">
                            <DualColorSwitch
                                checked={spotMode === 'BUY'}
                                onChange={handleSpotModeChange}
                                checkedText="買"
                                uncheckedText="賣"
                                checkedColor="#00b578"
                                uncheckedColor="#ff3141"
                            />
                        </div>
                    </div>

                    {/* 張數控制 */}
                    <div id="tutorial-trade-action">
                        <div style={{ marginBottom: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                <span style={{ fontSize: '14px', color: '#666' }}>張數</span>
                                <span style={{ fontSize: '12px', color: '#999' }}>上限 {spotMax}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ flex: 1 }}>
                                    <Slider
                                        min={0}
                                        max={spotMax}
                                        step={spotSliderStep}
                                        ticks={showSpotTicks}
                                        disabled={spotMax <= 0}
                                        value={Math.min(spotQuantity, spotMax)}
                                        onChange={(val) => handleSliderChange(val as number, setSpotQuantity, setSpotQuantityInput, spotMax)}
                                    />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#999', marginTop: 4 }}>
                                        <span>0</span>
                                        <span>{Math.floor(spotMax / 2)}</span>
                                        <span>{spotMax}</span>
                                    </div>
                                </div>
                                <input
                                    type="number"
                                    min={0}
                                    max={spotMax}
                                    step={1}
                                    value={spotQuantityInput}
                                    onChange={(e) => handleSpotInputChange(e.target.value)}
                                    onBlur={handleSpotInputBlur}
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

                        {/* 預估金額 */}
                        <div style={{ 
                            textAlign: 'center',
                            fontSize: '12px',
                            color: '#666',
                            marginBottom: '12px'
                        }}>
                            預估金額: <span style={{ fontWeight: 'bold', color: '#1677ff' }}>
                                ${spotEstimatedTotal.toFixed(2)}
                            </span>
                        </div>

                        {/* 單一操作按鈕 */}
                        <div>
                            <Button 
                                color={spotMode === 'BUY' ? 'success' : 'danger'}
                                size="large"
                                block
                                disabled={isTrading || spotMax <= 0}
                                loading={isTrading}
                                onClick={handleConfirmSpot}
                            >
                                {spotMode === 'BUY' ? '買入' : '賣出'}
                            </Button>
                        </div>
                    </div>
                </>
            )}

            {/* 合約交易 UI */}
            {tradeMode === 'contract' && (
                <>
                    <div id="tutorial-contract-options">
                        {/* 方向選擇 */}
                        <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '8px'
                        }}>
                            <span style={{ fontSize: '14px', color: '#666' }}>方向:</span>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <Button 
                                    size="small"
                                    fill={contractDirection === 'LONG' ? 'solid' : 'none'}
                                    color={contractDirection === 'LONG' ? 'success' : 'default'}
                                    onClick={() => setContractDirection('LONG')}
                                >
                                    做多 (看漲)
                                </Button>
                                <Button 
                                    size="small"
                                    fill={contractDirection === 'SHORT' ? 'solid' : 'none'}
                                    color={contractDirection === 'SHORT' ? 'danger' : 'default'}
                                    onClick={() => setContractDirection('SHORT')}
                                >
                                    做空 (看跌)
                                </Button>
                            </div>
                        </div>

                        {/* 槓桿選擇 */}
                        <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '8px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ fontSize: '14px', color: '#666' }}>倍數:</span>
                                <QuestionCircleOutline 
                                    fontSize={14}
                                    style={{ cursor: 'pointer', color: '#999' }}
                                    onClick={() => {
                                        Dialog.alert({
                                            content: <div>
                                                <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>保證金計算公式</div>
                                                <div style={{ marginBottom: '16px' }}>保證金 = (股價 × 張數) ÷ 槓桿倍數</div>
                                                <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>最高倍數</div>
                                                <div>{maxLeverage}x</div>
                                            </div>,
                                        });
                                    }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                {[2, 5, 10 ].map(lev => (
                                    <Button 
                                        key={lev}
                                        size="small"
                                        fill={leverage === lev ? 'solid' : 'none'}
                                        color={leverage === lev ? 'primary' : 'default'}
                                        onClick={() => handleLeverageChange(lev)}
                                    >
                                        {lev}x
                                    </Button>
                                ))}
                                <div style={{paddingLeft: '20px'}}><input
                                    type="number"
                                    min="1.0"
                                    max={maxLeverage}
                                    step="0.1"
                                    value={customLeverage}
                                    onChange={(e) => handleCustomLeverageChange(e.target.value)}
                                    placeholder="自訂"
                                    style={{
                                        fontSize: '14px',
                                        width: '40px',
                                        textAlign: 'center',
                                        border: '1px solid #e5e5e5',
                                        borderRadius: '4px',
                                        padding: '4px'
                                    }}
                                /> {" "}倍 </div>
                            </div>
                        </div>
                    </div>

                    {/* 張數控制 */}
                    <div id="tutorial-contract-action">
                        <div style={{ marginBottom: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                <span style={{ fontSize: '14px', color: '#666' }}>張數</span>
                                <span style={{ fontSize: '12px', color: '#999' }}>上限 {contractMax}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ flex: 1 }}>
                                    <Slider
                                        min={0}
                                        max={contractMax}
                                        step={contractSliderStep}
                                        ticks={showContractTicks}
                                        disabled={contractMax <= 0}
                                        value={Math.min(contractQuantity, contractMax)}
                                        onChange={(val) => handleSliderChange(val as number, setContractQuantity, setContractQuantityInput, contractMax)}
                                    />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#999', marginTop: 4 }}>
                                        <span>0</span>
                                        <span>{Math.floor(contractMax / 2)}</span>
                                        <span>{contractMax}</span>
                                    </div>
                                </div>
                                <input
                                    type="number"
                                    min={0}
                                    max={contractMax}
                                    step={1}
                                    value={contractQuantityInput}
                                    onChange={(e) => handleContractInputChange(e.target.value)}
                                    onBlur={handleContractInputBlur}
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

                        {/* 預估保證金 */}
                        <div style={{ 
                            textAlign: 'center',
                            fontSize: '12px',
                            color: '#666',
                            marginBottom: '12px'
                        }}>
                            保證金: <span style={{ fontWeight: 'bold', color: '#1677ff' }}>
                                ${estimatedMargin.toFixed(2)}
                            </span>
                        </div>

                        {/* 操作按鈕 */}
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <Button 
                                color="primary"
                                size="large"
                                style={{ flex: 1 }}
                                disabled={isTrading || contractMax <= 0}
                                loading={isTrading}
                                onClick={handlePlaceContract}
                            >
                                下單 (隔日結算)
                            </Button>
                            <Button 
                                color="danger"
                                size="large"
                                style={{ flex: 1 }}
                                disabled={isTrading}
                                onClick={handleCancelContract}
                            >
                                撤銷今日訂單
                            </Button>
                        </div>
                    </div>

                    {/* 教學彈窗 */}
                    <Modal
                        visible={showTutorial}
                        onClose={closeTutorialWithHash}
                        closeOnMaskClick={false}
                        content={
                            <div style={{ 
                                position: 'relative', 
                                width: 'calc(100% + 24px)',
                                margin: '-12px'
                            }}>
                                {/* 關閉按鈕 */}
                                <CloseOutline 
                                    fontSize={24}
                                    style={{
                                        position: 'absolute',
                                        top: '20px',
                                        right: '8px',
                                        cursor: 'pointer',
                                        color: '#fff',
                                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                        borderRadius: '50%',
                                        padding: '4px',
                                        zIndex: 10
                                    }}
                                    onClick={closeTutorialWithHash}
                                />
                                {/* 圖片占滿彈窗 */}
                                <img 
                                    src="/images/contract_tutorial.webp" 
                                    alt="合約教學圖"
                                    style={{ width: '100%', display: 'block' }}
                                />
                            </div>
                        }
                        bodyStyle={{ 
                            padding: 0
                        }}
                    />
                </>
            )}

            {/* ==================== 【新增】地下錢莊浮動視窗 ==================== */}
            <LoanSharkModal 
                isOpen={showLoanShark}
                onClose={closeLoanSharkWithHash}
                socket={socket}
                userAssets={{ 
                    cash, 
                    debt, 
                    dailyBorrowed,
                    loanSharkVisitCount // 【新增】
                }}
                gameConfig={{ maxLoanAmount, dailyInterestRate }}
                currentDay={currentDay} // 【新增】
            />
        </div>
    );
};

export default TradingBar;
