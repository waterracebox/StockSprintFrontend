import React, { useState } from 'react';
import { Button, Toast } from 'antd-mobile';
import { Socket } from 'socket.io-client';

interface TradingBarProps {
    socket: Socket | null;
    currentPrice: number;
    isTrading: boolean;
    isGameStarted: boolean;
    onTradingStart: () => void;
}

const TradingBar: React.FC<TradingBarProps> = ({ 
    socket, 
    currentPrice,
    isTrading,
    isGameStarted,
    onTradingStart
}) => {
    const [tradeMode, setTradeMode] = useState<'spot' | 'contract'>('spot');
    const [quantity, setQuantity] = useState<number>(1);
    const [contractDirection, setContractDirection] = useState<'long' | 'short'>('long');
    const [leverage, setLeverage] = useState<number>(2);

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
                <div style={{ display: 'flex', gap: '8px' }}>
                    <Button 
                        size="small"
                        fill={tradeMode === 'spot' ? 'solid' : 'none'}
                        color={tradeMode === 'spot' ? 'primary' : 'default'}
                        onClick={() => setTradeMode('spot')}
                    >
                        現貨
                    </Button>
                    <Button 
                        size="small"
                        fill={tradeMode === 'contract' ? 'solid' : 'none'}
                        color={tradeMode === 'contract' ? 'primary' : 'default'}
                        onClick={() => setTradeMode('contract')}
                    >
                        合約
                    </Button>
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
                                fill={contractDirection === 'long' ? 'solid' : 'none'}
                                color={contractDirection === 'long' ? 'success' : 'default'}
                                onClick={() => setContractDirection('long')}
                            >
                                做多
                            </Button>
                            <Button 
                                size="small"
                                fill={contractDirection === 'short' ? 'solid' : 'none'}
                                color={contractDirection === 'short' ? 'danger' : 'default'}
                                onClick={() => setContractDirection('short')}
                            >
                                做空
                            </Button>
                        </div>
                    </div>

                    {/* 倍數選擇 */}
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '8px'
                    }}>
                        <span style={{ fontSize: '14px', color: '#666' }}>倍數:</span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {[2, 5, 10].map(lev => (
                                <Button 
                                    key={lev}
                                    size="small"
                                    fill={leverage === lev ? 'solid' : 'none'}
                                    color={leverage === lev ? 'primary' : 'default'}
                                    onClick={() => setLeverage(lev)}
                                >
                                    {lev}x
                                </Button>
                            ))}
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
                            ${((currentPrice / leverage) * quantity).toFixed(2)}
                        </span>
                    </div>

                    {/* 下單按鈕 */}
                    <Button 
                        color="primary"
                        size="large"
                        block
                        onClick={() => {
                            Toast.show({
                                icon: 'fail',
                                content: '合約交易功能尚未實作',
                            });
                        }}
                    >
                        下單 (隔日結算)
                    </Button>
                </>
            )}
        </div>
    );
};

export default TradingBar;
