"use client";
import { useState, useEffect, useRef, memo, useCallback } from "react";

// 별도 컴포넌트로 분리하여 메모이제이션 적용
const MusicPlayer = memo(() => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);

  // 음악 플레이리스트
  const playlist = [
    {
      title: "차민우는 술취해",
      artist: "술민우",
      src: "/music/차민우는 술취해.mp3",
      lyrics: `[Verse]
      차민우는 술취해 오늘도 취했대
      잠들어도 답이 없대 침대 위에 누웠대
      우산달라 외치며 전화만 반복해
      사라져서 어디갔냐 미스테리 같대
      
      [Chorus]
      차민우는 술취해 술취하면 잠들어
      술취하면 전화해 우산 달라고 하고
      차민우는 술취해 가끔은 또 사라져
      술취한 너 귀여워 솔직히 말해볼까
      
      [Verse 2]
      동네마다 흔들리며 걷는 그 모양새
      장난스런 얼굴하며 안주를 집었대
      친구들 앞에서 더 소란을 펼쳤대
      술잔 위에 달을 보며 생각했대 뭐래
      
      [Chorus]
      차민우는 술취해 술취하면 잠들어
      술취하면 전화해 우산 달라고 하고
      차민우는 술취해 결국은 또 사라져
      술 취한 너
      귀여워 멈출 수 없어 웃어
      
      [Bridge]
      별이 빛나 별이 떨어 그 빈잔 속에서
      웃음소리 넘쳐났어 어디 있는 걸까
      불쑥 나타나서 말해 "내 우산을 봤어?"
      장난꾸러기 미소에 난 반해버렸어
      
      [Chorus]
      차민우는 술취해 술취하면 잠들어
      술취하면 전화해 우산 달라고 하고
      차민우는 술취해 가끔은 또 사라져
      술취한 네 모습에 난 사랑을 느껴져`,
    },
    {
      title: "쿠팡맨의 노래",
      artist: "빡구컷",
      src: "/music/쿠팡맨의 노래.mp3",
      lyrics: `[Verse]
승식이는 쿠팡맨 오늘도 뛰어요
피곤한 몸뚱이로 하루를 채워요
무거운 박스들이 나를 기다리고
그 박스에 내 마음을 눌러놔요

[Chorus]
박스를 주먹으로 내리쳐요
아 화가나요 탑룰루 해야해요
그것만이 내 유일한 탈출구
리듬과 함께 스트레스 날려요

[Verse 2]
택배 터미널은 전쟁터 같아요
사람들 속에서 나는 길을 찾아요
마음 같아선 다 던져버리고
바다로 가서 쉬고 싶어요

[Chorus]
박스를 주먹으로 내리쳐요
아 화가나요 탑룰루 해야해요
그것만이 내 유일한 탈출구
리듬과 함께 스트레스 날려요

[Bridge]
팔은 아프고 시간은 멀죠
나는 단지 쉬고 싶을 뿐이죠
음악 속에서 나는 찾죠
내 리듬 내 세계 그 자유를

[Chorus]
박스를 주먹으로 내리쳐요
아 화가나요 탑룰루 해야해요
그것만이 내 유일한 탈출구
리듬과 함께 스트레스 날려요`,
    },
    {
      title: "대방동욕쟁이종원",
      artist: "서일순대맨",
      src: "/music/대방동욕쟁이종원.mp3",
      lyrics: `[Verse]
    종원이는 오늘도 롤을하며 화를 내요
왜 우리팀 정글은 저렇게 하지요
화가 머리끝까지 났지만 어쩌나요
세상엔 맛있는 것들 많아요

[Chorus]
순대국밥은 나의 위로 가득 차요
서일순대국이 나를 꼭 안아줘요
게임 속 화살은 나를 향하더라도
뜨끈한 국물 속엔 평화가 있어요

[Verse 2]
친구들이랑 같이 게임을 시작해요
우리팀 정글은 왜 또 딴 곳에 가나요
화가 누적되지만 울지 않아요
내 머릿속엔 이미 순대국밥 있어요

[Chorus]
순대국밥은 나의 위로 가득 차요
서일순대국이 나를 꼭 안아줘요
게임 속 화살은 나를 향하더라도
뜨끈한 국물 속엔 평화가 있어요

[Bridge]
피치피치 실로폰이 두들겨주며
리코더가 우리 마음을 가볍게 해줘요
롤이 뭐길래 내가 이렇게 웃게 되나
순대국밥 덕분에 행복 속으로

[Chorus]
순대국밥은 나의 위로 가득 차요
서일순대국이 나를 꼭 안아줘요
게임 속 화살은 나를 향하더라도
뜨끈한 국물 속엔 평화가 있어요`,
    },
    {
      title: "최강자리신",
      artist: "움치기",
      src: "/music/최강자리신.mp3",
      lyrics: `[Chorus]
최우민 정글 못해
최우민 리신 못해 야

[Chorus]
최우민 정글 못해
최우민 리신 못해 야

[Chorus]
최우민 정글 못해
최우민 리신 못해 야

[Chorus]
최우민 정글 못해
최우민 리신 못해 야

[Chorus]
최우민 정글 못해
최우민 리신 못해 야

[Chorus]
최우민 정글 못해
최우민 리신 못해 야
      
      `,
    },
    {
      title: "나는 최백규니까",
      artist: "섹디르",
      src: "/music/나는 최백규니까.mp3",
      lyrics: `[Verse 1]
깊은 숲속 어둠이 깔려
나의 길은 여기서 시작돼
용의 울음은 멀어지는데
이 손으로 운명을 쥘 거야

[Chorus]
나는 오늘도 캐리한다
리신 정글 또 용을 뺏겼어
워윅 탑에서 솔킬 또 따였어
괜찮아 난 최백규니까

[Verse 2]
칼끝의 빛은 길을 비추고
발걸음은 흔들림이 없어
잿더미 속 피어난 꽃처럼
내게도 기회는 올 테니까

[Chorus]
나는 오늘도 캐리한다
리신 정글 또 용을 뺏겼어
자이라야
그걸 들어가면 안되지
괜찮아 난 최백규니까

[Bridge]
북소리 내 심장과 함께 두드려
어둠 속에서도 내가 빛난다
전사의 혼이 나를 감싸 안아
세상의 끝이라도 닿는다

[Chorus]
나는 오늘도 캐리한다
적의 함정을 뚫고 나갔어
팀원 모두가 쓰러져도 괜찮아
나는 최백규니까
      `,
    },
  ];

  // 컴포넌트 마운트시 오디오 설정
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = 0.3;
      audioRef.current.addEventListener("ended", playNextSong);
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener("ended", playNextSong);
      }
    };
  }, []);

  // 현재 노래 변경시 마다 실행
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.src = playlist[currentSongIndex].src;
      if (isPlaying) {
        audioRef.current.play();
      }
    }
  }, [currentSongIndex]);

  // useCallback으로 핸들러 함수 메모이제이션
  const togglePlay = useCallback(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying((prev) => !prev);
    }
  }, [isPlaying]);

  const playNextSong = useCallback(() => {
    setCurrentSongIndex((prevIndex) =>
      prevIndex === playlist.length - 1 ? 0 : prevIndex + 1
    );
  }, [playlist.length]);

  const playPrevSong = useCallback(() => {
    setCurrentSongIndex((prevIndex) =>
      prevIndex === 0 ? playlist.length - 1 : prevIndex - 1
    );
  }, [playlist.length]);

  const selectSong = useCallback(
    (index) => {
      setCurrentSongIndex(index);
      if (!isPlaying) {
        setIsPlaying(true);
      }
    },
    [isPlaying]
  );

  const togglePlaylist = useCallback(() => {
    setShowPlaylist((prev) => !prev);
    if (showLyrics) setShowLyrics(false);
  }, [showLyrics]);

  const toggleLyrics = useCallback(() => {
    setShowLyrics((prev) => !prev);
    if (showPlaylist) setShowPlaylist(false);
  }, [showPlaylist]);

  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        zIndex: 100,
        background: "rgba(25, 25, 25, 0.85)",
        borderRadius: "10px",
        padding: "10px",
        color: "white",
        boxShadow: "0 3px 10px rgba(0,0,0,0.3)",
        width: "300px",
      }}
    >
      {/* 현재 재생 정보 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "10px",
        }}
      >
        <div>
          <div style={{ fontWeight: "bold" }}>
            {playlist[currentSongIndex].title}
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={toggleLyrics}
            style={{
              background: "transparent",
              border: "none",
              color: "white",
              fontSize: "1.2em",
              cursor: "pointer",
            }}
          >
            📝
          </button>
          <button
            onClick={togglePlaylist}
            style={{
              background: "transparent",
              border: "none",
              color: "white",
              fontSize: "1.2em",
              cursor: "pointer",
            }}
          >
            &#9776;
          </button>
        </div>
      </div>

      {/* 컨트롤 버튼 */}
      <div style={{ display: "flex", justifyContent: "center", gap: "15px" }}>
        <button
          onClick={playPrevSong}
          style={{
            background: "transparent",
            border: "none",
            color: "white",
            fontSize: "1.5em",
            cursor: "pointer",
          }}
        >
          ⏮
        </button>
        <button
          onClick={togglePlay}
          style={{
            background: isPlaying ? "#f44336" : "#4CAF50",
            border: "none",
            borderRadius: "50%",
            width: "40px",
            height: "40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.2em",
            cursor: "pointer",
          }}
        >
          {isPlaying ? "⏸" : "▶"}
        </button>
        <button
          onClick={playNextSong}
          style={{
            background: "transparent",
            border: "none",
            color: "white",
            fontSize: "1.5em",
            cursor: "pointer",
          }}
        >
          ⏭
        </button>
      </div>

      {/* 가사 표시 영역 */}
      {showLyrics && (
        <div
          style={{
            marginTop: "10px",
            maxHeight: "200px",
            overflowY: "auto",
            borderTop: "1px solid rgba(255,255,255,0.2)",
            paddingTop: "10px",
            whiteSpace: "pre-line",
            fontSize: "0.9em",
            lineHeight: "1.4",
          }}
        >
          {playlist[currentSongIndex].lyrics}
        </div>
      )}

      {/* 플레이리스트 */}
      {showPlaylist && (
        <div
          style={{
            marginTop: "10px",
            maxHeight: "200px",
            overflowY: "auto",
            borderTop: "1px solid rgba(255,255,255,0.2)",
            paddingTop: "10px",
          }}
        >
          {playlist.map((song, index) => (
            <div
              key={index}
              onClick={() => selectSong(index)}
              style={{
                padding: "5px 10px",
                cursor: "pointer",
                background:
                  index === currentSongIndex
                    ? "rgba(255,255,255,0.2)"
                    : "transparent",
                borderRadius: "5px",
                marginBottom: "5px",
              }}
            >
              {song.title}
            </div>
          ))}
        </div>
      )}

      {/* 오디오 요소 */}
      <audio ref={audioRef} />
    </div>
  );
});

MusicPlayer.displayName = "MusicPlayer";

export default MusicPlayer;
