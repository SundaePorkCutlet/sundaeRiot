"use client";
import { useEffect, useState } from "react";

// Rate limit 상태 관리를 위한 전역 변수
let isRateLimited = false;
let rateLimitResetTime = null;

export default function Home() {
  // 🔹 6명의 소환사명 (순서 중요!)
  const summonerNames = [
    "순대돈까스",
    "움치기",
    "죗값치룬박연진",
    "빡구컷",
    "밥뚱원",
    "섹디르",
  ];

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log("🔹 `/api/user` 호출 시작...");
        const res = await fetch("/api/user");
        console.log("🔹 응답 상태 코드:", res.status);

        if (!res.ok) throw new Error(`HTTP 오류 상태 코드: ${res.status}`);

        const result = await res.json();
        console.log("✅ 서버에서 받은 데이터:", result);

        // 🔹 "솔로 랭크 (RANKED_SOLO_5x5)"만 필터링
        const filteredData = result.map((user, index) => ({
          summonerName: summonerNames[index], // PUUID 순서와 동일한 소환사명 추가
          puuid: user.puuid,
          league:
            user.league.find((l) => l.queueType === "RANKED_SOLO_5x5") || null,
          matches: user.matches,
        }));

        setUsers(filteredData);
      } catch (err) {
        console.error("❌ 오류 발생:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // 티어별 배경 그라데이션 설정
  const getTierGradient = (tier) => {
    const gradients = {
      IRON: "linear-gradient(135deg, rgba(81, 83, 94, 0.3) 0%, rgba(120, 122, 133, 0.3) 50%, rgba(81, 83, 94, 0.3) 100%)",
      BRONZE:
        "linear-gradient(135deg, rgba(140, 81, 58, 0.3) 0%, rgba(205, 127, 50, 0.3) 50%, rgba(140, 81, 58, 0.3) 100%)",
      SILVER:
        "linear-gradient(135deg, rgba(156, 164, 179, 0.3) 0%, rgba(192, 192, 192, 0.3) 50%, rgba(156, 164, 179, 0.3) 100%)",
      GOLD: "linear-gradient(135deg, rgba(241, 166, 77, 0.3) 0%, rgba(255, 215, 0, 0.3) 50%, rgba(241, 166, 77, 0.3) 100%)",
      PLATINUM:
        "linear-gradient(135deg, rgba(75, 160, 172, 0.3) 0%, rgba(121, 206, 187, 0.3) 50%, rgba(75, 160, 172, 0.3) 100%)",
      DIAMOND:
        "linear-gradient(135deg, rgba(87, 107, 206, 0.3) 0%, rgba(185, 242, 255, 0.3) 50%, rgba(87, 107, 206, 0.3) 100%)",
      MASTER:
        "linear-gradient(135deg, rgba(157, 62, 181, 0.3) 0%, rgba(211, 125, 255, 0.3) 50%, rgba(157, 62, 181, 0.3) 100%)",
      GRANDMASTER:
        "linear-gradient(135deg, rgba(224, 69, 93, 0.3) 0%, rgba(255, 107, 136, 0.3) 50%, rgba(224, 69, 93, 0.3) 100%)",
      CHALLENGER:
        "linear-gradient(135deg, rgba(50, 200, 255, 0.3) 0%, rgba(153, 229, 255, 0.3) 50%, rgba(50, 200, 255, 0.3) 100%)",
    };
    return (
      gradients[tier] || "linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)"
    );
  };

  // 티어 순위 매핑
  const tierOrder = {
    CHALLENGER: 9,
    GRANDMASTER: 8,
    MASTER: 7,
    DIAMOND: 6,
    PLATINUM: 5,
    GOLD: 4,
    SILVER: 3,
    BRONZE: 2,
    IRON: 1,
  };

  // 랭크 순위 매핑
  const rankOrder = {
    I: 4,
    II: 3,
    III: 2,
    IV: 1,
  };

  // 유저 정렬 함수
  const sortUsers = (users) => {
    return [...users].sort((a, b) => {
      const aLeague = a.league?.[0] || {};
      const bLeague = b.league?.[0] || {};

      // 티어 비교
      const tierDiff =
        (tierOrder[bLeague.tier] || 0) - (tierOrder[aLeague.tier] || 0);
      if (tierDiff !== 0) return tierDiff;

      // 같은 티어면 랭크(I, II, III, IV) 비교
      const rankDiff =
        (rankOrder[bLeague.rank] || 0) - (rankOrder[aLeague.rank] || 0);
      if (rankDiff !== 0) return rankDiff;

      // 같은 랭크면 LP 비교
      return (bLeague.leaguePoints || 0) - (aLeague.leaguePoints || 0);
    });
  };

  // 매치 정보를 보여주는 컴포넌트
  const MatchInfo = ({ matchId, puuid }) => {
    const [matchData, setMatchData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
      const fetchMatchData = async () => {
        try {
          // Rate limit 체크
          if (isRateLimited) {
            const now = new Date();
            if (rateLimitResetTime && now < rateLimitResetTime) {
              throw new Error(
                "API 호출 제한 중입니다. 잠시 후 다시 시도해주세요."
              );
            }
            isRateLimited = false;
          }

          const res = await fetch(`/api/match/${matchId}?puuid=${puuid}`);

          if (res.status === 429) {
            // Rate limit 상태 설정
            isRateLimited = true;
            // 2분 후로 reset 시간 설정
            rateLimitResetTime = new Date(Date.now() + 2 * 60 * 1000);
            throw new Error(
              "API 호출 횟수가 초과되었습니다. 잠시 후 다시 시도해주세요."
            );
          }

          if (!res.ok) throw new Error(`HTTP 오류: ${res.status}`);

          const data = await res.json();
          setMatchData(data);
        } catch (err) {
          console.error(`매치 데이터 로딩 오류 (${matchId}):`, err);
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };

      fetchMatchData();
    }, [matchId, puuid]);

    const getMultiKillText = (matchData) => {
      if (matchData.pentaKills > 0) return "펜타킬!";
      if (matchData.quadraKills > 0) return "쿼드라킬!";
      if (matchData.tripleKills > 0) return "트리플킬!";
      if (matchData.doubleKills > 0) return "더블킬!";
      return null;
    };

    const formatDate = (timestamp) => {
      const date = new Date(timestamp);
      const month = date.getMonth() + 1;
      const day = date.getDate();
      return `${month}/${day}`;
    };

    if (loading) return <div>로딩중...</div>;
    if (error)
      return <div style={{ color: "red", fontSize: "0.9em" }}>{error}</div>;
    if (!matchData) return null;

    return (
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "8px",
          }}
        >
          <img
            src={`https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/${matchData.championName}.png`}
            alt={matchData.championName}
            style={{ width: "40px", height: "40px", borderRadius: "50%" }}
          />
          <div>
            <div style={{ fontWeight: "bold" }}>{matchData.championName}</div>
            <div
              style={{
                color: matchData.win ? "#2196F3" : "#F44336",
                fontSize: "0.9em",
              }}
            >
              {matchData.win ? "승리" : "패배"}
            </div>
            <div style={{ fontSize: "0.8em", color: "#666" }}>
              {formatDate(matchData.gameStartTimestamp)}
            </div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            fontSize: "0.9em",
            color: "#666",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div>
              {matchData.kills}/{matchData.deaths}/{matchData.assists}
            </div>
            <div>
              딜량: {matchData.totalDamageDealtToChampions.toLocaleString()}
            </div>
          </div>
          {getMultiKillText(matchData) && (
            <div
              style={{
                color: "#FF4081",
                fontWeight: "bold",
                textAlign: "center",
              }}
            >
              {getMultiKillText(matchData)}
            </div>
          )}
        </div>
      </div>
    );
  };

  // 최근 매치 컨테이너 컴포넌트 추가
  const RecentMatches = ({ matches, puuid }) => {
    const [rankedMatches, setRankedMatches] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const fetchRankedMatches = async () => {
        let rankedGames = [];
        let index = 0;

        while (rankedGames.length < 3 && index < matches.length) {
          try {
            const res = await fetch(
              `/api/match/${matches[index]}?puuid=${puuid}`
            );
            const data = await res.json();
            if (data.isRanked) {
              rankedGames.push(matches[index]);
            }
          } catch (err) {
            console.error(`매치 데이터 로딩 오류 (${matches[index]}):`, err);
          }
          index++;
        }

        setRankedMatches(rankedGames);
        setLoading(false);
      };

      fetchRankedMatches();
    }, [matches, puuid]);

    if (loading) return <div>솔로랭크 매치 검색중...</div>;

    return (
      <div
        style={{
          display: "flex",
          gap: "15px",
          marginTop: "15px",
        }}
      >
        {rankedMatches.map((matchId) => (
          <div
            key={matchId}
            style={{
              flex: "1",
              padding: "15px",
              backgroundColor: "rgba(255, 255, 255, 0.9)",
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              minWidth: "200px",
            }}
          >
            <MatchInfo matchId={matchId} puuid={puuid} />
          </div>
        ))}
      </div>
    );
  };

  if (loading) return <p>데이터 불러오는 중...</p>;
  if (error) return <p>오류 발생: {error}</p>;

  // 정렬된 유저 목록 사용
  const sortedUsers = sortUsers(users);

  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      <h1>🔹 6명의 유저 정보</h1>

      {sortedUsers.map((user, index) => (
        <div
          key={index}
          style={{
            border: "1px solid #ccc",
            padding: "20px",
            marginBottom: "20px",
            background: user.league
              ? `${getTierGradient(user.league.tier)}`
              : "#ffffff",
            opacity: 0.9,
            borderRadius: "8px",
            boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
            color: "#000000",
          }}
        >
          {/* 유저 기본 정보 */}
          <div style={{ marginBottom: "15px" }}>
            <h2 style={{ margin: "0 0 10px 0" }}>👤 {user.summonerName}</h2>
            {user.league && (
              <div style={{ display: "flex", gap: "20px" }}>
                <p style={{ margin: "0" }}>
                  <strong>티어:</strong> {user.league.tier} {user.league.rank}
                </p>
                <p style={{ margin: "0" }}>
                  <strong>LP:</strong> {user.league.leaguePoints} LP
                </p>
                <p style={{ margin: "0" }}>
                  <strong>승/패:</strong> {user.league.wins}승{" "}
                  {user.league.losses}패
                </p>
              </div>
            )}
          </div>

          {/* 최근 매치 정보 */}
          <RecentMatches matches={user.matches} puuid={user.puuid} />
        </div>
      ))}
    </div>
  );
}
