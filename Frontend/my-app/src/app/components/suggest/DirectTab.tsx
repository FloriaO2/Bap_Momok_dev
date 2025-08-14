"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import KakaoMap from '../../components/KakaoMap';

interface Restaurant {
  id: string;
  name: string;
  description: string;
  image: string;
  category: string;
  address?: string;
  phone?: string;
}

interface DirectTabProps {
  groupData: any;
  groupId: string;
  onAddCandidate: (restaurant: any) => void; // 타입을 any로 변경하여 유연성 확보
  registeredCandidateIds?: number[];
  sectorSearchResults: any[];
  setSectorSearchResults: React.Dispatch<React.SetStateAction<any[]>>;
  hasSectorSearchCompleted: boolean;
  setHasSectorSearchCompleted: React.Dispatch<React.SetStateAction<boolean>>;
  setLoading?: React.Dispatch<React.SetStateAction<boolean>>;
  setFilteredResults?: React.Dispatch<React.SetStateAction<any[]>>; // 필터링된 결과를 상위로 전달
  setSlotMachineResults?: React.Dispatch<React.SetStateAction<any[]>>; // 슬롯머신용 필터링된 결과를 상위로 전달
}

declare global {
  interface Window {
    kakao: any;
  }
}

export default function DirectTab({ 
  groupData, 
  groupId, 
  onAddCandidate, 
  registeredCandidateIds = [],
  sectorSearchResults,
  setSectorSearchResults,
  hasSectorSearchCompleted,
  setHasSectorSearchCompleted,
  setLoading,
  setFilteredResults,
  setSlotMachineResults
}: DirectTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLocalLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const mapRef = useRef<any>(null);
  const psRef = useRef<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalUrl, setModalUrl] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isEnd, setIsEnd] = useState(false);
  const [placeholder, setPlaceholder] = useState("음식점 검색 (예: 이태원 맛집)");
  const [initialLoading, setInitialLoading] = useState(false);
  const [displayedResults, setDisplayedResults] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreResults, setHasMoreResults] = useState(true);
  const ITEMS_PER_PAGE = 25;

  // 카페, 디저트 제외 필터 상태
  const [excludeCafeDessert, setExcludeCafeDessert] = useState(false);

  // 세부 필터링 상태
  const [excludedCategories, setExcludedCategories] = useState<string[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  // 필터링된 결과 상태
  const [localFilteredResults, setLocalFilteredResults] = useState<any[]>([]);
  
  // 슬롯머신용 필터링된 전체 결과 (검색 결과와 무관하게 카페,디저트 필터만 적용)
  const [slotMachineFilteredResults, setSlotMachineFilteredResults] = useState<any[]>([]);

  // 카테고리 계층 구조 정의
  const categoryHierarchy = {
    '한식': ['분식', '고기', '밥류', '찌개', '기타한식'],
    '중식': ['마라탕', '기타중식'],
    '일식': ['초밥', '회', '돈까스', '우동', '기타일식'],
    '양식': ['치킨', '피자', '패스트푸드', '기타양식'],
    '건강식': ['샐러드', '죽', '샤브샤브'],
    '기타': ['베트남음식', '동남아음식', '태국음식', '기타식당'],
    '후식': ['카페,디저트', '제과,베이커리', '간식', '아이스크림', '떡,한과'],
    '주류': ['술집', '호프', '기타주류']
  };

  // 모든 하위 카테고리 목록 (필터링용)
  const allSubCategories = [
    // 한식
    '분식', '고기', '밥류',
    // 중식
    // 일식
    '초밥', '회', '돈까스', '우동',
    // 양식
    '치킨', '피자', '패스트푸드',
    // 기타
    '뷔페', '베트남식', '멕시칸식',
    // 디저트
    '카페,디저트', '제과,베이커리', '간식', '아이스크림', '떡,한과',
    // 회식
    '술집', '호프'
  ];

  // 카테고리 매핑 (실제 카카오맵 카테고리와 매칭)
  const categoryMapping: { [key: string]: string[] } = {
    // 한식 하위 카테고리
    '분식': ['분식'],
    '고기': ['고기'],
    '밥류': ['밥류'],
    '찌개': ['찌개'],
    
    // 중식
    '마라탕': ['마라탕'],
    '기타중식': ['중식'],
    
    // 일식 하위 카테고리
    '초밥': ['일식'],
    '돈까스': ['일식'],
    '우동': ['면류'],
    '회': ['해산물'],
    
    // 양식 하위 카테고리
    '치킨': ['치킨'],
    '피자': ['피자'],
    '패스트푸드': ['패스트푸드'],
    
    // 건강식 하위 카테고리
    '샐러드': ['샐러드'],
    '죽': ['죽'],
    '샤브샤브': ['샤브샤브'],
    
    // 기타 하위 카테고리
    '베트남음식': ['베트남음식'],
    '동남아음식': ['동남아음식'],
    '태국음식': ['태국음식'],
    '기타식당': ['기타식당'],
    
    // 디저트 하위 카테고리
    '카페,디저트': ['카페,디저트'],
    '제과,베이커리': ['제과,베이커리'],
    '간식': ['간식'],
    '아이스크림': ['아이스크림'],
    '떡,한과': ['떡,한과'],
    
    // 주류 하위 카테고리
    '술집': ['술집'],
    '호프': ['호프'],
    '기타주류': ['기타주류']
  };

  // 스크롤 위치 저장용 ref와 state
  const listRef = useRef<HTMLDivElement>(null);
  const [scrollPos, setScrollPos] = useState<number | null>(null);

  // URL 정규화 함수 - 끝에 슬래시 제거
  const normalizeUrl = (url: string) => {
    return url.endsWith('/') ? url.slice(0, -1) : url;
  };

  const BACKEND_URL = normalizeUrl(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000');

  // 카페, 디저트 카테고리 필터링 함수


  // 세부 카테고리 필터링 함수
  const filterByCategory = (restaurant: any) => {
    if (excludedCategories.length === 0) return true; // 제외된 카테고리가 없으면 모든 식당 표시
    
    if (!restaurant.category_name) return true; // 카테고리 정보가 없으면 표시
    
    const fullCategoryString = restaurant.category_name; // 전체 카테고리 문자열
    
    // 제외된 카테고리와 매칭 확인
    for (const excludedCategory of excludedCategories) {
      // '기타' 카테고리 특별 처리
      if (excludedCategory === '기타한식') {
        // 한식의 기타: 한식 중 분식, 고기, 밥류가 아닌 것들
        if (fullCategoryString.includes('한식') || fullCategoryString.includes('해장국') || fullCategoryString.includes('한정식') || fullCategoryString.includes('국밥')) {
          return false;
        }
      } else if (excludedCategory === '기타중식') {
        // 중식의 기타: 중식 중 마라탕이 아닌 것들
        if (fullCategoryString.includes('중식')) {
          return false;
        }
      } else if (excludedCategory === '기타일식') {
        // 일식의 기타: 일식 중 초밥, 회, 돈까스, 우동이 아닌 것들
        if (fullCategoryString.includes('일식')) {
          return false;
        }
      } else if (excludedCategory === '기타양식') {
        // 양식의 기타: 양식 중 치킨, 피자, 패스트푸드가 아닌 것들
        if (fullCategoryString.includes('양식')) {
          return false;
        }
      } else if (excludedCategory === '기타주류') {
        // 주류의 기타: 주류 중 술집, 호프가 아닌 것들
        if (fullCategoryString.includes('주류') && 
            !fullCategoryString.includes('술집') && 
            !fullCategoryString.includes('호프')) {
          return false;
        }
      } else if (excludedCategory === '기타식당') {
        // 기타식당: 다른 카테고리에 모두 해당하지 않는 모든 식당
        const excludedKeywords = [
          // 한식 관련
          '분식', '고기', '밥류', '찌개', '한식', '해장국', '한정식', '국밥',
          // 중식 관련
          '마라탕', '중식',
          // 일식 관련
          '초밥', '회', '돈까스', '우동', '일식',
          // 양식 관련
          '치킨', '피자', '패스트푸드', '양식',
          // 건강식 관련
          '샐러드', '죽', '샤브샤브',
          // 기타 관련
          '베트남음식', '동남아음식', '태국음식',
          // 후식 관련
          '카페,디저트', '제과,베이커리', '간식', '아이스크림', '떡,한과',
          // 주류 관련
          '술집', '호프', '주류'
        ];
        
        // 다른 카테고리에 해당하지 않는지 확인
        const hasOtherCategory = excludedKeywords.some(keyword => 
          fullCategoryString.includes(keyword)
        );
        
        if (!hasOtherCategory) {
          return false;
        }
      } else {
        // 일반 카테고리 매칭 - 전체 카테고리 문자열에서 키워드 검색
        const mappedCategories = categoryMapping[excludedCategory] || [excludedCategory];
        for (const mappedCategory of mappedCategories) {
          if (fullCategoryString.includes(mappedCategory)) {
            return false;
          }
        }
      }
    }
    
    return true;
  };

  // 통합 필터링 함수 (세부 카테고리만 사용)
  const applyFilters = (restaurant: any) => {
    return filterByCategory(restaurant);
  };

  // 카테고리 토글 함수
      const toggleCategory = (category: string) => {
      setExcludedCategories(prev => {
        const newExcluded = prev.includes(category) 
          ? prev.filter(cat => cat !== category)
          : [...prev, category];
        
        // 후식 카테고리의 하위 카테고리 상태 확인
        const dessertCategories = categoryHierarchy['후식'] || [];
        const hasDessertCategory = dessertCategories.some(cat => newExcluded.includes(cat));
        
        // 후식 하위 카테고리가 하나라도 제외되지 않으면 체크박스 해제
        if (!hasDessertCategory) {
          setExcludeCafeDessert(false);
        } else {
          // 후식 하위 카테고리가 모두 제외된 경우에만 체크박스 켜기
          const allDessertExcluded = dessertCategories.every(cat => newExcluded.includes(cat));
          setExcludeCafeDessert(allDessertExcluded);
        }
        
        return newExcluded;
      });
    };

  // 상위 카테고리 토글 함수 (모든 하위 카테고리 포함/제외)
      const toggleParentCategory = (parentCategory: string) => {
      const subCategories = categoryHierarchy[parentCategory] || [];
      const isAllExcluded = subCategories.every(cat => excludedCategories.includes(cat));
      
      setExcludedCategories(prev => {
        let newExcluded;
        if (isAllExcluded) {
          // 모든 하위 카테고리가 제외되어 있으면 모두 포함
          newExcluded = prev.filter(cat => !subCategories.includes(cat));
        } else {
          // 일부만 제외되어 있으면 모두 제외
          newExcluded = [...prev];
          subCategories.forEach(cat => {
            if (!newExcluded.includes(cat)) {
              newExcluded.push(cat);
            }
          });
        }
        
        // 후식 카테고리 토글 시 체크박스 동기화
        if (parentCategory === '후식') {
          const hasDessertCategory = subCategories.some(cat => newExcluded.includes(cat));
          setExcludeCafeDessert(hasDessertCategory);
        }
        
        return newExcluded;
      });
    };

  // 하위 카테고리 상태 확인 함수
  const getSubCategoryStatus = (parentCategory: string) => {
    const subCategories = categoryHierarchy[parentCategory] || [];
    const excludedCount = subCategories.filter(cat => excludedCategories.includes(cat)).length;
    
    if (excludedCount === 0) return 'all-included';
    if (excludedCount === subCategories.length) return 'all-excluded';
    return 'partial';
  };

  // 필터 변경 시 스크롤 맨 위로 이동 및 슬롯머신용 결과 업데이트
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
    
    // 슬롯머신용 필터링된 결과 업데이트
    if (sectorSearchResults.length > 0) {
      const slotMachineFiltered = sectorSearchResults.filter(applyFilters);
      setSlotMachineFilteredResults(slotMachineFiltered);
      
      // 상위 컴포넌트로 슬롯머신용 결과 전달
      if (setSlotMachineResults) {
        setSlotMachineResults(slotMachineFiltered);
      }
      
      console.log(`🎰 슬롯머신용 필터링 결과 업데이트: ${sectorSearchResults.length}개 → ${slotMachineFiltered.length}개`);
    }
  }, [excludeCafeDessert, excludedCategories, sectorSearchResults]);

  // 지도가 준비되면 인스턴스 저장
  const handleMapReady = (mapInstance: any) => {
    mapRef.current = mapInstance;
  };

  // 그룹 위치로 이동하는 핀 버튼 클릭 핸들러
  const handleGroupPinClick = () => {
    if (mapRef.current && typeof window !== 'undefined' && window.kakao && window.kakao.maps) {
      const moveLatLng = new window.kakao.maps.LatLng(groupData.x, groupData.y);
      mapRef.current.panTo(moveLatLng);
    }
  };

  // 카카오맵 초기화
  useEffect(() => {
    const initKakaoServices = () => {
      if (typeof window !== 'undefined' && window.kakao && window.kakao.maps && window.kakao.maps.services) {
        try {
          // Places 서비스 초기화
          if (!psRef.current) {
            psRef.current = new window.kakao.maps.services.Places();
            console.log('카카오맵 Places 서비스 초기화 성공');
          }
        } catch (error) {
          console.error('Places 서비스 초기화 실패:', error);
        }
      }
    };

    // 더 긴 간격으로 여러 번 시도
    const checkAndInit = () => {
      if (typeof window !== 'undefined' && window.kakao && window.kakao.maps && window.kakao.maps.services) {
        initKakaoServices();
        return true;
      }
      return false;
    };

    // 즉시 시도
    if (!checkAndInit()) {
      // 500ms 간격으로 최대 10번 시도
      let attempts = 0;
      const maxAttempts = 10;
      const interval = setInterval(() => {
        attempts++;
        if (checkAndInit() || attempts >= maxAttempts) {
          clearInterval(interval);
          if (attempts >= maxAttempts) {
            console.error('카카오맵 서비스 초기화 실패: 최대 시도 횟수 초과');
          }
        }
      }, 500);
    }
  }, [groupData]);

  // 부채꼴 검색 함수
  const loadAllRestaurantsBySectors = async () => {
    console.log('🔍 loadAllRestaurantsBySectors 함수 시작');
    console.log('🔍 groupData:', groupData);
    
    if (!groupData) {
      console.log('🔍 groupData가 없어서 부채꼴 검색을 건너뜁니다.');
      return;
    }
    
    // 카카오맵 API가 로드될 때까지 기다리기
    console.log('🔍 카카오맵 API 로드 대기 중...');
    let attempts = 0;
    const maxAttempts = 50; // 5초 대기 (100ms * 50)
    
    while (attempts < maxAttempts) {
      if (typeof window !== 'undefined' && window.kakao && window.kakao.maps && window.kakao.maps.services) {
        console.log('🔍 카카오맵 API 로드 완료!');
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (attempts >= maxAttempts) {
      console.error('🔍 카카오맵 API 로드 타임아웃');
      return;
    }
    
    console.log('🔍 window.kakao:', !!window.kakao);
    console.log('🔍 window.kakao.maps:', !!window.kakao.maps);
    console.log('🔍 window.kakao.maps.services:', !!window.kakao.maps.services);
    
    if (groupData && typeof window !== 'undefined' && window.kakao && window.kakao.maps && window.kakao.maps.services) {
      // Places 서비스가 준비될 때까지 대기
      let attempts = 0;
      const maxAttempts = 20;
      
      while (!psRef.current && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      if (!psRef.current) {
        psRef.current = new window.kakao.maps.services.Places();
      }
      
      setInitialLoading(true);
      setShowSearchResults(true);
      setLoading?.(true); // 상위 컴포넌트에 로딩 시작 알림
      
      let allRestaurants: any[] = [];
      const centerLat = groupData.x;
      const centerLng = groupData.y;
      const radius = groupData.radius;
      
      // 원을 부채꼴과 고리로 나누기
      const numSectors = 8;  // 부채꼴 개수 (8개 = 45도씩)
      const numRings = 2;    // 고리 개수 (2개 = 반지름을 2등분)
      
      console.log(`🔍 원형 분할 설정: 반경 ${radius}m, ${numSectors}개 부채꼴, ${numRings}개 고리`);
      
      // 각 부채꼴과 고리 조합으로 검색 (안쪽 고리부터 먼저 검색)
      for (let ring = 0; ring < numRings; ring++) {
        for (let sector = 0; sector < numSectors; sector++) {
          // 부채꼴의 각도 계산 (0도부터 시작, 45도씩)
          const startAngle = sector * (360 / numSectors);
          const endAngle = (sector + 1) * (360 / numSectors);
          
          // 고리의 반지름 계산 (안쪽부터 바깥쪽까지)
          const innerRadius = (ring * radius) / numRings;
          const outerRadius = ((ring + 1) * radius) / numRings;
          
          // 부채꼴의 중심점 계산
          const centerAngle = (startAngle + endAngle) / 2;
          const centerRadius = (innerRadius + outerRadius) / 2;
          
          // 중심점의 위도/경도 계산 (대략적인 계산)
          const latOffset = (centerRadius * Math.cos(centerAngle * Math.PI / 180)) / 111000; // 111000m = 1도
          const lngOffset = (centerRadius * Math.sin(centerAngle * Math.PI / 180)) / (111000 * Math.cos(centerLat * Math.PI / 180));
          
          const sectorCenterLat = centerLat + latOffset;
          const sectorCenterLng = centerLng + lngOffset;
          
          // 부채꼴 영역의 바운딩 박스 계산 (대략적인 사각형)
          const sectorRadius = (outerRadius - innerRadius) / 2;
          
          // 최소 바운딩 박스 크기 보장 (너무 작으면 검색이 실패할 수 있음)
          const minLatOffset = Math.max(sectorRadius/111000, 0.001); // 최소 0.001도
          const minLngOffset = Math.max(sectorRadius/111000, 0.001); // 최소 0.001도
          
          const bounds = new window.kakao.maps.LatLngBounds(
            new window.kakao.maps.LatLng(sectorCenterLat - minLatOffset, sectorCenterLng - minLngOffset),
            new window.kakao.maps.LatLng(sectorCenterLat + minLatOffset, sectorCenterLng + minLngOffset)
          );
          
          try {
            let sectorRestaurants: any[] = [];
            let page = 1;
            const maxPages = 2; // 최대 2페이지까지 검색 (15개 × 2 = 30개)
            
            while (page <= maxPages) {
              const result = await new Promise((resolve, reject) => {
                const timeoutId = setTimeout(() => {
                  reject(new Error(`부채꼴 (${sector},${ring}) 페이지 ${page} 검색 타임아웃`));
                }, 10000); // 10초 타임아웃
                
                psRef.current.categorySearch('FD6', (data: any, status: any, pagination: any) => {
                  clearTimeout(timeoutId);
                  if (status === window.kakao.maps.services.Status.OK) {
                    resolve({ data, pagination });
                  } else if (status === window.kakao.maps.services.Status.ZERO_RESULT) {
                    // 검색 결과가 없는 경우 (오류가 아님)
                    resolve({ data: [], pagination: null });
                  } else {
                    console.warn(`부채꼴 (${sector},${ring}) 페이지 ${page} 검색 상태:`, status);
                    reject(new Error(`부채꼴 (${sector},${ring}) 페이지 ${page} 검색 실패 - 상태: ${status}`));
                  }
                }, { bounds, page });
              });
              
              const { data, pagination } = result as any;
              
              // 중복 제거하면서 추가
              const existingIds = new Set(sectorRestaurants.map(item => item.id || item.kakao_id));
              const newRestaurants = data.filter((item: any) => !existingIds.has(item.id || item.kakao_id));
              sectorRestaurants = [...sectorRestaurants, ...newRestaurants];
              
              console.log(`🔍 부채꼴 (${sector},${ring}) 페이지 ${page} 완료: ${data.length}개 식당, 누적 ${sectorRestaurants.length}개`);
              
              // 더 이상 페이지가 없으면 중단
              if (!pagination || !pagination.hasNextPage) {
                break;
              }
              
              page++;
            }
            
            // 전체 결과에 추가
            const existingIds = new Set(allRestaurants.map(item => item.id || item.kakao_id));
            const newRestaurants = sectorRestaurants.filter((item: any) => !existingIds.has(item.id || item.kakao_id));
            allRestaurants = [...allRestaurants, ...newRestaurants];
            
            console.log(`🔍 부채꼴 (${sector},${ring}) 전체 완료: ${sectorRestaurants.length}개 식당, 중복 제거 후 ${newRestaurants.length}개 추가`);
            
            // 최대 500개까지만 수집
            if (allRestaurants.length >= 500) {
              console.log('🔍 최대 식당 수(500개)에 도달하여 검색 중단');
              break;
            }
            
          } catch (error) {
            console.error(`부채꼴 (${sector},${ring}) 검색 오류:`, error);
            // 에러 발생 시 해당 부채꼴 건너뛰고 계속 진행
            continue;
          }
        }
        
        // 최대 500개까지만 수집 (이중 루프 탈출)
        if (allRestaurants.length >= 500) {
          break;
        }
      }
      
      setInitialLoading(false);
      setSearchResults(allRestaurants);
      setSectorSearchResults(allRestaurants); // 부채꼴 검색 결과 저장
      
      // 슬롯머신용 필터링된 결과 업데이트 (카페,디저트 필터만 적용)
              const slotMachineFiltered = allRestaurants.filter(applyFilters);
      setSlotMachineFilteredResults(slotMachineFiltered);
      
      // 상위 컴포넌트로 슬롯머신용 결과 전달
      if (setSlotMachineResults) {
        setSlotMachineResults(slotMachineFiltered);
      }
      
      setHasSectorSearchCompleted(true); // 부채꼴 검색 완료 표시
      setLoading?.(false); // 상위 컴포넌트에 로딩 완료 알림
      
      // 페이지네이션 초기화 (필터링 적용)
      const filteredRestaurants = allRestaurants.filter(applyFilters);
      const initialDisplay = filteredRestaurants.slice(0, ITEMS_PER_PAGE);
      setDisplayedResults(initialDisplay);
      setCurrentPage(1);
      setHasMoreResults(allRestaurants.length > ITEMS_PER_PAGE);
      setIsEnd(false); // 더보기 버튼 표시
      
      console.log(`🔍 전체 식당 로드 완료: 총 ${allRestaurants.length}개 식당`);
    }
  };

  // 부채꼴 검색 실행: 최초 groupData 변경 시 1회만 실행
  useEffect(() => {
    // 저장된 결과가 있으면 재활용
    if (hasSectorSearchCompleted && sectorSearchResults.length > 0) {
      console.log('🔍 탭 전환 - 저장된 부채꼴 검색 결과 재활용:', sectorSearchResults.length, '개 식당');
      setSearchResults(sectorSearchResults);
      
      // 페이지네이션 초기화 (필터링 적용)
      const filteredResults = sectorSearchResults.filter(applyFilters);
      const initialDisplay = filteredResults.slice(0, ITEMS_PER_PAGE);
      setDisplayedResults(initialDisplay);
      setCurrentPage(1);
      setHasMoreResults(sectorSearchResults.length > ITEMS_PER_PAGE);
      setShowSearchResults(true);
      setIsEnd(false); // 더보기 버튼 표시
      return; // 저장된 결과가 있으면 함수 종료
    }
    
    // 저장된 결과가 없으면 부채꼴 검색 실행
    console.log('🔍 최초 부채꼴 검색 실행');
    loadAllRestaurantsBySectors();
  }, [groupData]);

  // 필터링 효과 적용
  useEffect(() => {
    if (searchResults.length > 0) {
      const filtered = searchResults.filter(applyFilters);
      setLocalFilteredResults(filtered);
      
      // 상위 컴포넌트로 필터링된 결과 전달
      if (setFilteredResults) {
        console.log('🔍 상위 컴포넌트로 필터링된 결과 전달:', filtered.length, '개');
        setFilteredResults(filtered);
      }
      
      // 페이지네이션 초기화
      const initialDisplay = filtered.slice(0, ITEMS_PER_PAGE);
      setDisplayedResults(initialDisplay);
      setCurrentPage(1);
      setHasMoreResults(filtered.length > ITEMS_PER_PAGE);
      setIsEnd(filtered.length <= ITEMS_PER_PAGE);
      
      console.log(`🔍 필터링 결과: ${searchResults.length}개 → ${filtered.length}개`);
    }
  }, [searchResults, excludeCafeDessert, excludedCategories, setFilteredResults]);



  // 검색 실행 (페이지네이션 적용)
  const handleSearch = (resetPage = true) => {
    // 더보기(페이지네이션)일 때 스크롤 위치 저장
    if (!resetPage && listRef.current) {
      setScrollPos(listRef.current.scrollTop);
    }
    let keyword = searchTerm.trim();
    const nextPage = resetPage ? 1 : page + 1;
    let searchOptions: any = { category_group_code: 'FD6', size: 15, page: nextPage };

    // 모든 검색에서 그룹 위치와 radius 사용
    if (groupData && groupData.x && groupData.y && groupData.radius) {
      searchOptions.location = new window.kakao.maps.LatLng(groupData.x, groupData.y);
      searchOptions.radius = groupData.radius;
      console.log(`🔍 검색 옵션: 위치(${groupData.x}, ${groupData.y}), 반경 ${groupData.radius}m, 키워드: "${keyword}"`);
    } else {
      console.warn('⚠️ 그룹 위치 정보가 없어서 전체 지역에서 검색됩니다.');
    }

    setLocalLoading(true);
    setShowSearchResults(true);
    
    // 검색어가 있으면 키워드 검색, 없으면 카테고리 검색
    if (keyword !== '') {
      psRef.current.keywordSearch(keyword, (data: any, status: any, pagination: any) => {
        setLocalLoading(false);
        if (status === window.kakao.maps.services.Status.OK) {
          // 카테고리 정보 디버깅을 위한 로그
          console.log('🔍 카카오맵 키워드 검색 결과:', data.map((item: any) => ({
            name: item.place_name,
            category_name: item.category_name,
            category_group_code: item.category_group_code,
            id: item.id
          })));
          
          if (resetPage) {
            setSearchResults(data);
            // 필터링 적용
            const filteredData = data.filter(applyFilters);
            setDisplayedResults(filteredData);
            setPage(1);
            setCurrentPage(1);
            setHasMoreResults(false); // 키워드 검색은 더보기 없음
          } else {
            setSearchResults(prev => {
              const existingIds = new Set(prev.map((item: any) => item.id || item.kakao_id));
              const newData = data.filter((item: any) => !existingIds.has(item.id || item.kakao_id));
              return [...prev, ...newData];
            });
            setDisplayedResults(prev => {
              const existingIds = new Set(prev.map((item: any) => item.id || item.kakao_id));
              const newData = data.filter((item: any) => !existingIds.has(item.id || item.kakao_id));
              // 새로 추가된 데이터에 필터링 적용
              const filteredNewData = newData.filter(applyFilters);
              return [...prev, ...filteredNewData];
            });
            setPage(nextPage);
          }
          // pagination이 없거나, data가 15개 미만이면 isEnd를 true로
          if (!pagination) {
            setIsEnd(true);
            console.log('🔍 페이지네이션 정보 없음 - 더보기 종료');
          } else {
            const hasNextPage = pagination.hasNextPage === false;
            setIsEnd(hasNextPage);
            console.log('🔍 페이지네이션 정보:', {
              currentPage: pagination.current,
              hasNextPage: !hasNextPage,
              totalCount: pagination.totalCount,
              dataLength: data.length
            });
          }
        } else {
          if (resetPage) setSearchResults([]);
          setIsEnd(true);
        }
      }, searchOptions);
    } else {
      // 검색어가 없으면 저장된 부채꼴 검색 결과 사용
      if (hasSectorSearchCompleted && sectorSearchResults.length > 0) {
        setLocalLoading(false);
        setSearchResults(sectorSearchResults);
        
        // 페이지네이션 초기화 (필터링 적용)
        const filteredResults = sectorSearchResults.filter(applyFilters);
        const initialDisplay = filteredResults.slice(0, ITEMS_PER_PAGE);
        setDisplayedResults(initialDisplay);
        setCurrentPage(1);
        setHasMoreResults(sectorSearchResults.length > ITEMS_PER_PAGE);
        setShowSearchResults(true);
        setIsEnd(sectorSearchResults.length <= ITEMS_PER_PAGE); // 더보기 버튼 표시 여부
        console.log('🔍 저장된 부채꼴 검색 결과 사용:', sectorSearchResults.length, '개 식당');
      } else {
        // 저장된 결과가 없으면 부채꼴 검색 실행
        const loadAllRestaurantsByCircularDivision = async () => {
        const centerLat = groupData.x;
        const centerLng = groupData.y;
        const radius = groupData.radius;
        
        // 원을 부채꼴과 고리로 나누기
        const numSectors = 8;  // 부채꼴 개수 (8개 = 45도씩)
        const numRings = 3;    // 고리 개수 (3개 = 반지름을 3등분)
        
        let allRestaurants: any[] = [];
        
        // 각 부채꼴과 고리 조합으로 검색 (안쪽 고리부터 먼저 검색)
        for (let ring = 0; ring < numRings; ring++) {
          for (let sector = 0; sector < numSectors; sector++) {
            // 부채꼴의 각도 계산 (0도부터 시작, 45도씩)
            const startAngle = sector * (360 / numSectors);
            const endAngle = (sector + 1) * (360 / numSectors);
            
            // 고리의 반지름 계산 (안쪽부터 바깥쪽까지)
            const innerRadius = (ring * radius) / numRings;
            const outerRadius = ((ring + 1) * radius) / numRings;
            
            // 부채꼴의 중심점 계산
            const centerAngle = (startAngle + endAngle) / 2;
            const centerRadius = (innerRadius + outerRadius) / 2;
            
            // 중심점의 위도/경도 계산 (대략적인 계산)
            const latOffset = (centerRadius * Math.cos(centerAngle * Math.PI / 180)) / 111000; // 111000m = 1도
            const lngOffset = (centerRadius * Math.sin(centerAngle * Math.PI / 180)) / (111000 * Math.cos(centerLat * Math.PI / 180));
            
            const sectorCenterLat = centerLat + latOffset;
            const sectorCenterLng = centerLng + lngOffset;
            
            // 부채꼴 영역의 바운딩 박스 계산 (대략적인 사각형)
            const sectorRadius = (outerRadius - innerRadius) / 2;
            
            // 최소 바운딩 박스 크기 보장 (너무 작으면 검색이 실패할 수 있음)
            const minLatOffset = Math.max(sectorRadius/111000, 0.001); // 최소 0.001도
            const minLngOffset = Math.max(sectorRadius/111000, 0.001); // 최소 0.001도
            
            const bounds = new window.kakao.maps.LatLngBounds(
              new window.kakao.maps.LatLng(sectorCenterLat - minLatOffset, sectorCenterLng - minLngOffset),
              new window.kakao.maps.LatLng(sectorCenterLat + minLatOffset, sectorCenterLng + minLngOffset)
            );
            
            try {
              let sectorRestaurants: any[] = [];
              let page = 1;
              const maxPages = 2; // 최대 2페이지까지 검색 (15개 × 2 = 30개)
              
              while (page <= maxPages) {
                const result = await new Promise((resolve, reject) => {
                  const timeoutId = setTimeout(() => {
                    reject(new Error(`부채꼴 (${sector},${ring}) 페이지 ${page} 검색 타임아웃`));
                  }, 10000); // 10초 타임아웃
                  
                  psRef.current.categorySearch('FD6', (data: any, status: any, pagination: any) => {
                    clearTimeout(timeoutId);
                    if (status === window.kakao.maps.services.Status.OK) {
                      resolve({ data, pagination });
                    } else if (status === window.kakao.maps.services.Status.ZERO_RESULT) {
                      // 검색 결과가 없는 경우 (오류가 아님)
                      resolve({ data: [], pagination: null });
                    } else {
                      console.warn(`부채꼴 (${sector},${ring}) 검색 상태:`, status);
                      reject(new Error(`부채꼴 (${sector},${ring}) 검색 실패 - 상태: ${status}`));
                    }
                  }, { bounds, page });
                });
                
                const { data, pagination } = result as any;
                
                // 중복 제거하면서 추가
                const existingIds = new Set(sectorRestaurants.map(item => item.id || item.kakao_id));
                const newRestaurants = data.filter((item: any) => !existingIds.has(item.id || item.kakao_id));
                sectorRestaurants = [...sectorRestaurants, ...newRestaurants];
                
                // 더 이상 페이지가 없으면 중단
                if (!pagination || !pagination.hasNextPage) {
                  break;
                }
                
                page++;
              }
              
              // 전체 결과에 추가
              const existingIds = new Set(allRestaurants.map(item => item.id || item.kakao_id));
              const newRestaurants = sectorRestaurants.filter((item: any) => !existingIds.has(item.id || item.kakao_id));
              allRestaurants = [...allRestaurants, ...newRestaurants];
              
              // 최대 500개까지만 수집
              if (allRestaurants.length >= 500) {
                break;
              }
              
            } catch (error) {
              console.error(`부채꼴 (${sector},${ring}) 검색 오류:`, error);
              // 에러 발생 시 해당 부채꼴 건너뛰고 계속 진행
              continue;
            }
          }
          
          // 최대 500개까지만 수집 (이중 루프 탈출)
          if (allRestaurants.length >= 500) {
            break;
          }
        }
        
        setLocalLoading(false);
        
        if (resetPage) {
          setSearchResults(allRestaurants);
          setPage(1);
        } else {
          setSearchResults(prev => {
            const existingIds = new Set(prev.map((item: any) => item.id || item.kakao_id));
            const newData = allRestaurants.filter((item: any) => !existingIds.has(item.id || item.kakao_id));
            return [...prev, ...newData];
          });
          setPage(nextPage);
        }
        
        setIsEnd(false); // 더보기 버튼 표시
        
        console.log('🔍 원형 분할 검색 완료:', allRestaurants.length, '개 식당');
      };
      
        loadAllRestaurantsByCircularDivision();
      }
    }
  };

  // 검색어 입력 시 엔터키 처리
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch(true);
    }
  };

  // 더보기 버튼 클릭 핸들러
  const handleLoadMore = () => {
    // 키워드 검색 중이면 기존 로직 사용
    if (searchTerm.trim() !== '') {
      handleSearch(false);
    } else {
      // 부채꼴 검색 결과인 경우 페이지네이션 적용 (필터링된 결과 사용)
      const nextPage = currentPage + 1;
      const startIndex = (nextPage - 1) * ITEMS_PER_PAGE;
      const endIndex = startIndex + ITEMS_PER_PAGE;
      
      const newItems = localFilteredResults.slice(startIndex, endIndex);
      setDisplayedResults(prev => [...prev, ...newItems]);
      setCurrentPage(nextPage);
      setHasMoreResults(endIndex < localFilteredResults.length);
      
      console.log(`🔍 더보기: ${newItems.length}개 추가, 총 ${displayedResults.length + newItems.length}개 표시`);
    }
  };


  // 후보 추가 함수 (+버튼 클릭 시)
  const handleAddCandidate = async (restaurant: any) => {
    const added_by = typeof window !== 'undefined' ? (sessionStorage.getItem('participant_id') || 'unknown') : 'unknown';
    const body = {
      added_by,
      kakao_data: restaurant
    };
    try {
      const res = await fetch(`${BACKEND_URL}/groups/${groupId}/candidates/kakao`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        alert(`${restaurant.place_name || restaurant.name}이(가) 후보에 추가되었습니다!`);
      } else {
        alert('후보 추가에 실패했습니다.');
      }
    } catch (e) {
      alert('후보 추가 중 오류가 발생했습니다.');
    }
  };

  const handleInfoClick = (restaurant: any) => {
    const kakao_id = restaurant.id || restaurant.kakao_id;
    if (kakao_id) {
      setModalUrl(`https://place.map.kakao.com/${kakao_id}`);
      setModalOpen(true);
    }
  };

  const handleCardClick = (id: string, restaurant: any) => {
    setSelectedId(selectedId === id ? null : id);
    // 활성화 시 지도 이동
    if (selectedId !== id && mapRef.current && typeof window !== 'undefined' && window.kakao && window.kakao.maps) {
      const x = Number(restaurant.y);
      const y = Number(restaurant.x);
      if (!isNaN(x) && !isNaN(y)) {
        const moveLatLng = new window.kakao.maps.LatLng(x, y);
        mapRef.current.panTo(moveLatLng);
      }
    }
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 440) {
        setPlaceholder("음식점 검색");
      } else {
        setPlaceholder("음식점 검색 (예: 이태원 맛집)");
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 검색 결과가 추가된 후, 스크롤 위치 복원
  useEffect(() => {
    if (scrollPos !== null && listRef.current) {
      listRef.current.scrollTop = scrollPos;
      setScrollPos(null);
    }
  }, [searchResults]);

  return (
    <div>
      {/* 지도 표시 */}
      {groupData && (
        <div style={{ 
          marginBottom: "20px",
          height: "300px",
          borderRadius: "12px",
          overflow: "hidden",
          position: "relative"
        }}>
          <KakaoMap
            searchKeyword=""
            onLocationChange={() => {}}
            centerLat={groupData.x}
            centerLng={groupData.y}
            onMapReady={handleMapReady}
            pinButtonType="group"
            onPinClick={handleGroupPinClick}
          />
        </div>
      )}

      {/* 검색바 */}
      <div style={{ marginBottom: "20px", position: "relative" }}>
        <input
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyPress={handleKeyPress}
          style={{
            width: "100%",
            padding: "12px 40px 12px 15px",
            border: "1px solid #e0e0e0",
            borderRadius: "8px",
            fontSize: "16px",
            outline: "none"
          }}
        />
                    {searchTerm && !loading && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  console.log('🔍 X 버튼 클릭 - 저장된 결과 확인:', {
                    hasSectorSearchCompleted,
                    sectorSearchResultsLength: sectorSearchResults.length
                  });
                  // 저장된 부채꼴 검색 결과로 돌아가기
                  if (hasSectorSearchCompleted && sectorSearchResults.length > 0) {
                    console.log('🔍 저장된 부채꼴 검색 결과 사용');
                    setSearchResults(sectorSearchResults);
                    setShowSearchResults(true);
                    setIsEnd(true);
                  } else {
                    console.log('🔍 저장된 결과 없음 - 부채꼴 검색 실행');
                    // 저장된 결과가 없으면 부채꼴 검색 실행
                    loadAllRestaurantsBySectors();
                  }
                }}
                style={{
                  position: "absolute",
                  right: "calc(clamp(60px, 15vw, 80px) + 25px)",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  fontSize: "18px",
                  color: "#999",
                  cursor: "pointer"
                }}
              >
                ✕
              </button>
            )}
        <button
          onClick={() => {
            handleSearch(true);
          }}
          disabled={loading}
          style={{
            position: "absolute",
            right: "15px",
            top: "50%",
            transform: "translateY(-50%)",
            background: "#994d52",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            padding: "7px clamp(12px, 3vw, 20px)",
            fontSize: "clamp(12px, 2.5vw, 16px)",
            fontWeight: "bold",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
            minWidth: "60px",
            maxWidth: "100px",
            width: "clamp(60px, 15vw, 80px)"
          }}
        >
          {loading ? "검색" : "검색"}
        </button>
      </div>

      {/* 필터 영역 - 가로 정렬 */}
      <div style={{ 
        marginBottom: "15px",
        display: "flex",
        gap: "15px",
        alignItems: "center"
      }}>
        {/* 카페, 디저트 제외 필터 */}
        <div style={{ 
          padding: "12px", 
          background: "#f8f9fa", 
          borderRadius: "8px",
          border: "1px solid #e9ecef"
        }}>
          <label style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: "8px", 
            cursor: "pointer",
            fontSize: "14px",
            color: "#333"
          }}>
            <input
              type="checkbox"
              checked={excludeCafeDessert}
                             onChange={(e) => {
                 const newExcludeCafeDessert = e.target.checked;
                 setExcludeCafeDessert(newExcludeCafeDessert);
                 
                 // 카페, 디저트 제외가 켜지면 세부 필터링에서도 후식 카테고리 제외
                 if (newExcludeCafeDessert) {
                   // 후식 카테고리의 모든 하위 카테고리를 제외 목록에 추가
                   const dessertCategories = categoryHierarchy['후식'] || [];
                   setExcludedCategories(prev => {
                     const newExcluded = [...prev];
                     dessertCategories.forEach(cat => {
                       if (!newExcluded.includes(cat)) {
                         newExcluded.push(cat);
                       }
                     });
                     return newExcluded;
                   });
                 } else {
                   // 카페, 디저트 제외가 꺼지면 세부 필터링에서도 후식 카테고리 포함
                   const dessertCategories = categoryHierarchy['후식'] || [];
                   setExcludedCategories(prev => {
                     return prev.filter(cat => !dessertCategories.includes(cat));
                   });
                 }
               }}
              style={{
                width: "16px",
                height: "16px",
                cursor: "pointer"
              }}
            />
            <span>☕ 후식 제외</span>
          </label>
        </div>

        {/* 세부 필터링 버튼 */}
        <button
          onClick={() => setShowCategoryModal(true)}
          style={{
            padding: "8px 16px",
            background: "#994d52",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "500"
          }}
        >
          🍽️ 세부 필터링
        </button>

        {/* 모든 태그 제거 버튼 */}
        {excludedCategories.length > 0 && (
          <button
            onClick={() => {
              setExcludedCategories([]);
              setExcludeCafeDessert(false); // 후식 제외 체크박스도 해제
            }}
            style={{
              padding: "8px 16px",
              background: "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500"
            }}
          >
            🗑️ 모든 태그 제거
          </button>
        )}
      </div>

      {/* 제외된 카테고리 태그들 */}
      {excludedCategories.length > 0 && (
        <div style={{ 
          marginBottom: "15px",
          display: "flex",
          flexWrap: "wrap",
          gap: "8px"
        }}>
          {(() => {
            // 상위 카테고리별로 그룹화하여 태그 생성
            const tagsToShow: string[] = [];
            
            // 각 상위 카테고리 확인
            Object.entries(categoryHierarchy).forEach(([parentCategory, subCategories]) => {
              const excludedSubCategories = subCategories.filter(cat => excludedCategories.includes(cat));
              
              if (excludedSubCategories.length === subCategories.length) {
                // 모든 하위 카테고리가 제외된 경우 상위 카테고리만 표시
                tagsToShow.push(parentCategory);
              } else if (excludedSubCategories.length > 0) {
                // 일부만 제외된 경우 개별 하위 카테고리 표시
                excludedSubCategories.forEach(cat => {
                  if (!tagsToShow.includes(cat)) {
                    tagsToShow.push(cat);
                  }
                });
              }
            });
            
            return tagsToShow.map((category) => (
              <span
                key={category}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "4px 8px",
                  background: "#ff6b6b",
                  color: "white",
                  borderRadius: "12px",
                  fontSize: "12px",
                  fontWeight: "500"
                }}
              >
                {category} 제외
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (categoryHierarchy[category]) {
                      // 상위 카테고리인 경우 모든 하위 카테고리 토글
                      toggleParentCategory(category);
                    } else {
                      // 하위 카테고리인 경우 개별 토글
                      toggleCategory(category);
                    }
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "white",
                    marginLeft: "6px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "bold"
                  }}
                >
                  ×
                </button>
              </span>
            ));
          })()}
        </div>
      )}

      {/* 검색 결과 목록 */}
      {showSearchResults && (
        <div 
          ref={listRef}
          style={{ 
            marginBottom: "20px",
            maxHeight: "400px",
            overflowY: "auto"
          }}
        >
          <h3 style={{ 
            fontSize: "18px", 
            fontWeight: "bold", 
            color: "#333", 
            marginBottom: "15px"
          }}>
            음식점 목록
            {excludedCategories.length > 0 && (
              <span style={{ 
                fontSize: "14px", 
                fontWeight: "normal", 
                color: "#666",
                marginLeft: "8px"
              }}>
                ({excludedCategories.length}개 카테고리 제외)
              </span>
            )}
          </h3>
          
          {initialLoading ? (
            <div style={{ 
              height: "calc(100vh - 800px)",
              minHeight: "200px",
              maxHeight: "400px",
              overflowY: "auto"
            }}>
              <div style={{ textAlign: "center", color: "#999", fontSize: "16px", padding: "40px 0" }}>
              식당 정보를 불러오고 있습니다...
              </div>
            </div>
          ) : loading ? (
            <div style={{ textAlign: "center", color: "#999", fontSize: "16px", padding: "40px 0" }}>
              검색
            </div>
          ) : displayedResults.length === 0 ? (
            <div style={{ textAlign: "center", color: "#999", fontSize: "16px", padding: "40px 0" }}>
              {excludedCategories.length > 0 ? "필터링된 검색 결과가 없습니다" : "검색 결과가 없습니다"}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              {displayedResults.map((restaurant) => {
                const cardId = restaurant.id || restaurant.kakao_id;
                const isRegistered = registeredCandidateIds.includes(Number(cardId));

                return (
                  <div
                    key={cardId}
                    onClick={() => handleCardClick(cardId, restaurant)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "15px",
                      background: "#f8f9fa",
                      borderRadius: "12px",
                      gap: "15px",
                      border: selectedId === cardId ? "2px solid #994d52" : "2px solid transparent",
                      cursor: "pointer"
                    }}
                  >
                    {/* 정보 */}
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        fontSize: "16px", 
                        fontWeight: "bold", 
                        color: "#333",
                        marginBottom: "4px"
                      }}>
                        {restaurant.place_name || restaurant.name}
                      </div>
                      <div style={{ 
                        fontSize: "14px", 
                        color: "#666",
                        marginBottom: "4px"
                      }}>
                        {restaurant.category_name && restaurant.category_name.trim() !== '' 
                          ? (() => {
                              const categories = restaurant.category_name.split('>').map((cat: string) => cat.trim());
                              const lastCategory = categories[categories.length - 1];
                              const restaurantName = restaurant.place_name || restaurant.name;
                              
                              // 마지막 카테고리가 식당 이름에 포함되면 그 앞의 카테고리 사용
                              if (lastCategory && restaurantName && restaurantName.includes(lastCategory)) {
                                return categories.length > 1 ? categories[categories.length - 2] : '카테고리 정보 없음';
                              } else {
                                return lastCategory || '카테고리 정보 없음';
                              }
                            })()
                          : '카테고리 정보 없음'
                        }
                      </div>
                      {restaurant.road_address_name && (
                        <div style={{ 
                          fontSize: "12px", 
                          color: "#999",
                          marginBottom: "2px"
                        }}>
                          📍 {restaurant.road_address_name}
                        </div>
                      )}
                      {restaurant.address_name && (
                        <div style={{ 
                          fontSize: "12px", 
                          color: "#999",
                          marginBottom: "2px"
                        }}>
                          📍 {restaurant.address_name}
                        </div>
                      )}
                    </div>
                    {/* 버튼 영역: i버튼 + +버튼 */}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: 12 }}>
                      <button
                        onClick={e => { e.stopPropagation(); handleInfoClick(restaurant); }}
                        style={{
                          background: "#eee",
                          border: "none",
                          borderRadius: "50%",
                          width: 32,
                          height: 32,
                          fontSize: 20,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: restaurant.id || restaurant.kakao_id ? "pointer" : "not-allowed"
                        }}
                        title="카카오 플레이스 정보"
                        disabled={!(restaurant.id || restaurant.kakao_id)}
                      >
                        ℹ️
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); onAddCandidate(restaurant); }}
                        disabled={isRegistered}
                        style={{ 
                          width: "40px",
                          height: "40px",
                          background: isRegistered ? "#ccc" : "#994d52",
                          color: "#fff",
                          border: "none",
                          borderRadius: "50%",
                          fontSize: "20px",
                          fontWeight: "bold",
                          cursor: isRegistered ? "not-allowed" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "all 0.2s"
                        }}
                        onMouseOver={(e) => {
                          if (!isRegistered) {
                            e.currentTarget.style.background = "#8a4449";
                            e.currentTarget.style.transform = "scale(1.1)";
                          }
                        }}
                        onMouseOut={(e) => {
                          if (!isRegistered) {
                            e.currentTarget.style.background = "#994d52";
                            e.currentTarget.style.transform = "scale(1)";
                          }
                        }}
                      >
                        {isRegistered ? '✔' : '+'}
                      </button>
                    </div>
                  </div>
                );
              })}
              {!isEnd && hasMoreResults && (
                <div style={{ textAlign: "center", margin: "20px 0" }}>
                  <button
                    type="button"
                    onClick={e => { e.preventDefault(); handleLoadMore(); }}
                    style={{
                      background: "#994d52",
                      color: "#fff",
                      border: "none",
                      borderRadius: "20px",
                      padding: "10px 30px",
                      fontSize: "16px",
                      fontWeight: "bold",
                      cursor: "pointer"
                    }}
                    disabled={loading}
                  >
                    {loading ? "로딩 중..." : "더보기"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 기존 식당 목록 (검색 결과가 없을 때만 표시) */}
      {!showSearchResults && (
        <div style={{ 
          height: "calc(100vh - 800px)",
          minHeight: "200px",
          maxHeight: "400px",
          overflowY: "auto"
        }}>
          <h3 style={{ 
            fontSize: "18px", 
            fontWeight: "bold", 
            color: "#333", 
            marginBottom: "15px"
          }}>
            음식점 목록
          </h3>
          
          <div style={{ textAlign: "center", color: "#999", fontSize: "16px", padding: "40px 0" }}>
            식당 정보를 불러오고 있습니다...
          </div>
        </div>
      )}
      {/* 모달 */}
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

      {/* 세부 필터링 모달 */}
      {showCategoryModal && (
        <div
          onClick={() => setShowCategoryModal(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: "12px",
              width: "90vw",
              maxWidth: "500px",
              maxHeight: "80vh",
              padding: "20px",
              overflow: "auto"
            }}
          >
            {/* 헤더 */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
              borderBottom: "1px solid #e9ecef",
              paddingBottom: "15px"
            }}>
              <h3 style={{
                fontSize: "18px",
                fontWeight: "bold",
                color: "#333",
                margin: 0
              }}>
                🍽️ 세부 필터링
              </h3>
              <button
                onClick={() => setShowCategoryModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "20px",
                  cursor: "pointer",
                  color: "#666",
                  padding: "5px"
                }}
              >
                ✕
              </button>
            </div>

            {/* 설명 */}
            <div style={{
              fontSize: "14px",
              color: "#666",
              marginBottom: "20px",
              padding: "12px",
              background: "#f8f9fa",
              borderRadius: "8px"
            }}>
              상위 카테고리를 클릭하면 모든 하위 카테고리가 제외됩니다. 개별 하위 카테고리도 선택 가능합니다.
            </div>

            {/* 카테고리 목록 - 테이블 구조 */}
            <div style={{
              border: "1px solid #e9ecef",
              borderRadius: "8px",
              overflow: "hidden"
            }}>
              {Object.entries(categoryHierarchy).map(([parentCategory, subCategories], index) => {
                const parentStatus = getSubCategoryStatus(parentCategory);
                const isParentExcluded = parentStatus === 'all-excluded';
                const isParentPartial = parentStatus === 'partial';
                
                return (
                  <div key={parentCategory} style={{
                    display: "flex",
                    borderBottom: index < Object.keys(categoryHierarchy).length - 1 ? "1px solid #e9ecef" : "none"
                  }}>
                    {/* 좌측: 상위 카테고리 */}
                    <div style={{
                      width: "120px",
                      padding: "12px",
                      borderRight: "1px solid #e9ecef",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "#f8f9fa"
                    }}>
                      <button
                        onClick={() => toggleParentCategory(parentCategory)}
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          background: "#f8f9fa",
                          color: "#333",
                          cursor: "pointer",
                          fontSize: "14px",
                          fontWeight: "600",
                          textAlign: "center",
                          transition: "all 0.2s ease"
                        }}
                      >
                        {parentCategory}
                      </button>
                    </div>
                    
                    {/* 우측: 하위 카테고리들 */}
                    <div style={{
                      flex: "1",
                      padding: "12px",
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "8px",
                      alignItems: "center"
                    }}>
                      {subCategories.map((subCategory) => {
                        const isExcluded = excludedCategories.includes(subCategory);
                        return (
                          <button
                            key={subCategory}
                            onClick={() => toggleCategory(subCategory)}
                            style={{
                              padding: "8px 12px",
                              background: isExcluded ? "#dc3545" : "#28a745",
                              color: "white",
                              border: "1px solid #e9ecef",
                              borderRadius: "6px",
                              cursor: "pointer",
                              fontSize: "12px",
                              fontWeight: "500",
                              textDecoration: isExcluded ? "line-through" : "none",
                              transition: "all 0.2s ease",
                              whiteSpace: "nowrap"
                            }}
                          >
                            {subCategory}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 하단 버튼 */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "20px",
              paddingTop: "15px",
              borderTop: "1px solid #e9ecef"
            }}>
              <div style={{
                display: "flex",
                gap: "10px"
              }}>
                <button
                  onClick={() => {
                    // 모든 하위 카테고리를 제외 목록에 추가
                    const allSubCategories = Object.values(categoryHierarchy).flat();
                    setExcludedCategories(allSubCategories);
                  }}
                  style={{
                    padding: "8px 16px",
                    background: "#dc3545",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "14px"
                  }}
                >
                  전체 제외
                </button>
                <button
                  onClick={() => setExcludedCategories([])}
                  style={{
                    padding: "8px 16px",
                    background: "#28a745",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "14px"
                  }}
                >
                  전체 포함
                </button>
              </div>
              <button
                onClick={() => setShowCategoryModal(false)}
                style={{
                  padding: "8px 16px",
                  background: "#994d52",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "14px"
                }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 