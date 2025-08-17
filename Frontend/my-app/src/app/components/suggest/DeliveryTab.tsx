"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";

interface DeliveryTabProps {
  groupData: any;
  groupId: string;
  onAddCandidate?: (restaurant: any) => void;
  registeredCandidateIds?: number[];
  setLoading?: (loading: boolean) => void;
  // 상위 컴포넌트에서 관리하는 데이터
  deliveryRestaurants?: any[];
  setDeliveryRestaurants?: (restaurants: any[]) => void;
  hasDeliveryDataLoaded?: boolean;
  setHasDeliveryDataLoaded?: (loaded: boolean) => void;
}

interface YogiyoRestaurant {
  id: number;
  name: string;
  categories: string[];
  review_avg: number;
  review_count: number;
  thumbnail_url: string;
  estimated_delivery_time: string;
  is_open: boolean;
}

export default function DeliveryTab({ 
  groupData, 
  groupId, 
  onAddCandidate, 
  registeredCandidateIds = [], 
  setLoading: setParentLoading,
  deliveryRestaurants = [],
  setDeliveryRestaurants,
  hasDeliveryDataLoaded = false,
  setHasDeliveryDataLoaded
}: DeliveryTabProps) {
  // 상위 컴포넌트에서 관리하는 데이터 사용
  const allRestaurants = deliveryRestaurants;
  const isInitialDataLoaded = hasDeliveryDataLoaded;
  
  // 현재 표시할 데이터
  const [params, setParams] = useState({ category: '', searchTerm: '', page: 1 });
  const [restaurants, setRestaurants] = useState<YogiyoRestaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [menuModalOpen, setMenuModalOpen] = useState(false);
  const [menuList, setMenuList] = useState<{name: string, image: string|null}[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuError, setMenuError] = useState<string|null>(null);
  const [placeholder, setPlaceholder] = useState("음식점 검색 (예: 치킨, 피자)");

  // URL 정규화 함수 - 끝에 슬래시 제거
  const normalizeUrl = (url: string) => {
    return url.endsWith('/') ? url.slice(0, -1) : url;
  };

  const BACKEND_URL = normalizeUrl(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000');

  const categories = [
    { id: '', name: '전체' },
    { id: '프랜차이즈', name: '프랜차이즈' },
    { id: '치킨', name: '치킨' },
    { id: '피자양식', name: '피자/양식' },
    { id: '중식', name: '중국집' },
    { id: '한식', name: '한식' },
    { id: '일식돈까스', name: '일식/돈까스' },
    { id: '족발보쌈', name: '족발/보쌈' },
    { id: '야식', name: '야식' },
    { id: '분식', name: '분식' },
    { id: '카페디저트', name: '카페/디저트' }
  ];

  // 전체 데이터를 가져오는 함수 (초기 로드용)
  const fetchAllRestaurants = useCallback(async () => {
    if (!groupData?.delivery) return;
    
    setLoading(true);
    setParentLoading?.(true);
    try {
      console.log('🍕 요기요 전체 데이터 가져오기 시작');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 35000); // 35초 타임아웃
      
      const res = await fetch(`${BACKEND_URL}/groups/${groupId}/yogiyo-restaurants`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!res.ok) {
        if (res.status === 504) {
          throw new Error('요기요 API 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.');
        } else if (res.status === 502) {
          throw new Error('요기요 서비스에 일시적인 문제가 있습니다. 잠시 후 다시 시도해주세요.');
        } else {
          throw new Error(`요기요 API 오류 (${res.status}): ${res.statusText}`);
        }
      }
      
      const data = await res.json();
      const allRestaurantsData = data.restaurants || [];
      
      // 전체 데이터 저장 (상위 컴포넌트에 저장)
      setDeliveryRestaurants?.(allRestaurantsData);
      setHasDeliveryDataLoaded?.(true);
      
      // 초기 표시 데이터 설정
      setRestaurants(allRestaurantsData);
      setHasMore(allRestaurantsData.length > 20); // 20개 이상이면 더보기 버튼 표시
      
      console.log(`🍕 요기요 전체 데이터 로드 완료: 총 ${allRestaurantsData.length}개 식당`);
    } catch (error) {
      console.error("Error fetching all restaurants:", error);
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.error('요기요 API 요청이 타임아웃되었습니다.');
        } else {
          console.error('요기요 API 요청 실패:', error.message);
        }
      }
      setHasMore(false);
    } finally {
      setLoading(false);
      setParentLoading?.(false);
    }
  }, [groupId, BACKEND_URL, setParentLoading, groupData]);

  // 필터링된 데이터를 가져오는 함수 (검색/카테고리 필터용)
  const fetchFilteredRestaurants = useCallback(async (params: { category: string; searchTerm: string; page: number }) => {
    // 전체 데이터가 로드되지 않았으면 전체 데이터 먼저 가져오기
    if (!isInitialDataLoaded) {
      await fetchAllRestaurants();
      return;
    }
    
    setLoading(true);
    setParentLoading?.(true);
    
    try {
      let filteredData = [...allRestaurants];
      
      // 카테고리 필터링
      if (params.category) {
        filteredData = filteredData.filter(restaurant => 
          restaurant.categories.some((category: string) => category.includes(params.category))
        );
      }
      
      // 검색어 필터링
      if (params.searchTerm) {
        const searchLower = params.searchTerm.toLowerCase();
        filteredData = filteredData.filter(restaurant => 
          restaurant.name.toLowerCase().includes(searchLower) ||
          restaurant.categories.some((category: string) => category.toLowerCase().includes(searchLower))
        );
      }
      
      // 페이지네이션 적용
      const itemsPerPage = 20;
      const startIndex = (params.page - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const paginatedData = filteredData.slice(startIndex, endIndex);
      
      setRestaurants(prev => params.page === 1 ? paginatedData : [...prev, ...paginatedData]);
      setHasMore(endIndex < filteredData.length);
      
      console.log(`🍕 필터링 결과: ${filteredData.length}개 중 ${paginatedData.length}개 표시 (페이지 ${params.page})`);
    } catch (error) {
      console.error("Error filtering restaurants:", error);
      setHasMore(false);
    } finally {
      setLoading(false);
      setParentLoading?.(false);
    }
  }, [allRestaurants, isInitialDataLoaded, fetchAllRestaurants, setParentLoading]);

  // 초기 데이터 로드
  useEffect(() => {
    if (groupData?.delivery && !isInitialDataLoaded) {
      fetchAllRestaurants();
    }
  }, [groupData, fetchAllRestaurants, isInitialDataLoaded]);

  // params가 바뀔 때마다 필터링 적용
  useEffect(() => {
    if (isInitialDataLoaded) {
      fetchFilteredRestaurants(params);
    }
  }, [params, fetchFilteredRestaurants, isInitialDataLoaded]);

  // 카테고리 선택 시
  const handleCategory = (category: string) => {
    isUserAction.current = true; // 사용자 액션 플래그 설정
    setParams(prev => ({ ...prev, category, page: 1 }));
  };

  // 검색어 입력 상태
  const [searchInput, setSearchInput] = useState('');
  // 더보기 버튼 클릭 여부 상태
  const [isLoadMore, setIsLoadMore] = useState(false);

  // 검색 input 변경 핸들러
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    if (value === '') {
      isUserAction.current = true; // 사용자 액션 플래그 설정
      setParams(prev => ({ ...prev, searchTerm: '', page: 1 }));
    }
  };

  // 검색 버튼 클릭 시
  const handleSearch = () => {
    isUserAction.current = true; // 사용자 액션 플래그 설정
    // 검색 시 카테고리를 '전체'로 변경
    setParams(prev => ({ ...prev, searchTerm: searchInput, category: '', page: 1 }));
    setIsLoadMore(false);
  };

  // 검색어 입력 시 엔터키 처리
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // 더보기
  const loadMore = () => {
    if (!loading && hasMore) {
      setParams(prev => ({ ...prev, page: prev.page + 1 }));
      setIsLoadMore(true);
    }
  };

  // 검색어 초기화 (X 버튼 클릭 시)
  const handleClearSearch = () => {
    isUserAction.current = true; // 사용자 액션 플래그 설정
    setSearchInput('');
    setParams(prev => ({ ...prev, searchTerm: '', page: 1 }));
    // 검색어 초기화 시에도 카테고리는 유지 (사용자가 선택한 카테고리 그대로)
  };

  // 스크롤 맨 위로 이동용 ref
  const listRef = useRef<HTMLDivElement>(null);
  
  // 스크롤 위치 저장용 ref
  const savedScrollTop = useRef(0);
  
  // 사용자 액션으로 인한 리렌더링인지 추적
  const isUserAction = useRef(false);

  // 리스트 변동 시(더보기가 아닐 때) 스크롤 맨 위로 이동
  useEffect(() => {
    if (!isLoadMore && listRef.current) {
      // 사용자 액션(검색, 카테고리 변경)으로 인한 리렌더링인 경우에만 스크롤 리셋
      if (isUserAction.current) {
        listRef.current.scrollTop = 0;
        isUserAction.current = false; // 리셋 후 플래그 초기화
      }
    }
    // 더보기 이후에는 다시 false로 초기화
    if (isLoadMore) setIsLoadMore(false);
  }, [restaurants]);

  // id 중복 제거
  const uniqueRestaurants = Array.from(
    new Map(restaurants.map(r => [Number(r.id), r])).values()
  );
  
  // 카테고리 탭 드래그 스크롤 구현
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    isDragging.current = true;
    startX.current = e.pageX - (scrollRef.current?.offsetLeft || 0);
    scrollLeft.current = scrollRef.current?.scrollLeft || 0;
  };
  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    e.preventDefault();
    const x = e.pageX - (scrollRef.current?.offsetLeft || 0);
    const walk = x - startX.current;
    if (scrollRef.current) scrollRef.current.scrollLeft = scrollLeft.current - walk;
  };
  const onMouseUp = () => { isDragging.current = false; };

  // 반응형 placeholder 설정
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 440) {
        setPlaceholder("음식점 검색");
      } else {
        setPlaceholder("음식점 검색 (예: 치킨, 피자)");
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 식당 카드 클릭 시 메뉴 모달 오픈
  const handleCardClick = async (restaurant: YogiyoRestaurant) => {
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
  };

  return (
    <div>
      {/* 카테고리 탭 */}
      <div
        ref={scrollRef}
        className="category-scroll"
        style={{
          display: "flex",
          gap: "2vh",
          paddingBottom: "1vh",
          overflowX: "auto",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch"
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseUp}
        onMouseUp={onMouseUp}
      >
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => handleCategory(category.id)}
            style={{
              padding: "0.8vh 0",
              background: "none",
              border: "none",
              fontSize: "1.68vh",
              fontWeight: "600",
              color: params.category === category.id ? "#333" : "#999",
              borderBottom: params.category === category.id ? "0.2vh solid #994d52" : "none",
              cursor: "pointer",
              whiteSpace: "nowrap"
            }}
          >
            {category.name}
          </button>
        ))}
      </div>
      {/* 검색바 */}
      <div style={{ marginBottom: "2vh", position: "relative" }}>
        <input
          type="text"
          placeholder={placeholder}
          value={searchInput}
          onChange={handleSearchInputChange}
          onKeyPress={handleKeyPress}
          style={{
            width: "100%",
            padding: "1.2vh 4vh 1.2vh 1.5vh",
            border: "0.1vh solid #e0e0e0",
            borderRadius: "0.8vh",
            fontSize: "1.92vh",
            outline: "none"
          }}
        />
        {searchInput && !loading && (
          <button
            onClick={handleClearSearch}
            style={{
              position: "absolute",
              right: "calc(clamp(6vh, 15vw, 8vh) + 2.5vh)",
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              fontSize: "2.16vh",
              color: "#999",
              cursor: "pointer"
            }}
          >
            ✕
          </button>
        )}
        <button
          onClick={handleSearch}
          disabled={loading}
          style={{
            position: "absolute",
            right: "1.5vh",
            top: "50%",
            transform: "translateY(-50%)",
            background: "#994d52",
            color: "#fff",
            border: "none",
            borderRadius: "0.4vh",
            padding: "0.7vh clamp(1.2vh, 3vw, 2vh)",
            fontSize: "clamp(1.2vh, 2.5vw, 1.6vh)",
            fontWeight: "bold",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
            minWidth: "6vh",
            maxWidth: "10vh",
            width: "clamp(6vh, 15vw, 8vh)"
          }}
        >
          {loading ? "검색" : "검색"}
        </button>
      </div>
              {/* 식당 목록 */}
        <div style={{ 
            marginBottom: "2vh",
            maxHeight: "40vh",
            overflowY: "auto"
          }}
          ref={listRef}
        >
        <h3 style={{ fontSize: "2vh", fontWeight: "bold", color: "#333", marginBottom: "1.5vh" }}>
          배달 음식점 목록
        </h3>
        {loading && restaurants.length === 0 ? (
          <div style={{ textAlign: "center", color: "#999", fontSize: "1.92vh", padding: "4vh 0" }}>
            식당 정보를 불러오는 중...
          </div>
        ) : uniqueRestaurants.length === 0 && !hasMore ? (
          <div style={{ textAlign: "center", color: "#999", fontSize: "1.92vh", padding: "4vh 0" }}>
            식당이 없습니다
          </div>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5vh" }}>
              {uniqueRestaurants.map((r) => {
                // ID 타입을 통일하여 비교 (문자열과 숫자 모두 처리)
                const restaurantId = Number(r.id);
                const isRegistered = registeredCandidateIds.some(registeredId => 
                  Number(registeredId) === restaurantId
                );
                
                return (
                <div
                  key={r.id}
                  style={{ display: "flex", alignItems: "center", padding: "1.5vh", background: "#f8f9fa", borderRadius: "1.2vh", gap: "1.5vh", cursor: 'pointer' }}
                  onClick={() => handleCardClick(r)}
                >
                  {/* 썸네일 */}
                  <div style={{ width: "6vh", height: "6vh", borderRadius: "0.8vh", overflow: "hidden", flexShrink: 0 }}>
                    <img
                      src={r.thumbnail_url}
                      alt={r.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  </div>
                  {/* 정보 */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "1.92vh", fontWeight: "bold", color: "#333", marginBottom: "0.4vh" }}>{r.name}</div>
                    <div style={{ fontSize: "1.68vh", color: "#666", marginBottom: "0.4vh" }}>{r.categories.join(', ')}</div>
                    <div style={{ fontSize: "1.68vh", color: "#666", display: "flex", alignItems: "center", gap: "0.4vh" }}>
                      ⭐ {r.review_avg} ({r.review_count} {r.review_count <= 1 ? "review" : "reviews"})
                    </div>
                  </div>
                  {/* + 버튼 */}
                  {typeof onAddCandidate === 'function' && (
                    <button
                      onClick={e => { 
                        e.stopPropagation(); 
                        // yogiyo_id 필드를 명시적으로 추가
                        const restaurantData = {
                          ...r,
                          yogiyo_id: r.id
                        };
                        onAddCandidate(restaurantData); 
                      }}
                      disabled={isRegistered}
                      style={{
                        width: "4vh",
                        height: "4vh",
                        background: isRegistered ? "#ccc" : "#994d52",
                        color: "#fff",
                        border: "none",
                        borderRadius: "50%",
                        fontSize: "2vh",
                        fontWeight: "bold",
                        cursor: isRegistered ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.2s"
                      }}
                      onMouseOver={e => {
                        if (!isRegistered) {
                          e.currentTarget.style.background = "#8a4449";
                          e.currentTarget.style.transform = "scale(1.1)";
                        }
                      }}
                      onMouseOut={e => {
                        if (!isRegistered) {
                          e.currentTarget.style.background = "#994d52";
                          e.currentTarget.style.transform = "scale(1)";
                        }
                      }}
                    >
                      {isRegistered ? '✔' : '+'}
                    </button>
                  )}
                </div>
                );
              })}
            </div>
            {loading && (
              <div style={{ textAlign: "center", color: "#999", padding: "2vh 0" }}>
                더 많은 식당을 불러오는 중...
              </div>
            )}
            {!loading && hasMore && (
              // 전체 카테고리에서도 더보기 버튼 표시 (검색어가 있을 때만 제외)
              params.searchTerm === '' && (
                <div style={{ textAlign: "center", margin: "2vh 0" }}>
                  <button onClick={loadMore} style={{
                    background: "#994d52",
                    color: "#fff",
                    border: "none",
                    borderRadius: "2vh",
                    padding: "1vh 3vh",
                    fontSize: "1.6vh",
                    fontWeight: "bold",
                    cursor: "pointer"
                  }}>
                    더보기
                  </button>
                </div>
              )
            )}
          </>
        )}
      </div>
      {/* 메뉴 모달 */}
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
              background: "#fff", borderRadius: "1.2vh", width: "90vw", maxWidth: "50vh", maxHeight: '80vh', overflowY: 'auto', position: "relative", padding: "2.4vh", textAlign: 'center'
            }}
          >
            <button
              onClick={() => setMenuModalOpen(false)}
              style={{
                position: "absolute", top: "1vh", right: "1vh", background: "none", border: "none", fontSize: "2.4vh", cursor: "pointer"
              }}
            >✕</button>
            <h3 style={{fontWeight:'bold', marginBottom:"1.6vh", fontSize:"2vh"}}>메뉴</h3>
            {menuLoading ? (
              <div style={{color:'#999', padding:"4vh"}}>메뉴 불러오는 중...</div>
            ) : menuError ? (
              <div style={{color:'#e57373', padding:"4vh"}}>{menuError}</div>
            ) : menuList.length === 0 ? (
              <div style={{color:'#999', padding:"4vh"}}>메뉴가 없습니다</div>
            ) : (
              <div style={{display:'flex', flexWrap:'wrap', gap:"2vh", justifyContent:'center'}}>
                {menuList.map((menu, idx) => (
                  <div key={menu.name + '-' + idx} style={{width:"12vh", textAlign:'center'}}>
                    {menu.image ? (
                      <img src={menu.image} alt={menu.name} style={{width:"10vh", height:"8vh", objectFit:'cover', borderRadius:"0.8vh", marginBottom:"0.8vh"}} />
                    ) : (
                      <div style={{width:"10vh", height:"8vh", background:'#eee', borderRadius:"0.8vh", marginBottom:"0.8vh", display:'flex', alignItems:'center', justifyContent:'center', color:'#aaa', fontSize:"1.3vh"}}>
                        이미지 없음
                      </div>
                    )}
                    <div style={{fontSize:"1.4vh", color:'#222', fontWeight:500}}>{menu.name}</div>
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