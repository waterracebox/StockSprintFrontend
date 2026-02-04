import React from 'react';

interface QRCodeModalProps {
    /** 當前遊戲天數 */
    currentDay: number;
    /** 是否有小遊戲正在進行 */
    hasMiniGame: boolean;
}

/**
 * QR Code 彈窗組件
 * 
 * 顯示邏輯：
 * - 當 currentDay === 0 時顯示
 * - 當有小遊戲進行中時自動隱藏
 * - 遊戲開始（currentDay > 0）後自動關閉
 */
const QRCodeModal: React.FC<QRCodeModalProps> = ({ currentDay, hasMiniGame }) => {
    // 只在第 0 天且無小遊戲時顯示
    const shouldShow = currentDay === 0 && !hasMiniGame;

    if (!shouldShow) {
        return null;
    }

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 10000, // 最高優先級，在新聞速報和小遊戲之上
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                backdropFilter: 'blur(8px)',
            }}
        >
            <div
                style={{
                    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                    border: '2px solid rgba(139, 92, 246, 0.3)',
                    borderRadius: 24,
                    padding: 48,
                    boxShadow: '0 25px 60px rgba(139, 92, 246, 0.4)',
                    maxWidth: '90vw',
                    maxHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 24,
                }}
            >
                {/* 標題 */}
                <h1
                    style={{
                        fontSize: 'clamp(28px, 5vw, 48px)',
                        fontWeight: 900,
                        color: '#fff',
                        textAlign: 'center',
                        margin: 0,
                        textShadow: '0 4px 12px rgba(139, 92, 246, 0.5)',
                    }}
                >
                    🎮 歡迎參加斯凱達交易所！
                </h1>

                {/* QR Code 圖片容器 */}
                <div
                    style={{
                        background: '#fff',
                        borderRadius: 16,
                        padding: 16,
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
                    }}
                >
                    <img
                        src="/siteQRCode.svg"
                        alt="網站 QR Code"
                        style={{
                            width: 'clamp(200px, 40vw, 400px)',
                            height: 'auto',
                            display: 'block',
                        }}
                        onError={(e) => {
                            console.error('[QRCodeModal] QR Code 載入失敗，請確認 /public/siteQRCode.svg 檔案存在');
                            e.currentTarget.style.display = 'none';
                        }}
                    />
                </div>

                {/* 說明文字 */}
                <p
                    style={{
                        fontSize: 'clamp(14px, 2.5vw, 18px)',
                        color: '#cbd5e1',
                        textAlign: 'center',
                        maxWidth: 600,
                        lineHeight: 1.6,
                        margin: 0,
                    }}
                >
                    掃描上方 QR Code 或輸入網址進入遊戲
                    <br />
                    <span style={{ fontSize: '0.9em', opacity: 0.8 }}>
                        遊戲開始後，此彈窗將自動關閉
                    </span>
                </p>
            </div>
        </div>
    );
};

export default QRCodeModal;
