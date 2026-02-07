import React from 'react';
import type { TutorialStep } from './tutorialTypes';

/**
 * 新手教學步驟定義
 *
 * 規則：
 * - content 包含「請點擊」→ 不顯示「下一步」按鈕，等待使用者互動後自動推進
 * - fairyPlacement: 精靈（Tooltip 整體）相對於目標元素的方位
 * - fairyDialogPlacement: 對話泡泡相對於精靈圖片的方位
 * - fairyType: 精靈圖片（center / left / right）
 */
export const TUTORIAL_STEPS: TutorialStep[] = [
    // ========== Step 0: 歡迎（全螢幕居中） ==========
    {
        target: 'body',
        content: '歡迎來到斯凱達交易所！我是小精靈，讓我來幫你快速了解遊戲玩法吧！🎉',
        placement: 'center',
        data: {
            fairyPlacement: 'center',
            fairyDialogPlacement: 'bottom',
            fairyType: 'center',
        },
        disableBeacon: true,
        disableOverlayClose: true,
        hideCloseButton: true,
    },

    // ========== Step 1: 遊戲狀態列 ==========
    {
        target: '#tutorial-game-header',
        content: '這裡顯示當前的遊戲天數和剩餘時間。記得把握每一天的交易機會喔！⏰',
        placement: 'bottom',
        data: {
            fairyPlacement: 'bottom',
            fairyDialogPlacement: 'right',
            fairyType: 'left',
        },
        disableBeacon: true,
        disableOverlayClose: true,
        hideCloseButton: true,
    },

    // ========== Step 2: 資產卡片 ==========
    {
        target: '#tutorial-asset-card',
        content: '這裡是你的資產總覽：現金、持股、負債和總資產。目標是讓總資產不斷成長！💰',
        placement: 'bottom',
        data: {
            fairyPlacement: 'bottom',
            fairyDialogPlacement: 'bottom',
            fairyType: 'center',
        },
        disableBeacon: true,
        disableOverlayClose: true,
        hideCloseButton: true,
    },

    // ========== Step 3: 市場資訊區 ==========
    {
        target: '#tutorial-info-section',
        content: '留意市場趨勢和新聞速報，它們會影響股價走勢，是你的投資決策關鍵！📰',
        placement: 'top',
        data: {
            fairyPlacement: 'top',
            fairyDialogPlacement: 'top',
            fairyType: 'center',
        },
        disableBeacon: true,
        disableOverlayClose: true,
        hideCloseButton: true,
    },

    // ========== Step 4: 現貨交易頁籤 ==========
    {
        target: '#tutorial-tab-spot',
        content: '底部是交易面板。這是「現貨交易」頁籤，讓你直接買賣股票。',
        placement: 'top',
        data: {
            fairyPlacement: 'top',
            fairyDialogPlacement: 'right',
            fairyType: 'left',
        },
        disableBeacon: true,
        disableOverlayClose: true,
        hideCloseButton: true,
    },

    // ========== Step 5: 買賣切換 ==========
    {
        target: '#tutorial-trade-switch',
        content: '使用這個開關可以切換「買入」或「賣出」模式。',
        placement: 'top',
        data: {
            fairyPlacement: 'top',
            fairyDialogPlacement: 'left',
            fairyType: 'right',
        },
        disableBeacon: true,
        disableOverlayClose: true,
        hideCloseButton: true,
    },

    // ========== Step 6: 交易操作 ==========
    {
        target: '#tutorial-trade-action',
        content: '調整張數後，點擊按鈕即可完成交易。簡單吧？',
        placement: 'top',
        data: {
            fairyPlacement: 'top',
            fairyDialogPlacement: 'top',
            fairyType: 'center',
        },
        disableBeacon: true,
        disableOverlayClose: true,
        hideCloseButton: true,
    },

    // ========== Step 7: 合約交易頁籤（需要互動） ==========
    {
        target: '#tutorial-tab-futures',
        content: '請點擊「合約」頁籤，我帶你了解進階玩法！📈',
        placement: 'top',
        data: {
            fairyPlacement: 'top',
            fairyDialogPlacement: 'right',
            fairyType: 'left',
            requiresInteraction: true,
            advanceOn: 'tab-futures-clicked',
        },
        disableBeacon: true,
        disableOverlayClose: true,
        hideCloseButton: true,
        spotlightClicks: true,
    },

    // ========== Step 8: 合約選項 ==========
    {
        target: '#tutorial-contract-options',
        content: (
            <div>
                <div style={{ marginBottom: 8 }}>
                    合約交易可以「做多」或「做空」，還能設定槓桿放大報酬或風險！
                </div>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>
                    假設資產從 <b>100 元</b>漲到 <b>110 元</b>（漲 <b>10%</b>）：
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, lineHeight: 1.4 }}>
                        <thead>
                            <tr style={{ background: '#f5f5f5' }}>
                                <th style={{ padding: '4px 6px', border: '1px solid #e0e0e0', textAlign: 'left', whiteSpace: 'nowrap' }}>比較</th>
                                <th style={{ padding: '4px 6px', border: '1px solid #e0e0e0', textAlign: 'center', whiteSpace: 'nowrap' }}>無槓桿(1x)</th>
                                <th style={{ padding: '4px 6px', border: '1px solid #e0e0e0', textAlign: 'center', whiteSpace: 'nowrap' }}>5倍槓桿(5x)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style={{ padding: '4px 6px', border: '1px solid #e0e0e0', whiteSpace: 'nowrap' }}>出的錢</td>
                                <td style={{ padding: '4px 6px', border: '1px solid #e0e0e0', textAlign: 'center' }}>100元 (全額)</td>
                                <td style={{ padding: '4px 6px', border: '1px solid #e0e0e0', textAlign: 'center' }}>20元 (保證金)</td>
                            </tr>
                            <tr>
                                <td style={{ padding: '4px 6px', border: '1px solid #e0e0e0', whiteSpace: 'nowrap' }}>漒10元後</td>
                                <td style={{ padding: '4px 6px', border: '1px solid #e0e0e0', textAlign: 'center' }}>賺10元</td>
                                <td style={{ padding: '4px 6px', border: '1px solid #e0e0e0', textAlign: 'center' }}>賺10元</td>
                            </tr>
                            <tr>
                                <td style={{ padding: '4px 6px', border: '1px solid #e0e0e0', whiteSpace: 'nowrap' }}>獲利率</td>
                                <td style={{ padding: '4px 6px', border: '1px solid #e0e0e0', textAlign: 'center' }}>10÷100=<b>10%</b></td>
                                <td style={{ padding: '4px 6px', border: '1px solid #e0e0e0', textAlign: 'center' }}>10÷20=<b>50%</b></td>
                            </tr>
                            <tr style={{ background: '#fffbe6' }}>
                                <td style={{ padding: '4px 6px', border: '1px solid #e0e0e0', whiteSpace: 'nowrap' }}>結果</td>
                                <td style={{ padding: '4px 6px', border: '1px solid #e0e0e0', textAlign: 'center' }}>與市場同步</td>
                                <td style={{ padding: '4px 6px', border: '1px solid #e0e0e0', textAlign: 'center', fontWeight: 'bold', color: '#d4380d' }}>獲利×5倍</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div style={{ fontSize: 11, color: '#d4380d', marginTop: 6, fontWeight: 'bold' }}>
                    ⚠️ 注意：雖然賺錢是 5 倍，但虧損也是 5 倍！
                </div>
            </div>
        ),
        placement: 'bottom',
        data: {
            fairyPlacement: 'bottom',
            fairyDialogPlacement: 'top',
            fairyType: 'center',
            wideContent: true,
        },
        disableBeacon: true,
        disableOverlayClose: true,
        hideCloseButton: true,
    },

    // ========== Step 9: 合約操作 ==========
    {
        target: '#tutorial-contract-action',
        content: '合約會在隔日自動結算，記得評估好風險再下單喔！⚠️',
        placement: 'top',
        data: {
            fairyPlacement: 'top',
            fairyDialogPlacement: 'top',
            fairyType: 'center',
        },
        disableBeacon: true,
        disableOverlayClose: true,
        hideCloseButton: true,
    },

    // ========== Step 10: 地下錢莊 ==========
    {
        target: '#tutorial-btn-loan-shark',
        content: '缺錢的時候可以找地下錢莊借款，但要小心利息喔！',
        placement: 'top',
        data: {
            fairyPlacement: 'top',
            fairyDialogPlacement: 'left',
            fairyType: 'right',
        },
        disableBeacon: true,
        disableOverlayClose: true,
        hideCloseButton: true,
    },

    // ========== Step 11: 使用者頭像（需要互動） ==========
    {
        target: '#tutorial-user-avatar',
        content: '最後，請點擊右上角的頭像可以進入個人設定。',
        placement: 'bottom',
        data: {
            fairyPlacement: 'bottom',
            fairyDialogPlacement: 'left',
            fairyType: 'right',
            requiresInteraction: true,
            advanceOn: 'user-menu-opened',
        },
        disableBeacon: true,
        disableOverlayClose: true,
        hideCloseButton: true,
        spotlightClicks: true,
    },

    // ========== Step 12: 更改頭像按鈕（需要互動） ==========
    {
        target: '#tutorial-btn-edit-avatar',
        content: '請點擊「更改頭像」來選擇你的專屬形象！',
        placement: 'bottom',
        data: {
            fairyPlacement: 'bottom',
            fairyDialogPlacement: 'left',
            fairyType: 'right',
            requiresInteraction: true,
            advanceOn: 'avatar-selector-opened',
        },
        disableBeacon: true,
        disableOverlayClose: true,
        hideCloseButton: true,
        spotlightClicks: true,
    },

    // ========== Step 13: 頭像網格（需要互動） ==========
    {
        target: '#tutorial-avatar-grid',
        content: '請點擊選擇一個你喜歡的頭像吧！🎨',
        placement: 'left',
        data: {
            fairyPlacement: 'left',
            fairyDialogPlacement: 'top',
            fairyType: 'right',
            requiresInteraction: true,
            advanceOn: 'avatar-selected',
        },
        disableBeacon: true,
        disableOverlayClose: true,
        hideCloseButton: true,
        spotlightClicks: true,
    },

    // ========== Step 14: 儲存頭像按鈕（需要互動） ==========
    {
        target: '#tutorial-btn-save-avatar',
        content: '請點擊「儲存」按鈕確認你的選擇。',
        placement: 'bottom',
        data: {
            fairyPlacement: 'bottom',
            fairyDialogPlacement: 'left',
            fairyType: 'right',
            requiresInteraction: true,
            advanceOn: 'avatar-saved',
        },
        disableBeacon: true,
        disableOverlayClose: true,
        hideCloseButton: true,
        spotlightClicks: true,
    },

    // ========== Step 15: 結束 ==========
    {
        target: 'body',
        content: '新手教學結束！祝你在交易所賺大錢，成為排行榜第一名！🎊',
        placement: 'center',
        data: {
            fairyPlacement: 'center',
            fairyDialogPlacement: 'bottom',
            fairyType: 'center',
        },
        disableBeacon: true,
        disableOverlayClose: true,
        hideCloseButton: true,
    },
];
