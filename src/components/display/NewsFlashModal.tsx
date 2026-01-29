import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface NewsFlashModalProps {
    title: string;
    content: string;
    isVisible: boolean;
    onClose: () => void;
    duration?: number; // 自動關閉時間（毫秒），預設 10 秒
}

/**
 * 新聞速報彈窗
 * - 顯示重大新聞標題與內容
 * - 支援自動關閉（10 秒）與手動關閉（點擊任意處）
 * - 使用 Framer Motion 實現滑入/淡出動畫
 */
const NewsFlashModal: React.FC<NewsFlashModalProps> = ({ 
    title, 
    content, 
    isVisible, 
    onClose, 
    duration = 10000 
}) => {
    // 使用 useRef 保存計時器，避免因為重新渲染而被清理
    const timerRef = useRef<number | null>(null);
    const onCloseRef = useRef(onClose);

    // 每次渲染時更新 onCloseRef
    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    // 自動關閉計時器
    useEffect(() => {
        // 清理舊計時器
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }

        if (!isVisible) return;

        console.log('[NewsFlashModal] 啟動自動關閉計時器:', duration / 1000, '秒');
        timerRef.current = setTimeout(() => {
            console.log('[NewsFlashModal] 計時器到期，調用 onClose');
            onCloseRef.current();
        }, duration);

        // 清理計時器
        return () => {
            if (timerRef.current) {
                console.log('[NewsFlashModal] 清理計時器');
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [isVisible, duration]);

    const handleOverlayClick = () => {
        console.log('[NewsFlashModal] 點擊遮罩，調用 onClose');
        onClose();
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: -100 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -100 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                    onClick={handleOverlayClick}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.85)',
                        zIndex: 10000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px',
                        cursor: 'pointer',
                    }}
                >
                    {/* 新聞卡片 */}
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{ delay: 0.1, duration: 0.3 }}
                        onClick={(e) => e.stopPropagation()} // 防止點擊內容時觸發關閉
                        style={{
                            maxWidth: '800px',
                            width: '100%',
                            background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
                            borderRadius: '16px',
                            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
                            overflow: 'hidden',
                            border: '2px solid rgba(59, 130, 246, 0.5)',
                            cursor: 'default',
                        }}
                    >
                        {/* Header: 新聞速報 */}
                        <div
                            style={{
                                background: 'linear-gradient(90deg, #d97706 0%, #f59e0b 100%)',
                                padding: '20px 24px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px',
                                animation: 'pulse 2s infinite',
                            }}
                        >
                            <span style={{ fontSize: '32px' }}>📰</span>
                            <div style={{ flex: 1 }}>
                                <div style={{ 
                                    fontSize: '28px', 
                                    fontWeight: 'bold', 
                                    color: '#fff',
                                    letterSpacing: '3px',
                                }}>
                                    新聞速報
                                </div>
                            </div>
                        </div>

                        {/* Content: 新聞標題與內容 */}
                        <div style={{ padding: '32px 24px' }}>
                            {/* 標題 */}
                            <h2 style={{ 
                                fontSize: '32px', 
                                fontWeight: 'bold', 
                                color: '#fff',
                                marginBottom: '16px',
                                lineHeight: '1.3',
                            }}>
                                {title}
                            </h2>

                            {/* 內容 */}
                            <p style={{ 
                                fontSize: '20px', 
                                color: 'rgba(255, 255, 255, 0.85)',
                                lineHeight: '1.6',
                                marginBottom: 0,
                            }}>
                                {content}
                            </p>
                        </div>

                        {/* Footer: 提示文字 */}
                        <div
                            style={{
                                padding: '12px 24px',
                                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                                fontSize: '14px',
                                color: 'rgba(255, 255, 255, 0.6)',
                                textAlign: 'center',
                            }}
                        >
                            點擊遮罩關閉 | {duration / 1000}秒後自動關閉
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// CSS 動畫（加入到全域樣式或組件內）
const pulseKeyframes = `
@keyframes pulse {
    0%, 100% {
        opacity: 1;
    }
    50% {
        opacity: 0.8;
    }
}
`;

// 將動畫注入到 document
if (typeof document !== 'undefined') {
    const existingStyle = document.getElementById('news-flash-pulse-animation');
    if (!existingStyle) {
        const style = document.createElement('style');
        style.id = 'news-flash-pulse-animation';
        style.innerHTML = pulseKeyframes;
        document.head.appendChild(style);
    }
}

export default NewsFlashModal;
