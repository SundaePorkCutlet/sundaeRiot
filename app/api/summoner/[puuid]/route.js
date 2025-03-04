import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  const { puuid } = await params;
  
  try {
    // PUUID로 소환사 정보 가져오기
    const response = await fetch(
      `https://kr.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`,
      {
        headers: {
          "X-Riot-Token": process.env.RIOT_API_KEY
        }
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error fetching summoner data:', error);
    return NextResponse.json(
      { error: "소환사 정보를 가져오는데 실패했습니다." }, 
      { status: 500 }
    );
  }
} 