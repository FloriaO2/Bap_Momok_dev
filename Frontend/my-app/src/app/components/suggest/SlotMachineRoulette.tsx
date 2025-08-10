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
  onAddCandidate: (candidate: Restaurant) => void;
  onClose: () => void;
}

const SlotMachineRoulette: React.FC<SlotMachineRouletteProps> = ({ 
  groupId, 
  onAddCandidate, 
  onClose 
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSpinning, setIsSpinning] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [groupData, setGroupData] = useState<GroupData | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
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
        // 카카오맵 API 호출
        if (groupData.offline && typeof window !== 'undefined') {
          console.log('카카오맵 API 호출 시작');
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
            console.log('카카오맵 식당 수:', filteredKakao.length);
            allRestaurants.push(...filteredKakao);
          } catch (err) {
            console.error('카카오맵 API 호출 오류:', err);
          }
        }

        // 요기요 API 호출
        if (groupData.delivery) {
          console.log('요기요 API 호출 시작');
          try {
            const response = await fetch(`${BACKEND_URL}/yogiyo/search?x=${groupData.x}&y=${groupData.y}&delivery_time=${groupData.delivery_time}`);
            const data = await response.json();
            
            if (data.restaurants) {
              const yogiyoRestaurants = data.restaurants.map((restaurant: any) => ({
                id: restaurant.yogiyo_id.toString(),
                name: formatRestaurantName(restaurant.name),
                rating: restaurant.rating,
                address: restaurant.address,
                category: restaurant.category,
                type: 'yogiyo' as const,
                detail: restaurant
              }));
              console.log('요기요 식당 수:', yogiyoRestaurants.length);
              allRestaurants.push(...yogiyoRestaurants);
            }
          } catch (err) {
            console.error('요기요 API 호출 오류:', err);
          }
        }

        console.log('최종 식당 목록:', allRestaurants);
        setRestaurants(allRestaurants);
      } catch (error) {
        console.error('식당 정보 가져오기 오류:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRestaurants();
  }, [groupData, BACKEND_URL]);

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

    // 애니메이션 시작 - 정확한 회전 횟수 계산
    const currentPos = currentIndexRef.current;
    const targetPos = finalIndex;
    let stepsToTarget = 0;
    
    // 시계방향으로 돌면서 targetPos에 도달하는 단계 수 계산
    let tempPos = currentPos;
    while (tempPos !== targetPos) {
      tempPos = (tempPos + 1) % restaurants.length;
      stepsToTarget++;
    }
    
    // 최소 1.5바퀴 + 정확한 위치까지의 단계 수
    const minRotations = 1;
    const totalSteps = Math.floor((minRotations * restaurants.length) + stepsToTarget);
    let currentStep = 0;

    const animate = () => {
      if (currentStep < totalSteps) {
        // 다음 인덱스로 이동
        const nextIndex = (currentIndexRef.current + 1) % restaurants.length;
        currentIndexRef.current = nextIndex;
        setCurrentIndex(nextIndex);
        
        // 감속 효과 계산 (마지막 1.5초 정도만)
        const progress = currentStep / totalSteps; // 0~1 사이의 진행률
        let currentStepDuration;
        
        if (progress > 0.7) {
          // 마지막 30% 구간에서 감속 (약 1.5초)
          const decelerationProgress = (progress - 0.7) / 0.3; // 0~1
          const decelerationFactor = 1 + (decelerationProgress * 3); // 1배 -> 4배
          currentStepDuration = 80 * decelerationFactor;
        } else {
          // 그 외 구간은 일정한 속도 (더 느리게)
          currentStepDuration = 80;
        }
        
        currentStep++;
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
          animationRef.current = setTimeout(animate, 150);
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

  // 다시 돌리기 (결과 초기화만)
  const handleSpinAgain = () => {
    setShowResult(false);
    setSelectedRestaurant(null);
    // currentIndex는 그대로 유지해서 당첨된 식당이 중앙에 계속 보이도록
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
          <h1>🍽️ 슬롯머신 룰렛 🍽️</h1>
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
            <div className={styles.resultContainer}>
              <h2>🎉 당첨! 🎉</h2>
              <div className={styles.selectedRestaurant}>
                <span className={styles.restaurantName}>{selectedRestaurant.name}</span>
                <span className={styles.restaurantType}>
                  {selectedRestaurant.type === 'kakao' ? '🍽️ 카카오맵' : '🍕 요기요'}
                </span>
              </div>
              <button className={styles.addCandidateButton} onClick={handleAddCandidate}>
                후보에 추가하기
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SlotMachineRoulette; 