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
  setLoading
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

  // 스크롤 위치 저장용 ref와 state
  const listRef = useRef<HTMLDivElement>(null);
  const [scrollPos, setScrollPos] = useState<number | null>(null);

  // URL 정규화 함수 - 끝에 슬래시 제거
  const normalizeUrl = (url: string) => {
    return url.endsWith('/') ? url.slice(0, -1) : url;
  };

  const BACKEND_URL = normalizeUrl(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000');

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
      setHasSectorSearchCompleted(true); // 부채꼴 검색 완료 표시
      setLoading?.(false); // 상위 컴포넌트에 로딩 완료 알림
      
      // 페이지네이션 초기화
      const initialDisplay = allRestaurants.slice(0, ITEMS_PER_PAGE);
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
      
      // 페이지네이션 초기화
      const initialDisplay = sectorSearchResults.slice(0, ITEMS_PER_PAGE);
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
            setDisplayedResults(data);
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
              return [...prev, ...newData];
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
        
        // 페이지네이션 초기화
        const initialDisplay = sectorSearchResults.slice(0, ITEMS_PER_PAGE);
        setDisplayedResults(initialDisplay);
        setCurrentPage(1);
        setHasMoreResults(sectorSearchResults.length > ITEMS_PER_PAGE);
        setShowSearchResults(true);
        setIsEnd(false); // 더보기 버튼 표시
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
        
        setIsEnd(true); // 모든 부채꼴을 검색했으므로 더보기 버튼 숨김
        
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
      // 부채꼴 검색 결과인 경우 페이지네이션 적용
      const nextPage = currentPage + 1;
      const startIndex = (nextPage - 1) * ITEMS_PER_PAGE;
      const endIndex = startIndex + ITEMS_PER_PAGE;
      
      const newItems = searchResults.slice(startIndex, endIndex);
      setDisplayedResults(prev => [...prev, ...newItems]);
      setCurrentPage(nextPage);
      setHasMoreResults(endIndex < searchResults.length);
      
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
              검색 결과가 없습니다
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
    </div>
  );
} 