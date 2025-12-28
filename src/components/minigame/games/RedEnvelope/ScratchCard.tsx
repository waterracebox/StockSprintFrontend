import React from 'react';

interface Props {
    prizeName: string;
    prizeValue?: number;
    type?: 'PHYSICAL' | 'CASH';
}

const ScratchCard: React.FC<Props> = ({ prizeName, prizeValue, type }) => {
    const isCash = type === 'CASH';

    return (
        <div
            style={{
                width: 300,
                maxWidth: '90vw',
                height: 400,
                maxHeight: '80vh',
                borderRadius: 16,
                background: 'linear-gradient(135deg, #b71c1c 0%, #ffb300 100%)',
                boxShadow: '0 16px 40px rgba(0,0,0,0.35)',
                color: '#fff',
                padding: 24,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
            }}
        >
            <div style={{ fontSize: 18, opacity: 0.9, marginBottom: 8 }}>恭喜獲得</div>
            <div style={{ fontSize: 26, fontWeight: 900, marginBottom: 12 }}>{prizeName || '神秘獎品'}</div>
            {isCash ? (
                <div style={{ fontSize: 18, fontWeight: 700, opacity: 0.95 }}>
                    遊戲獎金：${Number(prizeValue ?? 0).toLocaleString()}
                </div>
            ) : (
                <div style={{ fontSize: 16, opacity: 0.85 }}>請洽工作人員領取實體獎品</div>
            )}
        </div>
    );
};

export default ScratchCard;
