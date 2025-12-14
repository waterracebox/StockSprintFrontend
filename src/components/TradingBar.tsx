import React, { useState, useEffect } from 'react';
import { Button, Toast, Dialog, Modal } from 'antd-mobile';
import { QuestionCircleOutline, CloseOutline } from 'antd-mobile-icons';
import { Socket } from 'socket.io-client';

interface TradingBarProps {
    socket: Socket | null;
    currentPrice: number;
    isTrading: boolean;
    isGameStarted: boolean;
    onTradingStart: () => void;
    maxLeverage?: number; // 新增：從後端取得的最大槓桿倍數
    cash?: number; // 新增：使用者現金
}

const TradingBar: React.FC<TradingBarProps> = ({ 
    socket, 
    currentPrice,
    isTrading,
    isGameStarted,
    onTradingStart,
    maxLeverage = 100, // 預設值 100（向後相容）
    cash = 0 // 預設值 0
}) => {
    const [tradeMode, setTradeMode] = useState<'spot' | 'contract'>('spot');
    const [quantity, setQuantity] = useState<number>(1);
    
    // 合約交易專用狀態
    const [contractDirection, setContractDirection] = useState<'LONG' | 'SHORT'>('LONG');
    const [leverage, setLeverage] = useState<number>(2);
    const [customLeverage, setCustomLeverage] = useState<string>('2');
    const [showTutorial, setShowTutorial] = useState(false);

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
        };

        // 頁面載入時檢查 Hash
        handlePopState();

        // 監聽 popstate 事件
        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, []);

    // 處理買入
    const handleBuy = () => {
        if (!socket) {
            Toast.show({ icon: 'fail', content: 'WebSocket 未連線' });
            return;
        }
        if (!isGameStarted) {
            Toast.show({ icon: 'fail', content: '遊戲尚未開始' });
            return;
        }
        onTradingStart();
        socket.emit('BUY_STOCK', { quantity });
    };

    // 處理賣出
    const handleSell = () => {
        if (!socket) {
            Toast.show({ icon: 'fail', content: 'WebSocket 未連線' });
            return;
        }
        if (!isGameStarted) {
            Toast.show({ icon: 'fail', content: '遊戲尚未開始' });
            return;
        }
        onTradingStart();
        socket.emit('SELL_STOCK', { quantity });
    };

    // ==================== 合約交易 ====================
    const handlePlaceContract = () => {
        if (!socket) {
            Toast.show({ icon: 'fail', content: 'WebSocket 未連線' });
            return;
        }
        if (!isGameStarted) {
            Toast.show({ icon: 'fail', content: '遊戲尚未開始' });
            return;
        }

        onTradingStart();
        socket.emit('BUY_CONTRACT', {
            type: contractDirection,
            leverage: parseFloat(customLeverage),
            quantity,
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

    // 計算最大張數 - 現貨
    const handleMaxSpot = () => {
        if (currentPrice > 0) {
            const maxQty = Math.floor(cash / currentPrice);
            setQuantity(Math.max(1, maxQty));
        }
    };

    // 計算最大張數 - 合約
    const handleMaxContract = () => {
        const currentLeverage = parseFloat(customLeverage || '1');
        if (currentPrice > 0 && currentLeverage > 0) {
            // 保證金 = (股價 × 張數) ÷ 槓桿
            // 所以 最大張數 = (現金 × 槓桿) ÷ 股價
            const maxQty = Math.floor((cash * currentLeverage) / currentPrice);
            setQuantity(Math.max(1, maxQty));
        }
    };

    // 計算保證金
    const estimatedMargin = (currentPrice * quantity) / parseFloat(customLeverage || '1');

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
                    <Button 
                        size="small"
                        fill={tradeMode === 'spot' ? 'solid' : 'none'}
                        color={tradeMode === 'spot' ? 'primary' : 'default'}
                        onClick={() => setTradeMode('spot')}
                    >
                        現貨
                    </Button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Button 
                            size="small"
                            fill={tradeMode === 'contract' ? 'solid' : 'none'}
                            color={tradeMode === 'contract' ? 'primary' : 'default'}
                            onClick={() => setTradeMode('contract')}
                        >
                            合約
                        </Button>
                        {tradeMode === 'contract' && (
                            <QuestionCircleOutline 
                                fontSize={16}
                                style={{ cursor: 'pointer', color: '#1677ff' }}
                                onClick={openTutorialWithHash}
                            />
                        )}
                    </div>
                </div>
                <Button 
                    size="small"
                    color="warning"
                    onClick={() => {
                        Toast.show({
                            icon: 'fail',
                            content: '小遊戲功能尚未實作',
                        });
                    }}
                >
                    🎮 小遊戲
                </Button>
            </div>

            {/* 現貨交易 UI */}
            {tradeMode === 'spot' && (
                <>
                    {/* 張數控制 */}
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '8px'
                    }}>
                        <span style={{ fontSize: '14px', color: '#666' }}>張數:</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Button 
                                size="small"
                                color="default"
                                onClick={() => setQuantity(1)}
                            >
                                最小
                            </Button>
                            <Button 
                                size="small"
                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                            >
                                -
                            </Button>
                            <input
                                type="number"
                                min="1"
                                value={quantity}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value) || 1;
                                    setQuantity(Math.max(1, val));
                                }}
                                style={{
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    width: '50px',
                                    textAlign: 'center',
                                    border: '1px solid #e5e5e5',
                                    borderRadius: '4px',
                                    padding: '4px 8px'
                                }}
                            />
                            <Button 
                                size="small"
                                onClick={() => setQuantity(quantity + 1)}
                            >
                                +
                            </Button>
                            <Button 
                                size="small"
                                color="default"
                                onClick={handleMaxSpot}
                            >
                                最大
                            </Button>
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
                            ${(currentPrice * quantity).toFixed(2)}
                        </span>
                    </div>

                    {/* 買入 / 賣出按鈕 */}
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <Button 
                            color="success" 
                            size="large"
                            style={{ flex: 1 }}
                            disabled={isTrading}
                            loading={isTrading}
                            onClick={handleBuy}
                        >
                            買入
                        </Button>
                        <Button 
                            color="danger" 
                            size="large"
                            style={{ flex: 1 }}
                            disabled={isTrading}
                            loading={isTrading}
                            onClick={handleSell}
                        >
                            賣出
                        </Button>
                    </div>
                </>
            )}

            {/* 合約交易 UI */}
            {tradeMode === 'contract' && (
                <>
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
                            />倍</div>
                        </div>
                    </div>

                    {/* 張數控制 */}
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '8px'
                    }}>
                        <span style={{ fontSize: '14px', color: '#666' }}>張數:</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Button 
                                size="small"
                                color="default"
                                onClick={() => setQuantity(1)}
                            >
                                最小
                            </Button>
                            <Button 
                                size="small"
                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                            >
                                -
                            </Button>
                            <input
                                type="number"
                                min="1"
                                value={quantity}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value) || 1;
                                    setQuantity(Math.max(1, val));
                                }}
                                style={{
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    width: '50px',
                                    textAlign: 'center',
                                    border: '1px solid #e5e5e5',
                                    borderRadius: '4px',
                                    padding: '4px 8px'
                                }}
                            />
                            <Button 
                                size="small"
                                onClick={() => setQuantity(quantity + 1)}
                            >
                                +
                            </Button>
                            <Button 
                                size="small"
                                color="default"
                                onClick={handleMaxContract}
                            >
                                最大
                            </Button>
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
                            disabled={isTrading}
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
        </div>
    );
};

export default TradingBar;
