"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";

interface DeliveryTabProps {
  groupData: any;
  groupId: string;
  onAddCandidate?: (restaurant: any) => void;
  registeredCandidateIds?: number[];
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

export default function DeliveryTab({ groupData, groupId, onAddCandidate, registeredCandidateIds = [] }: DeliveryTabProps) {
  // 기존 상태 제거 및 통합
  // const [activeCategory, setActiveCategory] = useState('all');
  // const [searchTerm, setSearchTerm] = useState('');
  // const [pageNum, setPageNum] = useState(1);
  // const [showSearchResults, setShowSearchResults] = useState(false);
  // const [restaurants, setRestaurants] = useState<YogiyoRestaurant[]>([]);
  // const [hasMore, setHasMore] = useState(true);

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

  // API 요청 함수
  const fetchRestaurants = useCallback(async (params: { category: string; searchTerm: string; page: number }) => {
    setLoading(true);
    try {
      const query = [];
      if (params.category) query.push(`category=${encodeURIComponent(params.category)}`);
      if (params.searchTerm) query.push(`search=${encodeURIComponent(params.searchTerm)}`);
      query.push(`page=${params.page}`);
      const res = await fetch(`${BACKEND_URL}/groups/${groupId}/yogiyo-restaurants?${query.join('&')}`);
      if (!res.ok) {
        throw new Error('Failed to fetch restaurants');
      }
      const data = await res.json();
      const newRestaurants = data.restaurants || [];
      setRestaurants(prev => params.page === 1 ? newRestaurants : [...prev, ...newRestaurants]);
      setHasMore(newRestaurants.length > 0);
    } catch (error) {
      console.error("Error fetching restaurants:", error);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [groupId, BACKEND_URL]);

  // params가 바뀔 때마다 항상 API 요청
  useEffect(() => {
    fetchRestaurants(params);
  }, [params, fetchRestaurants]);

  // 카테고리 선택 시
  const handleCategory = (category: string) => {
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
      setParams(prev => ({ ...prev, searchTerm: '', page: 1 }));
    }
  };

  // 검색 버튼 클릭 시
  const handleSearch = () => {
    setParams(prev => ({ ...prev, searchTerm: searchInput, page: 1 }));
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

  // 스크롤 맨 위로 이동용 ref
  const listRef = useRef<HTMLDivElement>(null);

  // 리스트 변동 시(더보기가 아닐 때) 스크롤 맨 위로 이동
  useEffect(() => {
    if (!isLoadMore && listRef.current) {
      listRef.current.scrollTop = 0;
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
          gap: "20px",
          paddingBottom: "10px",
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
              padding: "8px 0",
              background: "none",
              border: "none",
              fontSize: "14px",
              fontWeight: "600",
              color: params.category === category.id ? "#333" : "#999",
              borderBottom: params.category === category.id ? "2px solid #994d52" : "none",
              cursor: "pointer",
              whiteSpace: "nowrap"
            }}
          >
            {category.name}
          </button>
        ))}
      </div>
      {/* 검색바 */}
      <div style={{ marginBottom: "20px", position: "relative" }}>
        <input
          type="text"
          placeholder={placeholder}
          value={searchInput}
          onChange={handleSearchInputChange}
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
        {searchInput && !loading && (
          <button
            onClick={() => {
              setSearchInput('');
              setParams(prev => ({ ...prev, searchTerm: '', page: 1 }));
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
          onClick={handleSearch}
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
      {/* 식당 목록 */}
      <div style={{ height: "calc(100vh - 500px)", minHeight: "200px", maxHeight: "50vh", overflowY: "auto" }}
        ref={listRef}
      >
        <h3 style={{ fontSize: "18px", fontWeight: "bold", color: "#333", marginBottom: "15px" }}>
          배달 음식점 목록
        </h3>
        {loading && restaurants.length === 0 ? (
          <div style={{ textAlign: "center", color: "#999", fontSize: "16px", padding: "40px 0" }}>
            식당 정보를 불러오는 중...
          </div>
        ) : uniqueRestaurants.length === 0 && !hasMore ? (
          <div style={{ textAlign: "center", color: "#999", fontSize: "16px", padding: "40px 0" }}>
            식당이 없습니다
          </div>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              {uniqueRestaurants.map((r) => {
                const isRegistered = registeredCandidateIds.includes(Number(r.id));
                return (
                <div
                  key={r.id}
                  style={{ display: "flex", alignItems: "center", padding: "15px", background: "#f8f9fa", borderRadius: "12px", gap: "15px", cursor: 'pointer' }}
                  onClick={() => handleCardClick(r)}
                >
                  {/* 썸네일 */}
                  <div style={{ width: "60px", height: "60px", borderRadius: "8px", overflow: "hidden", flexShrink: 0 }}>
                    <img
                      src={r.thumbnail_url}
                      alt={r.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  </div>
                  {/* 정보 */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "16px", fontWeight: "bold", color: "#333", marginBottom: "4px" }}>{r.name}</div>
                    <div style={{ fontSize: "14px", color: "#666", marginBottom: "4px" }}>{r.categories.join(', ')}</div>
                    <div style={{ fontSize: "14px", color: "#666", display: "flex", alignItems: "center", gap: "4px" }}>
                      ⭐ {r.review_avg} ({r.review_count} {r.review_count <= 1 ? "review" : "reviews"})
                    </div>
                  </div>
                  {/* + 버튼 */}
                  {typeof onAddCandidate === 'function' && (
                    <button
                      onClick={e => { e.stopPropagation(); onAddCandidate(r); }}
                      disabled={registeredCandidateIds.includes(Number(r.id))}
                      style={{
                        width: "40px",
                        height: "40px",
                        background: registeredCandidateIds.includes(Number(r.id)) ? "#ccc" : "#994d52",
                        color: "#fff",
                        border: "none",
                        borderRadius: "50%",
                        fontSize: "20px",
                        fontWeight: "bold",
                        cursor: registeredCandidateIds.includes(Number(r.id)) ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.2s"
                      }}
                      onMouseOver={e => {
                        if (!registeredCandidateIds.includes(Number(r.id))) {
                          e.currentTarget.style.background = "#8a4449";
                          e.currentTarget.style.transform = "scale(1.1)";
                        }
                      }}
                      onMouseOut={e => {
                        if (!registeredCandidateIds.includes(Number(r.id))) {
                          e.currentTarget.style.background = "#994d52";
                          e.currentTarget.style.transform = "scale(1)";
                        }
                      }}
                    >
                      {registeredCandidateIds.includes(Number(r.id)) ? '✔' : '+'}
                    </button>
                  )}
                </div>
                );
              })}
            </div>
            {loading && (
              <div style={{ textAlign: "center", color: "#999", padding: "20px 0" }}>
                더 많은 식당을 불러오는 중...
              </div>
            )}
            {!loading && hasMore && (
              params.searchTerm === '' && (
                <div style={{ textAlign: "center", margin: "20px 0" }}>
                  <button onClick={loadMore} style={{
                    background: "#994d52",
                    color: "#fff",
                    border: "none",
                    borderRadius: "20px",
                    padding: "10px 30px",
                    fontSize: "16px",
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
              background: "#fff", borderRadius: 12, width: "90vw", maxWidth: 500, maxHeight: '80vh', overflowY: 'auto', position: "relative", padding: 24, textAlign: 'center'
            }}
          >
            <button
              onClick={() => setMenuModalOpen(false)}
              style={{
                position: "absolute", top: 10, right: 10, background: "none", border: "none", fontSize: 24, cursor: "pointer"
              }}
            >✕</button>
            <h3 style={{fontWeight:'bold', marginBottom:16, fontSize:20}}>메뉴</h3>
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