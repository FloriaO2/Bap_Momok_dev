import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
// 파이어베이스 import 필요 (firebaseApp, database 등)
import { ref, onValue, off } from "firebase/database";
import { database } from "../../../firebase";

interface SuggestCompleteWaitScreenProps {
  groupId: string;
  participantId: string | null;
  router: any;
  timeLeft: string;
  start_votingtime: number;
  group_creation_time: string;
}

interface Participant {
  nickname: string;
  suggest_complete: boolean;
}

interface Candidate {
  name: string;
  type: string;
  detail?: {
    category?: string;
  };
}

const getEmojiForCandidate = (candidate: Candidate): string => {
  if (candidate.type === 'custom') {
    return '🍽️';
  }

  const category = candidate.detail?.category || '';

  if (category.includes('피자') || category.includes('이탈리안')) return '🍕';
  if (category.includes('치킨')) return '🍗';
  if (category.includes('중국집') || category.includes('중식')) return '🥡';
  if (category.includes('일식') || category.includes('돈까스') || category.includes('초밥')) return '🍣';
  if (category.includes('한식')) return '🍚';
  if (category.includes('카페') || category.includes('디저트')) return '☕️';
  
  return '🍽️'; // 기본값
};

const SuggestCompleteWaitScreen: React.FC<SuggestCompleteWaitScreenProps> = ({ groupId, router, timeLeft, start_votingtime, group_creation_time }) => {
  const [participants, setParticipants] = useState<{ [id: string]: Participant }>({});
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [allComplete, setAllComplete] = useState(false);
  const [progressPercent, setProgressPercent] = useState(100);

  useEffect(() => {
    // 파이어베이스 realtimeDB에서 참가자 목록 구독
    const participantsRef = ref(database, `groups/${groupId}/participants`);
    const participantsCallback = (snapshot: any) => {
      const data = snapshot.val() || {};
      setParticipants(data);
      const allDone = Object.values(data).length > 0 && Object.values(data).every((p: any) => p.suggest_complete);
      setAllComplete(allDone);
      if (allDone) router.push(`/tinder?group_id=${groupId}`);
    };
    onValue(participantsRef, participantsCallback);
    return () => off(participantsRef, "value", participantsCallback);
  }, [groupId, router]);

  useEffect(() => {
    // 실시간 후보 목록 구독
    const candidatesRef = ref(database, `groups/${groupId}/candidates`);
    const candidatesCallback = (snapshot: any) => {
      const data = snapshot.val() || {};
      const candidatesArray = Object.values(data);
      console.log('🔍 SuggestCompleteWaitScreen - Firebase 후보 데이터:', data);
      console.log('🔍 SuggestCompleteWaitScreen - 후보 배열:', candidatesArray);
      setCandidates(candidatesArray as Candidate[]);
    };
    onValue(candidatesRef, candidatesCallback);
    return () => off(candidatesRef, "value", candidatesCallback);
  }, [groupId]);

  useEffect(() => {
    // 타이머가 끝나면 자동으로 투표 화면으로 이동
    if (timeLeft === "후보 제안 시간 종료") {
      setTimeout(() => {
        router.push(`/tinder?group_id=${groupId}`);
      }, 1000);
    }
  }, [timeLeft, groupId, router]);

  useEffect(() => {
    // 게이지 퍼센트 계산
    if (start_votingtime && group_creation_time) {
      const timer = setInterval(() => {
        const now = new Date().getTime();
        const creationTime = new Date(group_creation_time).getTime();
        const votingDurationMinutes = start_votingtime;
        const votingTime = creationTime + (votingDurationMinutes * 60 * 1000);
        const totalDuration = votingTime - creationTime;
        const remainingTime = votingTime - now;
        let percent = 0;
        if (remainingTime > 0) {
          percent = (remainingTime / totalDuration) * 100;
        }
        setProgressPercent(Math.max(0, Math.min(100, percent)));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [start_votingtime, group_creation_time]);

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px"
    }}>
      <div style={{
        maxWidth: "400px",
        width: "100%",
        background: "#fff",
        borderRadius: "20px",
        padding: "40px 30px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
        textAlign: "center"
      }}>
        <h2 style={{ fontSize: "24px", fontWeight: "bold", color: "#333", marginBottom: "20px" }}>
          제안 완료 대기 중
        </h2>
        {/* 남은 시간 게이지 */}
        <div style={{ width: "100%", marginBottom: "24px" }}>
          <div style={{ fontSize: "16px", color: "#666", marginBottom: "8px" }}>
            투표까지 남은시간
          </div>
          <div style={{ fontSize: "20px", fontWeight: "bold", color: timeLeft === "후보 제안 시간 종료" ? "#dc3545" : "#333" }}>
            {timeLeft}
          </div>
          {timeLeft === "후보 제안 시간 종료" && (
            <div style={{ 
              fontSize: "14px", 
              color: "#dc3545", 
              marginTop: "5px" 
            }}>
              투표 화면으로 이동합니다.
            </div>
          )}
          <div style={{ width: "100%", height: "8px", background: "#f0f0f0", borderRadius: "4px", marginTop: "10px", overflow: "hidden" }}>
            <div style={{
              width: `${progressPercent}%`,
              height: "100%",
              background: timeLeft === "후보 제안 시간 종료"
                ? "linear-gradient(90deg, #dc3545, #c82333)"
                : "linear-gradient(90deg, #667eea, #764ba2)",
              borderRadius: "4px",
              transition: "width 0.3s ease"
            }}></div>
          </div>
        </div>
        <div style={{ fontSize: "16px", color: "#666", marginBottom: "20px" }}>
          모든 참가자가 제안을 완료하면 투표가 시작됩니다.<br />
        </div>
        <div style={{ marginBottom: "20px" }}>
          <h3 style={{ fontSize: "18px", color: "#333", marginBottom: "10px" }}>참가자 현황</h3>
          <div style={{ 
            maxHeight: '150px', 
            overflowY: 'auto', 
            background: '#f8f9fa', 
            padding: '15px', 
            borderRadius: '8px', 
            border: '1px solid #eee', 
            textAlign: 'center' 
          }}>
            {Object.values(participants).length === 0 ? (
              <div style={{ color: "#999", textAlign: 'center' }}>참가자 정보를 불러오는 중...</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {Object.values(participants).map((p, idx) => (
                  <div key={idx} style={{
                    color: p.suggest_complete ? "#28a745" : "#999",
                    fontWeight: p.suggest_complete ? "bold" : undefined,
                    fontSize: "16px"
                  }}>
                    {p.nickname} {p.suggest_complete ? "✔" : "(제안 중...)"}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {/* 실시간 후보 목록 */}
        <div style={{ marginBottom: "20px" }}>
          <h3 style={{ fontSize: "18px", color: "#333", marginBottom: "10px" }}>실시간 후보 목록</h3>
          <div style={{ 
            maxHeight: '150px', 
            overflowY: 'auto', 
            background: '#f8f9fa', 
            padding: '15px', 
            borderRadius: '8px', 
            border: '1px solid #eee', 
            textAlign: 'center' 
          }}>
            {candidates.length === 0 ? (
              <div style={{ color: "#999", textAlign: 'center' }}>아직 추가된 후보가 없습니다.</div>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {candidates.map((candidate, index) => (
                  <li key={index} style={{
                    paddingBottom: index < candidates.length - 1 ? '10px' : '0',
                    borderBottom: index < candidates.length - 1 ? '1px solid #e9ecef' : 'none'
                  }}>
                    {`${getEmojiForCandidate(candidate)} ${candidate.name || '이름 없음'}`}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div style={{ fontSize: "15px", color: allComplete ? "#28a745" : "#666", fontWeight: allComplete ? "bold" : undefined }}>
          {allComplete 
            ? <>
                모든 참가자가 제안을 완료했습니다!
                <br />
                곧 투표가 시작됩니다.
              </>
            : <>
                모든 참가자가 제안을 완료하면 투표가 시작됩니다.<br/>
                다른 참가자들이 제안을 완료할 때까지 기다려주세요.
              </>
          }
        </div>
      </div>
    </div>
  );
};

export default SuggestCompleteWaitScreen; 