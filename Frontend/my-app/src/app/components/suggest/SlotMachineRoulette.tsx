import React, { useState, useEffect, useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCoverflow, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-coverflow';
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
  const [slidePositions, setSlidePositions] = useState<{[key: string]: number}>({});
  const swiperRef = useRef<any>(null);
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

    // 랜덤한 최종 인덱스 선택
    const finalIndex = Math.floor(Math.random() * restaurants.length);
    const selected = restaurants[finalIndex];

        // 애니메이션 시작
    const totalDuration = 2000; // 2초로 늘림
    const totalSteps = 30; // 총 30단계
    let currentStep = 0;

    const animate = () => {
      if (currentStep < totalSteps) {
        // 순차적으로 다음 인덱스로 이동 (loop를 활용해서 자연스럽게 연결)
        if (swiperRef.current && swiperRef.current.swiper) {
          const swiper = swiperRef.current.swiper;
          
          // 현재 슬라이드들의 위치를 저장
          const currentPositions = {
            prev: swiper.slides[swiper.previousIndex] ? swiper.previousIndex : 0,
            active: swiper.activeIndex,
            next: swiper.slides[swiper.nextIndex] ? swiper.nextIndex : 0
          };
          
          // 다음 슬라이드로 이동
          swiper.slideNext();
          
                     // 새로운 슬라이드 위치 계산 (즉시 처리)
           const newPositions = {
             prev: swiper.slides[swiper.previousIndex] ? swiper.previousIndex : 0,
             active: swiper.activeIndex,
             next: swiper.slides[swiper.nextIndex] ? swiper.nextIndex : 0
           };
           
           // 중앙아래 슬라이드가 새로 등장하는 경우 아래쪽에서 시작
           if (newPositions.next !== currentPositions.next) {
             setSlidePositions(prev => ({
               ...prev,
               [`slide-${newPositions.next}`]: 100 // 더 아래쪽에서 시작
             }));
             
             // 애니메이션으로 중앙아래 위치로 이동 (즉시)
             setSlidePositions(prev => ({
               ...prev,
               [`slide-${newPositions.next}`]: 25
             }));
           }
        }
        
        // 일정한 속도로 회전
        const currentStepDuration = 80; // 빠른 일정한 속도
        
        currentStep++;
        animationRef.current = setTimeout(animate, currentStepDuration);
      } else {
        // 최종 결과로 이동 - 당첨된 식당이 중앙에 그대로 유지
        if (swiperRef.current && swiperRef.current.swiper) {
          // loop를 고려해서 올바른 슬라이드로 이동
          const swiper = swiperRef.current.swiper;
          const realIndex = swiper.realIndex;
          const targetIndex = finalIndex;
          
          // 현재 위치에서 목표 위치까지의 거리 계산
          const distance = (targetIndex - realIndex + restaurants.length) % restaurants.length;
          
          // 단계별로 이동해서 자연스럽게 연결
          let moveCount = 0;
          const moveToTarget = () => {
            if (moveCount < distance) {
              swiper.slideNext();
              moveCount++;
                             setTimeout(moveToTarget, 120);
            } else {
              // 최종 이동 완료 후 상태 업데이트
              const finalRealIndex = swiper.realIndex;
              currentIndexRef.current = finalRealIndex;
              setCurrentIndex(finalRealIndex);
              setSelectedRestaurant(restaurants[finalRealIndex]);
              setIsSpinning(false);
              setShowResult(true);
            }
          };
          moveToTarget();
        } else {
          // Swiper가 없는 경우 바로 상태 업데이트
          currentIndexRef.current = finalIndex;
          setCurrentIndex(finalIndex);
          setSelectedRestaurant(selected);
          setIsSpinning(false);
          setShowResult(true);
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
                             <Swiper
                 ref={swiperRef}
                 direction="vertical"
                 effect="coverflow"
                 grabCursor={false}
                 allowTouchMove={false}
                 modules={[EffectCoverflow]}
                 coverflowEffect={{
                   rotate: 0,
                   stretch: 0,
                   depth: 100,
                   modifier: 1,
                   slideShadows: false,
                 }}
                 className={styles.slotMachineSwiper}
                 initialSlide={0}
                                   speed={0}
                  spaceBetween={15}
                  slidesPerView={3}
                 centeredSlides={true}
                 loop={true}
                                   onSlideChange={(swiper) => {
                    // 실시간으로 active 상태 업데이트
                    if (isSpinning) {
                      setCurrentIndex(swiper.realIndex);
                      currentIndexRef.current = swiper.realIndex;
                    }
                  }}
               >
                                 {restaurants.map((restaurant, index) => (
                   <SwiperSlide 
                     key={index} 
                     className={styles.slotMachineSlide}
                     style={{
                       transform: slidePositions[`slide-${index}`] 
                         ? `translateY(${slidePositions[`slide-${index}`]}px)` 
                         : undefined
                     }}
                   >
                     <div className={`${styles.slotMachineItem} ${index === currentIndex ? styles.active : ''}`}>
                       {restaurant.name}
                     </div>
                   </SwiperSlide>
                 ))}
              </Swiper>
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