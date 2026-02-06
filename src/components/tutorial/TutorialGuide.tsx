import React, { useState, useCallback, useEffect, useRef } from 'react';
import Joyride, { STATUS, EVENTS, ACTIONS } from 'react-joyride';
import type { CallBackProps } from 'react-joyride';
import { Dialog } from 'antd-mobile';
import { TUTORIAL_STEPS } from '../../config/tutorialSteps';
import type { TutorialStepData } from '../../config/tutorialTypes';
import FairyTooltip from './FairyTooltip';
import apiClient from '../../services/apiClient';

interface TutorialGuideProps {
    /** 是否啟用教學（首次登入 = true） */
    enabled: boolean;
    /** 教學完成/跳過後的回調 */
    onComplete: () => void;
    /** 目前交易模式（用於偵測合約頁籤點擊，自動推進步驟） */
    currentTradeMode?: 'spot' | 'contract';
    /** 使用者選單是否開啟 */
    isUserMenuOpen?: boolean;
    /** 頭像選擇器是否開啟 */
    isAvatarSelectorOpen?: boolean;
    /** 當前選中的頭像檔名（非空代表已選擇） */
    selectedAvatar?: string;
    /** 頭像是否已儲存（用於偵測儲存完成） */
    avatarSaved?: boolean;
    /** 【新增】步驟索引變化回調，供父組件鎖定特定按鈕 */
    onStepIndexChange?: (index: number) => void;
}

/**
 * TutorialGuide - 教學精靈控制器
 *
 * 負責：
 * 1. 管理 react-joyride 的步驟流程與 stepIndex
 * 2. 處理互動步驟的自動推進（偵測使用者完成指定動作）
 * 3. 處理「跳過所有教學」確認流程
 * 4. 教學完成後呼叫後端 API 標記 firstSignIn = false
 */
