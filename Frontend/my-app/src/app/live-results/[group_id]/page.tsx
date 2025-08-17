"use client";
import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { database } from "@/firebase";
import { ref, onValue, off } from "firebase/database";
import { useRouter } from "next/navigation";

// participate 페이지와 동일한 firebaseConfig 사용
export default function LiveResultsPage() {
  const params = useParams();
  const groupId = params.group_id;
  const [candidates, setCandidates] = useState<any[]>([]);
  const [groupData, setGroupData] = useState<any>(null);
  const [votingProgress, setVotingProgress] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [clickCount, setClickCount] = useState<number>(0);
  const [lastClickTime, setLastClickTime] = useState<number>(0);

  useEffect(() => {
    if (!groupId) return;
    // 후보 실시간 업데이트 (Firebase)
    const candidatesRef = ref(database, `groups/${groupId}/candidates`);
    const candidatesCallback = (snapshot: any) => {
      const data = snapshot.val() || {};
      const arr = Object.entries(data).map(([id, c]: any) => ({
        id,
        ...c,
        score:
          (c.good || 0) * 1 +
          (c.soso || 0) * 0 +
          (c.bad || 0) * -2 +
          (c.never || 0) * -10,
      }));
      arr.sort((a, b) => b.score - a.score);
      arr.forEach((c, i) => (c.rank = i + 1));
      setCandidates(arr);
    };
    onValue(candidatesRef, candidatesCallback);
    // 투표 정보(votes, participants)도 실시간 반영
    const groupRef = ref(database, `groups/${groupId}`);
    const groupCallback = (snapshot: any) => {
      const groupData = snapshot.val() || {};
      setGroupData(groupData);
      // 투표 진행률 계산
      const participantsObj = groupData.participants || {};
      const totalParticipants = Object.keys(participantsObj).length;
      const completedParticipants = Object.values(participantsObj).filter((p: any) => p.vote_complete).length;
      const progress = totalParticipants > 0 ? (completedParticipants / totalParticipants) * 100 : 0;
      setVotingProgress(progress);
    };
    onValue(groupRef, groupCallback);
    return () => {
      off(candidatesRef, "value", candidatesCallback);
      off(groupRef, "value", groupCallback);
    };
  }, [groupId]);

  console.log("candidates state:", candidates);

  // 20회 클릭 시 best-couple 페이지로 이동하는 핸들러 (이스터에그)
  const handleSecretClick = () => {
    // 이미 10회 이상 클릭했으면 무시
    if (clickCount >= 10) {
      return;
    }
    
    const now = Date.now();
    
    // 1초 내에 클릭해야 연속으로 인정 (시간 제한 단축)
    if (now - lastClickTime > 1000) {
      setClickCount(1);
      setLastClickTime(now);
      
      // 디버그용: 터치 카운트를 화면에 표시 (임시)
      console.log(`터치 카운트: 1/10`);
      
      // 1회 클릭 시 즉시 이동 (테스트용)
      if (1 >= 10) {
        console.log('10회 터치 완료! best-couple로 이동합니다.');
        window.location.href = `/best-couple/${groupId}`;
      }
    } else {
      const newCount = clickCount + 1;
      setClickCount(newCount);
      setLastClickTime(now);
      
      // 디버그용: 터치 카운트를 화면에 표시 (임시)
      console.log(`터치 카운트: ${newCount}/10`);
      
      // 즉시 이동 체크
      if (newCount >= 10) {
        console.log('10회 터치 완료! best-couple로 이동합니다.');
        window.location.href = `/best-couple/${groupId}`;
      }
    }
  };

  // 후보별로 옵션별 투표자 닉네임 목록 반환 함수
  const getVoteMembersByOption = (candidateId: string | number, option: string): string[] => {
    if (!groupData?.votes) return [];
    return Object.entries(groupData.votes as Record<string, Record<string, string>>)
      .filter(([participantId, votes]) => votes[String(candidateId)] === option)
      .map(([participantId]) => groupData.participants?.[participantId]?.nickname || participantId);
  };

  const tooltipStyle: React.CSSProperties = {
    position: 'absolute',
    top: '150%', // 아래로 위치 변경
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#fff', // 밝은 배경색
    color: '#333', // 어두운 글자색
    padding: '8px 12px',
    borderRadius: '8px',
    fontSize: '14px',
    whiteSpace: 'nowrap',
    zIndex: 10,
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)', // 그림자 조정
    textAlign: 'left',
    pointerEvents: 'none',
    width: 'max-content'
  };

  const tooltipArrowStyle: React.CSSProperties = {
    position: 'absolute',
    top: '-4px', // 화살표 위치 위로 변경
    left: '50%',
    transform: 'translateX(-50%) rotate(45deg)',
    width: '8px',
    height: '8px',
    background: '#fff', // 배경색과 동일하게
  };

  const VoteDisplay = ({ candidateId, option, emoji, count }: { candidateId: string, option: string, emoji: string, count: number }) => {
    const tooltipId = `${candidateId}-${option}`;
    const members = getVoteMembersByOption(candidateId, option);

    return (
      <span
        style={{ position: 'relative', cursor: 'pointer' }}
        onMouseEnter={() => setActiveTooltip(tooltipId)}
        onMouseLeave={() => setActiveTooltip(null)}
      >
        {emoji} {count}
        {activeTooltip === tooltipId && (
          <div style={tooltipStyle}>
            {members.length > 0
              ? members.map(name => <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '2px 0' }}>👤<span>{name}</span></div>)
              : <div style={{ padding: '2px 0' }}>투표자 없음</div>
            }
            <div style={tooltipArrowStyle} />
          </div>
        )}
      </span>
    );
  };

  const medalColors = [
    'linear-gradient(90deg, #FFD700 0%, #FFEF8A 100%)', // 금
    'linear-gradient(90deg, #C0C0C0 0%, #E0E0E0 100%)', // 은
    'linear-gradient(90deg, #CD7F32 0%, #E3B778 100%)', // 동
  ];

  const medalEmojis = ['🥇', '🥈', '🥉'];

  return (
    <>
      <style>{`
        .live-title-strong {
          color: #222 !important;
          font-weight: 700;
          font-size: 28px;
          background: none !important;
          -webkit-text-stroke: 0px #222;
        }
      `}</style>
      <div 
        style={{ 
          minHeight: "100vh", 
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          padding: "20px",
          fontFamily: "Arial, sans-serif",
          cursor: "pointer"
        }}
        onClick={handleSecretClick}
        onTouchStart={handleSecretClick}
      >
                  <div 
            style={{ 
              maxWidth: "600px", 
              margin: "0 auto", 
              background: "#fff", 
              borderRadius: "20px", 
              padding: "30px", 
              boxShadow: "0 10px 30px rgba(0,0,0,0.2)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
          {/* 제목 */}
          <h1 style={{ 
            fontSize: "3.2vh", 
            fontWeight: "bold", 
            color: "#333", 
            marginBottom: "3.6vh",
            textAlign: "center"
          }}>
            🏆 투표 결과 🏆
          </h1>
          {candidates.length === 0 ? (
            <div style={{ color: "#888", fontSize: "2.2vh", fontWeight: "bold", textAlign: "center", padding: "7.2vh 0" }}>
              후보가 없습니다.
            </div>
          ) : (
            <AnimatePresence>
              {candidates.map((c, idx) => (
                <motion.div
                  key={c.id}
                  layout
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -30 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  style={{
                    background: idx < 3 ? medalColors[idx] : "#fff",
                    borderRadius: 12,
                    marginBottom: 16,
                    padding: 20,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    color: "#222"
                  }}
                >
                  <div style={{ fontSize: "2.4vh", fontWeight: "bold", width: "3.8vh", textAlign: "center", color: "#222" }}>
                    {c.rank <= 3 ? (
                      <span>{medalEmojis[c.rank - 1]}</span>
                    ) : (
                      c.rank
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "2.03vh", fontWeight: 600, color: "#222" }}>{c.name}</div>
                    <div style={{ fontSize: "1.5vh", color: "#888", display: 'flex', gap: '1.4vh', marginTop: '0.5vh' }}>
                      <VoteDisplay candidateId={c.id} option="good" emoji="👍" count={c.good || 0} />
                      <VoteDisplay candidateId={c.id} option="soso" emoji="👌" count={c.soso || 0} />
                      <VoteDisplay candidateId={c.id} option="bad" emoji="👎" count={c.bad || 0} />
                      <VoteDisplay candidateId={c.id} option="never" emoji="🚫" count={c.never || 0} />
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
          {/* 하단 홈으로 가기 버튼 */}
          <div style={{ marginTop: "30px", textAlign: "center", display: "flex", gap: "15px", justifyContent: "center" }}>
            <button
              onClick={() => window.location.href = '/'}
              style={{ 
                background: "#dc3545", 
                color: "#fff", 
                border: "none", 
                borderRadius: "25px", 
                padding: "12px 24px", 
                fontSize: "16px", 
                fontWeight: "bold", 
                cursor: "pointer",
                transition: "all 0.3s ease"
              }}
              onMouseOver={e => {
                e.currentTarget.style.background = "#c82333";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseOut={e => {
                e.currentTarget.style.background = "#dc3545";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              홈으로 가기
            </button>
          </div>
        </div>
      </div>
    </>
  );
} 