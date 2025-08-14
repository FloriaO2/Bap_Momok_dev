import React, { useState, useEffect, useRef } from 'react';
import styles from './SlotMachineRoulette.module.css';

// 카카오맵 API 타입 정의
declare global {
  interface Window {
    kakao: any;
  }
}

interface Restaurant {
  id: number;
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
  filteredRestaurants?: Restaurant[]; // 필터링된 식당 데이터
}

const SlotMachineRoulette: React.FC<SlotMachineRouletteProps> = ({ 
  groupId, 
  registeredKakaoIds = [],
  registeredYogiyoIds = [],
  onAddCandidate, 
  onClose,
  activeTab,
  filteredRestaurants
}) => {
  const [isLoading, setIsLoading] = useState(false);
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
  const [previousCandidates, setPreviousCandidates] = useState<Set<number>>(new Set());
  
  // 전체 식당 데이터를 저장할 새로운 state 추가
  const [allRestaurantsData, setAllRestaurantsData] = useState<Restaurant[]>([]);
  const [isInitialDataLoaded, setIsInitialDataLoaded] = useState(false);
  
  // 슬롯머신 내부 전용 로딩 상태 (외부 isLoading과 반대로 작동)
  const [isSlotMachineReady, setIsSlotMachineReady] = useState(false);
  
  // 새로고침 버튼 전용 상태
  const [isRefreshing, setIsRefreshing] = useState(false);

  // URL 정규화 함수 - 끝에 슬래시 제거
  const normalizeUrl = (url: string) => {
    return url.endsWith('/') ? url.slice(0, -1) : url;
  };

  const BACKEND_URL = normalizeUrl(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000');

  // 식당 목록을 랜덤으로 선택하는 함수
  const selectRandomRestaurants = (allRestaurants: Restaurant[], maxCount: number = 20): Restaurant[] => {
    if (allRestaurants.length <= maxCount) {
      return allRestaurants;
    }

    // 필터링된 모든 식당이 이전 후보에 들어가있는지 확인
    const filteredRestaurantIds = new Set(allRestaurants.map(r => r.id));
    const allUsed = filteredRestaurantIds.size > 0 && 
                   [...filteredRestaurantIds].every(id => previousCandidates.has(Number(id)));
    
    console.log('🎰 previousCandidates 상태 확인:', {
      filteredRestaurantsCount: allRestaurants.length,
      previousCandidatesSize: previousCandidates.size,
      allUsed: allUsed
    });
    


    // 요기요의 경우 카테고리별로 그룹화하여 랜덤 선택
    if (activeTab === 'delivery') {
      const categoryGroups: { [key: string]: Restaurant[] } = {};
      
      // 카테고리별로 그룹화
      allRestaurants.forEach(restaurant => {
        const category = restaurant.category || '기타';
        if (!categoryGroups[category]) {
          categoryGroups[category] = [];
        }
        categoryGroups[category].push(restaurant);
      });

      const selectedRestaurants: Restaurant[] = [];
      const categories = Object.keys(categoryGroups);
      
      // 각 카테고리에서 최대 2개씩 선택 (이전 후보 우선 제외)
      categories.forEach(category => {
        const restaurantsInCategory = categoryGroups[category];
        
        // 이전 후보가 아닌 식당들 먼저 선택
        const newRestaurants = restaurantsInCategory.filter(restaurant => 
          !previousCandidates.has(Number(restaurant.id))
        );
        
        // 이전 후보였던 식당들
        const usedRestaurants = restaurantsInCategory.filter(restaurant => 
          previousCandidates.has(Number(restaurant.id))
        );
        
        let selectedFromCategory = 0;
        const maxFromCategory = 2;
        
        // 새로운 식당들에서 최대 2개 선택
        for (let i = 0; i < Math.min(newRestaurants.length, maxFromCategory); i++) {
          const randomIndex = Math.floor(Math.random() * newRestaurants.length);
          selectedRestaurants.push(newRestaurants[randomIndex]);
          newRestaurants.splice(randomIndex, 1);
          selectedFromCategory++;
        }
        
        // 새로운 식당이 부족하면 이전 후보에서 선택
        if (selectedFromCategory < maxFromCategory && usedRestaurants.length > 0) {
          for (let i = selectedFromCategory; i < maxFromCategory; i++) {
            const randomIndex = Math.floor(Math.random() * usedRestaurants.length);
            selectedRestaurants.push(usedRestaurants[randomIndex]);
            usedRestaurants.splice(randomIndex, 1);
          }
        }
      });

      // 남은 자리를 랜덤으로 채우기 (이전 후보 우선 제외)
      const remainingCount = maxCount - selectedRestaurants.length;
      if (remainingCount > 0) {
        const remainingNewRestaurants = allRestaurants.filter(restaurant => 
          !selectedRestaurants.some(selected => selected.id === restaurant.id) &&
          !previousCandidates.has(Number(restaurant.id))
        );
        
        const remainingUsedRestaurants = allRestaurants.filter(restaurant => 
          !selectedRestaurants.some(selected => selected.id === restaurant.id) &&
          previousCandidates.has(Number(restaurant.id))
        );
        
        // 새로운 식당들 먼저 추가
        const shuffledNew = [...remainingNewRestaurants];
        for (let i = shuffledNew.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffledNew[i], shuffledNew[j]] = [shuffledNew[j], shuffledNew[i]];
        }
        
        const newToAdd = Math.min(remainingCount, shuffledNew.length);
        selectedRestaurants.push(...shuffledNew.slice(0, newToAdd));
        
        // 여전히 부족하면 이전 후보에서 추가
        const stillNeeded = remainingCount - newToAdd;
        if (stillNeeded > 0 && remainingUsedRestaurants.length > 0) {
          const shuffledUsed = [...remainingUsedRestaurants];
          for (let i = shuffledUsed.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledUsed[i], shuffledUsed[j]] = [shuffledUsed[j], shuffledUsed[i]];
          }
          selectedRestaurants.push(...shuffledUsed.slice(0, stillNeeded));
        }
      }

      return selectedRestaurants;
    } else {
      // 카카오맵의 경우 이전 후보 우선 제외하고 랜덤 선택
      const newRestaurants = allRestaurants.filter(restaurant => 
        !previousCandidates.has(Number(restaurant.id))
      );
      
      const usedRestaurants = allRestaurants.filter(restaurant => 
        previousCandidates.has(Number(restaurant.id))
      );
      
      let selectedRestaurants: Restaurant[] = [];
      
      // 새로운 식당들에서 먼저 선택
      if (newRestaurants.length > 0) {
        const shuffledNew = [...newRestaurants];
        for (let i = shuffledNew.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffledNew[i], shuffledNew[j]] = [shuffledNew[j], shuffledNew[i]];
        }
        
        const newToAdd = Math.min(maxCount, shuffledNew.length);
        selectedRestaurants.push(...shuffledNew.slice(0, newToAdd));
      }
      
      // 새로운 식당이 부족하면 이전 후보에서 추가
      const stillNeeded = maxCount - selectedRestaurants.length;
      if (stillNeeded > 0 && usedRestaurants.length > 0) {
        const shuffledUsed = [...usedRestaurants];
        for (let i = shuffledUsed.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffledUsed[i], shuffledUsed[j]] = [shuffledUsed[j], shuffledUsed[i]];
        }
        selectedRestaurants.push(...shuffledUsed.slice(0, stillNeeded));
      }
      
      return selectedRestaurants;
    }
  };

  // 식당 목록 새로고침 함수 (API 호출 없이 기존 데이터에서만 랜덤 선택)
  const refreshRestaurants = () => {
    // 필터링된 데이터가 있으면 우선 사용
    if (filteredRestaurants && filteredRestaurants.length > 0) {
      console.log('필터링된 데이터에서 새로운 후보를 선택합니다.');
      setIsRefreshing(true);
      setShowResult(false);
      setSelectedRestaurant(null);
      setCurrentIndex(0);
      currentIndexRef.current = 0;
      
      // 필터링된 데이터에서 20개 랜덤 선택
      const selectedRestaurants = selectRandomRestaurants(filteredRestaurants, 20);

      // previousCandidates 상태 확인
      let currentPreviousCandidates = new Set(previousCandidates);
      
      // 모든 필터링된 식당이 이전 후보에 포함되어 있는지 확인
      const allUsed = filteredRestaurants.length > 0 && 
                     filteredRestaurants.every(restaurant => currentPreviousCandidates.has(Number(restaurant.id)));
      
      if (allUsed) {
        console.log('🔄 필터링된 모든 식당이 이전 후보에 포함되어 있습니다. previousCandidates를 리셋합니다.');
        currentPreviousCandidates = new Set();
      }

      // 선택된 후보들을 이전 후보 목록에 추가
      selectedRestaurants.forEach(restaurant => {
        currentPreviousCandidates.add(Number(restaurant.id));
      });
      setPreviousCandidates(currentPreviousCandidates);
      
      console.log('🎰 previousCandidates 업데이트 (새로고침):', {
        beforeSize: previousCandidates.size,
        afterSize: currentPreviousCandidates.size,
        addedCount: selectedRestaurants.length,
        wasReset: allUsed
      });

      console.log(`새로운 후보 목록 (${activeTab} 탭, 필터링됨):`, selectedRestaurants);
      console.log('총 식당 수:', selectedRestaurants.length);
      console.log('카카오맵 식당 수:', selectedRestaurants.filter(r => r.type === 'kakao').length);
      console.log('요기요 식당 수:', selectedRestaurants.filter(r => r.type === 'yogiyo').length);
      setRestaurants(selectedRestaurants);
      setIsSlotMachineReady(true);
      setIsRefreshing(false);
      return;
    }

    if (!isInitialDataLoaded || allRestaurantsData.length === 0) {
      console.log('초기 데이터가 로드되지 않았거나 데이터가 없습니다. API 호출을 진행합니다.');
      fetchAllRestaurants();
      return;
    }

    console.log('기존 데이터에서 새로운 후보를 선택합니다.');
    setIsRefreshing(true);
    setShowResult(false);
    setSelectedRestaurant(null);
    setCurrentIndex(0);
    currentIndexRef.current = 0;
    
    // 기존 전체 데이터에서 20개 랜덤 선택
    const selectedRestaurants = selectRandomRestaurants(allRestaurantsData, 20);

    // 선택된 후보들을 이전 후보 목록에 추가
    const newPreviousCandidates = new Set(previousCandidates);
    selectedRestaurants.forEach(restaurant => {
      newPreviousCandidates.add(Number(restaurant.id));
    });
    setPreviousCandidates(newPreviousCandidates);

      console.log(`새로운 후보 목록 (${activeTab} 탭):`, selectedRestaurants);
      console.log('총 식당 수:', selectedRestaurants.length);
      console.log('카카오맵 식당 수:', selectedRestaurants.filter(r => r.type === 'kakao').length);
      console.log('요기요 식당 수:', selectedRestaurants.filter(r => r.type === 'yogiyo').length);
      setRestaurants(selectedRestaurants);
      setIsSlotMachineReady(true);
  };

  // 전체 식당 데이터를 가져오는 함수 (초기 로드용)
  const fetchAllRestaurants = async () => {
    if (!groupData) return;

    setIsLoading(false);
    const allRestaurants: Restaurant[] = [];

    try {
      // 직접가기 탭인 경우 카카오맵 API로 전체 데이터 가져오기
      if (activeTab === 'direct' && groupData.offline && typeof window !== 'undefined') {
        console.log('직접가기 탭: 카카오맵 API 전체 데이터 가져오기 시작');
        try {
          await waitForKakaoMap();
          
          const ps = new window.kakao.maps.services.Places();
          const allKakaoResults: any[] = [];
          
          // 더 많은 페이지를 가져와서 충분한 데이터 확보 (최대 10페이지)
          for (let page = 1; page <= 10; page++) {
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
              
              // 검색 결과가 적으면 더 이상 요청하지 않음
              if ((kakaoResults as any[]).length < 15) {
                console.log(`페이지 ${page}에서 검색 결과가 부족하여 검색 중단`);
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
              id: Number(restaurant.id || restaurant.kakao_id),
              name: formatRestaurantName(restaurant.place_name),
              rating: restaurant.rating,
              address: restaurant.address_name,
              category: restaurant.category_name,
              type: 'kakao' as const,
              detail: restaurant
            }));
          console.log('직접가기 탭 - 카카오맵 전체 식당 수:', filteredKakao.length);
          allRestaurants.push(...filteredKakao);
        } catch (err) {
          console.error('카카오맵 API 호출 오류:', err);
        }
      }

      // 배달 탭인 경우 요기요 API로 전체 데이터 가져오기
      // 배달 탭인 경우 요기요 API로 전체 데이터 가져오기
      if (activeTab === 'delivery' && groupData.delivery) {
        console.log('배달 탭: 요기요 API 전체 데이터 가져오기 시작');
        try {
          const response = await fetch(`${BACKEND_URL}/groups/${groupId}/yogiyo-restaurants`);
          const data = await response.json();
          
          if (data.restaurants) {
            const yogiyoRestaurants = data.restaurants.map((restaurant: any) => {
              const restaurantId = Number(restaurant.id || restaurant.yogiyo_id || restaurant.restaurant_id || 0);
              return {
                id: restaurantId,
                name: formatRestaurantName(restaurant.name || restaurant.restaurant_name || ''),
                rating: restaurant.rating || restaurant.score || 0,
                address: restaurant.address || restaurant.address_name || '',
                category: restaurant.category || restaurant.category_name || '',
                type: 'yogiyo' as const,
                detail: {
                  ...restaurant,
                  yogiyo_id: restaurantId
                }
              };
            });
            console.log('배달 탭 - 요기요 전체 식당 수:', yogiyoRestaurants.length);
            allRestaurants.push(...yogiyoRestaurants);
          }
        } catch (err) {
          console.error('요기요 API 호출 오류:', err);
        }
      }

      // 전체 데이터 저장
      setAllRestaurantsData(allRestaurants);
      setIsInitialDataLoaded(true);

      // 최대 20개로 랜덤 선택
      const selectedRestaurants = selectRandomRestaurants(allRestaurants, 20);

      // 선택된 후보들을 이전 후보 목록에 추가
      const newPreviousCandidates = new Set(previousCandidates);
      selectedRestaurants.forEach(restaurant => {
        newPreviousCandidates.add(Number(restaurant.id));
      });
      setPreviousCandidates(newPreviousCandidates);
      
      console.log('🎰 previousCandidates 업데이트 (최종):', {
        beforeSize: previousCandidates.size,
        afterSize: newPreviousCandidates.size,
        addedCount: selectedRestaurants.length
      });

      console.log(`최종 식당 목록 (${activeTab} 탭):`, selectedRestaurants);
      console.log('총 식당 수:', selectedRestaurants.length);
      console.log('카카오맵 식당 수:', selectedRestaurants.filter(r => r.type === 'kakao').length);
      console.log('요기요 식당 수:', selectedRestaurants.filter(r => r.type === 'yogiyo').length);
      setRestaurants(selectedRestaurants);
    } catch (error) {
      console.error('식당 정보 가져오기 오류:', error);
    } finally {
      setIsSlotMachineReady(true);
    }
  };

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

  // 식당 정보 가져오기 (초기 로드)
  useEffect(() => {
    console.log('🎰 슬롯머신 초기화 시작');
    console.log('🔍 filteredRestaurants:', filteredRestaurants);
    console.log('🔍 activeTab:', activeTab);
    console.log('🔍 groupData:', groupData);
    
    // 필터링된 데이터가 있으면 우선 사용
    if (filteredRestaurants && filteredRestaurants.length > 0) {
      console.log('✅ 필터링된 데이터를 사용하여 슬롯머신 초기화');
      console.log('📊 필터링된 데이터 개수:', filteredRestaurants.length);
      console.log('📊 필터링된 데이터 샘플:', filteredRestaurants.slice(0, 3));
      
      // 필터링된 데이터에 type 필드 추가
      const processedRestaurants = filteredRestaurants.map((restaurant: any) => ({
        ...restaurant,
        type: 'kakao' // 직접가기 탭에서는 모두 카카오맵 데이터
      }));
      
      const selectedRestaurants = selectRandomRestaurants(processedRestaurants, 20);
      
      // 선택된 후보들을 이전 후보 목록에 추가 (selectRandomRestaurants에서 이미 처리됨)
      console.log('🎰 previousCandidates 업데이트 (새로고침):', {
        beforeSize: previousCandidates.size,
        afterSize: previousCandidates.size + selectedRestaurants.length,
        addedCount: selectedRestaurants.length
      });
      
      console.log('🎰 previousCandidates 업데이트 (초기):', {
        beforeSize: previousCandidates.size,
        afterSize: previousCandidates.size + selectedRestaurants.length,
        addedCount: selectedRestaurants.length
      });

      console.log(`✅ 초기 후보 목록 (${activeTab} 탭, 필터링됨):`, selectedRestaurants);
      setRestaurants(selectedRestaurants);
      setIsSlotMachineReady(true);
      return;
    }

    console.log('⚠️ 필터링된 데이터가 없어서 전체 데이터를 가져옵니다.');
    fetchAllRestaurants();
  }, [groupData, BACKEND_URL, activeTab, filteredRestaurants]); // filteredRestaurants를 의존성 배열에 추가

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
    console.log('🎰 슬롯머신에서 후보 추가 시작');
    console.log('📊 선택된 식당:', selectedRestaurant);
    console.log('🔍 선택된 식당 타입:', selectedRestaurant?.type);
    console.log('🔍 activeTab:', activeTab);
    console.log('🔗 onAddCandidate 함수:', onAddCandidate);
    
    if (selectedRestaurant) {
      console.log('✅ 후보 추가 함수 호출');
      
      // 상위 컴포넌트가 기대하는 형식으로 데이터 변환
              console.log('🔍 조건 확인:', {
          selectedRestaurantType: selectedRestaurant.type,
          activeTab: activeTab,
          condition1: selectedRestaurant.type === 'kakao',
          condition2: (!selectedRestaurant.type && activeTab === 'direct'),
          result: selectedRestaurant.type === 'kakao' || (!selectedRestaurant.type && activeTab === 'direct')
        });
        
        if (selectedRestaurant.type === 'kakao' || (!selectedRestaurant.type && activeTab === 'direct')) {
        // 카카오맵 데이터를 직접가기탭과 동일한 방식으로 전달
        const kakaoData = (selectedRestaurant as any).detail || selectedRestaurant;
        console.log('🎯 슬롯머신 카카오 데이터 변환:', kakaoData);
        onAddCandidate(kakaoData as any);
      } else if (selectedRestaurant.type === 'yogiyo' || (!selectedRestaurant.type && activeTab === 'delivery')) {
        // 요기요 데이터 형식으로 변환 (배달탭과 동일한 구조)
        const yogiyoData = {
          // 원본 데이터의 모든 필드를 먼저 포함
          ...selectedRestaurant,
          // 필요한 필드들을 올바른 이름으로 덮어쓰기
          id: (selectedRestaurant as any).id,
          name: (selectedRestaurant as any).name,
          categories: (selectedRestaurant as any).categories || [],
          estimated_delivery_time: (selectedRestaurant as any).estimated_delivery_time || '',
          thumbnail_url: (selectedRestaurant as any).thumbnail_url || '',
          review_avg: (selectedRestaurant as any).review_avg || 0,
          review_count: (selectedRestaurant as any).review_count || 0,
          address: (selectedRestaurant as any).address,
          yogiyo_id: (selectedRestaurant as any).id
        };
        console.log('🎯 슬롯머신 요기요 데이터 변환:', yogiyoData);
        onAddCandidate(yogiyoData);
      } else {
        console.log('❌ 알 수 없는 타입의 후보입니다.');
      }
      
      console.log('✅ 후보 추가 함수 호출 완료');
    } else {
      console.log('❌ 선택된 식당이 없음');
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
    console.log('🔍 카카오맵 클릭:', restaurant);
    const kakaoId = (restaurant as any).detail?.id || (restaurant as any).id || restaurant.id;
    if (restaurant.type === 'kakao' && kakaoId) {
      console.log('🔗 카카오맵 URL 생성:', `https://place.map.kakao.com/${kakaoId}`);
      setModalUrl(`https://place.map.kakao.com/${kakaoId}`);
      setModalOpen(true);
    } else {
      console.log('❌ 카카오맵 ID를 찾을 수 없음');
    }
  };

  // 요기요 메뉴 모달 열기
  const handleMenuClick = async (restaurant: Restaurant) => {
    console.log('🔍 요기요 클릭:', restaurant);
    const yogiyoId = (restaurant as any).detail?.yogiyo_id || (restaurant as any).id || restaurant.id;
    if (restaurant.type === 'yogiyo' && yogiyoId) {
      console.log('🔗 요기요 메뉴 요청:', `${BACKEND_URL}/yogiyo-menu/${yogiyoId}`);
      setMenuModalOpen(true);
      setMenuLoading(true);
      setMenuError(null);
      setMenuList([]);
      try {
        const res = await fetch(`${BACKEND_URL}/yogiyo-menu/${yogiyoId}`);
        if (!res.ok) throw new Error("메뉴 정보를 불러올 수 없습니다");
        const data = await res.json();
        setMenuList(data.menus || []);
      } catch (e: any) {
        setMenuError(e.message || "메뉴 정보를 불러올 수 없습니다");
      } finally {
        setMenuLoading(false);
      }
    } else {
      console.log('❌ 요기요 ID를 찾을 수 없음');
    }
  };

  // 결과 컨테이너 클릭 핸들러
  const handleResultClick = (restaurant: Restaurant) => {
    console.log('🎯 결과 컨테이너 클릭됨!');
    console.log('📊 클릭된 식당:', restaurant);
    console.log('🔍 식당 타입:', restaurant.type);
    
    if (restaurant.type === 'kakao') {
      console.log('🍽️ 카카오맵 클릭 처리');
      handleInfoClick(restaurant);
    } else if (restaurant.type === 'yogiyo') {
      console.log('🍕 요기요 클릭 처리');
      handleMenuClick(restaurant);
    } else {
      console.log('❌ 알 수 없는 타입:', restaurant.type);
    }
  };

  // 선택된 식당이 이미 등록되어 있는지 확인
  const isAlreadyRegistered = (restaurant: Restaurant): boolean => {
    if (restaurant.type === 'kakao') {
      const kakaoId = restaurant.detail?.id || restaurant.id;
      return registeredKakaoIds.includes(Number(kakaoId));
    } else if (restaurant.type === 'yogiyo') {
      // 요기요의 경우 detail.yogiyo_id 또는 id를 모두 확인
      const yogiyoId = restaurant.detail?.yogiyo_id || restaurant.id;
      
      const numericYogiyoId = Number(yogiyoId);
      return registeredYogiyoIds.includes(numericYogiyoId);
    }
    return false;
  };

  if (!isSlotMachineReady) {
    return (
      <div className={styles.modal}>
        <div className={styles.container}>
          <div className={styles.header}>
            <button 
              className={styles.refreshButton} 
              onClick={refreshRestaurants}
              disabled={isRefreshing}
              title="후보 새로고침"
            >
              ⭮
            </button>
            <h1>
              {activeTab === 'direct' ? '🍽️ 직접가기 슬롯머신 룰렛 🍽️' : '🛵 배달 슬롯머신 룰렛 🛵'}
            </h1>
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
          <button 
            className={styles.refreshButton} 
            onClick={refreshRestaurants}
            disabled={isLoading}
            title="후보 새로고침"
          >
            ⭮
          </button>
          <h1>
            {activeTab === 'direct' ? '🍽️ 직접가기 슬롯머신 룰렛 🍽️' : '🛵 배달 슬롯머신 룰렛 🛵'}
          </h1>
          <button className={styles.closeButton} onClick={onClose}>✕</button>
        </div>

                <div className={styles.body}>
          <div className={styles.wheelContainer}>
            <div className={styles.wheelWrapper}>
              <div className={styles.slotMachineContainer}>
                {restaurants.map((restaurant: any, index) => {
                  // 현재 인덱스 기준으로 위치 계산
                  const position = (index - currentIndex + restaurants.length) % restaurants.length;
                  let className = styles.slotMachineItem;
                  let style: React.CSSProperties = {};
                  
                  if (position === 0) {
                    // 중앙
                    className += ` ${styles.active}`;
                  } else if (position === 1) {
                    // 중앙위
                    style.transform = 'translateY(-5vh) scale(1)';
                    style.opacity = '0.5';
                  } else if (position === restaurants.length - 1) {
                    // 중앙아래
                    style.transform = 'translateY(5vh) scale(1)';
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
                      {restaurant.name || restaurant.place_name || restaurant.restaurant_name || '이름 없음'}
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              className={`${styles.spinButton} ${isSpinning ? styles.spinning : ''}`}
              onClick={showResult ? handleSpinAgain : handleSpin}
              disabled={isSpinning || restaurants.length === 0 || !isSlotMachineReady}
            >
              {isSpinning ? '돌리는 중...' : showResult ? '다시 돌리기' : 'GO!'}
            </button>
          </div>

          {showResult && selectedRestaurant && (
            <div 
              className={styles.resultContainer}
              onClick={() => {
                console.log('🎯 결과 컨테이너 div 클릭됨!');
                handleResultClick(selectedRestaurant);
              }}
              style={{ 
                cursor: 'pointer',
                border: '2px solid #ddd',
                position: 'relative',
                zIndex: 10
              }}
            >
              <h2>🎉 당첨! 🎉</h2>
              <div className={styles.selectedRestaurant}>
                <span className={styles.restaurantName}>
                  {(selectedRestaurant as any).name || (selectedRestaurant as any).place_name || (selectedRestaurant as any).restaurant_name || '이름 없음'}
                </span>
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
            {/* 헤더 */}
            <div style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "40px",
              background: "#f8f9fa",
              borderBottom: "1px solid #e9ecef",
              display: "flex",
              alignItems: "center",
              justifyContent: "end",
              padding: "0 20px",
              zIndex: 3,
              borderTopLeftRadius: 12,
              borderTopRightRadius: 12
            }}>

              <button
                onClick={() => setModalOpen(false)}
                style={{
                  background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#666", padding: "5px"
                }}
              >✕</button>
            </div>
            <iframe
              src={modalUrl}
              style={{ width: "100%", height: "calc(100% - 20px)", border: "none", borderRadius: 12, marginTop: "40px" }}
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