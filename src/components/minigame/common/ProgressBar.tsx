import React, { useEffect, useState } from 'react';

interface Props {
    targetEndTime: number; // 目標結束時間戳（毫秒）
    totalDuration: number; // 總持續時間（毫秒）
    color?: string;        // 進度條顏色
    height?: number;       // 進度條高度（px）
}

const ProgressBar: React.FC<Props> = ({ 
    targetEndTime, 
    totalDuration, 
    color = '#1677ff', 
    height = 8 
}) => {
    // 【修正】初始值應該根據剩餘時間計算，而非固定 100
    const [width, setWidth] = useState<number>(() => {
        const remainingTime = Math.max(0, targetEndTime - Date.now());
        return Math.min(100, Math.max(0, (remainingTime / totalDuration) * 100));
    });

    useEffect(() => {
        // 計算剩餘時間
        const remainingTime = Math.max(0, targetEndTime - Date.now());
        
        // 【修正】計算起始百分比：剩餘時間 / 總時間
        // 例如：20 秒題目，剩餘 5 秒 → 5000/20000 = 25%
        const startPercentage = Math.min(100, Math.max(0, (remainingTime / totalDuration) * 100));

        // 立即設置為正確的起始百分比（而非固定 100%）
        setWidth(startPercentage);

        // 使用 requestAnimationFrame 確保 CSS transition 觸發
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                // 在下一幀將 width 設為 0，觸發平滑動畫
                setWidth(0);
            });
        });

        // 清理函數
        return () => setWidth(0);
    }, [targetEndTime, totalDuration]);

    // 計算 transition duration（使用剩餘時間）
    const remainingMs = Math.max(0, targetEndTime - Date.now());

    return (
        <div 
            style={{ 
                width: '100%', 
                height: `${height}px`, 
                background: 'rgba(255,255,255,0.2)', 
                borderRadius: height / 2,
                overflow: 'hidden',
                position: 'relative',
            }}
        >
            <div 
                style={{ 
                    width: `${width}%`, 
                    height: '100%', 
                    background: color,
                    transition: `width ${remainingMs}ms linear`,
                    borderRadius: height / 2,
                }}
            />
        </div>
    );
};

export default ProgressBar;