const TutorialGuide: React.FC<TutorialGuideProps> = ({
    enabled,
    onComplete,
    currentTradeMode = 'spot',
    isUserMenuOpen = false,
    isAvatarSelectorOpen = false,
    selectedAvatar = '',
    avatarSaved = false,
    onStepIndexChange,
}) => {
    const [run, setRun] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);

    // 記錄進入步驟時的 selectedAvatar，用來偵測「新選擇」而非預填值
    const avatarOnStepEntryRef = useRef<string>('');

    // 當 stepIndex 變化時，拍攝當前 selectedAvatar 快照，並通知父組件
    useEffect(() => {
        avatarOnStepEntryRef.current = selectedAvatar;
        onStepIndexChange?.(stepIndex);
    }, [stepIndex, onStepIndexChange]);

    // 教學啟動（延遲等待 DOM 渲染）
    useEffect(() => {
        if (enabled) {
            const timer = setTimeout(() => setRun(true), 800);
            return () => clearTimeout(timer);
        }
    }, [enabled]);

    // ==================== 自動推進邏輯 ====================

    /**
     * 通用自動推進：
     * 1. 根據當前步驟的 advanceOn 判斷對應的狀態是否滿足
     * 2. 條件滿足後，輪詢等待下一步的目標元素掛載到 DOM
     * 3. 目標元素出現後才推進 stepIndex（避免 "Target not mounted"）
     * 
     * 所有 setInterval 都在 effect cleanup 中正確清除
     */
    useEffect(() => {
        if (!run) return;

        const currentStep = TUTORIAL_STEPS[stepIndex];
        const stepData = currentStep?.data as TutorialStepData | undefined;
        const advanceOn = stepData?.advanceOn;
        if (!advanceOn) return;

        // 判斷推進條件是否滿足
        let shouldAdvance = false;

        switch (advanceOn) {
            case 'tab-futures-clicked':
                shouldAdvance = currentTradeMode === 'contract';
                break;
            case 'user-menu-opened':
                shouldAdvance = isUserMenuOpen;
                break;
            case 'avatar-selector-opened':
                shouldAdvance = isAvatarSelectorOpen;
                break;
            case 'avatar-selected':
                // 必須是「新選擇」，而非開啟頭像選擇器時的預填值
                shouldAdvance = selectedAvatar !== '' && selectedAvatar !== avatarOnStepEntryRef.current;
                break;
            case 'avatar-saved':
                shouldAdvance = avatarSaved;
                break;
        }

        if (!shouldAdvance) return;

        // 條件滿足 → 等待下一步的目標元素出現再推進
        const nextIndex = stepIndex + 1;
        const nextStep = TUTORIAL_STEPS[nextIndex];

        // 沒有下一步或目標是 body → 延遲後直接推進
        if (!nextStep || nextStep.target === 'body') {
            const timer = setTimeout(() => setStepIndex(nextIndex), 300);
            return () => clearTimeout(timer);
        }

        // 輪詢等待下一步目標元素出現（effect cleanup 會正確清除 interval）
        const nextTarget = nextStep.target as string;
        const pollInterval = setInterval(() => {
            const el = document.querySelector(nextTarget);
            if (el) {
                clearInterval(pollInterval);
                setStepIndex(nextIndex);
            }
        }, 100);

        return () => clearInterval(pollInterval);
    }, [currentTradeMode, isUserMenuOpen, isAvatarSelectorOpen, selectedAvatar, avatarSaved, stepIndex, run]);

    // ==================== 跳過教學 ====================
    const handleSkipAll = useCallback(async () => {
        // 暫停 Joyride，讓 Dialog 不被 overlay 遮擋
        setRun(false);

        const confirmed = await Dialog.confirm({
            content: '確定要跳過所有教學嗎？之後可以在設定中重新開啟。',
            confirmText: '確定跳過',
            cancelText: '繼續教學',
            closeOnMaskClick: false,
        });

        if (confirmed) {
            await completeTutorial();
            onComplete();
        } else {
            // 使用者選擇繼續 → 恢復 Joyride
            setRun(true);
        }
    }, [onComplete]);

    // ==================== 完成教學（呼叫後端 API） ====================
    const completeTutorial = async () => {
        try {
            await apiClient.post('/auth/user/tutorial/complete');
            console.log(`[${new Date().toISOString()}] [Tutorial] 教學完成，已通知後端`);
        } catch (error) {
            console.error(`[${new Date().toISOString()}] [Tutorial] 通知後端失敗:`, error);
            // 即使 API 失敗也不阻擋使用者繼續使用
        }
    };

    // ==================== Joyride 回調 ====================
    const handleJoyrideCallback = useCallback(async (data: CallBackProps) => {
        const { status, action, type, index } = data;

        // 教學完成或被 Joyride 內部跳過
        if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
            setRun(false);
            await completeTutorial();
            onComplete();
            return;
        }

        // 步驟前進（僅處理非互動步驟的自然推進）
        // 互動步驟（有 advanceOn）由 useEffect 負責推進，這裡要跳過避免雙重推進
        if (type === EVENTS.STEP_AFTER && action === ACTIONS.NEXT) {
            const stepData = TUTORIAL_STEPS[index]?.data as TutorialStepData | undefined;
            if (!stepData?.advanceOn) {
                setStepIndex((prev) => prev + 1);
            }
        }
    }, [onComplete]);

    if (!enabled || !run) return null;

    return (
        <Joyride
            steps={TUTORIAL_STEPS}
            run={run}
            stepIndex={stepIndex}
            continuous
            scrollToFirstStep
            showSkipButton={false}
            showProgress={false}
            disableCloseOnEsc
            disableOverlayClose
            hideBackButton
            spotlightPadding={8}
            tooltipComponent={(props) => (
                <FairyTooltip {...props} onSkipAll={handleSkipAll} />
            )}
            styles={{
                options: {
                    zIndex: 10001,
                    arrowColor: 'transparent',
                    overlayColor: 'rgba(0, 0, 0, 0.5)',
                },
                spotlight: {
                    borderRadius: 12,
                },
            }}
            floaterProps={{
                disableAnimation: true,
                offset: 10,
                styles: {
                    arrow: {
                        // 隱藏預設 Joyride 箭頭（我們用自己的 CSS 三角形）
                        display: 'none',
                    },
                },
            }}
            callback={handleJoyrideCallback}
        />
    );
};

export default TutorialGuide;
