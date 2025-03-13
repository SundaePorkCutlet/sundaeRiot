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
          {event.victimChampion && (
            <img
              src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${event.victimChampion}.png`}
              alt={event.victimChampion}
              className={styles.championIcon}
              title={`${event.victimChampion} 처치`}
              onError={(e) => {
                console.error('Image load error:', e.target.src);
                e.target.onerror = null;
                e.target.src = '/fallback-champion-icon.png';
              }}
            />
          )}
          {event.assistingParticipants?.length > 0 && (
            <div className={styles.assists}>
              {event.assistingParticipants.map((champion, idx) => (
                champion && (
                  <img
                    key={`${event.timestamp}-${champion}-${idx}`}
                    src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${champion}.png`}
                    alt={champion}
                    className={styles.assistIcon}
                    title={`${champion} 어시스트`}
                    onError={(e) => {
                      console.error('Image load error:', e.target.src);
                      e.target.onerror = null;
                      e.target.src = '/fallback-champion-icon.png';
                    }}
                  />
                )
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
  const gameMinutes = teamInfo.gameDuration / 60;

  const scores = {
    kda: (player.kills + player.assists) / Math.max(1, player.deaths),
    killParticipation: (player.kills + player.assists) / teamInfo.teamKills,
    damageShare: player.totalDamageDealtToChampions / teamInfo.teamDamage,
    csPerMin: player.totalMinionsKilled / gameMinutes,
    visionPerMin: player.visionScore / gameMinutes,
    objectiveScore: player.objectiveScore || 0
  };

  const normalizedScores = {
    kda: Math.min(scores.kda / 5, 1),
    killParticipation: scores.killParticipation,
    damageShare: scores.damageShare,
    csPerMin: Math.min(scores.csPerMin / 10, 1),
    visionPerMin: Math.min(scores.visionPerMin / 2, 1),
    objectiveScore: Math.min(scores.objectiveScore / 3, 1)
  };

  const weights = {
    kda: 0.2,
    killParticipation: 0.2,
    damageShare: 0.2,
    csPerMin: 0.2,
    visionPerMin: 0.1,
    objectiveScore: 0.1
  };

  console.log(`${player.summonerName} (${player.championName}):
    KDA: ${scores.kda.toFixed(2)} -> ${normalizedScores.kda.toFixed(2)} * ${weights.kda}
    킬관여: ${(scores.killParticipation * 100).toFixed(0)}% -> ${normalizedScores.killParticipation.toFixed(2)} * ${weights.killParticipation}
    데미지: ${(scores.damageShare * 100).toFixed(0)}% -> ${normalizedScores.damageShare.toFixed(2)} * ${weights.damageShare}
    분당CS: ${scores.csPerMin.toFixed(1)} -> ${normalizedScores.csPerMin.toFixed(2)} * ${weights.csPerMin}
    시야: ${scores.visionPerMin.toFixed(1)} -> ${normalizedScores.visionPerMin.toFixed(2)} * ${weights.visionPerMin}
    오브젝트: ${Number(scores.objectiveScore).toFixed(1)} -> ${normalizedScores.objectiveScore.toFixed(2)} * ${weights.objectiveScore}
  `);

  const baseScore = Object.keys(normalizedScores).reduce((sum, key) => 
    sum + normalizedScores[key] * weights[key], 0) * 10;

  return baseScore + (player.win ? 1 : 0);
};

