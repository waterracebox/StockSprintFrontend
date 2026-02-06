import React from 'react';
import type { TooltipRenderProps } from 'react-joyride';
import type { FairyDialogPlacement, FairyType, TutorialStepData } from '../../config/tutorialTypes';

/**
 * 精靈圖片路徑對應
 * 圖片放在 public/images/ 下
 */
const FAIRY_IMAGES: Record<FairyType, string> = {
    center: '/images/fairy_center.webp',
    left: '/images/fairy_left.webp',
    right: '/images/fairy_right.webp',
};

/** 精靈圖片尺寸（px） */
const FAIRY_SIZE = 100;
/** 泡泡最大寬度 */
const BUBBLE_MAX_WIDTH = 260;
/** 精靈與泡泡之間的間隔（水平） */
const GAP_H = 8;
/** 精靈與泡泡之間的間隔（垂直，需要更大避免重疊） */
const GAP_V = 20;
/** 三角形指標大小 */
const TAIL_SIZE = 10;

// ==================== 輔助函數 ====================

/**
 * 根據 fairyDialogPlacement 產生尾巴（CSS 三角形）的樣式
 * 尾巴從泡泡指向精靈圖片
 */
const getTailStyle = (dialogPlacement: FairyDialogPlacement): React.CSSProperties => {
    const base: React.CSSProperties = {
        position: 'absolute',
        width: 0,
        height: 0,
    };

    switch (dialogPlacement) {
        case 'right':
            // 泡泡在精靈右側 → 尾巴在泡泡左邊，指向左
            return {
                ...base,
                left: -(TAIL_SIZE * 2),
                top: '50%',
                transform: 'translateY(-50%)',
                borderTop: `${TAIL_SIZE}px solid transparent`,
                borderBottom: `${TAIL_SIZE}px solid transparent`,
                borderRight: `${TAIL_SIZE * 2}px solid #fff`,
            };
        case 'left':
            // 泡泡在精靈左側 → 尾巴在泡泡右邊，指向右
            return {
                ...base,
                right: -(TAIL_SIZE * 2),
                top: '50%',
                transform: 'translateY(-50%)',
                borderTop: `${TAIL_SIZE}px solid transparent`,
                borderBottom: `${TAIL_SIZE}px solid transparent`,
                borderLeft: `${TAIL_SIZE * 2}px solid #fff`,
            };
        case 'bottom':
            // 泡泡在精靈下方 → 尾巴在泡泡頂部，指向上
            return {
                ...base,
                top: -(TAIL_SIZE * 2),
                left: '50%',
                transform: 'translateX(-50%)',
                borderLeft: `${TAIL_SIZE}px solid transparent`,
                borderRight: `${TAIL_SIZE}px solid transparent`,
                borderBottom: `${TAIL_SIZE * 2}px solid #fff`,
            };
        case 'top':
            // 泡泡在精靈上方 → 尾巴在泡泡底部，指向下
            return {
                ...base,
                bottom: -(TAIL_SIZE * 2),
                left: '50%',
                transform: 'translateX(-50%)',
                borderLeft: `${TAIL_SIZE}px solid transparent`,
                borderRight: `${TAIL_SIZE}px solid transparent`,
                borderTop: `${TAIL_SIZE * 2}px solid #fff`,
            };
        default:
            return base;
    }
};

/**
 * 根據 fairyDialogPlacement 產生容器的 flex 排列方向
 * 控制精靈和泡泡的相對排列
 */
const getContainerLayout = (dialogPlacement: FairyDialogPlacement): React.CSSProperties => {
    switch (dialogPlacement) {
        case 'right':
            // 精靈在左、泡泡在右
            return { flexDirection: 'row', alignItems: 'center', gap: GAP_H };
        case 'left':
            // 泡泡在左、精靈在右（row-reverse 讓精靈仍在 DOM 前面但視覺上在右）
            return { flexDirection: 'row-reverse', alignItems: 'center', gap: GAP_H };
        case 'bottom':
            // 精靈在上、泡泡在下
            return { flexDirection: 'column', alignItems: 'center', gap: GAP_V };
        case 'top':
            // 泡泡在上、精靈在下
            return { flexDirection: 'column-reverse', alignItems: 'center', gap: GAP_V };
        default:
            return { flexDirection: 'column', alignItems: 'center', gap: GAP_V };
    }
};

