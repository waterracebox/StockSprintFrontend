// HelloWorld.tsx
// 顯示後端健康狀態，並驗證 UI 套件安裝

import React, { useEffect, useState } from "react";
import { Button } from "antd-mobile";

const HelloWorld: React.FC = () => {
    const [health, setHealth] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // 從後端取得健康狀態（自動適配本地開發與生產環境）
        const fetchHealth = async () => {
            try {
                // 本地開發使用代理 /api，生產環境使用完整 URL
                const apiUrl = import.meta.env.PROD 
                    ? "https://stock-sprint-backend.onrender.com/health"
                    : "/api/health";
                
                console.log("開始取得健康狀態，目標 URL:", apiUrl);
                const response = await fetch(apiUrl);
                console.log("回應狀態:", response.status);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                console.log("健康狀態數據:", data);
                setHealth(data);
            } catch (err: any) {
                console.error("取得健康狀態失敗:", err.message);
                setError(err.message);
            }
        };
        
        fetchHealth();
    }, []);

    return (
        <div style={{ padding: "20px" }}>
            <h2>後端健康狀態</h2>
            {error && (
                <div style={{ color: "red", marginBottom: "10px" }}>
                    <strong>錯誤:</strong> {error}
                </div>
            )}
            {health ? (
                <pre style={{ backgroundColor: "#f5f5f5", padding: "10px" }}>
                    {JSON.stringify(health, null, 2)}
                </pre>
            ) : (
                <p>載入中...</p>
            )}
            <Button color="primary">測試按鈕（Antd Mobile）</Button>
        </div>
    );
};

export default HelloWorld;