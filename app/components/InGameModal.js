'use client';
import { useState, useEffect } from 'react';
import styles from './InGameModal.module.css';
import useUserStore from '../store/userStore';

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
          mapping[champion.key] = champion.id;  // 챔피언 ID를 이름으로 매핑
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

function useSpellData() {
  const [spellMap, setSpellMap] = useState({});

  useEffect(() => {
    async function fetchSpellData() {
      try {
        const response = await fetch(
          'https://ddragon.leagueoflegends.com/cdn/13.24.1/data/ko_KR/summoner.json'
        );
        const data = await response.json();
        
        const mapping = {};
        Object.values(data.data).forEach(spell => {
          mapping[spell.key] = spell.id;
        });
        
        setSpellMap(mapping);
      } catch (error) {
        console.error('Failed to fetch spell data:', error);
      }
    }

    fetchSpellData();
  }, []);

  return spellMap;
}

export function InGameModal({ isOpen, onClose, gameData }) {
  const championMap = useChampionData();
  const spellMap = useSpellData();
  const championKoreanNames = useUserStore(state => state.championKoreanNames);
  
  if (!isOpen) return null;

  const gameStartTime = gameData?.gameStartTime;

  // API 응답 데이터 구조 확인을 위한 디버깅
  console.log('Game Data:', gameData);
  console.log('Champion Names:', championKoreanNames);

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
                  const championName = championMap[player.championId];
                  const spell1 = spellMap[player.spell1Id];
                  const spell2 = spellMap[player.spell2Id];
                  return (
                    <div key={player.puuid} className={styles.player}>
                      <div className={styles.championInfo}>
                        <img 
                          src={`https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/${championName}.png`}
                          alt={`Champion ${championName}`}
                          className={styles.championImage}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/item/3340.png';
                          }}
                        />
                        <img 
                          src={`https://ddragon.leagueoflegends.com/cdn/13.24.1/img/spell/${spell1}.png`}
                          alt={`Spell ${spell1}`}
                          className={styles.spellImage}
                        />
                        <img 
                          src={`https://ddragon.leagueoflegends.com/cdn/13.24.1/img/spell/${spell2}.png`}
                          alt={`Spell ${spell2}`}
                          className={styles.spellImage}
                        />
                      </div>
                      <span className={styles.playerName}>{player.riotId}</span>
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
                  const championName = championMap[player.championId];
                  const spell1 = spellMap[player.spell1Id];
                  const spell2 = spellMap[player.spell2Id];
                  return (
                    <div key={player.puuid} className={styles.player}>
                      <div className={styles.championInfo}>
                        <img 
                          src={`https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/${championName}.png`}
                          alt={`Champion ${championName}`}
                          className={styles.championImage}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/item/3340.png';
                          }}
                        />
                        <img 
                          src={`https://ddragon.leagueoflegends.com/cdn/13.24.1/img/spell/${spell1}.png`}
                          alt={`Spell ${spell1}`}
                          className={styles.spellImage}
                        />
                        <img 
                          src={`https://ddragon.leagueoflegends.com/cdn/13.24.1/img/spell/${spell2}.png`}
                          alt={`Spell ${spell2}`}
                          className={styles.spellImage}
                        />
                      </div>
                      <span className={styles.playerName}>{player.riotId}</span>
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