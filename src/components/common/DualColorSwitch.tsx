import React from 'react';

interface DualColorSwitchProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    checkedText?: string;
    uncheckedText?: string;
    checkedColor?: string;
    uncheckedColor?: string;
    disabled?: boolean;
}

/**
 * 自定義雙色 Switch 組件
 * 可以分別設置 checked 和 unchecked 狀態的顏色
 */
const DualColorSwitch: React.FC<DualColorSwitchProps> = ({
    checked,
    onChange,
    checkedText = '開',
    uncheckedText = '關',
    checkedColor = '#1677ff',
    uncheckedColor = '#999',
    disabled = false
}) => {
    const handleClick = () => {
        if (!disabled) {
            onChange(!checked);
        }
    };

    const backgroundColor = checked ? checkedColor : uncheckedColor;
    const textColor = '#fff';

    return (
        <div
            onClick={handleClick}
            style={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                width: '50px',
                height: '28px',
                backgroundColor: backgroundColor,
                borderRadius: '14px',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.5 : 1,
                transition: 'background-color 0.2s ease',
                padding: '0 4px',
                boxSizing: 'border-box'
            }}
        >
            {/* 滑動的圓點 */}
            <div
                style={{
                    position: 'absolute',
                    width: '22px',
                    height: '22px',
                    backgroundColor: '#fff',
                    borderRadius: '50%',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                    transition: 'transform 0.2s ease',
                    transform: checked ? 'translateX(22px)' : 'translateX(0)',
                    left: '3px'
                }}
            />
            
            {/* 文字標籤 */}
            <div
                style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: checked ? 'flex-start' : 'flex-end',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    color: textColor,
                    userSelect: 'none',
                    pointerEvents: 'none',
                    paddingLeft: checked ? '6px' : '0',
                    paddingRight: checked ? '0' : '13px'
                }}
            >
                {checked ? checkedText : uncheckedText}
            </div>
        </div>
    );
};

export default DualColorSwitch;
