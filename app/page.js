"use client";
import { useEffect, useState, useRef } from "react";
import useUserStore from "./store/userStore";
import { InGameModal } from "./components/InGameModal";
import React from "react";
import { getCachedData, setCachedData } from "./utils/cache";
import { MatchDetailModal } from "./components/MatchDetailModal";
import MusicPlayer from "./components/MusicPlayer";

// Rate limit 상태 관리를 위한 전역 변수
let isRateLimited = false;
let rateLimitResetTime = null;

let randomLoadingKeyword = [
  "움치기가 키우는 고양이의 이름은 랑이 입니다.",
  "움치기와 순대돈까스는 단 한번도 같은 반이 된 적이 없습니다.",
  "죗연진은 g70을 싫어합니다.",
  "움치기는 원딜러 빡구컷은 서포터가 주 라인이지만 둘은 절대 바텀듀오를 하지 않습니다.",
  "밥뚱원은 서일순대국을 일주일에 2번을 꼭 갑니다.",
  "섹디르는 고등학생때 공부를 굉장히 잘했습니다.",
  "빡구컷은 갓 대 황 데시앙포레에 삽니다.",
  "밥뚱원은 현재 다이어트 중입니다.",
  "죗연진은 역류성 식도염을 가지고 있습니다.",
];

// 스펠 ID를 키로 변환하는 함수를 컴포넌트 외부에 정의
const getSpellKey = (spellId) => {
  const spellMap = {
    21: "SummonerBarrier",
    1: "SummonerBoost",
    14: "SummonerDot",
    3: "SummonerExhaust",
    4: "SummonerFlash",
    6: "SummonerHaste",
    7: "SummonerHeal",
    13: "SummonerMana",
    30: "SummonerPoroRecall",
    31: "SummonerPoroThrow",
    11: "SummonerSmite",
    39: "SummonerSnowURFSnowball_Mark",
    32: "SummonerSnowball",
    12: "SummonerTeleport",
  };
  return spellMap[spellId] || "SummonerFlash"; // 기본값으로 Flash 반환
};