// ==================== 組件 ====================

interface FairyTooltipProps extends TooltipRenderProps {
    /** 跳過所有教學的回調 */
    onSkipAll: () => void;
}

/**
 * FairyTooltip - 精靈教學 Tooltip 組件
 *
 * 視覺規則（嚴格遵守）：
 * 1. Tooltip 容器本身完全透明（無背景、無邊框、無陰影）
 * 2. 精靈圖片為視覺錨點
 * 3. 對話泡泡根據 fairyDialogPlacement 相對於精靈定位
 * 4. CSS 三角形（尾巴）從泡泡指向精靈
 * 5. 行動裝置上泡泡 max-width: 80vw，防止溢出螢幕
 */
const FairyTooltip: React.FC<FairyTooltipProps> = ({
    step,
    primaryProps,
    isLastStep,
    onSkipAll,
}) => {
    const stepData = (step.data || {}) as TutorialStepData;
    const {
        fairyDialogPlacement = 'bottom',
        fairyType = 'center',
        requiresInteraction = false,
    } = stepData;

    // 自動偵測：content 包含「請點擊」即視為需要使用者互動
    const contentStr = typeof step.content === 'string' ? step.content : '';
    const needsInteraction = requiresInteraction || contentStr.includes('請點擊');

    // 非互動步驟才顯示「下一步」按鈕
    const showNextButton = !needsInteraction;

    const fairyImageSrc = FAIRY_IMAGES[fairyType];
    const containerLayout = getContainerLayout(fairyDialogPlacement);
    const tailStyle = getTailStyle(fairyDialogPlacement);

    // 判斷是否為全螢幕居中步驟（target = 'body'）
    const isCenter = step.target === 'body';

    return (
        <div
            style={{
                // 容器完全透明（嚴格視覺規則）
                background: 'transparent',
                boxShadow: 'none',
                border: 'none',
                padding: 0,
                // 排列方向由 fairyDialogPlacement 決定
                display: 'flex',
                maxWidth: '80vw',
                ...containerLayout,
                // 全螢幕居中時，使用 fixed 定位
                ...(isCenter ? {
                    position: 'fixed' as const,
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 10002,
                } : {}),
            }}
        >
            {/* 精靈圖片 */}
            <div
                style={{
                    flexShrink: 0,
                    width: FAIRY_SIZE,
                    height: FAIRY_SIZE,
                }}
            >
                <img
                    src={fairyImageSrc}
                    alt="教學精靈"
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))',
                        // 精靈輕微浮動動畫
                        animation: 'fairyFloat 3s ease-in-out infinite',
                    }}
                />
            </div>

            {/* 對話泡泡 */}
            <div
                style={{
                    position: 'relative',
                    background: '#fff',
                    borderRadius: 16,
                    padding: '16px 20px',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                    maxWidth: BUBBLE_MAX_WIDTH,
                    minWidth: 180,
                }}
            >
                {/* 尾巴（三角形指向精靈） */}
                <div style={tailStyle} />

                {/* 對話內容 */}
                <div
                    style={{
                        fontSize: 15,
                        lineHeight: 1.6,
                        color: '#333',
                        marginBottom: 12,
                        wordBreak: 'break-word',
                    }}
                >
                    {step.content}
                </div>

                {/* 底部按鈕區 */}
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: 8,
                    }}
                >
                    {/* 跳過按鈕（左側） */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onSkipAll();
                        }}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#999',
                            fontSize: 12,
                            cursor: 'pointer',
                            padding: '4px 0',
                            textDecoration: 'underline',
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                        }}
                    >
                        跳過教學
                    </button>

                    {/* 下一步按鈕（右側），僅非互動步驟顯示 */}
                    {showNextButton && (
                        <button
                            {...primaryProps}
                            style={{
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 20,
                                padding: '8px 20px',
                                fontSize: 14,
                                fontWeight: 700,
                                cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
                                transition: 'transform 0.15s ease',
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                            }}
                        >
                            {isLastStep ? '完成！' : '下一步'}
                        </button>
                    )}
                </div>
            </div>

            {/* 精靈浮動動畫 keyframes（注入全域 CSS） */}
            <style>{`
                @keyframes fairyFloat {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-6px); }
                }
            `}</style>
        </div>
    );
};

export default FairyTooltip;
