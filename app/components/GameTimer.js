'use client';
import { useState, useEffect } from 'react';

export default function GameTimer({ gameStartTime }) {
  const [elapsedTime, setElapsedTime] = useState('');

  useEffect(() => {
    const calculateTime = () => {
      const now = Date.now();
      const startTime = gameStartTime;
      const elapsed = now - startTime;

      const minutes = Math.floor(elapsed / 60000);
      const seconds = Math.floor((elapsed % 60000) / 1000);

      setElapsedTime(`${minutes}분 ${seconds}초`);
    };

    // 초기 계산
    calculateTime();

    // 1초마다 업데이트
    const interval = setInterval(calculateTime, 1000);

    return () => clearInterval(interval);
  }, [gameStartTime]);

  return <div>게임 시간: {elapsedTime}</div>;
} 