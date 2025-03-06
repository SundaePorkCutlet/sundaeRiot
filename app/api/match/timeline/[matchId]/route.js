import { getCachedData, setCachedData } from '../../../../utils/cache';

export async function GET(request, { params }) {
  const { matchId } = await params;
  const searchParams = request.nextUrl.searchParams;
  const participantId = parseInt(searchParams.get("puuid"));
  

  try {
    // 매치와 타임라인 데이터를 병렬로 요청
    const [matchRes, timelineRes] = await Promise.all([
      fetch(`https://asia.api.riotgames.com/lol/match/v5/matches/${matchId}`, {
        headers: { "X-Riot-Token": process.env.RIOT_API_KEY }
      }),
      fetch(`https://asia.api.riotgames.com/lol/match/v5/matches/${matchId}/timeline`, {
        headers: { "X-Riot-Token": process.env.RIOT_API_KEY }
      })
    ]);

    if (matchRes.status === 429 || timelineRes.status === 429) {
      return Response.json({ error: 'Rate limit reached' }, { status: 429 });
    }

    if (!matchRes.ok || !timelineRes.ok) {
      throw new Error('API request failed');
    }

    const [matchData, timelineData] = await Promise.all([
      matchRes.json(),
      timelineRes.json()
    ]);

    console.log('Match Data:', matchData);
    console.log('Timeline Data:', timelineData);
    console.log('PUUID:', participantId);

    // participantMapping을 participantId 기준으로 생성
    const participantMapping = {};
    const participantChampions = {};
    
    matchData.info.participants.forEach(p => {
      participantMapping[p.participantId] = p.participantId;  // puuid가 아닌 participantId 사용
      participantChampions[p.participantId] = p.championName;
    });

    console.log('Participant Mapping:', participantMapping);

    const events = [];
    const seenEvents = new Set();

    timelineData.info.frames.forEach(frame => {
      frame.events.forEach(event => {
        console.log('Processing event:', event);  // 이벤트 로깅 추가
        
        // 아이템 관련 이벤트
        if (event.participantId === participantId) {
          if (event.type === 'ITEM_PURCHASED' || event.type === 'ITEM_SOLD') {
            const eventKey = `${event.timestamp}-${event.type}-${event.itemId}-${participantId}`;
            if (!seenEvents.has(eventKey)) {
              seenEvents.add(eventKey);
              events.push({
                type: 'ITEM',
                timestamp: event.timestamp,
                itemId: event.itemId,
                action: event.type === 'ITEM_PURCHASED' ? 'purchased' : 'sold'
              });
            }
          }
          else if (event.type === 'ITEM_UNDO') {
            const eventKey = `${event.timestamp}-${event.type}-${event.beforeId}-${participantId}`;
            if (!seenEvents.has(eventKey)) {
              seenEvents.add(eventKey);
              events.push({
                type: 'ITEM',
                timestamp: event.timestamp,
                itemId: event.beforeId,  // UNDO의 경우 beforeId를 사용
                action: 'undo'
              });
            }
          }
        }
        
        // 챔피언 킬 이벤트
        if (event.type === 'CHAMPION_KILL') {
          console.log('Found CHAMPION_KILL event:', event); // 디버깅용
          console.log('Current participantId:', participantId); // 디버깅용

          if (event.killerId === participantId) {
            // 내가 킬을 했을 때
            const eventKey = `${event.timestamp}-KILL-${event.killerId}-${event.victimId}-${participantId}`;
            if (!seenEvents.has(eventKey)) {
              seenEvents.add(eventKey);
              events.push({
                type: 'KILL',
                timestamp: event.timestamp,
                killerId: event.killerId,
                victimId: event.victimId,
                victimChampion: participantChampions[event.victimId],
                assistingParticipants: (event.assistingParticipantIds || [])
                  .map(id => participantChampions[id])
                  .filter(Boolean)
              });
            }
          } 
          else if (event.victimId === participantId) {
            // 내가 죽었을 때
            const eventKey = `${event.timestamp}-DEATH-${event.killerId}-${event.victimId}-${participantId}`;
            if (!seenEvents.has(eventKey)) {
              seenEvents.add(eventKey);
              events.push({
                type: 'DEATH',
                timestamp: event.timestamp,
                killerId: event.killerId,
                killerChampion: participantChampions[event.killerId],
                assistingParticipants: (event.assistingParticipantIds || [])
                  .map(id => participantChampions[id])
                  .filter(Boolean)
              });
            }
          }
          else if (event.assistingParticipantIds?.includes(participantId)) {
            // 내가 어시스트 했을 때
            const eventKey = `${event.timestamp}-ASSIST-${event.killerId}-${event.victimId}-${participantId}`;
            if (!seenEvents.has(eventKey)) {
              seenEvents.add(eventKey);
              events.push({
                type: 'ASSIST',
                timestamp: event.timestamp,
                killerId: event.killerId,
                killerChampion: participantChampions[event.killerId],
                victimId: event.victimId,
                victimChampion: participantChampions[event.victimId]
              });
            }
          }
        }
        // 엘리트 몬스터 처치
        if (event.type === 'ELITE_MONSTER_KILL' && event.killerId === participantId) {
          const eventKey = `${event.timestamp}-MONSTER_KILL-${event.monsterType}-${participantId}`;
          if (!seenEvents.has(eventKey)) {
            seenEvents.add(eventKey);
            events.push({
              type: 'MONSTER_KILL',
              timestamp: event.timestamp,
              monsterType: event.monsterType,
              monsterSubType: event.monsterSubType
            });
          }
        }
        // 타워 파괴
        else if (event.type === 'BUILDING_KILL' && 
                 event.buildingType === 'TOWER_BUILDING' && 
                 event.killerId === participantId) {
          const eventKey = `${event.timestamp}-TOWER_KILL-${event.towerType}-${event.laneType}-${event.teamId}`;
          if (!seenEvents.has(eventKey)) {
            seenEvents.add(eventKey);
            events.push({
              type: 'TOWER_KILL',
              timestamp: event.timestamp,
              towerType: event.towerType,
              laneType: event.laneType,
              teamId: event.teamId
            });
          }
        }
      });
    });
    // 시간순 정렬
    events.sort((a, b) => a.timestamp - b.timestamp);

    console.log('Final events:', events);  // 최종 이벤트 로깅

    const responseData = { events };
    return Response.json(responseData);

  } catch (error) {
    console.error("Error fetching timeline data:", error);

    return Response.json({ error: error.message }, { status: 500 });
  }
} 