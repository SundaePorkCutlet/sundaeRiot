'use client';
import { useState, useEffect } from 'react';
import styles from './InGameModal.module.css';

function useChampionData() {
  const [championMap, setChampionMap] = useState({});

  useEffect(() => {
    async function fetchChampionData() {
      try {
        const response = await fetch(
          'https://ddragon.leagueoflegends.com/cdn/13.24.1/data/ko_KR/champion.json'
        );
        const data = await response.json();
        
        // championId를 key로 하는 매핑 생성
        const mapping = {};
        Object.values(data.data).forEach(champion => {
          mapping[champion.key] = champion.id;
        });
        
        setChampionMap(mapping);
      } catch (error) {
        console.error('Failed to fetch champion data:', error);
      }
    }

    fetchChampionData();
  }, []);

  return championMap;
}

function GameTimer({ gameStartTime }) {
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

export function InGameModal({ isOpen, onClose, gameData }) {
  const championMap = useChampionData();
  
  if (!isOpen) return null;

  const gameStartTime = gameData?.gameStartTime;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>×</button>
        <h2>실시간 게임 정보</h2>
        
        <div className={styles.gameInfo}>
          <GameTimer gameStartTime={gameStartTime} />
          <div className={styles.teams}>
            {/* 블루팀 */}
            <div className={styles.team}>
              <h3>블루팀</h3>
              {gameData?.participants
                .filter(p => p.teamId === 100)
                .map(player => {
                  const championName = championMap[player.championId] || `Champion${player.championId}`;
                  return (
                    <div key={championName} className={styles.player}>
                      <img 
                        src={`https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/${championName}.png`}
                        alt={championName}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/item/3340.png';
                        }}
                      />
                      <span>{championName}</span>
                    </div>
                  );
                })}
            </div>
            
            {/* 레드팀 */}
            <div className={styles.team}>
              <h3>레드팀</h3>
              {gameData?.participants
                .filter(p => p.teamId === 200)
                .map(player => {
                  const championName = championMap[player.championId] || `Champion${player.championId}`;
                  return (
                    <div key={championName} className={styles.player}>
                      <img 
                        src={`https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/${championName}.png`}
                        alt={championName}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/item/3340.png';
                        }}
                      />
                      <span>{championName}</span>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 