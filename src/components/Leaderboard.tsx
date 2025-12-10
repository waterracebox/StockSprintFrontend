import React, { useRef, useEffect } from 'react';
import { List, Avatar } from 'antd-mobile';
import './Leaderboard.css';

interface LeaderboardItem {
    userId: number;
    displayName: string;
    avatar: string | null;
    totalAssets: number;
    rank: number;
}

interface LeaderboardProps {
    data: LeaderboardItem[];
    currentUserId: number;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ data, currentUserId }) => {
    // 使用 useRef 儲存上一次的排名（key: userId, value: rank）
    const previousRanksRef = useRef<Map<number, number>>(new Map());

    useEffect(() => {
        // 更新 ref 為當前排名（延遲更新，確保動畫能觸發）
        const timer = setTimeout(() => {
            const newRanks = new Map<number, number>();
            data.forEach((item) => {
                newRanks.set(item.userId, item.rank);
            });
            previousRanksRef.current = newRanks;
        }, 1000); // 1 秒後更新（配合動畫時長）

        return () => clearTimeout(timer);
    }, [data]);

    /**
     * 取得排名徽章的樣式類別
     */
    const getRankBadgeClass = (rank: number): string => {
        if (rank === 1) return 'rank-badge top-1';
        if (rank === 2) return 'rank-badge top-2';
        if (rank === 3) return 'rank-badge top-3';
        return 'rank-badge normal';
    };

    /**
     * 格式化總資產（加上千分位符號）
     */
    const formatAssets = (value: number): string => {
        return value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    };

    return (
        <div className="leaderboard-container">
            <List>
                {data.map((item) => {
                    const oldRank = previousRanksRef.current.get(item.userId);
                    const rankUp = oldRank !== undefined && item.rank < oldRank;
                    const isSelf = item.userId === currentUserId;

                    return (
                        <List.Item
                            key={item.userId}
                            prefix={
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div className={getRankBadgeClass(item.rank)}>
                                        {item.rank}
                                    </div>
                                    <Avatar
                                        src={item.avatar ? `/avatars/${item.avatar}` : ''}
                                        style={{ '--size': '36px', backgroundColor: '#1677ff' }}
                                    >
                                        {item.displayName.charAt(0)}
                                    </Avatar>
                                </div>
                            }
                            description={`總資產: $${formatAssets(item.totalAssets)}`}
                            className={`leaderboard-item ${rankUp ? 'rank-up' : ''} ${isSelf ? 'self-row' : ''}`}
                        >
                            <div style={{ 
                                fontWeight: isSelf ? 'bold' : 'normal',
                                fontSize: '14px'
                            }}>
                                {item.displayName} {isSelf && <span style={{ color: '#1677ff' }}>(你)</span>}
                            </div>
                        </List.Item>
                    );
                })}
            </List>
        </div>
    );
};

export default Leaderboard;
