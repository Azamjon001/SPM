import React from 'react';
import styled from 'styled-components@6.1.13';

interface AnimatedColorButtonProps {
  color: string;
  isSelected: boolean;
  onClick: () => void;
  displayMode?: 'day' | 'night';
}

const AnimatedColorButton: React.FC<AnimatedColorButtonProps> = ({ 
  color, 
  isSelected, 
  onClick,
  displayMode = 'day'
}) => {
  const colorStyles = {
    'Любой': 'from-purple-400 via-pink-400 to-blue-400',
    'Черный': 'black',
    'Белый': 'white',
    'Желтый': 'yellow-400',
    'Синий': 'blue-600',
    'Красный': 'red-600'
  };

  const bgClass = colorStyles[color as keyof typeof colorStyles];

  return (
    <StyledWrapper $isSelected={isSelected} $bgClass={bgClass} $color={color}>
      <button 
        className={`button ${isSelected ? 'selected' : ''}`}
        onClick={onClick}
        title={color}
      >
        <div className="bg" />
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 342 208" height={208} width={342} className="splash">
          <path strokeLinecap="round" strokeWidth={3} d="M54.1054 99.7837C54.1054 99.7837 40.0984 90.7874 26.6893 97.6362C13.2802 104.485 1.5 97.6362 1.5 97.6362" />
          <path strokeLinecap="round" strokeWidth={3} d="M285.273 99.7841C285.273 99.7841 299.28 90.7879 312.689 97.6367C326.098 104.486 340.105 95.4893 340.105 95.4893" />
          <path strokeLinecap="round" strokeWidth={3} strokeOpacity="0.3" d="M281.133 64.9917C281.133 64.9917 287.96 49.8089 302.934 48.2295C317.908 46.6501 319.712 36.5272 319.712 36.5272" />
          <path strokeLinecap="round" strokeWidth={3} strokeOpacity="0.3" d="M281.133 138.984C281.133 138.984 287.96 154.167 302.934 155.746C317.908 157.326 319.712 167.449 319.712 167.449" />
        </svg>
        <div className="wrap">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 221 42" height={42} width={221} className="path">
            <path strokeLinecap="round" strokeWidth={3} d="M182.674 2H203C211.837 2 219 9.16344 219 18V24C219 32.8366 211.837 40 203 40H18C9.16345 40 2 32.8366 2 24V18C2 9.16344 9.16344 2 18 2H47.8855" />
          </svg>
          <div className="outline" />
          <div className="content">
            <span className="char state-1">
              {color.split('').map((char, i) => (
                <span key={i} data-label={char} style={{ '--i': i + 1 } as any}>{char}</span>
              ))}
            </span>
            <div className="icon">
              <div />
            </div>
            {isSelected && (
              <span className="char state-2">
                {'✓'.split('').map((char, i) => (
                  <span key={i} data-label={char} style={{ '--i': i + 1 } as any}>{char}</span>
                ))}
              </span>
            )}
          </div>
        </div>
      </button>
    </StyledWrapper>
  );
}

interface StyledWrapperProps {
  $isSelected: boolean;
  $bgClass: string;
  $color: string;
}