// RecentMatches 컴포넌트를 먼저 정의
const RecentMatches = ({ matches, puuid }) => {
  const [rankedMatches, setRankedMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRankedMatches = async () => {
      let rankedGames = [];
      let index = 0;
      let errors = 0;

      while (rankedGames.length < 3 && index < matches.length && errors < 3) {
        try {
          const res = await fetch(
            `/api/match/${matches[index]}?puuid=${puuid}`
          );
          const data = await res.json();

          // 429 에러이지만 캐시된 데이터가 있는 경우
          if (res.status === 429 && data && !data.error) {
            console.log("Using cached match data:", matches[index]);
            if (data.isRanked) {
              rankedGames.push(matches[index]);
            }
          }
          // 정상적인 응답인 경우
          else if (res.ok && data.isRanked) {
            rankedGames.push(matches[index]);
          }
          // 실제 에러인 경우
          else if (!res.ok && res.status !== 429) {
            errors++;
            console.error(
              `매치 데이터 로딩 오류 (${matches[index]}):`,
              data.error
            );
          }
        } catch (err) {
          errors++;
          console.error(`매치 데이터 로딩 오류 (${matches[index]}):`, err);
        }
        index++;
      }

      if (rankedGames.length === 0 && errors > 0) {
        setError("최근 랭크 게임을 불러오는데 실패했습니다.");
      }

      setRankedMatches(rankedGames);
      setLoading(false);
    };

    fetchRankedMatches();
  }, [matches, puuid]);

  if (loading) {
    return <div className="loading-message">솔로랭크 매치 검색중...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (rankedMatches.length === 0) {
    return (
      <div className="no-matches-message">최근 솔로랭크 게임이 없습니다.</div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "10px",
        marginTop: "15px",
        maxHeight: window.innerWidth <= 768 ? "400px" : "auto", // 모바일에서 높이 제한
        overflow: window.innerWidth <= 768 ? "hidden" : "visible", // 모바일에서 오버플로우 숨김
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

// MatchInfo 컴포넌트 정의
const MatchInfo = ({ matchId, puuid }) => {
  const [matchData, setMatchData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [version, setVersion] = useState("15.3.1");
  const [showDetail, setShowDetail] = useState(false);
  const [championKoreanNames, setChampionKoreanNames] = useState({});

  useEffect(() => {
    // DataDragon 버전 가져오기
    const fetchVersion = async () => {
      try {
        const response = await fetch(
          "https://ddragon.leagueoflegends.com/api/versions.json"
        );
        const versions = await response.json();
        setVersion(versions[0]); // 최신 버전 사용
      } catch (error) {
        console.error("버전 정보 가져오기 실패:", error);
        // 기본 버전 유지
      }
    };

    fetchVersion();
  }, []);

  useEffect(() => {
    // 챔피언 데이터 가져오기
    const fetchChampionData = async () => {
      try {
        const response = await fetch(
          "https://ddragon.leagueoflegends.com/cdn/15.2.1/data/ko_KR/champion.json"
        );
        const data = await response.json();

        const koreanNames = {};
        Object.values(data.data).forEach((champion) => {
          koreanNames[champion.id] = champion.name; // 영문 ID를 키로, 한글 이름을 값으로
        });

        setChampionKoreanNames(koreanNames);
      } catch (error) {
        console.error("Failed to fetch champion data:", error);
      }
    };

    fetchChampionData();
  }, []);

  useEffect(() => {
    const fetchMatchData = async () => {
      try {
        const cacheKey = `match-${matchId}-${puuid}`;
        const cachedData = getCachedData(cacheKey);

        if (cachedData) {
          console.log("캐시된 매치 데이터 사용:", matchId);
          setMatchData(cachedData);
          setLoading(false);
          return;
        }

        const res = await fetch(`/api/match/${matchId}?puuid=${puuid}`);
        const data = await res.json();

        if (res.status === 429) {
          const cachedData = getCachedData(cacheKey);
          if (cachedData) {
            console.log("Rate limit - 캐시 데이터 사용:", matchId);
            setMatchData(cachedData);
            setLoading(false);
            return;
          }
          throw new Error("API 호출 제한 초과");
        }

        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

        if (!data.error) {
          console.log("새로운 매치 데이터 캐시:", matchId);
          setCachedData(cacheKey, data);
          setMatchData(data);
        }
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
  if (error) return <div>에러: {error}</div>;
  if (!matchData) return null;

  return (
    <div className="match-card">
      <div
        className="match-header"
        onClick={() => setShowDetail(true)}
        style={{ cursor: "pointer" }}
      >
        {/* 챔피언 이미지 */}
        <img
          src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${matchData.championName}.png`}
          alt={
            championKoreanNames[matchData.championName] ||
            matchData.championName
          }
          className="champion-image"
        />

        {/* 스펠 이미지 */}
        <div className="spell-container">
          <img
            src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/spell/${getSpellKey(
              matchData.summoner1Id
            )}.png`}
            alt={`Spell 1`}
            className="spell-image"
          />
          <img
            src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/spell/${getSpellKey(
              matchData.summoner2Id
            )}.png`}
            alt={`Spell 2`}
            className="spell-image"
          />
        </div>

        <div className="match-info">
          <div className="champion-name">
            {championKoreanNames[matchData.championName] ||
              matchData.championName}
          </div>
          <div className={`match-result ${matchData.win ? "win" : "lose"}`}>
            {matchData.win ? "승리" : "패배"}
          </div>
          <div className="kda">
            {matchData.kills}/{matchData.deaths}/{matchData.assists}
          </div>
        </div>

        {/* 아이템 빌드 */}
        <div className="items-container">
          {[
            matchData.item0,
            matchData.item1,
            matchData.item2,
            matchData.item3,
            matchData.item4,
            matchData.item5,
            matchData.item6,
          ].map(
            (itemId, index) =>
              itemId > 0 && (
                <img
                  key={index}
                  src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${itemId}.png`}
                  alt={`Item ${itemId}`}
                  className="item-image"
                  title={`아이템 ${index + 1}`}
                />
              )
          )}
        </div>
      </div>

      <div className="match-footer">
        <span>
          딜량: {matchData.totalDamageDealtToChampions.toLocaleString()}
        </span>
        <span>{formatDate(matchData.gameStartTimestamp)}</span>
      </div>

      {showDetail && (
        <MatchDetailModal
          matchData={matchData}
          version={version}
          onClose={() => setShowDetail(false)}
        />
      )}
    </div>
  );
};

// 그 다음 메모이제이션
const MemoizedRecentMatches = React.memo(RecentMatches);

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

  const {
    users: storedUsers,
    setUsers: storeUsers,
    shouldFetch,
  } = useUserStore();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [inGameData, setInGameData] = useState(null);
  const [checkingInGame, setCheckingInGame] = useState({}); // 각 유저별 로딩 상태
  const [inGameLoading, setInGameLoading] = useState({}); // 인게임 체크용 별도 상태
  const [loadingMessage, setLoadingMessage] = useState("");

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * randomLoadingKeyword.length);
    setLoadingMessage(randomLoadingKeyword[randomIndex]);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const startTime = Date.now(); // 시작 시간 기록

      try {
        if (!shouldFetch()) {
          setUsers(storedUsers);
        } else {
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
              user.league.find((l) => l.queueType === "RANKED_SOLO_5x5") ||
              null,
            matches: user.matches,
          }));

          setUsers(filteredData);
          storeUsers(filteredData); // store에 데이터 저장
        }
      } catch (err) {
        console.error("❌ 오류 발생:", err);
        setError(err.message);
      } finally {
        const elapsedTime = Date.now() - startTime;
        const minimumLoadingTime = 2000; // 2초

        // 1초와의 차이만큼 더 기다림
        if (elapsedTime < minimumLoadingTime) {
          await new Promise((resolve) =>
            setTimeout(resolve, minimumLoadingTime - elapsedTime)
          );
        }

        setLoading(false);
      }
    };

    fetchData();
  }, [shouldFetch, storedUsers, storeUsers]);

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
      const aLeague = a.league || {}; // league가 배열이 아닌 객체로 가정
      const bLeague = b.league || {};

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

  // 인게임 체크 함수 - 기존 데이터와 완전히 독립적
  const checkInGame = async (puuid) => {
    if (inGameLoading[puuid]) return;

    setInGameLoading((prev) => ({ ...prev, [puuid]: true }));

    try {
      // puuid를 직접 사용
      const res = await fetch(`/api/ingame/${puuid}`);
      const data = await res.json();

      if (!data || data.error) {
        alert("현재 게임중이 아닙니다.");
        return;
      }

      setInGameData(data);
      setModalOpen(true);
    } catch (error) {
      alert("현재 게임중이 아닙니다.");
    } finally {
      setInGameLoading((prev) => ({ ...prev, [puuid]: false }));
    }
  };

  // 로딩 상태일 때 보여줄 컴포넌트
  if (loading)
    return (
      <div className="loading-container">
        <div className="loading-icon">🎮</div>
        <p className="loading-text">{loadingMessage}</p>
        <div style={{ fontSize: "0.9rem", color: "#666", marginTop: "1rem" }}>
          잠시만 기다려주세요...
        </div>
      </div>
    );
  if (error) return <p>오류 발생: {error}</p>;

  // 정렬된 유저 목록에서 대장 찾기
  const findLeader = (users) => {
    const filteredUsers = users.filter(
      (user) => user.summonerName !== "섹디르"
    );
    return filteredUsers.length > 0 ? filteredUsers[0].summonerName : null;
  };

  // 정렬된 유저 목록 사용
  const sortedUsers = sortUsers(users);
  const leaderName = findLeader(sortedUsers);

  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      {/* 음악 플레이어 컴포넌트 */}
      <MusicPlayer />

      <h1>🔹 6명의 유저 정보</h1>
      {sortedUsers.map((user) => (
        <div
          key={user.puuid}
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
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "15px",
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  display: "inline-block",
                  fontWeight: "bold",
                }}
              >
                👤 {user.summonerName}
                {user.summonerName === "섹디르" && (
                  <span
                    style={{
                      marginLeft: "10px",
                      color: "#FF4081",
                      fontWeight: "bold",
                    }}
                  >
                    💀 넘사벽!
                  </span>
                )}
                {user.summonerName === leaderName && (
                  <span
                    style={{
                      marginLeft: "10px",
                      color: "#FFD700",
                      fontWeight: "bold",
                    }}
                  >
                    👑 대장!
                  </span>
                )}
              </h2>
            </div>
            <button
              onClick={() => checkInGame(user.puuid)}
              disabled={inGameLoading[user.puuid]}
              style={{
                padding: "8px 16px",
                backgroundColor: inGameLoading[user.puuid] ? "#ccc" : "#4CAF50",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: inGameLoading[user.puuid] ? "not-allowed" : "pointer",
              }}
            >
              {inGameLoading[user.puuid] ? "확인 중..." : "🎮 인게임"}
            </button>
          </div>

          <div>
            <span style={{ fontWeight: "bold" }}>티어:</span>{" "}
            {user.league
              ? `${user.league.tier} ${user.league.rank}`
              : "Unranked"}
            {user.league && (
              <>
                <span style={{ marginLeft: "10px" }}>
                  <span style={{ fontWeight: "bold" }}>LP:</span>{" "}
                  {user.league.leaguePoints} LP
                </span>
                <span style={{ marginLeft: "10px" }}>
                  <span style={{ fontWeight: "bold" }}>승패:</span>{" "}
                  {user.league.wins}승 {user.league.losses}패
                </span>
              </>
            )}
          </div>

          <MemoizedRecentMatches matches={user.matches} puuid={user.puuid} />
        </div>
      ))}

      <InGameModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setInGameData(null);
        }}
        gameData={inGameData}
      />
    </div>
  );
}
