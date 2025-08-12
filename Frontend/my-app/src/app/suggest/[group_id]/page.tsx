"use client";
import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { ref, onValue, off } from "firebase/database";
import { database, checkFirebaseConnection } from "../../../firebase";
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
  
  // 부채꼴 검색 결과를 상위 컴포넌트에서 관리
  const [sectorSearchResults, setSectorSearchResults] = useState<any[]>([]);
  const [hasSectorSearchCompleted, setHasSectorSearchCompleted] = useState(false);
  
  // 탭별 로딩 상태 관리
  const [directTabLoading, setDirectTabLoading] = useState(false);
  const [deliveryTabLoading, setDeliveryTabLoading] = useState(false);
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

  // Firebase 연결 상태 확인
  useEffect(() => {
    const checkConnection = async () => {
      console.log('🔍 Firebase 연결 상태 확인 시작...');
      const isConnected = await checkFirebaseConnection();
      console.log('📊 Firebase 연결 상태:', isConnected);
      
      if (!isConnected) {
        console.warn('⚠️ Firebase 연결이 되지 않았습니다. 실시간 업데이트가 작동하지 않을 수 있습니다.');
      }
    };
    
    checkConnection();
  }, []);

  // 실시간으로 후보 목록 감지
  useEffect(() => {
    if (!groupId) return;

    console.log('🔍 Firebase 실시간 리스너 시작:', groupId);
    console.log('🌐 현재 환경:', process.env.NODE_ENV);
    console.log('🔗 BACKEND_URL:', BACKEND_URL);
    console.log('📍 현재 페이지 경로:', typeof window !== "undefined" ? window.location.pathname : 'unknown');

    const candidatesRef = ref(database, `groups/${groupId}/candidates`);
    console.log('🎯 Firebase 참조 경로:', `groups/${groupId}/candidates`);
    
    let listenerRegistered = false;
    
    const candidatesCallback = (snapshot: any) => {
      console.log('⚡ 후보 리스너 콜백 실행됨!');
      console.log('📍 현재 페이지 경로:', typeof window !== "undefined" ? window.location.pathname : 'unknown');
      
      // 현재 URL이 /suggest/로 시작하지 않으면 콜백 즉시 종료
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/suggest/")) {
        console.log("❌ 현재 페이지가 suggest가 아님. 리스너 콜백 종료");
        return;
      }
      
      console.log('⚡ 후보 리스너 작동함!', groupId);
      console.log('📊 Firebase 스냅샷:', snapshot.val());
      
      const candidatesData = snapshot.val();
      if (candidatesData) {
        const allCandidates = Object.values(candidatesData);
        console.log('📊 전체 후보 배열:', allCandidates);
        console.log('🔍 Firebase 후보 데이터 상세:', candidatesData);
        
        const yogiyoIds = allCandidates
          .filter((c: any) => c.type === 'yogiyo')
          .map((c: any) => {
            // 백엔드에서 yogiyo_id로 저장하므로 이를 사용
            return c.detail?.yogiyo_id;
          })
          .filter(id => id !== undefined); // undefined 값 제거
        
        const kakaoIds = allCandidates
          .filter((c: any) => c.type === 'kakao' && c.detail?.kakao_id)
          .map((c: any) => Number(c.detail.kakao_id));
          
        console.log('📊 업데이트된 후보 목록:', { 
          yogiyoIds, 
          kakaoIds,
          yogiyoIdsTypes: yogiyoIds.map(id => typeof id)
        });
        console.log('📊 전체 후보 데이터:', candidatesData);
        
        // 요기요 후보들의 상세 정보 로그
        const yogiyoCandidates = allCandidates.filter((c: any) => c.type === 'yogiyo');
        console.log('🍕 요기요 후보 상세 정보:', yogiyoCandidates.map((c: any) => ({
          name: c.name,
          yogiyo_id: c.detail?.yogiyo_id,
          yogiyo_id_type: typeof c.detail?.yogiyo_id,
          detail: c.detail
        })));
        
        // 카카오 후보들의 상세 정보 로그
        const kakaoCandidates = allCandidates.filter((c: any) => c.type === 'kakao');
        console.log('🍽️ 카카오 후보 상세 정보:', kakaoCandidates.map((c: any) => ({
          name: c.name,
          kakao_id: c.detail?.kakao_id,
          detail: c.detail
        })));
        
        setRegisteredYogiyoIds(yogiyoIds);
        setRegisteredKakaoIds(kakaoIds);
      } else {
        console.log('📊 후보 데이터가 없음');
        setRegisteredYogiyoIds([]);
        setRegisteredKakaoIds([]);
      }
    };
    
    // Firebase 연결 상태 확인
    try {
      onValue(candidatesRef, candidatesCallback);
      listenerRegistered = true;
      console.log('✅ 후보 리스너 등록됨!', groupId);
      
      // 초기 데이터 로드 확인
      setTimeout(() => {
        console.log('🔄 초기 데이터 로드 확인 중...');
        console.log('📊 현재 등록된 요기요 ID:', registeredYogiyoIds);
        console.log('📊 현재 등록된 카카오 ID:', registeredKakaoIds);
      }, 1000);
      
    } catch (error) {
      console.error('❌ Firebase 리스너 등록 실패:', error);
    }

    // 컴포넌트가 언마운트될 때 리스너 정리
    return () => {
      console.log('🔥 후보 리스너 해제됨!', groupId);
      if (listenerRegistered) {
        try {
          off(candidatesRef, "value", candidatesCallback);
          console.log('✅ 리스너 해제 성공');
        } catch (error) {
          console.error('❌ Firebase 리스너 해제 실패:', error);
        }
      }
    };
  }, [groupId, BACKEND_URL]);

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
    console.log('🎯 카카오 후보 추가 시작:', restaurant);
    console.log('🔗 요청 URL:', `${BACKEND_URL}/groups/${groupId}/candidates/kakao`);
    console.log('📤 요청 데이터:', {
      added_by: participantId || 'web_user',
      kakao_data: restaurant
    });
    
    try {
      const response = await fetch(`${BACKEND_URL}/groups/${groupId}/candidates/kakao`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          added_by: participantId || 'web_user',
          kakao_data: restaurant
        }),
      });
      
      console.log('📥 응답 상태:', response.status);
      console.log('📥 응답 헤더:', Object.fromEntries(response.headers.entries()));
      
      if (response.ok) {
        const responseData = await response.json();
        console.log('✅ 후보 추가 성공:', responseData);
        showToast(`${restaurant.place_name || restaurant.name}이(가) 후보에 추가되었습니다!`);
        // 실시간 업데이트를 위해 잠시 대기 후 강제 리프레시
        setTimeout(() => {
          console.log('🔄 후보 추가 후 실시간 업데이트 트리거');
          // Firebase 리스너가 자동으로 업데이트하도록 함
        }, 500);
      } else {
        const errorData = await response.json();
        console.error('❌ 후보 추가 실패:', errorData);
        showToast(`후보 추가에 실패했습니다: ${errorData.detail}`);
      }
    } catch (error) {
      console.error('❌ 카카오 후보 추가 오류:', error);
      showToast('카카오 후보 추가 중 오류가 발생했습니다.');
    }
  };

  // 요기요 후보 추가 함수
  const addYogiyoCandidate = async (restaurant: any) => {
    console.log('🎯 요기요 후보 추가 시작:', restaurant);
    console.log('🔗 요청 URL:', `${BACKEND_URL}/groups/${groupId}/candidates/yogiyo`);
    console.log('📤 요청 데이터:', {
      added_by: participantId || 'web_user',
      yogiyo_data: restaurant
    });
    console.log('🔍 식당 ID 상세 정보:', {
      id: restaurant.id,
      type: typeof restaurant.id,
      name: restaurant.name
    });
    
    try {
      const response = await fetch(`${BACKEND_URL}/groups/${groupId}/candidates/yogiyo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          added_by: participantId || 'web_user',
          yogiyo_data: restaurant
        }),
      });
      
      console.log('📥 응답 상태:', response.status);
      console.log('📥 응답 헤더:', Object.fromEntries(response.headers.entries()));
      
      if (response.ok) {
        const responseData = await response.json();
        console.log('✅ 후보 추가 성공:', responseData);
        showToast(`${restaurant.name || restaurant.restaurant_name}이(가) 후보에 추가되었습니다!`);
        // 실시간 업데이트를 위해 잠시 대기 후 강제 리프레시
        setTimeout(() => {
          console.log('🔄 후보 추가 후 실시간 업데이트 트리거');
          // Firebase 리스너가 자동으로 업데이트하도록 함
        }, 500);
      } else {
        const errorData = await response.json();
        console.error('❌ 후보 추가 실패:', errorData);
        showToast(`후보 추가에 실패했습니다: ${errorData.detail}`);
      }
    } catch (error) {
      console.error('❌ 요기요 후보 추가 오류:', error);
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
          padding: "16px 0.8vw",
          borderRadius: "24px",
          fontSize: "16px",
          zIndex: 10000,
          boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
          minWidth: "280px",
          maxWidth: "92vw",
          textAlign: "center",
          wordBreak: "keep-all",
          whiteSpace: "normal"
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
            sectorSearchResults={sectorSearchResults}
            setSectorSearchResults={setSectorSearchResults}
            hasSectorSearchCompleted={hasSectorSearchCompleted}
            setHasSectorSearchCompleted={setHasSectorSearchCompleted}
            setLoading={setDirectTabLoading}
          />
        )}
        
        {activeTab === 'delivery' && showDeliveryTab && (
          <DeliveryTab 
            groupData={groupData}
            groupId={groupId}
            onAddCandidate={addYogiyoCandidate}
            registeredCandidateIds={registeredYogiyoIds}
            setLoading={setDeliveryTabLoading}
          />
        )}

        {/* 하단 버튼 위에 랜덤 룰렛 돌리기 버튼/모달 추가 */}
        {!directTabLoading && !deliveryTabLoading && (
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
        )}
        {showRandomModal && (
          <SlotMachineRoulette
            groupId={groupId}
            registeredKakaoIds={registeredKakaoIds}
            registeredYogiyoIds={registeredYogiyoIds}
            activeTab={activeTab}
            sectorSearchResults={sectorSearchResults}
            hasSectorSearchCompleted={hasSectorSearchCompleted}
            onAddCandidate={async (candidate: any) => {
              if (candidate.type === 'kakao') {
                // 슬롯머신의 Restaurant 객체를 백엔드가 기대하는 kakao_data 형태로 변환
                const kakaoData = {
                  id: candidate.id,
                  place_name: candidate.detail?.place_name || candidate.name,
                  address_name: candidate.detail?.address_name || candidate.address,
                  category_name: candidate.detail?.category_name || candidate.category,
                  rating: candidate.detail?.rating || candidate.rating,
                  phone: candidate.detail?.phone,
                  road_address_name: candidate.detail?.road_address_name,
                  // 원본 카카오맵 데이터의 모든 필드를 포함
                  ...candidate.detail
                };
                console.log('🎯 슬롯머신 카카오 데이터 변환:', kakaoData);
                console.log('🔍 원본 카카오맵 데이터:', candidate.detail);
                await addKakaoCandidate(kakaoData);
                // 팝업을 닫지 않고 그대로 유지
              } else if (candidate.type === 'yogiyo') {
                // 슬롯머신의 Restaurant 객체를 백엔드가 기대하는 yogiyo_data 형태로 변환
                const yogiyoData = {
                  id: candidate.id,
                  name: candidate.name,
                  categories: candidate.detail?.categories || [],
                  estimated_delivery_time: candidate.detail?.estimated_delivery_time || '',
                  thumbnail_url: candidate.detail?.thumbnail_url || '',
                  review_avg: candidate.detail?.review_avg || 0,
                  review_count: candidate.detail?.review_count || 0,
                  address: candidate.detail?.address || candidate.address,
                  ...candidate.detail  // 원본 데이터도 포함
                };
                await addYogiyoCandidate(yogiyoData);
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