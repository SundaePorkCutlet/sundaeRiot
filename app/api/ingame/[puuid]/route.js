import { NextResponse } from 'next/server';

export async function GET(request, context) {
  const params = await context.params;
  const puuid = params.puuid;
  
  if (!process.env.RIOT_API_KEY) {
    console.error('Missing RIOT_API_KEY');
    return NextResponse.json(
      { error: "서버 설정이 올바르지 않습니다." },
      { status: 500 }
    );
  }
  
  try {
    const response = await fetch(
      `https://kr.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${puuid}`,
      {
        headers: {
          "X-Riot-Token": process.env.RIOT_API_KEY
        }
      }
    );

    if (response.status === 404) {
      return NextResponse.json({ error: "현재 게임중이 아닙니다." }, { status: 404 });
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error fetching in-game data:', error);
    return NextResponse.json(
      { error: "인게임 정보를 가져오는데 실패했습니다." }, 
      { status: 500 }
    );
  }
} 