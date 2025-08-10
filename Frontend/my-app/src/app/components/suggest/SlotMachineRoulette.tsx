import React, { useState, useEffect, useRef } from 'react';
import styles from './SlotMachineRoulette.module.css';

// 카카오맵 API 타입 정의
declare global {
  interface Window {
    kakao: any;
  }
}

interface Restaurant {
  id: string;
  name: string;
  rating: number;
  address: string;
  category: string;
  type: 'kakao' | 'yogiyo';
  detail?: any;
}

interface GroupData {
  delivery: boolean;
  delivery_time: number;
  offline: boolean;
  visit_time: number;
  radius: number;
  x: number;
  y: number;
  state: string;
}

interface SlotMachineRouletteProps {
  groupId: string;
  registeredKakaoIds?: number[];
  registeredYogiyoIds?: number[];
  onAddCandidate: (candidate: Restaurant) => void;
  onClose: () => void;
  activeTab: 'direct' | 'delivery'; // 추가된 prop
}

const SlotMachineRoulette: React.FC<SlotMachineRouletteProps> = ({ 
  groupId, 
  registeredKakaoIds = [],
  registeredYogiyoIds = [],
  onAddCandidate, 
  onClose,
  activeTab
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSpinning, setIsSpinning] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [groupData, setGroupData] = useState<GroupData | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalUrl, setModalUrl] = useState("");
  const [menuModalOpen, setMenuModalOpen] = useState(false);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [menuList, setMenuList] = useState<any[]>([]);
  const animationRef = useRef<NodeJS.Timeout | null>(null);
  const currentIndexRef = useRef(0);

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  // 그룹 데이터 가져오기
  useEffect(() => {
    const fetchGroupData = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/groups/${groupId}`);
        const data = await response.json();
        console.log('그룹 데이터 응답:', data);
        
        if (data) {
          setGroupData(data);
          console.log('그룹 데이터 설정됨:', data);
        } else {
          console.error('그룹 데이터가 없습니다.');
        }
      } catch (error) {
        console.error('그룹 데이터 가져오기 오류:', error);
      }
    };

    fetchGroupData();
  }, [groupId, BACKEND_URL]);

  // 카카오맵 API 로드 대기
  const waitForKakaoMap = (): Promise<void> => {
    return new Promise((resolve) => {
      if (typeof window !== 'undefined' && window.kakao) {
        resolve();
        return;
      }

      const checkKakao = () => {
        if (typeof window !== 'undefined' && window.kakao) {
          resolve();
        } else {
          setTimeout(checkKakao, 100);
        }
      };

      checkKakao();
    });
  };

  // 식당 이름 정리
  const formatRestaurantName = (name: string): string => {
    return name.replace(/[^\w\s가-힣]/g, '').trim();
  };

  // 식당 정보 가져오기
  useEffect(() => {
    const fetchRestaurants = async () => {
      if (!groupData) return;

      setIsLoading(true);
      const allRestaurants: Restaurant[] = [];

      try {
        // 직접가기 탭인 경우 카카오맵 API만 호출
        if (activeTab === 'direct' && groupData.offline && typeof window !== 'undefined') {
          console.log('직접가기 탭: 카카오맵 API 호출 시작');
          try {
            await waitForKakaoMap();
            
            const ps = new window.kakao.maps.services.Places();
            const allKakaoResults: any[] = [];
            
            // categorySearch로 3페이지만 검색
            for (let page = 1; page <= 3; page++) {
              await new Promise(res => setTimeout(res, 300));
              try {
                const searchOptions = {
                  location: new window.kakao.maps.LatLng(groupData.x, groupData.y),
                  radius: groupData.radius,
                  category_group_code: 'FD6',
                  size: 15,
                  page: page
                };

                const kakaoResults = await new Promise((resolve) => {
                  ps.categorySearch('FD6', (data: any, status: any) => {
                    if (status === window.kakao.maps.services.Status.OK) {
                      resolve(data);
                    } else {
                      resolve([]);
                    }
                  }, searchOptions);
                });
                
                allKakaoResults.push(...(kakaoResults as any[]));
                
                if ((kakaoResults as any[]).length < 15) {
                  break;
                }
              } catch (err) {
                console.error(`카카오맵 API 호출 오류 (페이지 ${page}):`, err);
                break;
              }
            }

            // 중복 제거
            const uniqueKakaoResults = allKakaoResults.filter((restaurant, index, self) => 
              index === self.findIndex(r => r.id === restaurant.id)
            );

            const filteredKakao = uniqueKakaoResults
              .filter((restaurant: any) => restaurant.distance <= groupData.radius)
              .map((restaurant: any) => ({
                id: restaurant.id || restaurant.kakao_id,
                name: formatRestaurantName(restaurant.place_name),
                rating: restaurant.rating,
                address: restaurant.address_name,
                category: restaurant.category_name,
                type: 'kakao' as const,
                detail: restaurant
              }));
            console.log('직접가기 탭 - 카카오맵 식당 수:', filteredKakao.length);
            allRestaurants.push(...filteredKakao);
          } catch (err) {
            console.error('카카오맵 API 호출 오류:', err);
          }
        }

        // 배달 탭인 경우 요기요 API만 호출
        if (activeTab === 'delivery' && groupData.delivery) {
          console.log('배달 탭: 요기요 API 호출 시작');
          try {
            const response = await fetch(`${BACKEND_URL}/groups/${groupId}/yogiyo-restaurants`);
            const data = await response.json();
            
            if (data.restaurants) {
              const yogiyoRestaurants = data.restaurants.map((restaurant: any) => ({
                id: (restaurant.id || restaurant.yogiyo_id || restaurant.restaurant_id || '').toString(),
                name: formatRestaurantName(restaurant.name || restaurant.restaurant_name || ''),
                rating: restaurant.rating || restaurant.score || 0,
                address: restaurant.address || restaurant.address_name || '',
                category: restaurant.category || restaurant.category_name || '',
                type: 'yogiyo' as const,
                detail: restaurant
              }));
              console.log('배달 탭 - 요기요 식당 수:', yogiyoRestaurants.length);
              allRestaurants.push(...yogiyoRestaurants);
            }
          } catch (err) {
            console.error('요기요 API 호출 오류:', err);
          }
        }

        console.log(`최종 식당 목록 (${activeTab} 탭):`, allRestaurants);
        console.log('총 식당 수:', allRestaurants.length);
        console.log('카카오맵 식당 수:', allRestaurants.filter(r => r.type === 'kakao').length);
        console.log('요기요 식당 수:', allRestaurants.filter(r => r.type === 'yogiyo').length);
        setRestaurants(allRestaurants);
      } catch (error) {
        console.error('식당 정보 가져오기 오류:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRestaurants();
  }, [groupData, BACKEND_URL, activeTab]); // activeTab을 의존성 배열에 추가

    // 슬롯머신 돌리기
  const handleSpin = () => {
    if (restaurants.length === 0 || isSpinning) return;

    setIsSpinning(true);
    setShowResult(false);
    setSelectedRestaurant(null);
    setIsAnimating(true);

    // 랜덤한 최종 인덱스 선택
    const finalIndex = Math.floor(Math.random() * restaurants.length);
    const selected = restaurants[finalIndex];

    // 애니메이션 시작 - 시간 기반 회전
    const totalDuration = 4000; // 3초
    const fastDuration = 2000; // 2초 빠른 회전
    const slowDuration = totalDuration - fastDuration; // 1초 감속
    
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / totalDuration;
      
      if (progress < 1) {
        // 다음 인덱스로 이동
        const nextIndex = (currentIndexRef.current + 1) % restaurants.length;
        currentIndexRef.current = nextIndex;
        setCurrentIndex(nextIndex);
        
        // 시간 기반 감속 효과 계산
        let currentStepDuration;
        
        if (elapsed < fastDuration) {
          // 빠른 회전 구간 (2초)
          currentStepDuration = 60;
        } else {
          // 감속 구간 (1초)
          const slowProgress = (elapsed - fastDuration) / slowDuration;
          const decelerationFactor = 1 + (slowProgress * 4); // 1배 -> 5배
          currentStepDuration = 60 * decelerationFactor;
        }
        
        animationRef.current = setTimeout(animate, currentStepDuration);
      } else {
        // 자연스럽게 마지막 결과로 정착
        // 현재 위치에서 finalIndex까지 몇 번 더 돌아야 하는지 계산
        const currentPos = currentIndexRef.current;
        const targetPos = finalIndex;
        let stepsToTarget = 0;
        
        // 시계방향으로 돌면서 targetPos에 도달하는 단계 수 계산
        let tempPos = currentPos;
        while (tempPos !== targetPos) {
          tempPos = (tempPos + 1) % restaurants.length;
          stepsToTarget++;
        }
        
        // 추가 단계가 있으면 계속 돌기
        if (stepsToTarget > 0) {
          const nextIndex = (currentIndexRef.current + 1) % restaurants.length;
          currentIndexRef.current = nextIndex;
          setCurrentIndex(nextIndex);
          
          // 매우 느린 속도로 마지막 단계들 진행
          animationRef.current = setTimeout(animate, 200);
        } else {
          // 목표 위치에 도달했으면 결과 표시
          setSelectedRestaurant(restaurants[finalIndex]);
          setIsSpinning(false);
          setShowResult(true);
          setIsAnimating(false);
        }
      }
    };

    animate();
  };

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, []);

  // currentIndexRef 초기화
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  // 후보에 추가하기
  const handleAddCandidate = () => {
    if (selectedRestaurant) {
      onAddCandidate(selectedRestaurant);
    }
  };

  // 다시 돌리기 (바로 슬롯머신 시작)
  const handleSpinAgain = () => {
    setShowResult(false);
    setSelectedRestaurant(null);
    // 바로 새로운 슬롯머신 시작
    handleSpin();
  };

  // 카카오맵 상세정보 모달 열기
  const handleInfoClick = (restaurant: Restaurant) => {
    if (restaurant.type === 'kakao' && restaurant.detail?.id) {
      setModalUrl(`https://place.map.kakao.com/${restaurant.detail.id}`);
      setModalOpen(true);
    }
  };

  // 요기요 메뉴 모달 열기
  const handleMenuClick = async (restaurant: Restaurant) => {
    if (restaurant.type === 'yogiyo') {
      setMenuModalOpen(true);
      setMenuLoading(true);
      setMenuError(null);
      setMenuList([]);
      try {
        const res = await fetch(`${BACKEND_URL}/yogiyo-menu/${restaurant.id}`);
        if (!res.ok) throw new Error("메뉴 정보를 불러올 수 없습니다");
        const data = await res.json();
        setMenuList(data.menus || []);
      } catch (e: any) {
        setMenuError(e.message || "메뉴 정보를 불러올 수 없습니다");
      } finally {
        setMenuLoading(false);
      }
    }
  };

  // 결과 컨테이너 클릭 핸들러
  const handleResultClick = (restaurant: Restaurant) => {
    if (restaurant.type === 'kakao') {
      handleInfoClick(restaurant);
    } else if (restaurant.type === 'yogiyo') {
      handleMenuClick(restaurant);
    }
  };

  // 선택된 식당이 이미 등록되어 있는지 확인
  const isAlreadyRegistered = (restaurant: Restaurant): boolean => {
    if (restaurant.type === 'kakao') {
      const kakaoId = restaurant.detail?.id || restaurant.id;
      return registeredKakaoIds.includes(Number(kakaoId));
    } else if (restaurant.type === 'yogiyo') {
      return registeredYogiyoIds.includes(Number(restaurant.id));
    }
    return false;
  };

  if (isLoading) {
    return (
      <div className={styles.modal}>
        <div className={styles.container}>
          <div className={styles.header}>
            <h1>🍽️ 슬롯머신 룰렛 🍽️</h1>
            <button className={styles.closeButton} onClick={onClose}>✕</button>
          </div>
          <div className={styles.loadingMessage}>
            <div className={styles.spinner}></div>
            <p>식당 정보를 불러오는 중...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.modal}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>
            {activeTab === 'direct' ? '🍽️ 직접가기 슬롯머신 룰렛 🍽️' : '🍕 배달 슬롯머신 룰렛 🍕'}
          </h1>
          <button className={styles.closeButton} onClick={onClose}>✕</button>
        </div>

                <div className={styles.body}>
          <div className={styles.wheelContainer}>
            <div className={styles.wheelWrapper}>
              <div className={styles.slotMachineContainer}>
                {restaurants.map((restaurant, index) => {
                  // 현재 인덱스 기준으로 위치 계산
                  const position = (index - currentIndex + restaurants.length) % restaurants.length;
                  let className = styles.slotMachineItem;
                  let style: React.CSSProperties = {};
                  
                  if (position === 0) {
                    // 중앙
                    className += ` ${styles.active}`;
                  } else if (position === 1) {
                    // 중앙위
                    style.transform = 'translateY(-50px) scale(1)';
                    style.opacity = '0.5';
                  } else if (position === restaurants.length - 1) {
                    // 중앙아래
                    style.transform = 'translateY(50px) scale(1)';
                    style.opacity = '0.5';
                  } else {
                    // 보이지 않는 요소들
                    style.transform = 'translateY(100px) scale(0.3)';
                    style.opacity = '0';
                  }
                  
                  return (
                    <div 
                      key={index} 
                      className={className}
                      style={style}
                    >
                      {restaurant.name}
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              className={`${styles.spinButton} ${isSpinning ? styles.spinning : ''}`}
              onClick={showResult ? handleSpinAgain : handleSpin}
              disabled={isSpinning || restaurants.length === 0}
            >
              {isSpinning ? '돌리는 중...' : showResult ? '다시 돌리기' : 'GO!'}
            </button>
          </div>

          {showResult && selectedRestaurant && (
            <div 
              className={styles.resultContainer}
              onClick={() => handleResultClick(selectedRestaurant)}
              style={{ cursor: 'pointer' }}
            >
              <h2>🎉 당첨! 🎉</h2>
              <div className={styles.selectedRestaurant}>
                <span className={styles.restaurantName}>{selectedRestaurant.name}</span>
                <span className={styles.restaurantType}>
                  {selectedRestaurant.type === 'kakao' ? '🍽️ 카카오맵' : '🍕 요기요'}
                </span>
                <span className={styles.clickHint}>
                  {selectedRestaurant.type === 'kakao' ? '📍 클릭하여 상세정보 보기' : '🍽️ 클릭하여 메뉴 보기'}
                </span>
              </div>
              {isAlreadyRegistered(selectedRestaurant) ? (
                <div 
                  className={styles.alreadyRegistered}
                  onClick={(e) => e.stopPropagation()}
                >
                  <span>✓ 이미 등록된 후보</span>
                </div>
              ) : (
                <button 
                  className={styles.addCandidateButton} 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddCandidate();
                  }}
                >
                  후보에 추가하기
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 카카오맵 상세정보 모달 */}
      {modalOpen && (
        <div
          onClick={() => setModalOpen(false)}
          style={{
            position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
            background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "#fff", borderRadius: 12, width: "90vw", maxWidth: 600, height: "80vh", position: "relative", padding: 0, textAlign: 'center', overflow: 'hidden'
            }}
          >
            <button
              onClick={() => setModalOpen(false)}
              style={{
                position: "absolute", top: 10, right: 10, background: "none", border: "none", fontSize: 24, cursor: "pointer", zIndex: 2
              }}
            >✕</button>
            <iframe
              src={modalUrl}
              style={{ width: "100%", height: "100%", border: "none", borderRadius: 12 }}
              title="카카오 플레이스"
            />
          </div>
        </div>
      )}

      {/* 요기요 메뉴 모달 */}
      {menuModalOpen && (
        <div
          onClick={() => setMenuModalOpen(false)}
          style={{
            position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
            background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "#fff", borderRadius: 12, width: "90vw", maxWidth: 500, maxHeight: '80vh', overflowY: 'auto', position: "relative", padding: 24, textAlign: 'center'
            }}
          >
            <button
              onClick={() => setMenuModalOpen(false)}
              style={{
                position: "absolute", top: 10, right: 10, background: "none", border: "none", fontSize: 24, cursor: "pointer", color: '#222'
              }}
            >✕</button>
            <h3 style={{fontWeight:'bold', marginBottom:16, fontSize:20, color:'#222'}}>메뉴</h3>
            {menuLoading ? (
              <div style={{color:'#999', padding:40}}>메뉴 불러오는 중...</div>
            ) : menuError ? (
              <div style={{color:'#e57373', padding:40}}>{menuError}</div>
            ) : menuList.length === 0 ? (
              <div style={{color:'#999', padding:40}}>메뉴가 없습니다</div>
            ) : (
              <div style={{display:'flex', flexWrap:'wrap', gap:20, justifyContent:'center'}}>
                {menuList.map((menu, idx) => (
                  <div key={menu.name + '-' + idx} style={{width:120, textAlign:'center'}}>
                    {menu.image ? (
                      <img src={menu.image} alt={menu.name} style={{width:100, height:80, objectFit:'cover', borderRadius:8, marginBottom:8}} />
                    ) : (
                      <div style={{width:100, height:80, background:'#eee', borderRadius:8, marginBottom:8, display:'flex', alignItems:'center', justifyContent:'center', color:'#aaa', fontSize:13}}>
                        이미지 없음
                      </div>
                    )}
                    <div style={{fontSize:14, color:'#222', fontWeight:500}}>{menu.name}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SlotMachineRoulette; 