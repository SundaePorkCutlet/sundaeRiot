import React, { useState, useEffect, useRef, useMemo } from 'react';
import styles from './MatchDetailModal.module.css';
import { formatDate } from '../utils/date';
import { getCachedData, setCachedData } from '../utils/cache';
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
      return (
        <div className={`${styles.combatEvent} ${styles.kill}`}>
          <span className={styles.killIcon}>⚔️</span>
          <img
            src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${event.victimChampion}.png`}
            alt={event.victimChampion}
            className={styles.championIcon}
            title={`${event.victimChampion} 처치`}
          />
          {event.assistingParticipants?.length > 0 && (
            <div className={styles.assists}>
              {event.assistingParticipants.map((champion, idx) => (
                <img
                  key={`${event.timestamp}-${champion}-${idx}`}
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

    case 'DEATH':
      return (
        <div className={`${styles.combatEvent} ${styles.death}`}>
          <span className={styles.deathIcon}>💀</span>
          {event.killerChampion && event.killerChampion !== 'Unknown' && (
            <img
              src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${event.killerChampion}.png`}
              alt={event.killerChampion}
              className={styles.championIcon}
              title={`${event.killerChampion}에게 사망`}
            />
          )}
          {event.assistingParticipants?.length > 0 && (
            <div className={styles.assists}>
              {event.assistingParticipants.map((champion, idx) => (
                <img
                  key={`${event.timestamp}-${champion}-${idx}`}
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

    case 'ASSIST':
      return (
        <div className={`${styles.combatEvent} ${styles.assist}`}>
          <span className={styles.assistIcon}>🤝</span>
          <img
            src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${event.killerChampion}.png`}
            alt={event.killerChampion}
            className={styles.championIcon}
            title={`${event.killerChampion}의 킬 어시스트`}
          />
          <span>➔</span>
          <img
            src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${event.victimChampion}.png`}
            alt={event.victimChampion}
            className={styles.championIcon}
            title={`${event.victimChampion} 처치`}
          />
        </div>
      );

    case 'MONSTER_KILL':
      const monsterEmoji = {
        'DRAGON': '🐲',
        'RIFTHERALD': '👁️',
        'BARON_NASHOR': '👾',
        'HORDE': '🪲'
      }[event.monsterType] || '🐉';

      const monsterName = {
        'DRAGON': '드래곤',
        'RIFTHERALD': '전령',
        'BARON_NASHOR': '바론',
        'HORDE': '공허 곤충 무리'
      }[event.monsterType] || '몬스터';

      return (
        <div className={`${styles.combatEvent} ${styles.monsterKill}`}>
          <span className={styles.monsterIcon}>{monsterEmoji}</span>
          <span className={styles.monsterName}>{monsterName} 처치</span>
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

const calculatePlayerScore = (player, teamInfo) => {
  // 전투 점수 (60%)
  const combatScore = {
    kda: ((player.kills + player.assists) / Math.max(1, player.deaths)) * 0.35,
    damageShare: (player.totalDamageDealtToChampions / teamInfo.teamDamage) * 0.35,
    killParticipation: ((player.kills + player.assists) / teamInfo.teamKills) * 0.3
  };

  // 자원 관리 점수 (40%)
  const resourceScore = {
    csPerMin: (player.totalMinionsKilled / (teamInfo.gameDuration / 60)) * 0.4,
    goldPerMin: (player.goldEarned / (teamInfo.gameDuration / 60)) * 0.3,
    visionScore: (player.visionScore) * 0.3
  };

  const baseScore = (combatScore.kda + combatScore.damageShare + combatScore.killParticipation) * 0.6 +
         (resourceScore.csPerMin + resourceScore.goldPerMin + resourceScore.visionScore) * 0.4;

  // 최종 점수 계산
  return baseScore + (player.win ? 2 : 0);
};

export const MatchDetailModal = ({ matchData, version, onClose }) => {
  const [timelineData, setTimelineData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const fetchController = useRef(false);
  const [mounted, setMounted] = useState(false);

  // 디버깅을 위한 로그
  console.log('matchData:', matchData);

  // allPlayers에서 점수 계산하고 정렬
  const playerRanks = useMemo(() => {
    if (!matchData?.allPlayers) {
      console.log('allPlayers not found in:', matchData);
      return [];
    }
    
    return matchData.allPlayers
      .map(player => {
        console.log('Calculating score for player:', player);
        return {
          ...player,
          score: calculatePlayerScore(player, {
            teamDamage: matchData.teams[player.teamId === 100 ? 'blue' : 'red'].totalDamage,
            teamKills: matchData.teams[player.teamId === 100 ? 'blue' : 'red'].totalKills,
            gameDuration: matchData.gameDuration
          })
        };
      })
      .sort((a, b) => b.score - a.score)
      .map((player, index) => ({
        ...player,
        rank: index + 1
      }));
  }, [matchData]);

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  useEffect(() => {
    fetchTimeline();
  }, []);

  const fetchTimeline = async () => {
    if (fetchController.current) return;
    fetchController.current = true;

    try {
      setIsLoading(true);

      const res = await fetch(
        `/api/match/timeline/${matchData.matchId}?puuid=${matchData.participantId}`
      );
      
      const data = await res.json();
      
      if (data.events) {
        setTimelineData(data);
      } else {
        setError(data.error || '타임라인을 불러올 수 없습니다.');
      }
    } catch (error) {
      console.error('Timeline fetch error:', error);
      setError('타임라인을 불러올 수 없습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderTimeline = (events) => {
    if (!events || events.length === 0) return null;

    const getItemIcon = (action) => {
      switch(action) {
        case 'purchased': return '💰';
        case 'sold': return '💸';
        case 'undo': return '↩️';
        default: return '🛍️';
      }
    };

    return (
      <div className={styles.timeline}>
        {events
          .filter(event => 
            event.type === 'ITEM' || 
            event.type === 'KILL' ||
            event.type === 'DEATH' || 
            event.type === 'ASSIST' ||
            event.type === 'MONSTER_KILL' ||
            event.type === 'TOWER_KILL'
          )
          .map((event, index) => (
            <div key={`${event.timestamp}-${event.type}-${index}`} className={styles.timelineEvent}>
              {event.type === 'ITEM' ? (
                <>
                  {getItemIcon(event.action)}
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

  if (!mounted) return null;

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

          {/* 플레이어 순위 섹션 */}
          <div className={styles.playerRankings}>
            <div className={styles.team}>
              <h4>블루팀</h4>
              <div className={styles.teamPlayers}>
                {playerRanks
                  .filter(player => player.teamId === 100)
                  .map(player => (
                    <div 
                      key={player.puuid}
                      className={`${styles.playerCard} 
                        ${player.puuid === matchData.puuid ? styles.currentPlayer : ''} 
                        ${player.rank === 1 ? styles.firstPlace : ''}`}
                    >
                      <div className={styles.rankBadge}>
                        {player.rank === 1 ? '👑' : `#${player.rank}`}
                      </div>
                      <img 
                        src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${player.championName}.png`}
                        alt={player.championName}
                        className={styles.championIcon}
                      />
                      <div className={styles.playerInfo}>
                        <span className={styles.playerName}>{player.summonerName}</span>
                        <span className={styles.playerScore}>{player.score.toFixed(2)} pts</span>
                        <span className={styles.kdaText}>
                          {player.kills}/{player.deaths}/{player.assists}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className={styles.team}>
              <h4>레드팀</h4>
              <div className={styles.teamPlayers}>
                {playerRanks
                  .filter(player => player.teamId === 200)
                  .map(player => (
                    <div 
                      key={player.puuid}
                      className={`${styles.playerCard} 
                        ${player.puuid === matchData.puuid ? styles.currentPlayer : ''} 
                        ${player.rank === 1 ? styles.firstPlace : ''}`}
                    >
                      <div className={styles.rankBadge}>
                        {player.rank === 1 ? '👑' : `#${player.rank}`}
                      </div>
                      <img 
                        src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${player.championName}.png`}
                        alt={player.championName}
                        className={styles.championIcon}
                      />
                      <div className={styles.playerInfo}>
                        <span className={styles.playerName}>{player.summonerName}</span>
                        <span className={styles.playerScore}>{player.score.toFixed(2)} pts</span>
                        <span className={styles.kdaText}>
                          {player.kills}/{player.deaths}/{player.assists}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className={styles.loading}>
              타임라인 가져오는 중...
            </div>
          ) : (
            timelineData && renderTimeline(timelineData.events)
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};