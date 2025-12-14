/**
 * NewsModal.tsx
 * 新聞歷史浮動視窗組件
 * 使用 URL Hash (#news) 控制顯示/隱藏，支援手機返回鍵
 */

import React, { useEffect, useState } from 'react';
import { Modal } from 'antd-mobile';
import { CloseOutline } from 'antd-mobile-icons';
import type { NewsItem } from '../types/game';

interface NewsModalProps {
    newsHistory: NewsItem[];
    onClose: () => void;
}

const NewsModal: React.FC<NewsModalProps> = ({ newsHistory, onClose }) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        // 監聽 Hash 變化
        const checkHash = () => {
            const isNewsOpen = window.location.hash === '#news';
            console.log('[NewsModal] Hash changed:', window.location.hash, 'isNewsOpen:', isNewsOpen);
            setVisible(isNewsOpen);
        };

        checkHash(); // 初始檢查
        window.addEventListener('hashchange', checkHash);
        window.addEventListener('popstate', checkHash);

        return () => {
            window.removeEventListener('hashchange', checkHash);
            window.removeEventListener('popstate', checkHash);
        };
    }, []);

    const handleClose = () => {
        // 呼叫父組件的 onClose 回調
        onClose();
        
        // 移除 Hash（支援手機返回鍵）
        if (window.location.hash === '#news') {
            window.history.back();
        }
    };

    return (
        <Modal
            visible={visible}
            onClose={handleClose}
            closeOnMaskClick={false}
            title={
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center'
                }}>
                    <span>📰 股票相關新聞</span>
                    <CloseOutline 
                        fontSize={20}
                        onClick={handleClose}
                        style={{ cursor: 'pointer', color: '#999' }}
                    />
                </div>
            }
            content={
                <div style={{ 
                    maxHeight: '70vh',
                    overflowY: 'auto',
                    padding: '12px'
                }}>
                    {newsHistory.length > 0 ? (
                        newsHistory.map((news, index) => (
                            <div
                                key={index}
                                style={{
                                    marginBottom: '16px',
                                    padding: '12px',
                                    backgroundColor: '#f5f5f5',
                                    borderRadius: '8px',
                                    borderLeft: '4px solid #1677ff',
                                }}
                            >
                                <div style={{
                                    fontSize: '12px',
                                    color: '#999',
                                    marginBottom: '4px',
                                }}>
                                    第 {news.day} 天
                                </div>
                                <div style={{
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    marginBottom: '8px',
                                    color: '#333',
                                }}>
                                    {news.title}
                                </div>
                                <div style={{
                                    fontSize: '14px',
                                    color: '#666',
                                    lineHeight: '1.6',
                                }}>
                                    {news.content}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div style={{
                            textAlign: 'center',
                            color: '#999',
                            padding: '40px 20px',
                        }}>
                            目前尚無新聞
                        </div>
                    )}
                </div>
            }
        />
    );
};

export default NewsModal;