export const MatchDetailModal = ({ matchData, version, onClose }) => {
  const [timelineData, setTimelineData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const fetchController = useRef(false);
  const [mounted, setMounted] = useState(false);

  const playerObjectiveScores = useMemo(() => {
    if (!timelineData?.events) return {};
    
    const scores = {};
    matchData.allPlayers.forEach((_, index) => {
      scores[index + 1] = 0;
    });
    
    timelineData.events.forEach(event => {
      if (event.type === 'ELITE_MONSTER_KILL') {
        const killerId = Number(event.killerId);
        if (killerId && scores[killerId] !== undefined) {
          switch(event.monsterType) {
            case 'DRAGON': 
              scores[killerId] += 0.5;
              break;
            case 'BARON_NASHOR': 
              scores[killerId] += 1;
              break;
            case 'RIFTHERALD':
            case 'HORDE': 
              scores[killerId] += 0.12;
              break;
          }
        }
      } else if (event.type === 'BUILDING_KILL' && event.buildingType === 'TOWER_BUILDING') {
        const killerId = Number(event.killerId);
        if (killerId && scores[killerId] !== undefined) {
          scores[killerId] += 0.3;
        }
      }
    });
    
    return scores;
  }, [timelineData, matchData]);

  const playerRanks = useMemo(() => {
    if (!matchData?.allPlayers) return [];
    
    return matchData.allPlayers
      .map((player, index) => {
        const participantId = index + 1;
        const objectiveScore = playerObjectiveScores[participantId] || 0;
        
        console.log('하단 랭킹 점수 계산:', {
          player,
          objectiveScore,
          teamDamage: matchData.teams[player.teamId === 100 ? 'blue' : 'red'].totalDamage,
          teamKills: matchData.teams[player.teamId === 100 ? 'blue' : 'red'].totalKills,
        });

        const score = calculatePlayerScore(
          {
            ...player,
            objectiveScore
          },
          {
            teamDamage: matchData.teams[player.teamId === 100 ? 'blue' : 'red'].totalDamage,
            teamKills: matchData.teams[player.teamId === 100 ? 'blue' : 'red'].totalKills,
            gameDuration: matchData.gameDuration
          }
        );

        return {
          ...player,
          objectiveScore,
          score
        };
      })
      .sort((a, b) => b.score - a.score)
      .map((player, index) => ({
        ...player,
        rank: index + 1
      }));
  }, [matchData, timelineData, playerObjectiveScores]);

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

  useEffect(() => {
    if (matchData?.allPlayers) {
      matchData.allPlayers.forEach(player => {
        console.log(`${player.summonerName} (${player.championName})의 CS 정보:`, {
          totalMinionsKilled: player.totalMinionsKilled,
          neutralMinionsKilled: player.neutralMinionsKilled,
          minionsKilled: player.minionsKilled,
          jungleMinionsKilled: player.jungleMinionsKilled,
          totalCs: player.totalCs,
          cs: player.cs
        });
      });
    }
  }, [matchData]);

  const fetchTimeline = async () => {
    if (fetchController.current) return;
    fetchController.current = true;

    try {
      setIsLoading(true);
      console.log('Fetching timeline for match:', matchData.matchId);

      const res = await fetch(
        `/api/match/timeline/${matchData.matchId}`
      );
      
      const data = await res.json();
      console.log('Timeline full data:', data);
      
      if (data.events) {
        console.log('Processed events:', data.events);
        setTimelineData(data);
      } else {
        console.error('Timeline data missing events:', data);
        setError('타임라인을 불러올 수 없습니다.');
      }
    } catch (error) {
      console.error('Timeline fetch error:', error);
      setError('타임라인을 불러올 수 없습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const processTimelineEvents = (events, participantId) => {
    if (!events) return [];
    
    const getPlayerByParticipantId = (id) => {
      return matchData.allPlayers[Number(id) - 1];
    };

    return events.flatMap(event => {
      switch (event.type) {
        case 'ITEM_PURCHASED':
        case 'ITEM_SOLD':
        case 'ITEM_UNDO':
          if (event.participantId === participantId) {
            return {
              ...event,
              type: 'ITEM',
              action: event.type.toLowerCase().split('_')[1]
            };
          }
          break;

        case 'CHAMPION_KILL':
          const currentKillerId = Number(event.killerId);
          const currentVictimId = Number(event.victimId);
          const currentParticipantId = Number(participantId);

          if (currentKillerId === currentParticipantId) {
            const victim = getPlayerByParticipantId(event.victimId);
            console.log('Found victim:', victim);

            return {
              type: 'KILL',
              timestamp: event.timestamp,
              victimChampion: victim?.championName,
              assistingParticipants: event.assistingParticipantIds
                ? event.assistingParticipantIds.map(id => {
                    const assisting = getPlayerByParticipantId(id);
                    console.log(`Kill - Found assisting player:`, assisting);
                    return assisting?.championName;
                  }).filter(Boolean)
                : []
            };
          } else if (currentVictimId === currentParticipantId) {
            const killer = getPlayerByParticipantId(event.killerId);
            console.log('Death - Found killer:', killer);

            return {
              type: 'DEATH',
              timestamp: event.timestamp,
              killerChampion: killer?.championName,
              assistingParticipants: event.assistingParticipantIds
                ? event.assistingParticipantIds.map(id => {
                    const assisting = getPlayerByParticipantId(id);
                    return assisting?.championName;
                  }).filter(Boolean)
                : []
            };
          } else if (event.assistingParticipantIds?.includes(currentParticipantId)) {
            const killer = getPlayerByParticipantId(event.killerId);
            const victim = getPlayerByParticipantId(event.victimId);

            return {
              type: 'ASSIST',
              timestamp: event.timestamp,
              killerChampion: killer?.championName,
              victimChampion: victim?.championName
            };
          }
          break;

        case 'ELITE_MONSTER_KILL':
          return {
            type: 'MONSTER_KILL',
            timestamp: event.timestamp,
            monsterType: event.monsterType,
            teamId: event.teamId
          };

        case 'BUILDING_KILL':
          if (event.buildingType === 'TOWER_BUILDING') {
            return {
              type: 'TOWER_KILL',
              timestamp: event.timestamp,
              towerType: event.towerType,
              laneType: event.laneType,
              teamId: event.teamId
            };
          }
          break;
      }
      return [];
    }).filter(Boolean);
  };

  const renderTimeline = (events) => {
    if (!events || events.length === 0) return null;

    const processedEvents = processTimelineEvents(events, matchData.participantId);

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
        {processedEvents
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
              <div className={styles.playerScore}>
                {(() => {
                  const player = matchData.allPlayers.find(p => p.puuid === matchData.puuid);
                  const objectiveScore = playerObjectiveScores[matchData.participantId] || 0;
                  const team = player.teamId === 100 ? 'blue' : 'red';
                  
                  return calculatePlayerScore(
                    {
                      ...player,
                      objectiveScore
                    },
                    {
                      teamDamage: matchData.teams[team].totalDamage,
                      teamKills: matchData.teams[team].totalKills,
                      gameDuration: matchData.gameDuration
                    }
                  ).toFixed(2);
                })()}
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
                      <div className={styles.totalScore}>{player.score.toFixed(2)} pts</div>
                      <div className={styles.kdaTotal}>
                        {player.kills}/{player.deaths}/{player.assists}
                      </div>
                      <div className={styles.mainContent}>
                        <img 
                          src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${player.championName}.png`}
                          alt={player.championName}
                          className={styles.championIcon}
                        />
                        <div className={styles.statsGrid}>
                          <div>
                            <span className={styles.statLabel}>KDA</span>
                            <span className={styles.statValue}>{((player.kills + player.assists) / Math.max(1, player.deaths)).toFixed(2)}</span>
                          </div>
                          <div>
                            <span className={styles.statLabel}>킬관여</span>
                            <span className={styles.statValue}>{((player.kills + player.assists) / matchData.teams[player.teamId === 100 ? 'blue' : 'red'].totalKills * 100).toFixed(0)}%</span>
                          </div>
                          <div>
                            <span className={styles.statLabel}>데미지</span>
                            <span className={styles.statValue}>{(player.totalDamageDealtToChampions / matchData.teams[player.teamId === 100 ? 'blue' : 'red'].totalDamage * 100).toFixed(0)}%</span>
                          </div>
                          <div>
                            <span className={styles.statLabel}>분당CS</span>
                            <span className={styles.statValue}>
                              {(player.totalMinionsKilled / (matchData.gameDuration / 60)).toFixed(1)}
                            </span>
                          </div>
                          <div>
                            <span className={styles.statLabel}>시야</span>
                            <span className={styles.statValue}>{(player.visionScore / (matchData.gameDuration / 60)).toFixed(1)}</span>
                          </div>
                          <div>
                            <span className={styles.statLabel}>오브젝트</span>
                            <span className={styles.statValue}>{player.objectiveScore.toFixed(1)}</span>
                          </div>
                        </div>
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
                      <div className={styles.totalScore}>{player.score.toFixed(2)} pts</div>
                      <div className={styles.kdaTotal}>
                        {player.kills}/{player.deaths}/{player.assists}
                      </div>
                      <div className={styles.mainContent}>
                        <img 
                          src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${player.championName}.png`}
                          alt={player.championName}
                          className={styles.championIcon}
                        />
                        <div className={styles.statsGrid}>
                          <div>
                            <span className={styles.statLabel}>KDA</span>
                            <span className={styles.statValue}>{((player.kills + player.assists) / Math.max(1, player.deaths)).toFixed(2)}</span>
                          </div>
                          <div>
                            <span className={styles.statLabel}>킬관여</span>
                            <span className={styles.statValue}>{((player.kills + player.assists) / matchData.teams[player.teamId === 100 ? 'blue' : 'red'].totalKills * 100).toFixed(0)}%</span>
                          </div>
                          <div>
                            <span className={styles.statLabel}>데미지</span>
                            <span className={styles.statValue}>{(player.totalDamageDealtToChampions / matchData.teams[player.teamId === 100 ? 'blue' : 'red'].totalDamage * 100).toFixed(0)}%</span>
                          </div>
                          <div>
                            <span className={styles.statLabel}>분당CS</span>
                            <span className={styles.statValue}>
                              {(player.totalMinionsKilled / (matchData.gameDuration / 60)).toFixed(1)}
                            </span>
                          </div>
                          <div>
                            <span className={styles.statLabel}>시야</span>
                            <span className={styles.statValue}>{(player.visionScore / (matchData.gameDuration / 60)).toFixed(1)}</span>
                          </div>
                          <div>
                            <span className={styles.statLabel}>오브젝트</span>
                            <span className={styles.statValue}>{player.objectiveScore.toFixed(1)}</span>
                          </div>
                        </div>
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