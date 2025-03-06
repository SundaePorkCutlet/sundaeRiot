import React, { useState, useEffect } from 'react';
import styles from './MatchDetailModal.module.css';
import { formatDate } from '../utils/date';
import { createPortal } from 'react-dom';

const EventIcon = ({ type }) => {
  switch (type) {
    case 'KILL':
      return <span className={styles.killIcon}>⚔️</span>;
    case 'DEATH':
      return <span className={styles.deathIcon}>💀</span>;
    default:
      return null;
  }
};

const renderCombatEvent = (event, version) => {
  switch (event.type) {
    case 'KILL':
    case 'DEATH':
      return (
        <div className={styles.combatEvent}>
          <span className={styles.killIcon}>⚔️</span>
          <img
            src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${event.victimChampion}.png`}
            alt={event.victimChampion}
            className={styles.championIcon}
            title={`${event.victimChampion} 처치`}
          />
          {event.assistingParticipants.length > 0 && (
            <div className={styles.assists}>
              {event.assistingParticipants.map((champion, idx) => (
                <img
                  key={idx}
                  src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${champion}.png`}
                  alt={champion}
                  className={styles.assistIcon}
                  title={`${champion} 어시스트`}
                />
              ))}
            </div>
          )}
        </div>
      );
    case 'MONSTER_KILL':
      const monsterIcons = {
        'DRAGON': {
          'FIRE': '🔥',
          'WATER': '🌊',
          'EARTH': '🗻',
          'AIR': '💨',
          'ELDER': '🐉',
          'CHEMTECH': '☣️',
          'HEXTECH': '⚡'
        },
        'RIFTHERALD': '👾',
        'BARON_NASHOR': '👹'
      };
      
      const monsterNames = {
        'DRAGON': {
          'FIRE': '화염 드래곤',
          'WATER': '바다 드래곤',
          'EARTH': '대지 드래곤',
          'AIR': '바람 드래곤',
          'ELDER': '장로 드래곤',
          'CHEMTECH': '화학공학 드래곤',
          'HEXTECH': '마법공학 드래곤'
        },
        'RIFTHERALD': '전령',
        'BARON_NASHOR': '바론 내셔'
      };

      const icon = event.monsterSubType ? 
        monsterIcons['DRAGON'][event.monsterSubType] : 
        monsterIcons[event.monsterType];
      
      const name = event.monsterSubType ? 
        monsterNames['DRAGON'][event.monsterSubType] : 
        monsterNames[event.monsterType];

      return (
        <div className={`${styles.combatEvent} ${styles.monsterKill}`}>
          <span className={styles.monsterIcon}>{icon}</span>
          <span className={styles.monsterName}>{name} 처치</span>
        </div>
      );
    case 'TOWER_KILL':
      const towerNames = {
        'OUTER_TURRET': '외곽 포탑',
        'INNER_TURRET': '중앙 포탑',
        'BASE_TURRET': '보호막 포탑',
        'NEXUS_TURRET': '넥서스 포탑'
      };

      const laneNames = {
        'TOP': '탑',
        'MID': '미드',
        'BOT': '봇'
      };

      return (
        <div className={`${styles.combatEvent} ${styles.towerKill}`}>
          <span className={styles.towerIcon}>🗼</span>
          <span className={styles.towerName}>
            {laneNames[event.laneType]} {towerNames[event.towerType]} 파괴
          </span>
        </div>
      );
    default:
      return null;
  }
};

export const MatchDetailModal = ({ matchData, version, onClose }) => {
  const [timelineData, setTimelineData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        const res = await fetch(`/api/match/timeline/${matchData.matchId}?puuid=${matchData.participantId}`);
        const data = await res.json();
        setTimelineData(data);
      } catch (error) {
        console.error('타임라인 데이터 로딩 오류:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTimeline();
  }, [matchData.matchId, matchData.participantId]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  if (!matchData) return null;

  const renderTimeline = (events) => {
    if (!events || events.length === 0) return null;

    return (
      <div className={styles.timeline}>
        {events.map((event, index) => (
          <div key={index} className={styles.timelineEvent}>
            {event.type === 'ITEM' ? (
              <>
                <img
                  src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${event.itemId}.png`}
                  alt={`Item ${event.itemId}`}
                  className={styles.itemImage}
                />
                <span className={styles.timestamp}>
                  {Math.floor(event.timestamp / 60000)}분
                </span>
              </>
            ) : (
              <>
                {renderCombatEvent(event, version)}
                <span className={styles.timestamp}>
                  {Math.floor(event.timestamp / 60000)}분
                </span>
              </>
            )}
          </div>
        ))}
      </div>
    );
  };

  return createPortal(
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>×</button>
        
        <div className={styles.header}>
          <h3>매치 상세 정보</h3>
        </div>

        <div className={styles.content}>
          <div className={styles.basicInfo}>
            <img
              src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${matchData.championName}.png`}
              alt={matchData.championName}
              className={styles.championImage}
            />
            <div className={styles.stats}>
              <div className={`${styles.result} ${matchData.win ? styles.win : styles.lose}`}>
                {matchData.win ? '승리' : '패배'}
              </div>
              <div className={styles.kda}>
                {matchData.kills} / {matchData.deaths} / {matchData.assists}
              </div>
              <div className={styles.damage}>
                딜량: {matchData.totalDamageDealtToChampions.toLocaleString()}
              </div>
            </div>
          </div>

          <div className={styles.itemSection}>
            <h4>최종 아이템</h4>
            <div className={styles.finalItems}>
              {[
                matchData.item0,
                matchData.item1,
                matchData.item2,
                matchData.item3,
                matchData.item4,
                matchData.item5,
                matchData.item6
              ].map((itemId, index) => (
                itemId > 0 && (
                  <img
                    key={index}
                    src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${itemId}.png`}
                    alt={`Item ${itemId}`}
                    className={styles.itemImage}
                  />
                )
              ))}
            </div>
          </div>

          {loading ? (
            <div className={styles.loading}>빌드 순서 로딩중...</div>
          ) : timelineData?.events && (
            <div className={styles.buildOrder}>
              <h4>아이템 빌드 순서</h4>
              {renderTimeline(timelineData.events)}
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <span className={styles.time}>{formatDate(matchData.gameStartTimestamp)}</span>
        </div>
      </div>
    </div>,
    document.body
  );
}; 