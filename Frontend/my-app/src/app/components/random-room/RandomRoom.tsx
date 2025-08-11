"use client";

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import styles from '../../random-room/[group_id]/random-room.module.css';

const Wheel = dynamic(() => import('react-custom-roulette').then(mod => ({ default: mod.Wheel })), {
  ssr: false,
  loading: () => <div>로딩 중...</div>
});

// Wheel 마운트/언마운트 추적용 HOC
const DebugWheel = (props: any) => {
  useEffect(() => {
    console.log('[DebugWheel] 마운트됨', props.key);
    return () => {
      console.log('[DebugWheel] 언마운트됨', props.key);
    };
  }, []);
  return <Wheel {...props} />;
};

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

interface RandomRoomProps {
  groupId: string;
  isModal?: boolean;
  onAddCandidate?: (candidate: Restaurant) => void;
}

export default function RandomRoom({ groupId, isModal = false, onAddCandidate }: RandomRoomProps) {
  const [groupData, setGroupData] = useState<GroupData | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [mustSpin, setMustSpin] = useState(false);
  const [prizeNumber, setPrizeNumber] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalInfo, setModalInfo] = useState<{ type: string, url: string, label: string } | null>(null);
  const [menuModalOpen, setMenuModalOpen] = useState(false);
  const [menuList, setMenuList] = useState<{name: string, image: string|null}[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuError, setMenuError] = useState<string|null>(null);
  const [wheelKey, setWheelKey] = useState('default');
  const [showWheel, setShowWheel] = useState(false);
  const wheelRef = useRef<any>(null);

  useEffect(() => {
    console.log('[RandomRoom] isModal 변경:', isModal);
  }, [isModal]);

  useEffect(() => {
    console.log('[RandomRoom] showWheel 변경:', showWheel);
  }, [showWheel]);

  useEffect(() => {
    console.log('[RandomRoom] wheelKey 변경:', wheelKey);
  }, [wheelKey]);

  useEffect(() => {
    console.log('[RandomRoom] selectedRestaurant 변경:', selectedRestaurant);
  }, [selectedRestaurant]);

  // Wheel 마운트/언마운트 추적
  useEffect(() => {
    if (!showWheel) return;
    console.log('[Wheel] 마운트됨, key:', wheelKey);
    return () => {
      console.log('[Wheel] 언마운트됨, key:', wheelKey);
    };
  }, [showWheel, wheelKey]);

  useEffect(() => {
    if (isModal) {
      setShowWheel(false);
      const t = setTimeout(() => setShowWheel(true), 200);
      return () => clearTimeout(t);
    } else {
      setShowWheel(true);
      setWheelKey('default');
    }
  }, [isModal]);

  // showWheel이 true가 되는 순간에만 key를 새로 생성 (룰렛이 돌아가는 중에는 변경하지 않음)
  useEffect(() => {
    if (isModal && showWheel && !mustSpin) {
      setWheelKey(Math.random().toString(36).slice(2));
    }
  }, [isModal, showWheel, mustSpin]);

  // 그룹 데이터 가져오기
  useEffect(() => {
    const fetchGroupData = async () => {
      try {
        // URL 정규화 함수 - 끝에 슬래시 제거
        const normalizeUrl = (url: string) => {
          return url.endsWith('/') ? url.slice(0, -1) : url;
        };
        const BACKEND_URL = normalizeUrl(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000');
        console.log('그룹 데이터 가져오기 시작:', groupId);
        console.log('BACKEND_URL:', BACKEND_URL);
        
        const response = await fetch(`${BACKEND_URL}/groups/${groupId}`);
        console.log('응답 상태:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('받은 데이터:', data);
          if (data && data.x && data.y) {
            console.log('그룹 데이터 확인:', {
              x: data.x,
              y: data.y,
              radius: data.radius,
              offline: data.offline,
              delivery: data.delivery
            });
            setGroupData(data);
          } else {
            setError('그룹 정보를 가져올 수 없습니다.');
          }
        } else {
          setError('그룹 정보를 가져올 수 없습니다.');
        }
      } catch (err) {
        console.error('그룹 데이터 가져오기 오류:', err);
        setError('그룹 정보를 가져올 수 없습니다.');
      }
    };

    fetchGroupData();
  }, [groupId]);

  // Fisher-Yates 셔플 함수
  const shuffleArray = (array: any[]): any[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // 카테고리 정규화 함수 - 더 정확한 분류
  const normalizeCategory = (category: string): string => {
    const normalized = category.toLowerCase();
    
    // 카테고리 분류 (우선순위 순서대로)
    if (normalized.includes('치킨') || normalized.includes('닭') || normalized.includes('후라이드') || normalized.includes('양념치킨')) {
      return '치킨';
    }
    if (normalized.includes('피자')) {
      return '피자';
    }
    if (normalized.includes('햄버거') || normalized.includes('버거') || normalized.includes('패스트푸드') || normalized.includes('샌드위치')) {
      return '패스트푸드';
    }
    if (normalized.includes('분식') || normalized.includes('떡볶이') || normalized.includes('김밥')) {
      return '분식';
    }
    if (normalized.includes('카페') || normalized.includes('커피') || normalized.includes('음료')) {
      return '카페';
    }
    if (normalized.includes('디저트') || normalized.includes('베이커리') || normalized.includes('빵') || normalized.includes('케이크')) {
      return '디저트';
    }
    if (normalized.includes('중식') || normalized.includes('중국') || normalized.includes('중화요리')) {
      return '중식';
    }
    if (normalized.includes('일식') || normalized.includes('일본') || normalized.includes('참치회') || normalized.includes('돈까스') || normalized.includes('초밥') || normalized.includes('라멘')) {
      return '일식';
    }
    if (normalized.includes('양식') || normalized.includes('서양') || normalized.includes('이탈리안') || normalized.includes('스테이크') || normalized.includes('파스타')) {
      return '양식';
    }
    if (normalized.includes('고기') || normalized.includes('갈비') || normalized.includes('삼겹살') || normalized.includes('족발') || normalized.includes('보쌈')) {
      return '고기';
    }
    if (normalized.includes('해물') || normalized.includes('생선') || normalized.includes('회')) {
      return '해산물';
    }
    if (normalized.includes('면') || normalized.includes('국수') || normalized.includes('라면')) {
      return '면류';
    }
    if (normalized.includes('밥') || normalized.includes('덮밥') || normalized.includes('비빔밥') || normalized.includes('도시락')) {
      return '밥류';
    }
    if (normalized.includes('샐러드') || normalized.includes('건강식')) {
      return '건강식';
    }
    if (normalized.includes('뷔페')) {
      return '뷔페';
    }
    if (normalized.includes('술') || normalized.includes('술집') || normalized.includes('호프')) {
      return '술집';
    }
    if (normalized.includes('한식') || normalized.includes('한국') || normalized.includes('해장국') || normalized.includes('한정식') || normalized.includes('국밥')) {
      return '한식';
    }
    
    // 기본 카테고리 추출 (카카오맵 형식: "음식점 > 패스트푸드 > 햄버거")
    let parts = category.split('>').map(part => part.trim());
    if (parts.length >= 2) {
      return parts[1]; // 두 번째 부분 사용 (예: "패스트푸드")
    }
    
    return parts[0] || '기타';
  };

  // 카카오맵 스크립트 로드 확인
  const waitForKakaoMap = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      console.log('waitForKakaoMap 시작');
      
      // API 키 확인
      const apiKey = process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY;
      if (!apiKey) {
        console.error('KakaoMap - API Key is not set. Please set NEXT_PUBLIC_KAKAO_MAP_API_KEY in .env.local');
        reject(new Error('카카오맵 API 키가 설정되지 않았습니다.'));
        return;
      }
      
      if (typeof window === 'undefined') {
        console.log('서버 사이드에서 실행 중, 바로 resolve');
        resolve();
        return;
      }
      
      // 카카오맵 스크립트가 이미 로드되어 있는지 확인
      if (window.kakao && window.kakao.maps && window.kakao.maps.services) {
        console.log('카카오맵 스크립트 이미 로드됨');
        resolve();
        return;
      }
      
      // 스크립트가 로드되어 있지 않으면 로드
      if (!document.getElementById("kakao-map-script")) {
        console.log('카카오맵 스크립트 로드 시작');
        const script = document.createElement("script");
        script.id = "kakao-map-script";
        script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&autoload=false&libraries=services`;
        script.async = true;
        
        script.onload = () => {
          console.log('카카오맵 스크립트 로드 완료, maps.load 시작');
          if (window.kakao && window.kakao.maps) {
            window.kakao.maps.load(() => {
              console.log('카카오맵 maps.load 완료');
              resolve();
            });
          } else {
            console.error('카카오맵 - kakao 객체를 찾을 수 없습니다.');
            reject(new Error('카카오맵 스크립트 로드에 실패했습니다.'));
          }
        };
        
        script.onerror = (error) => {
          console.error('카카오맵 스크립트 로드 오류:', error);
          reject(new Error('카카오맵 스크립트 로드에 실패했습니다.'));
        };
        
        document.head.appendChild(script);
      } else {
        // 스크립트는 있지만 아직 로드 중인 경우
        const checkKakao = () => {
          console.log('카카오맵 스크립트 확인 중...');
          
          if (typeof window !== 'undefined' && window.kakao && window.kakao.maps && window.kakao.maps.services) {
            console.log('카카오맵 스크립트 로드 완료');
            resolve();
          } else {
            console.log('카카오맵 스크립트 아직 로딩 중, 100ms 후 재시도');
            setTimeout(checkKakao, 100);
          }
        };
        checkKakao();
      }
    });
  };

  // 식당 데이터 가져오기 함수
    const fetchRestaurants = async () => {
      // 랜덤 시드 추가 (매번 다른 결과를 위해)
      console.log('랜덤 시드:', Date.now());
      
    console.log('fetchRestaurants 시작');
    console.log('groupData:', groupData);
    
    if (!groupData) {
      console.log('groupData가 없어서 종료');
      return;
    }
    
      setIsLoading(true);
      try {
              // URL 정규화 함수 - 끝에 슬래시 제거
        const normalizeUrl = (url: string) => {
          return url.endsWith('/') ? url.slice(0, -1) : url;
        };
        const BACKEND_URL = normalizeUrl(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000');
      const allRestaurants: Restaurant[] = [];

      // 1. 직접가기 설정된 경우 카카오맵 API 호출
      console.log('카카오맵 API 호출 조건 확인:', { offline: groupData.offline, window: typeof window });
      if (groupData.offline && typeof window !== 'undefined') {
        try {
          console.log('카카오맵 API 호출 시작');
          await waitForKakaoMap();
          
          const ps = new window.kakao.maps.services.Places();
          const allKakaoResults: any[] = [];
          
          // categorySearch로 7페이지만 검색
          for (let page = 1; page <= 3; page++) { // 페이지 수 줄이기
            await new Promise(res => setTimeout(res, 300)); // 300ms 딜레이
            try {
              const searchOptions = {
                location: new window.kakao.maps.LatLng(groupData.x, groupData.y),
                radius: groupData.radius, // 미터 단위
                category_group_code: 'FD6',
                size: 15,
                page: page
              };

              console.log(`카카오맵 검색 옵션:`, {
                location: `${groupData.x}, ${groupData.y}`,
                radius: `${groupData.radius}m`,
                page: page
              });

              console.log(`카카오맵 categorySearch (페이지 ${page})`);
              const kakaoResults = await new Promise((resolve, reject) => {
                ps.categorySearch('FD6', (data: any, status: any) => {
                  console.log(`카카오맵 검색 결과 (페이지 ${page}):`, { status, dataLength: data?.length });
                  if (status === window.kakao.maps.services.Status.OK) {
                    console.log(`카카오맵 검색 성공 (페이지 ${page})`);
                    resolve(data);
                  } else {
                    console.log(`카카오맵 검색 실패 (페이지 ${page}):`, status);
                    resolve([]); // 실패해도 빈 배열 반환
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
              break; // 오류 발생 시 검색 중단
            }
          }

          // 중복 제거 (ID 기준)
          const uniqueKakaoResults = allKakaoResults.filter((restaurant, index, self) => 
            index === self.findIndex(r => r.id === restaurant.id)
          );
          
          console.log(`카카오맵 총 검색 결과: ${allKakaoResults.length}개, 중복 제거 후: ${uniqueKakaoResults.length}개`);

          const filteredKakao = uniqueKakaoResults
            .filter((restaurant: any) => {
              const withinRadius = restaurant.distance <= groupData.radius;
              console.log(`식당 필터링: ${restaurant.place_name}`, {
                distance: restaurant.distance, // 미터 단위
                radius: groupData.radius,
                withinRadius: withinRadius
              });
              return withinRadius;
            })
            .map((restaurant: any) => ({
              id: restaurant.id || restaurant.kakao_id,
              name: restaurant.place_name,
              rating: restaurant.rating,
              address: restaurant.address_name,
              category: restaurant.category_name,
              type: 'kakao' as const,
              detail: restaurant
            }));
          allRestaurants.push(...filteredKakao);
        } catch (error) {
          console.error('카카오맵 API 초기화 실패:', error);
          // 카카오맵 API 실패 시에도 계속 진행 (요기요 API만 사용)
        }
      }

      // 2. 배달 설정된 경우 요기요 API 호출
      console.log('요기요 API 호출 조건 확인:', { delivery: groupData.delivery });
      if (groupData.delivery) {
        try {
          console.log('요기요 API 호출 시작');
          const yogiyoResponse = await fetch(`${BACKEND_URL}/groups/${groupId}/yogiyo-restaurants`);
          if (yogiyoResponse.ok) {
            const yogiyoData = await yogiyoResponse.json();
            const filteredYogiyo = yogiyoData.restaurants
              .filter((restaurant: any) => restaurant.review_avg >= 4.7)
              .map((restaurant: any) => ({
                id: restaurant.id.toString(),
                name: restaurant.name,
                rating: restaurant.review_avg,
                address: restaurant.address || '배달 가능 지역',
                category: restaurant.categories.join(', '),
                type: 'yogiyo' as const,
                detail: restaurant
              }));
            allRestaurants.push(...filteredYogiyo);
          }
        } catch (err) {
          console.error('요기요 API 호출 오류:', err);
        }
      }

      // 3. 데이터 분배 로직 (카테고리별로 하나씩 선택)
      let finalRestaurants: Restaurant[] = [];
      
      if (groupData.offline && groupData.delivery) {
        const kakaoRestaurants = allRestaurants.filter(r => r.type === 'kakao');
        const yogiyoRestaurants = allRestaurants.filter(r => r.type === 'yogiyo');
        
        const selectByCategory = (restaurants: Restaurant[], maxCount: number): Restaurant[] => {
          const selected: Restaurant[] = [];
          
          // 1단계: 카테고리별로 분류 (카페 제외)
          const categoryGroups = new Map<string, Restaurant[]>();
          restaurants.forEach(restaurant => {
            const category = normalizeCategory(restaurant.category);
            // 카페 카테고리 제외
            if (category === '카페') {
              return;
            }
            if (!categoryGroups.has(category)) {
              categoryGroups.set(category, []);
            }
            categoryGroups.get(category)!.push(restaurant);
          });
          
          console.log('카테고리별 분류 결과:', Array.from(categoryGroups.entries()).map(([cat, rest]) => `${cat}: ${rest.length}개`));
          
          // 2단계: 카테고리별로 하나씩 랜덤 선택
          const categories = Array.from(categoryGroups.keys());
          const shuffledCategories = shuffleArray(categories);
          
          for (const category of shuffledCategories) {
            if (selected.length >= maxCount) break;
            
            const restaurantsInCategory = categoryGroups.get(category)!;
            const randomRestaurant = restaurantsInCategory[Math.floor(Math.random() * restaurantsInCategory.length)];
            selected.push(randomRestaurant);
            console.log(`선택됨: ${randomRestaurant.name} (${category})`);
          }
          
          // 3단계: 10개가 안 되면 중복 카테고리 허용하여 추가 선택
          if (selected.length < maxCount) {
            console.log(`카테고리별 선택 후 ${selected.length}개, ${maxCount}개까지 추가 선택`);
            
            // 이미 선택된 식당 ID 집합
            const selectedIds = new Set(selected.map(r => r.id));
            
            // 모든 식당을 하나의 배열로 합치고 랜덤하게 섞기
            const remainingRestaurants = restaurants.filter(r => !selectedIds.has(r.id));
            const shuffledRemaining = remainingRestaurants.sort(() => Math.random() - 0.5);
            
            // 남은 자리만큼 추가 선택
            for (const restaurant of shuffledRemaining) {
              if (selected.length >= maxCount) break;
              selected.push(restaurant);
              console.log(`추가 선택됨: ${restaurant.name} (${normalizeCategory(restaurant.category)})`);
            }
          }
          
          console.log(`최종 선택된 식당 개수: ${selected.length}`);
          console.log('최종 선택된 식당들:', selected.map(r => `${r.name} (${normalizeCategory(r.category)})`));
          return selected;
        };
        
        const selectedKakao = selectByCategory(kakaoRestaurants, 5);
        const selectedYogiyo = selectByCategory(yogiyoRestaurants, 5);
        finalRestaurants = [...selectedKakao, ...selectedYogiyo];
      } else if (groupData.offline || groupData.delivery) {
                  const selectByCategory = (restaurants: Restaurant[], maxCount: number): Restaurant[] => {
            const selected: Restaurant[] = [];
            
            // 1단계: 카테고리별로 분류 (카페 제외)
            const categoryGroups = new Map<string, Restaurant[]>();
            restaurants.forEach(restaurant => {
              const category = normalizeCategory(restaurant.category);
              // 카페 카테고리 제외
              if (category === '카페') {
                return;
              }
              if (!categoryGroups.has(category)) {
                categoryGroups.set(category, []);
              }
              categoryGroups.get(category)!.push(restaurant);
            });
            
            console.log('카테고리별 분류 결과:', Array.from(categoryGroups.entries()).map(([cat, rest]) => `${cat}: ${rest.length}개`));
            
            // 2단계: 카테고리별로 하나씩 랜덤 선택 (중복 이름 제외)
            const categories = Array.from(categoryGroups.keys());
            const shuffledCategories = shuffleArray(categories);
            const selectedNames = new Set<string>(); // 선택된 식당 이름 추적
            
            for (const category of shuffledCategories) {
              if (selected.length >= maxCount) break;
              
              const restaurantsInCategory = categoryGroups.get(category)!;
              const shuffledRestaurants = shuffleArray(restaurantsInCategory);
              
              // 중복 이름이 아닌 첫 번째 식당 선택
              for (const restaurant of shuffledRestaurants) {
                if (!selectedNames.has(restaurant.name)) {
                  selected.push(restaurant);
                  selectedNames.add(restaurant.name);
                  console.log(`선택됨: ${restaurant.name} (${category})`);
                  break;
                }
              }
            }
            
            // 3단계: 10개가 안 되면 중복 카테고리 허용하여 추가 선택 (중복 이름 제외)
            if (selected.length < maxCount) {
              console.log(`카테고리별 선택 후 ${selected.length}개, ${maxCount}개까지 추가 선택`);
              
              // 이미 선택된 식당 ID 집합
              const selectedIds = new Set(selected.map(r => r.id));
              
              // 모든 식당을 하나의 배열로 합치고 랜덤하게 섞기
              const remainingRestaurants = restaurants.filter(r => !selectedIds.has(r.id) && !selectedNames.has(r.name));
              const shuffledRemaining = shuffleArray(remainingRestaurants);
              
              // 남은 자리만큼 추가 선택
              for (const restaurant of shuffledRemaining) {
                if (selected.length >= maxCount) break;
                selected.push(restaurant);
                selectedNames.add(restaurant.name);
                console.log(`추가 선택됨: ${restaurant.name} (${normalizeCategory(restaurant.category)})`);
              }
            }
            
            console.log(`최종 선택된 식당 개수: ${selected.length}`);
            console.log('최종 선택된 식당들:', selected.map(r => `${r.name} (${normalizeCategory(r.category)})`));
            return selected;
          };
        
        finalRestaurants = selectByCategory(allRestaurants, 10);
      }

      // 4. 최종 결과 설정
      console.log('최종 식당 개수:', finalRestaurants.length);
      console.log('최종 식당 목록:', finalRestaurants);
      
      if (finalRestaurants.length === 0) {
        console.log('조건에 맞는 식당이 없음');
        setError('조건에 맞는 식당을 찾을 수 없습니다.');
      } else {
        console.log('식당 목록 설정 완료');
        setRestaurants(finalRestaurants);
      }
      } catch (err) {
      console.error('식당 정보 가져오기 오류:', err);
        setError('식당 정보를 가져올 수 없습니다.');
      } finally {
        setIsLoading(false);
      }
    };

  // groupData가 설정되면 자동으로 새로운 식당 데이터 가져오기
  useEffect(() => {
    if (groupData) {
    fetchRestaurants();
    }
  }, [groupData]);

  // 텍스트를 자동으로 줄바꿈하는 함수
  const formatTextForRoulette = (text: string): string => {
    const cleanName = text
      .replace(/[-_]\s*[가-힣\w\s]*점\s*$/, '')
      .replace(/[-_]\s*[가-힣\w\s]*지점\s*$/, '')
      .replace(/[-_]\s*[가-힣\w\s]*매장\s*$/, '')
      .replace(/[-_]\s*[가-힣\w\s]*스토어\s*$/, '')
      .replace(/[-_]\s*[가-힣\w\s]*센터\s*$/, '')
      .trim();
    
    if (cleanName.length >= 9) {
      const mid = Math.ceil(cleanName.length / 2);
      const firstLine = cleanName.substring(0, mid);
      const secondLine = cleanName.substring(mid);
      return firstLine.split('').join(' ') + '  ' + secondLine.split('').join(' ');
    } else {
      return cleanName.split('').join(' ');
    }
  };

  // react-custom-roulette용 데이터 변환
  const rouletteData = restaurants.map((restaurant, index) => {
    const formattedText = formatTextForRoulette(restaurant.name);
    const isLongText = restaurant.name.replace(/[-_]\s*[가-힣\w\s]*점\s*$/, '').replace(/[-_]\s*[가-힣\w\s]*지점\s*$/, '').replace(/[-_]\s*[가-힣\w\s]*매장\s*$/, '').replace(/[-_]\s*[가-힣\w\s]*스토어\s*$/, '').replace(/[-_]\s*[가-힣\w\s]*센터\s*$/, '').trim().length >= 9;
    
    return {
      option: formattedText,
    style: { 
        backgroundColor: index % 4 === 0 ? '#FFE4E1' :
                  index % 4 === 1 ? '#E6F3FF' :
                  index % 4 === 2 ? '#F0FFF0' :
                  '#FFF8DC',
        textColor: '#4A4A4A',
        fontSize: isLongText ? 10 : 14,
        fontWeight: 'bold',
        textAlign: 'center',
        lineHeight: '1.1'
    }
    };
  });

  // 룰렛 돌리기
  const handleSpinClick = () => {
    if (!mustSpin) {
      const newPrizeNumber = Math.floor(Math.random() * restaurants.length);
      setPrizeNumber(newPrizeNumber);
      setMustSpin(true);
      setSelectedRestaurant(null);
    }
  };

  // 룰렛이 멈췄을 때 호출
  const handleStopSpinning = () => {
    setMustSpin(false);
    
    // 정확한 각도 기반 계산
    // react-custom-roulette는 0도가 양의 x축(3시 방향), 시계방향으로 회전
    // 포인터는 90도(중앙 상단, 12시 방향)에 위치
    // 각 세그먼트의 크기 = 360도 / 세그먼트 개수
    const segmentSize = 360 / restaurants.length;
    
    // prizeNumber는 세그먼트의 중심점을 가리킴 (0도 기준)
    // 포인터는 90도에 있으므로, 실제 포인터가 가리키는 세그먼트는 90도 앞에 있는 세그먼트
    // 90도 = 1/4 회전 = restaurants.length / 4 개의 세그먼트
    const pointerOffset = Math.floor(restaurants.length / 4);
    
    // 포인터가 실제로 가리키는 세그먼트 계산 (90도 앞의 세그먼트)
    const actualPointerIndex = (prizeNumber + pointerOffset) % restaurants.length;
    
    // 실제 당첨되어야 하는 것보다 4칸 오른쪽이 당첨으로 나오므로, 4칸 왼쪽으로 조정
    const finalIndex = (actualPointerIndex - 3 + restaurants.length) % restaurants.length;
    
    console.log('룰렛 결과 계산 (포인터 위치 보정):');
    console.log('- prizeNumber (0도 기준):', prizeNumber);
    console.log('- restaurants.length:', restaurants.length);
    console.log('- segmentSize:', segmentSize);
    console.log('- pointerOffset (90도):', pointerOffset);
    console.log('- actualPointerIndex (90도 기준):', actualPointerIndex);
    console.log('- finalIndex (4칸 왼쪽 조정):', finalIndex);
    console.log('- 선택된 식당:', restaurants[finalIndex]?.name);
    console.log('- 모든 식당:', restaurants.map((r, i) => `${i}: ${r.name}`));
    
    setSelectedRestaurant(restaurants[finalIndex]);
  };

  // 홈으로 이동
  const handleGoHome = () => {
    window.location.href = '/';
  };

  // 새로고침 (새로운 식당 가져오기)
  const handleRefresh = () => {
    setSelectedRestaurant(null);
    setMustSpin(false);
    setPrizeNumber(0);
    if (groupData) {
      fetchRestaurants();
    }
  };

  // 식당 클릭 시 상세정보/메뉴 모달
  const handleRestaurantClick = async (restaurant: Restaurant) => {
    console.log('식당 클릭됨:', restaurant);
    console.log('식당 타입:', restaurant.type);
    console.log('식당 상세정보:', restaurant.detail);
    console.log('요기요 ID 확인:', restaurant.detail?.id);
    console.log('카카오 ID 확인:', restaurant.detail?.kakao_id);
    
    if (restaurant.type === 'kakao' && (restaurant.detail?.kakao_id || restaurant.detail?.id)) {
      const kakaoId = restaurant.detail?.kakao_id || restaurant.detail?.id;
      console.log('카카오 모달 열기, ID:', kakaoId);
      setModalInfo({
        type: 'kakao',
        url: `https://place.map.kakao.com/${kakaoId}`,
        label: `카카오@https://place.map.kakao.com/${kakaoId}`
      });
      setModalOpen(true);
    } else if (restaurant.type === 'yogiyo' && restaurant.detail?.id) {
      console.log('요기요 메뉴 모달 열기');
      setMenuModalOpen(true);
      setMenuLoading(true);
      setMenuError(null);
      setMenuList([]);
      try {
        // URL 정규화 함수 - 끝에 슬래시 제거
        const normalizeUrl = (url: string) => {
          return url.endsWith('/') ? url.slice(0, -1) : url;
        };
        const backendUrl = normalizeUrl(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000');
        const res = await fetch(`${backendUrl}/yogiyo-menu/${restaurant.detail.id}`);
        if (!res.ok) throw new Error("메뉴 정보를 불러올 수 없습니다");
        const data = await res.json();
        setMenuList(data.menus || []);
      } catch (e: any) {
        setMenuError(e.message || "메뉴 정보를 불러올 수 없습니다");
      } finally {
        setMenuLoading(false);
      }
    } else {
      console.log('기타 모달 열기 - 조건 확인:');
      console.log('- type이 yogiyo인가?', restaurant.type === 'yogiyo');
      console.log('- detail이 있는가?', !!restaurant.detail);
      console.log('- id가 있는가?', !!restaurant.detail?.id);
      setModalInfo({
        type: 'etc',
        url: '',
        label: `${restaurant.name}\n\n📍 주소: ${restaurant.address}\n⭐ 평점: ${restaurant.rating || '정보 없음'}\n🍽️ 카테고리: ${restaurant.category}`
      });
      setModalOpen(true);
    }
  };

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorMessage}>
          <h2>오류 발생</h2>
          <p>{error}</p>
          <button
            onClick={handleGoHome}
            style={{ 
              background: "#dc3545", 
              color: "#fff", 
              border: "none", 
              borderRadius: "25px", 
              padding: "12px 24px", 
              fontSize: "16px", 
              fontWeight: "bold", 
              cursor: "pointer",
              transition: "all 0.3s ease",
              marginTop: "20px"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "#c82333";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "#dc3545";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            홈으로
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingMessage}>
          <h2>식당 정보를 가져오는 중...</h2>
          <div className={styles.spinner}></div>
        </div>
      </div>
    );
  }

  if (restaurants.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.errorMessage}>
          <h2>😔 조건에 맞는 식당을 찾을 수 없어요</h2>
          <p>다음 중 하나를 시도해보세요:</p>
          <ul style={{ textAlign: 'left', marginTop: '15px' }}>
            <li>• 배달 시간을 늘려보세요</li>
            <li>• 방문 가능 거리를 늘려보세요</li>
            <li>• 다른 위치를 선택해보세요</li>
          </ul>
          <button
            onClick={handleGoHome}
            style={{ 
              background: "#dc3545", 
              color: "#fff", 
              border: "none", 
              borderRadius: "25px", 
              padding: "12px 24px", 
              fontSize: "16px", 
              fontWeight: "bold", 
              cursor: "pointer",
              transition: "all 0.3s ease",
              marginTop: "20px"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "#c82333";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "#dc3545";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            홈으로
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>🍽️ 랜덤 식당 룰렛 🍽️</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', justifyContent: 'center' }}>
          <p>무엇을 먹을까요?</p>
          <button
            onClick={handleRefresh}
            style={{ 
              background: "transparent", 
              color: "#fff", 
              border: "none", 
              borderRadius: "25px", 
              fontSize: "14px", 
              fontWeight: "bold", 
              cursor: "pointer",
              transition: "all 0.3s ease",
              display: "flex",
              alignItems: "center"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            🔄
          </button>
        </div>
        {restaurants.length < 10 && restaurants.length > 0 && (
          <>
          <p style={{ color: '#ffd700', fontSize: '0.9rem', marginTop: '10px'}}>
            ⚠️ 조건에 맞는 식당이 {restaurants.length}개만 있어요.
          </p>
          <p style={{ color: '#ffd700', fontSize: '0.8rem', marginTop: '0px' }}>
          더 많은 식당을 찾기 위해 조건을 조정해보세요!
        </p>
        </>
        )}
      </div>

      <div className={styles.wheelContainer}>
        <div className={styles.wheelWrapper}>
          {showWheel && (
            <DebugWheel
              key={wheelKey}
              mustStartSpinning={mustSpin}
              prizeNumber={prizeNumber}
              data={rouletteData}
              onStopSpinning={handleStopSpinning}
              backgroundColors={['#ff6b6b', '#4ecdc4']}
              textColors={['white']}
              fontSize={12}
              fontWeight="bold"
              spinDuration={0.8}
              innerRadius={0}
              innerBorderColor="#333"
              innerBorderWidth={3}
              outerBorderColor="#333"
              outerBorderWidth={3}
              radiusLineColor="#333"
              radiusLineWidth={1}
              perpendicularText={false}
              textDistance={50}
              pointerProps={{
                style: {
                  transform: 'translate(-50%, -50%)',
                  top: '50%',
                  left: '50%'
                }
              }}
            />
          )}
        </div>

        <button
          className={`${styles.spinButton} ${mustSpin ? styles.spinning : ''}`}
          onClick={handleSpinClick}
          disabled={mustSpin || restaurants.length === 0}
        >
          {mustSpin ? '돌리는 중...' : 'GO!'}
        </button>
      </div>

      {selectedRestaurant && (
        <div className={styles.resultContainer}>
          <h2>🎉 오늘의 식당! 🎉</h2>
          <div 
            className={styles.resultCard}
            onClick={() => handleRestaurantClick(selectedRestaurant)}
            style={{ cursor: 'pointer' }}
          >
            <h3>{selectedRestaurant.name}</h3>
            {selectedRestaurant.type === 'yogiyo' && (
            <p className={styles.rating}>⭐ {selectedRestaurant.rating}</p>
            )}
            <p className={styles.category}>{selectedRestaurant.category}</p>
            <p className={styles.address}>{selectedRestaurant.address}</p>
          </div>
          {isModal && (
            <button
              style={{
                marginTop: '18px',
                background: '#4ecdc4',
                color: '#fff',
                border: 'none',
                borderRadius: '25px',
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.3s',
              }}
              onClick={() => {
                console.log('[후보에 추가하기 클릭] selectedRestaurant:', selectedRestaurant);
                onAddCandidate && onAddCandidate(selectedRestaurant);
              }}
            >
              후보에 추가하기
            </button>
          )}
        </div>
      )}

      <div className={styles.restaurantList}>
        <h3>후보 식당들</h3>
        <div className={styles.listContainer}>
          {restaurants.map((restaurant, index) => (
            <div 
              key={restaurant.id} 
              className={styles.restaurantItem}
              onClick={() => handleRestaurantClick(restaurant)}
              style={{ cursor: 'pointer' }}
            >
              <span className={styles.itemNumber}>{index + 1}</span>
              <div className={styles.itemInfo}>
                <h4>{restaurant.name}</h4>
                <p>
                  {restaurant.type === 'yogiyo' && `⭐ ${restaurant.rating} • `}
                  {restaurant.category}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {!isModal && (
        <div style={{ marginTop: "30px", marginBottom: "30px", textAlign: "center", display: "flex", gap: "15px", justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={handleGoHome}
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
            onMouseOver={(e) => {
              e.currentTarget.style.background = "#c82333";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "#dc3545";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            홈으로
          </button>
        </div>
      )}

      {modalOpen && modalInfo && (
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
                position: "absolute", top: 38, right: 15, background: "none", border: "none", fontSize: 24, cursor: "pointer", zIndex: 2
              }}
            >✕</button>
            {modalInfo.type === 'kakao' ? (
              <iframe
                src={modalInfo.url}
                style={{ width: "100%", height: "100%", border: "none", borderRadius: 12 }}
                title="카카오 플레이스"
              />
            ) : modalInfo.type === 'yogiyo' ? (
              <>
                <div style={{fontWeight:'bold', marginBottom:8}}>요기요</div>
                <a href={modalInfo.url} target="_blank" rel="noopener noreferrer" style={{color:'#994d52', wordBreak:'break-all'}}>{modalInfo.label}</a>
              </>
            ) : modalInfo.type === 'custom' ? (
              <>
                <div style={{fontWeight:'bold', marginBottom:8}}>커스텀 링크</div>
                <a href={modalInfo.url} target="_blank" rel="noopener noreferrer" style={{color:'#994d52', wordBreak:'break-all'}}>{modalInfo.label}</a>
              </>
            ) : (
              <div style={{ 
                padding: '20px', 
                whiteSpace: 'pre-line', 
                textAlign: 'left',
                fontSize: '16px',
                lineHeight: '1.6'
              }}>
                {modalInfo.label}
              </div>
            )}
          </div>
        </div>
      )}

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
                position: "absolute", top: 20, right: 20, background: "none", border: "none", fontSize: 24, cursor: "pointer", color: '#222'
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
}