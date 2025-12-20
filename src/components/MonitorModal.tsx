import React, { useEffect, useState } from 'react';
import { Popup } from 'antd-mobile';
import apiClient from '../services/apiClient';

interface MonitorModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface HistoryPoint {
    timestamp: number;
    count: number;
}

const MonitorModal: React.FC<MonitorModalProps> = ({ isOpen, onClose }) => {
    const [history, setHistory] = useState<HistoryPoint[]>([]);
    const [loading, setLoading] = useState<boolean>(false);

    // 載入歷史資料
    const fetchHistory = async () => {
        setLoading(true);
        try {
            const response = await apiClient.get('/admin/monitor/history');
            setHistory(response.data.history || []);
        } catch (error) {
            console.error('[Monitor] 載入歷史資料失敗:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchHistory();
        }
    }, [isOpen]);

    const maxCount = Math.max(...history.map(h => h.count), 10);

    return (
        <Popup
            visible={isOpen}
            onMaskClick={onClose}
            bodyStyle={{
                borderTopLeftRadius: '16px',
                borderTopRightRadius: '16px',
                minHeight: '50vh',
                maxHeight: '80vh',
                overflow: 'auto',
                padding: '20px',
            }}
        >
            <div style={{ marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
                    在線人數歷史
                </h3>
                <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#999' }}>
                    最近 1 小時的在線人數變化
                </p>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '50px', color: '#999' }}>
                    載入中...
                </div>
            ) : history.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '50px', color: '#999' }}>
                    暫無資料
                </div>
            ) : (
                <div style={{ position: 'relative', height: '350px', marginTop: '20px' }}>
                    {/* 簡易折線圖 */}
                    <svg width="100%" height="100%" style={{ border: '1px solid #e5e5e5', borderRadius: '8px', background: '#fafafa' }}>
                        {/* Y 軸刻度 */}
                        {[0, 25, 50, 75, 100].map((percent) => {
                            const y = 280 - (percent / 100) * 260;
                            const value = Math.round((maxCount * percent) / 100);
                            return (
                                <g key={percent}>
                                    <line
                                        x1="40"
                                        y1={y}
                                        x2="95%"
                                        y2={y}
                                        stroke="#e5e5e5"
                                        strokeWidth="1"
                                    />
                                    <text
                                        x="35"
                                        y={y + 4}
                                        textAnchor="end"
                                        fontSize="10"
                                        fill="#999"
                                    >
                                        {value}
                                    </text>
                                </g>
                            );
                        })}

                        {/* 【新增】X 軸時間刻度 */}
                        {[0, 25, 50, 75, 100].map((percent) => {
                            const index = Math.floor((history.length - 1) * percent / 100);
                            const point = history[index];
                            if (!point) return null;
                            
                            const x = 40 + (index / (history.length - 1 || 1)) * (window.innerWidth * 0.9 - 60);
                            const time = new Date(point.timestamp);
                            const timeStr = time.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false });
                            
                            return (
                                <g key={`time-${percent}`}>
                                    <line
                                        x1={x}
                                        y1="280"
                                        x2={x}
                                        y2="285"
                                        stroke="#999"
                                        strokeWidth="1"
                                    />
                                    <text
                                        x={x}
                                        y="300"
                                        textAnchor="middle"
                                        fontSize="9"
                                        fill="#666"
                                    >
                                        {timeStr}
                                    </text>
                                </g>
                            );
                        })}

                        {/* 折線 */}
                        <polyline
                            points={history
                                .map((point, index) => {
                                    const x = 40 + (index / (history.length - 1 || 1)) * (window.innerWidth * 0.9 - 60);
                                    const y = 280 - (point.count / maxCount) * 260;
                                    return `${x},${y}`;
                                })
                                .join(' ')}
                            fill="none"
                            stroke="#1677ff"
                            strokeWidth="2"
                        />

                        {/* 資料點 */}
                        {history.map((point, index) => {
                            const x = 40 + (index / (history.length - 1 || 1)) * (window.innerWidth * 0.9 - 60);
                            const y = 280 - (point.count / maxCount) * 260;
                            return (
                                <circle
                                    key={index}
                                    cx={x}
                                    cy={y}
                                    r="3"
                                    fill="#1677ff"
                                />
                            );
                        })}
                    </svg>

                    {/* 統計資訊 */}
                    <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-around', fontSize: '13px' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ color: '#999' }}>當前</div>
                            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1677ff' }}>
                                {history[history.length - 1]?.count || 0}
                            </div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ color: '#999' }}>最高</div>
                            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#52c41a' }}>
                                {maxCount}
                            </div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ color: '#999' }}>平均</div>
                            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#faad14' }}>
                                {Math.round(history.reduce((sum, h) => sum + h.count, 0) / history.length)}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Popup>
    );
};

export default MonitorModal;
