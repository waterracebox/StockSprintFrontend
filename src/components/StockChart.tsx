import React, { useMemo, useEffect, useRef } from 'react';
// F2 3.x 完美支援 Default Import，不會有 export 報錯
import F2 from '@antv/f2';
import type { StockData } from '../types/game';

interface StockChartProps {
    data: StockData[];
    showAll?: boolean; // 是否顯示全部數據（預設 false，只顯示 28 天）
}

const StockChart: React.FC<StockChartProps> = ({ data, showAll = false }) => {
    // 產生唯一 ID
    const chartId = useMemo(() => `stock-chart-${Math.random().toString(36).substr(2, 9)}`, []);
    const chartInstance = useRef<F2.Chart | null>(null);

    // 滑動視窗：根據 showAll 決定顯示範圍
    const displayData = useMemo(() => {
        return showAll ? data : data.slice(-28);
    }, [data, showAll]);

    useEffect(() => {
        // 確保 DOM 元素存在
        const canvasEl = document.getElementById(chartId) as HTMLCanvasElement;
        // 如果沒有資料或找不到 canvas，就不要繪圖
        if (!canvasEl || displayData.length === 0) return;

        // 1. 清理舊圖表 (防止重複渲染)
        if (chartInstance.current) {
            chartInstance.current.clear(); // 3.x 建議先 clear
            chartInstance.current.destroy();
            chartInstance.current = null;
        }

        try {
            // 2. 取得容器實際尺寸
            const containerWidth = canvasEl.parentElement?.offsetWidth || canvasEl.offsetWidth || 300;
            const containerHeight = canvasEl.parentElement?.offsetHeight || canvasEl.offsetHeight || 120;

            // 3. 初始化 Chart (F2 3.x 標準寫法)
            const chart = new F2.Chart({
                id: chartId,
                pixelRatio: window.devicePixelRatio,
                width: containerWidth,
                height: containerHeight,
                padding: showAll ? [15, 40, 30, 40] : [5, 2, 10, 2] // showAll 時增加 padding 顯示座標軸 [上, 右, 下, 左]
            });

            chart.source(displayData);

            // 設定 Y 軸範圍（避免單點時圖表被壓扁）
            if (displayData.length > 0) {
                const prices = displayData.map(d => d.price);
                const minPrice = Math.min(...prices);
                const maxPrice = Math.max(...prices);
                
                // 如果只有一個點或價格範圍太小，手動設定合理的 Y 軸範圍
                if (minPrice === maxPrice || maxPrice - minPrice < 5) {
                    const centerPrice = minPrice;
                    const range = Math.max(centerPrice * 0.2, 10); // 至少 20% 或 10 元的範圍
                    chart.scale('price', {
                        min: centerPrice - range / 2,
                        max: centerPrice + range / 2,
                        nice: false
                    });
                } else {
                    // 正常情況，給一點上下空間
                    const padding = (maxPrice - minPrice) * 0.1;
                    chart.scale('price', {
                        min: minPrice - padding,
                        max: maxPrice + padding,
                        nice: false
                    });
                }
            }

            // 3. 設定座標軸
            if (showAll) {
                // 完整模式：顯示座標軸
                chart.axis('day', {
                    label: function label(text: any, index: number, total: number) {
                        // X 軸：顯示 5 個刻度（天數）
                        const step = Math.ceil(total / 5);
                        if (index % step === 0 || index === total - 1) {
                            return {
                                text: `第${text}天`,
                                fontSize: 10
                            };
                        }
                        return null;
                    },
                    line: {
                        lineWidth: 1,
                        stroke: '#e5e5e5'
                    },
                    grid: null
                });
                
                chart.axis('price', {
                    label: function label(text: any) {
                        return {
                            text: '$' + parseFloat(String(text)).toFixed(2),
                            fontSize: 10
                        };
                    },
                    line: {
                        lineWidth: 1,
                        stroke: '#e5e5e5'
                    },
                    grid: {
                        lineWidth: 1,
                        stroke: '#f0f0f0',
                        lineDash: [2, 2]
                    }
                });
            } else {
                // 簡潔模式：隱藏座標軸
                chart.axis('day', false);
                chart.axis('price', {
                    grid: null,
                    label: null
                });
            }

            // 4. 完全禁用 Tooltip（包括黑色浮動視窗）
            chart.tooltip({
                showCrosshairs: false,
                showItemMarker: false
            });

            // 5. 繪製圖形
            // 面積圖
            chart.area()
                .position('day*price')
                .color('l(90) 0:#1677ff 1:#ffffff')
                .style({ fillOpacity: 0.3 });

            // 折線圖
            chart.line()
                .position('day*price')
                .color('#1677ff')
                .size(2);

            chart.render();
            chartInstance.current = chart;

        } catch (err) {
            console.error("F2 Chart Error:", err);
        }

        // Cleanup function
        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
                chartInstance.current = null;
            }
        };
    }, [displayData, chartId]);

    if (displayData.length === 0) {
        return (
            <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#999', fontSize: '12px' }}>
                等待遊戲開始...
            </div>
        );
    }

    return (
        <canvas 
            id={chartId}
            style={{ width: '100%', height: '100%', display: 'block' }} 
        />
    );
};

export default StockChart;