const StyledWrapper = styled.div<StyledWrapperProps>`
  .button {
    --white: #ffe7ff;
    --purple-100: ${props => {
      if (props.$color === 'Любой') return '#f4b1fd';
      if (props.$color === 'Черный') return '#4a5568';
      if (props.$color === 'Белый') return '#f7fafc';
      if (props.$color === 'Желтый') return '#fef3c7';
      if (props.$color === 'Синий') return '#dbeafe';
      if (props.$color === 'Красный') return '#fee2e2';
      return '#f4b1fd';
    }};
    --purple-200: ${props => {
      if (props.$color === 'Любой') return '#d190ff';
      if (props.$color === 'Черный') return '#2d3748';
      if (props.$color === 'Белый') return '#e2e8f0';
      if (props.$color === 'Желтый') return '#fbbf24';
      if (props.$color === 'Синий') return '#3b82f6';
      if (props.$color === 'Красный') return '#ef4444';
      return '#d190ff';
    }};
    --purple-300: ${props => {
      if (props.$color === 'Любой') return '#c389f2';
      if (props.$color === 'Черный') return '#1a202c';
      if (props.$color === 'Белый') return '#cbd5e0';
      if (props.$color === 'Желтый') return '#f59e0b';
      if (props.$color === 'Синий') return '#2563eb';
      if (props.$color === 'Красный') return '#dc2626';
      return '#c389f2';
    }};
    --purple-400: ${props => {
      if (props.$color === 'Любой') return '#8e26e2';
      if (props.$color === 'Черный') return '#000000';
      if (props.$color === 'Белый') return '#a0aec0';
      if (props.$color === 'Желтый') return '#d97706';
      if (props.$color === 'Синий') return '#1d4ed8';
      if (props.$color === 'Красный') return '#b91c1c';
      return '#8e26e2';
    }};
    --purple-500: ${props => {
      if (props.$color === 'Любой') return '#5e2b83';
      if (props.$color === 'Черный') return '#000000';
      if (props.$color === 'Белый') return '#718096';
      if (props.$color === 'Желтый') return '#b45309';
      if (props.$color === 'Синий') return '#1e40af';
      if (props.$color === 'Красный') return '#991b1b';
      return '#5e2b83';
    }};
    --radius: 12px;

    border-radius: var(--radius);
    outline: none;
    cursor: pointer;
    font-size: 10px;
    font-family: Arial;
    background: transparent;
    letter-spacing: 0;
    border: 0;
    position: relative;
    width: 70px;
    height: 32px;
    transform: ${props => props.$isSelected ? 'rotate(0deg) skewX(0deg)' : 'rotate(353deg) skewX(2deg)'};
    transition: transform 0.3s ease;
  }

  .button.selected {
    transform: rotate(0deg) skewX(0deg) scale(1.05);
  }

  .bg {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    filter: blur(1px);
  }
  
  .bg::before,
  .bg::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: calc(var(--radius) * 1.1);
    background: var(--purple-500);
  }
  
  .bg::before {
    filter: blur(3px);
    transition: all 0.3s ease;
    box-shadow:
      -3px 3px 0 0 rgb(115 75 155 / 40%),
      -6px 6px 0 0 rgb(115 75 155 / 30%),
      -9px 9px 2px 0 rgb(115 75 155 / 25%);
  }

  .wrap {
    border-radius: inherit;
    overflow: hidden;
    height: 100%;
    transform: translate(3px, -3px);
    padding: 2px;
    background: linear-gradient(
      to bottom,
      var(--purple-100) 0%,
      var(--purple-400) 100%
    );
    position: relative;
    transition: all 0.3s ease;
  }

  .outline {
    position: absolute;
    overflow: hidden;
    inset: 0;
    opacity: 0;
    outline: none;
    border-radius: inherit;
    transition: all 0.4s ease;
  }
  
  .outline::before {
    content: "";
    position: absolute;
    inset: 2px;
    width: 60px;
    height: 150px;
    margin: auto;
    background: linear-gradient(
      to right,
      transparent 0%,
      white 50%,
      transparent 100%
    );
    animation: spin 3s linear infinite;
    animation-play-state: paused;
  }

  .content {
    pointer-events: none;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1;
    position: relative;
    height: 100%;
    gap: 6px;
    border-radius: calc(var(--radius) * 0.85);
    font-weight: 600;
    transition: all 0.3s ease;
    background: linear-gradient(
      to bottom,
      var(--purple-300) 0%,
      var(--purple-400) 100%
    );
    box-shadow:
      inset -1px 6px 5px -3px var(--purple-200),
      inset 1px -2px 5px 0px rgb(0 0 0 / 35%);
  }
  
  .content::before {
    content: "";
    inset: 0;
    position: absolute;
    z-index: 10;
    width: 80%;
    top: 45%;
    bottom: 35%;
    opacity: 0.7;
    margin: auto;
    background: linear-gradient(to bottom, transparent, var(--purple-400));
    filter: brightness(1.3) blur(3px);
  }

  .char {
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .char span {
    display: block;
    color: transparent;
    position: relative;
    font-size: 10px;
  }
  
  .char.state-1 span {
    animation: charAppear 1.2s ease backwards calc(var(--i) * 0.03s);
  }
  
  .char.state-1 span::before,
  .char span::after {
    content: attr(data-label);
    position: absolute;
    color: var(--white);
    text-shadow: -1px 1px 1px var(--purple-500);
    left: 0;
  }
  
  .char span::before {
    opacity: 0;
    transform: translateY(-100%);
  }
  
  .char.state-2 {
    position: absolute;
    left: 28px;
    font-size: 16px;
  }
  
  .char.state-2 span::after {
    opacity: 1;
    color: #4ade80;
    text-shadow: 0 0 5px #22c55e;
  }

  .icon {
    animation: resetArrow 0.8s cubic-bezier(0.7, -0.5, 0.3, 1.2) forwards;
    z-index: 10;
    display: none;
  }

  .path {
    position: absolute;
    z-index: 12;
    bottom: 0;
    left: 0;
    right: 0;
    stroke-dasharray: 150 480;
    stroke-dashoffset: 150;
    pointer-events: none;
    display: none;
  }

  .splash {
    position: absolute;
    top: 0;
    left: 0;
    pointer-events: none;
    stroke-dasharray: 60 60;
    stroke-dashoffset: 60;
    transform: translate(-17%, -31%) scale(0.5);
    stroke: var(--purple-300);
  }

  /** STATES */

  .button:hover .char.state-1 span::before {
    animation: charAppear 0.7s ease calc(var(--i) * 0.03s);
  }

  .button:hover .char.state-1 span::after {
    opacity: 1;
    animation: charDisappear 0.7s ease calc(var(--i) * 0.03s);
  }

  .button:hover .wrap {
    transform: translate(4px, -4px);
  }

  .button:hover .outline {
    opacity: 1;
  }

  .button:hover .outline::before {
    animation-play-state: running;
  }

  .button:active .bg::before {
    filter: blur(3px);
    opacity: 0.7;
    box-shadow:
      -3px 3px 0 0 rgb(115 75 155 / 40%),
      -6px 6px 0 0 rgb(115 75 155 / 25%);
  }
  
  .button:active .content {
    box-shadow:
      inset -1px 6px 4px -3px rgba(71, 0, 137, 0.4),
      inset 0px -2px 4px 0px var(--purple-200);
  }

  .button:active .outline {
    opacity: 0;
  }

  .button:active .wrap {
    transform: translate(1.5px, -1.5px);
  }

  .button:active .splash {
    animation: splash 0.8s cubic-bezier(0.3, 0, 0, 1) forwards 0.05s;
  }

  .button.selected .char.state-1 span {
    animation: charDisappear 0.5s ease forwards calc(var(--i) * 0.03s);
  }

  .button.selected .char.state-2 span::after {
    animation: charAppear 1s ease backwards calc(var(--i) * 0.03s);
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  @keyframes charAppear {
    0% {
      transform: translateY(50%);
      opacity: 0;
      filter: blur(10px);
    }
    20% {
      transform: translateY(70%);
      opacity: 1;
    }
    50% {
      transform: translateY(-15%);
      opacity: 1;
      filter: blur(0);
    }
    100% {
      transform: translateY(0);
      opacity: 1;
    }
  }

  @keyframes charDisappear {
    0% {
      transform: translateY(0);
      opacity: 1;
    }
    100% {
      transform: translateY(-70%);
      opacity: 0;
      filter: blur(2px);
    }
  }

  @keyframes splash {
    to {
      stroke-dasharray: 2 60;
      stroke-dashoffset: -60;
    }
  }
`;

export default AnimatedColorButton;
