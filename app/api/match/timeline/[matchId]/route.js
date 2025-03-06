import { getCachedData, setCachedData } from '../../../../utils/cache';

export async function GET(request, { params }) {
  const { matchId } = await params;
  const searchParams = request.nextUrl.searchParams;
  const puuid = searchParams.get("puuid");
  const cacheKey = `match-timeline-${matchId}-${puuid}`;

  try {
    // 캐시 확인
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      console.log('타임라인 캐시 사용:', cacheKey);
      return Response.json(cachedData);
    }

    const [timelineRes, matchRes] = await Promise.all([
      fetch(`https://asia.api.riotgames.com/lol/match/v5/matches/${matchId}/timeline`, {
        headers: { "X-Riot-Token": process.env.RIOT_API_KEY }
      }),
      fetch(`https://asia.api.riotgames.com/lol/match/v5/matches/${matchId}`, {
        headers: { "X-Riot-Token": process.env.RIOT_API_KEY }
      })
    ]);

    if (timelineRes.status === 429) {
      const cachedData = getCachedData(cacheKey);
      if (cachedData) {
        console.log('Rate limit - 타임라인 캐시 사용:', cacheKey);
        return Response.json(cachedData);
      }
      return Response.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    if (!timelineRes.ok || !matchRes.ok) 
      throw new Error(`HTTP error! status: ${timelineRes.status}`);
    
    const [timelineData, matchData] = await Promise.all([
      timelineRes.json(),
      matchRes.json()
    ]);

    // 참가자 ID와 챔피언 매핑
    const participantChampions = {};
    matchData.info.participants.forEach(participant => {
      participantChampions[participant.participantId] = participant.championName;
    });

    // 타임라인 이벤트 추출
    const events = [];
    timelineData.info.frames.forEach(frame => {
      frame.events.forEach(event => {
        // 기존 아이템, 킬/데스 이벤트
        if (event.type === 'ITEM_PURCHASED' && event.participantId === parseInt(puuid)) {
          events.push({
            type: 'ITEM',
            timestamp: event.timestamp,
            itemId: event.itemId
          });
        }
        else if (event.type === 'CHAMPION_KILL') {
          if (event.killerId === parseInt(puuid)) {
            events.push({
              type: 'KILL',
              timestamp: event.timestamp,
              victimChampion: participantChampions[event.victimId],
              assistingParticipants: (event.assistingParticipantIds || [])
                .map(id => participantChampions[id])
            });
          }
          else if (event.victimId === parseInt(puuid)) {
            events.push({
              type: 'DEATH',
              timestamp: event.timestamp,
              killerChampion: participantChampions[event.killerId],
              assistingParticipants: (event.assistingParticipantIds || [])
                .map(id => participantChampions[id])
            });
          }
        }
        // 엘리트 몬스터 처치
        else if (event.type === 'ELITE_MONSTER_KILL' && event.killerId === parseInt(puuid)) {
          const monsterType = event.monsterType;
          const monsterSubType = event.monsterSubType;
          events.push({
            type: 'MONSTER_KILL',
            timestamp: event.timestamp,
            monsterType,
            monsterSubType,
            // 드래곤 종류나 전령/바론 구분을 위해
            position: event.position
          });
        }
        // 타워 파괴
        else if (event.type === 'BUILDING_KILL' && 
                 event.buildingType === 'TOWER_BUILDING' && 
                 event.killerId === parseInt(puuid)) {
          events.push({
            type: 'TOWER_KILL',
            timestamp: event.timestamp,
            towerType: event.towerType,
            laneType: event.laneType,
            teamId: event.teamId
          });
        }
      });
    });

    // 시간순 정렬
    events.sort((a, b) => a.timestamp - b.timestamp);

    const responseData = {
      events,
      cacheKey
    };

    setCachedData(cacheKey, responseData);
    return Response.json(responseData);

  } catch (error) {
    console.error("Error fetching timeline data:", error);
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      console.log('Error - 타임라인 캐시 사용:', cacheKey);
      return Response.json(cachedData);
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
} 