"use client";
import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { ref, onValue, off } from "firebase/database";
import { database } from "../../../firebase";
import DirectTab from '../../components/suggest/DirectTab';
import DeliveryTab from '../../components/suggest/DeliveryTab';
import SuggestCompleteWaitScreen from '../../components/suggest/SuggestCompleteWaitScreen';
import SlotMachineRoulette from '../../components/suggest/SlotMachineRoulette';

export default function SuggestPage({ params }: { params: Promise<{ group_id: string }> }) {
  const resolvedParams = use(params);
  const groupId = resolvedParams.group_id;
  
  const router = useRouter();
  const [groupData, setGroupData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'direct' | 'delivery'>('direct');
  const [timeLeft, setTimeLeft] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };
  const [showSuggestCompleteScreen, setShowSuggestCompleteScreen] = useState(false);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [showRandomModal, setShowRandomModal] = useState(false);
  
  // 이미 등록된 후보 ID 목록을 실시간으로 관리하기 위한 상태
  const [registeredYogiyoIds, setRegisteredYogiyoIds] = useState<number[]>([]);
  const [registeredKakaoIds, setRegisteredKakaoIds] = useState<number[]>([]);

  // URL 정규화 함수 - 끝에 슬래시 제거
  const normalizeUrl = (url: string) => {
    return url.endsWith('/') ? url.slice(0, -1) : url;
  };

  const BACKEND_URL = normalizeUrl(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000');

  // 실시간으로 후보 목록 감지
  useEffect(() => {
    if (!groupId) return;

    const candidatesRef = ref(database, `groups/${groupId}/candidates`);
    const candidatesCallback = (snapshot: any) => {
      // 현재 URL이 /suggest/로 시작하지 않으면 콜백 즉시 종료
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/suggest/")) {
        console.log("❌ 현재 페이지가 suggest가 아님. 리스너 콜백 종료");
        return;
      }
      console.log('⚡ 후보 리스너 작동함!', groupId);
      const candidatesData = snapshot.val();
      if (candidatesData) {
        const allCandidates = Object.values(candidatesData);
        
        const yogiyoIds = allCandidates
          .filter((c: any) => c.type === 'yogiyo' && c.detail?.yogiyo_id)
          .map((c: any) => c.detail.yogiyo_id);
        
        const kakaoIds = allCandidates
          .filter((c: any) => c.type === 'kakao' && c.detail?.kakao_id)
          .map((c: any) => Number(c.detail.kakao_id));
          
        setRegisteredYogiyoIds(yogiyoIds);
        setRegisteredKakaoIds(kakaoIds);
      }
    };
    onValue(candidatesRef, candidatesCallback);
    console.log('✅ 후보 리스너 등록됨!', groupId);

    // 컴포넌트가 언마운트될 때 리스너 정리
    return () => {
      console.log('🔥 후보 리스너 해제됨!', groupId);
      off(candidatesRef, "value", candidatesCallback);
    };
  }, [groupId]);

  // 그룹 데이터에서 선택된 옵션 확인
  const hasDelivery = groupData?.delivery;
  const hasOffline = groupData?.offline;
  
  // 탭 표시 여부 결정
  const showDirectTab = hasOffline;
  const showDeliveryTab = hasDelivery;
  
  // 초기 탭 설정 (그룹 데이터 로드 후)
  useEffect(() => {
    if (groupData) {
      if (hasOffline && !hasDelivery) {
        setActiveTab('direct');
      } else if (hasDelivery && !hasOffline) {
        setActiveTab('delivery');
      } else if (hasDelivery && hasOffline) {
        setActiveTab('direct'); // 둘 다 있으면 기본값
      }
    }
  }, [groupData, hasDelivery, hasOffline]);

  // 게이지 퍼센트 계산
  const getProgressPercentage = () => {
    if (!groupData?.start_votingtime || !groupData?.group_creation_time) {
      return 100;
    }
    
    const now = new Date().getTime();
    const creationTime = new Date(groupData.group_creation_time).getTime();
    
    const votingDurationMinutes = groupData.start_votingtime;
    const votingTime = creationTime + (votingDurationMinutes * 60 * 1000);
    
    const totalDuration = votingTime - creationTime;
    const remainingTime = votingTime - now;
    
    if (remainingTime <= 0) return 0;
    
    const remainingPercentage = (remainingTime / totalDuration) * 100;
    
    return Math.max(0, Math.min(100, remainingPercentage));
  };

  // 그룹 데이터 가져오기
  useEffect(() => {
    const fetchGroupData = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/groups/${groupId}`);
        if (response.ok) {
          const data = await response.json();
          setGroupData(data);
        }
      } catch (error) {
        console.error("그룹 데이터 가져오기 실패:", error);
      }
    };
    fetchGroupData();
  }, [groupId, BACKEND_URL]);

  // 투표 시간 계산
  useEffect(() => {
    if (groupData?.start_votingtime && groupData?.group_creation_time) {
      const timer = setInterval(() => {
        const now = new Date().getTime();
        const creationTime = new Date(groupData.group_creation_time).getTime();
        const votingDurationMinutes = groupData.start_votingtime;
        const votingTime = creationTime + (votingDurationMinutes * 60 * 1000);
        const timeDiff = votingTime - now;
        
        if (timeDiff > 0) {
          const hours = Math.floor(timeDiff / (1000 * 60 * 60));
          const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
          
          if (hours > 0) {
            setTimeLeft(`${hours}시간 ${minutes}분`);
          } else if (minutes > 0) {
            setTimeLeft(`${minutes}분 ${seconds}초`);
          } else {
            setTimeLeft(`${seconds}초`);
          }
        } else {
          setTimeLeft("후보 제안 시간 종료");
          // 투표 시간이 끝나면 3초 후 결과 화면으로 이동
          setTimeout(() => {
            router.push(`/tinder?group_id=${groupId}`);
          }, 3000);
        }
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [groupData, groupId, router]);

  useEffect(() => {
    // 참가자 ID를 sessionStorage에서 groupId별로 읽음
    if (typeof window !== 'undefined') {
      setParticipantId(sessionStorage.getItem(`participant_id_${groupId}`));
    }
  }, [groupId]);

  // 제안 완료 처리
  const handleSuggestComplete = async () => {
    if (!participantId) return;
    setShowSuggestCompleteScreen(true); // 먼저 대기 화면으로 전환
    await fetch(`${BACKEND_URL}/groups/${groupId}/participants/${participantId}/suggest-complete`, { method: 'POST' });
  };

  // 카카오 후보 추가 함수
  const addKakaoCandidate = async (restaurant: any) => {
    try {
      const response = await fetch(`${BACKEND_URL}/groups/${groupId}/candidates/kakao`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          added_by: participantId || 'web_user',
          kakao_data: restaurant
        }),
      });
      if (response.ok) {
        showToast(`${restaurant.place_name || restaurant.name}이(가) 후보에 추가되었습니다!`);
      } else {
        const errorData = await response.json();
        showToast(`후보 추가에 실패했습니다: ${errorData.detail}`);
      }
    } catch (error) {
      console.error('카카오 후보 추가 오류:', error);
      showToast('카카오 후보 추가 중 오류가 발생했습니다.');
    }
  };

  // 요기요 후보 추가 함수
  const addYogiyoCandidate = async (restaurant: any) => {
    try {
      const response = await fetch(`${BACKEND_URL}/groups/${groupId}/candidates/yogiyo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          added_by: participantId || 'web_user',
          yogiyo_data: restaurant
        }),
      });
      if (response.ok) {
        showToast(`${restaurant.name}이(가) 후보에 추가되었습니다!`);
      } else {
        const errorData = await response.json();
        showToast(`후보 추가 실패: ${errorData.detail}`);
      }
    } catch (error) {
      console.error('요기요 후보 추가 오류:', error);
      showToast('요기요 후보 추가 중 오류가 발생했습니다.');
    }
  };

  // --- 기존의 ID 목록 추출 로직은 실시간 리스너로 대체되었으므로 모두 삭제 ---

  if (!groupData) {
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
          background: "#fff", 
          borderRadius: "20px", 
          padding: "40px", 
          textAlign: "center",
          boxShadow: "0 10px 30px rgba(0,0,0,0.2)"
        }}>
          <div style={{ color: "#333", fontSize: "18px" }}>그룹 정보를 불러오는 중...</div>
        </div>
      </div>
    );
  }

  if (showSuggestCompleteScreen) {
    return (
      <SuggestCompleteWaitScreen
        groupId={groupId}
        participantId={participantId}
        router={router}
        timeLeft={timeLeft}
        start_votingtime={groupData?.start_votingtime}
        group_creation_time={groupData?.group_creation_time}
      />
    );
  }

  return (
    <div style={{ 
      minHeight: "100vh", 
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      padding: "20px",
      fontFamily: "Arial, sans-serif"
    }}>
      {toast && (
        <div style={{
          position: "fixed",
          bottom: "40px",
          left: "50%",
          transform: "translateX(-50%)",
          background: "#333",
          color: "#fff",
          padding: "16px 32px",
          borderRadius: "24px",
          fontSize: "16px",
          zIndex: 10000,
          boxShadow: "0 4px 16px rgba(0,0,0,0.2)"
        }}>
          {toast}
        </div>
      )}
      <div style={{ 
        maxWidth: "600px", 
        margin: "0 auto", 
        background: "#fff", 
        borderRadius: "20px", 
        padding: "30px", 
        boxShadow: "0 10px 30px rgba(0,0,0,0.2)"
      }}>
        {/* 헤더 */}
        <div style={{ marginBottom: "30px" }}>
          <h1 style={{ 
            fontSize: "32px", 
            fontWeight: "bold", 
            color: "#333", 
            marginBottom: "30px",
            textAlign: "center"
          }}>
            투표 후보 선택
          </h1>
          
          {/* 투표 시간 */}
          <div style={{ marginBottom: "30px", textAlign: "center" }}>
            <div style={{ 
              fontSize: "16px", 
              color: "#666", 
              marginBottom: "10px" 
            }}>
              투표까지 남은시간
            </div>
            <div style={{ 
              fontSize: "20px", 
              fontWeight: "bold", 
              color: timeLeft === "후보 제안 시간 종료" ? "#dc3545" : "#333" 
            }}>
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
            {/* 진행바 */}
            <div style={{ 
              width: "100%", 
              height: "8px", 
              background: "#f0f0f0", 
              borderRadius: "4px", 
              marginTop: "10px",
              overflow: "hidden"
            }}>
              <div style={{ 
                width: `${getProgressPercentage()}%`, 
                height: "100%", 
                background: timeLeft === "후보 제안 시간 종료" 
                  ? "linear-gradient(90deg, #dc3545, #c82333)" 
                  : "linear-gradient(90deg, #667eea, #764ba2)", 
                borderRadius: "4px",
                transition: "width 0.3s ease"
              }}></div>
            </div>
          </div>

          {/* 메인 탭 - 둘 다 선택된 경우에만 표시 */}
          {showDirectTab && showDeliveryTab && (
            <div style={{ 
              display: "flex", 
              borderBottom: "1px solid #e0e0e0",
              marginBottom: "15px"
            }}>
              <button
                onClick={() => setActiveTab('direct')}
                style={{ 
                  flex: 1,
                  padding: "12px",
                  background: "none",
                  border: "none",
                  fontSize: "16px",
                  fontWeight: "600",
                  color: activeTab === 'direct' ? "#333" : "#999",
                  borderBottom: activeTab === 'direct' ? "2px solid #994d52" : "none",
                  cursor: "pointer"
                }}
              >
                직접가기
              </button>
              <button
                onClick={() => setActiveTab('delivery')}
                style={{ 
                  flex: 1,
                  padding: "12px",
                  background: "none",
                  border: "none",
                  fontSize: "16px",
                  fontWeight: "600",
                  color: activeTab === 'delivery' ? "#333" : "#999",
                  borderBottom: activeTab === 'delivery' ? "2px solid #994d52" : "none",
                  cursor: "pointer"
                }}
              >
                배달
              </button>
            </div>
          )}
        </div>

        {/* 탭 컨텐츠 */}
        {activeTab === 'direct' && showDirectTab && (
          <DirectTab 
            groupData={groupData}
            groupId={groupId}
            onAddCandidate={addKakaoCandidate}
            registeredCandidateIds={registeredKakaoIds}
          />
        )}
        
        {activeTab === 'delivery' && showDeliveryTab && (
          <DeliveryTab 
            groupData={groupData}
            groupId={groupId}
            onAddCandidate={addYogiyoCandidate}
            registeredCandidateIds={registeredYogiyoIds}
          />
        )}

        {/* 하단 버튼 위에 랜덤 룰렛 돌리기 버튼/모달 추가 */}
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <button
            style={{
              background: '#994d52',
              color: '#fff',
              fontSize: '18px',
              padding: '10px 28px',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
            onClick={() => setShowRandomModal(true)}
          >
            슬롯머신 돌리기
          </button>
        </div>
        {showRandomModal && (
          <SlotMachineRoulette
            groupId={groupId}
            registeredKakaoIds={registeredKakaoIds}
            registeredYogiyoIds={registeredYogiyoIds}
            activeTab={activeTab}
            onAddCandidate={async (candidate: any) => {
              if (candidate.type === 'kakao') {
                await addKakaoCandidate(candidate.detail || candidate);
                // 팝업을 닫지 않고 그대로 유지
              } else if (candidate.type === 'yogiyo') {
                await addYogiyoCandidate(candidate.detail || candidate);
                // 팝업을 닫지 않고 그대로 유지
              } else {
                showToast('알 수 없는 타입의 후보입니다.');
              }
            }}
            onClose={() => setShowRandomModal(false)}
          />
        )}
        {/* 하단 버튼 */}
        <div style={{ 
          marginTop: "30px",
          display: "flex",
          gap: "15px"
        }}>
          <button
            onClick={handleSuggestComplete}
            disabled={!participantId}
            style={{ 
              flex: 1,
              background: "#994d52",
              color: "#fff", 
              border: "none",
              borderRadius: "25px", 
              padding: "15px 30px", 
              fontSize: "16px",
              fontWeight: "bold",
              cursor: !participantId ? "not-allowed" : "pointer",
              transition: "all 0.3s ease"
            }}
            onMouseOver={(e) => {
              if (participantId) {
                e.currentTarget.style.background = "#8a4449";
                e.currentTarget.style.transform = "translateY(-2px)";
              }
            }}
            onMouseOut={(e) => {
              if (participantId) {
                e.currentTarget.style.background = "#994d52";
                e.currentTarget.style.transform = "translateY(0)";
              }
            }}
          >
            제안 완료
          </button>
        </div>
      </div>
    </div>
  );
} 