import React from 'react';

export type RedPacketStatus = 'NORMAL' | 'TAKEN' | 'ACTIVE';

interface Props {
    status: RedPacketStatus;
    index: number;
    ownerName?: string;
    onClick?: () => void;
}

const RedPacket: React.FC<Props> = ({ status, ownerName, onClick }) => {
    const src =
        status === 'TAKEN'
            ? '/images/red-packet-taken.webp'
            : status === 'ACTIVE'
            ? '/images/red-packet-active.webp'
            : '/images/red-packet.webp';

    const interactive = status === 'NORMAL' && !!onClick;

    return (
        <div
            onClick={interactive ? onClick : undefined}
            style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '1 / 1.3',
                cursor: interactive ? 'pointer' : 'default',
                filter: status === 'TAKEN' ? 'grayscale(0.85)' : undefined,
                transform: status === 'ACTIVE' ? 'scale(1.08)' : undefined,
                boxShadow: status === 'ACTIVE' ? '0 0 14px rgba(255, 215, 0, 0.6)' : undefined,
                transition: 'transform 0.3s ease, filter 0.3s ease, box-shadow 0.3s ease',
                pointerEvents: interactive ? 'auto' : 'none',
            }}
        >
            <img src={src} alt='red-packet' className='packet-img' />
            {ownerName && (
                <div
                    style={{
                        position: 'absolute',
                        top: 6,
                        left: 6,
                        right: 6,
                        padding: '2px 6px',
                        borderRadius: 999,
                        background: 'rgba(0,0,0,0.55)',
                        color: '#fff',
                        fontSize: 10,
                        textAlign: 'center',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    }}
                >
                    {ownerName}
                </div>
            )}
        </div>
    );
};

export default RedPacket;
