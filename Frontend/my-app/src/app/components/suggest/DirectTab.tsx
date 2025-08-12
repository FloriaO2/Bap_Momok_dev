"use client";
import React, { useState, useEffect, useRef } from "react";
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
}

declare global {
  interface Window {
    kakao: any;
  }
}

export default function DirectTab({ groupData, groupId, onAddCandidate, registeredCandidateIds = [] }: DirectTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
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
            
            // Places 서비스가 준비되면 자동 "맛집" 검색 실행
            if (groupData && typeof groupData.x === 'number' && typeof groupData.y === 'number' && typeof groupData.radius === 'number' && groupData.radius > 0) {
              const options: any = {
                location: new window.kakao.maps.LatLng(groupData.x, groupData.y),
                radius: groupData.radius,
                category_group_code: 'FD6'
              };
              setLoading(true);
              setShowSearchResults(true);
              psRef.current.keywordSearch('맛집', (data: any, status: any, pagination: any) => {
                setLoading(false);
                if (status === window.kakao.maps.services.Status.OK) {
                  setSearchResults(data); // place 원본 객체 그대로 저장
                  setPage(1); // 페이지 초기화
                  setIsEnd(pagination && pagination.hasNextPage === false);
                  console.log(`[자동 맛집 검색] x: ${groupData.x}, y: ${groupData.y}, radius: ${groupData.radius}m, keyword: "맛집"`);
                } else {
                  setSearchResults([]);
                  setIsEnd(true);
                }
              }, options);
            }
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

  // 자동 추천(맛집) 검색: 최초 groupData 변경 시 1회만 실행
  useEffect(() => {
    if (groupData && typeof window !== 'undefined' && window.kakao && window.kakao.maps && window.kakao.maps.services) {
      const options: any = {
        location: new window.kakao.maps.LatLng(groupData.x, groupData.y),
        radius: groupData.radius,
        category_group_code: 'FD6',
        size: 15,
        page: 1
      };
      setLoading(true);
      setShowSearchResults(true);
      psRef.current = new window.kakao.maps.services.Places();
      psRef.current.keywordSearch('맛집', (data: any, status: any, pagination: any) => {
        setLoading(false);
        if (status === window.kakao.maps.services.Status.OK) {
          setSearchResults(data);
          setPage(1);
          setIsEnd(pagination && pagination.hasNextPage === false);
        } else {
          setSearchResults([]);
          setIsEnd(true);
        }
      }, options);
    }
  }, [groupData]);

  // 검색 실행 (페이지네이션 적용)
  const handleSearch = (resetPage = true) => {
    // 더보기(페이지네이션)일 때 스크롤 위치 저장
    if (!resetPage && listRef.current) {
      setScrollPos(listRef.current.scrollTop);
    }
    let keyword = searchTerm.trim();
    if (keyword === '') keyword = '맛집';
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

    setLoading(true);
    setShowSearchResults(true);
    psRef.current.keywordSearch(keyword, (data: any, status: any, pagination: any) => {
      setLoading(false);
      if (status === window.kakao.maps.services.Status.OK) {
        // 카테고리 정보 디버깅을 위한 로그
        console.log('🔍 카카오맵 검색 결과:', data.map((item: any) => ({
          name: item.place_name,
          category_name: item.category_name,
          category_group_code: item.category_group_code,
          id: item.id
        })));
        
        if (resetPage) {
          setSearchResults(data);
          setPage(1);
        } else {
          setSearchResults(prev => {
            const existingIds = new Set(prev.map((item: any) => item.id || item.kakao_id));
            const newData = data.filter((item: any) => !existingIds.has(item.id || item.kakao_id));
            return [...prev, ...newData];
          });
          setPage(nextPage);
        }
        // pagination이 없거나, data가 15개 미만이면 isEnd를 true로
        if (!pagination || data.length < 15) {
          setIsEnd(true);
        } else {
          setIsEnd(pagination.hasNextPage === false);
        }
      } else {
        if (resetPage) setSearchResults([]);
        setIsEnd(true);
      }
    }, searchOptions);
  };

  // 검색어 입력 시 엔터키 처리
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch(true);
    }
  };

  // 더보기 버튼 클릭 핸들러
  const handleLoadMore = () => {
    handleSearch(false);
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
                  setShowSearchResults(false);
                  setSearchResults([]);
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
          
          {loading ? (
            <div style={{ textAlign: "center", color: "#999", fontSize: "16px", padding: "40px 0" }}>
              검색
            </div>
          ) : searchResults.length === 0 ? (
            <div style={{ textAlign: "center", color: "#999", fontSize: "16px", padding: "40px 0" }}>
              검색 결과가 없습니다
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              {searchResults.map((restaurant) => {
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
              {!isEnd && searchResults.length >= 15 && (
                <button
                  type="button"
                  onClick={e => { e.preventDefault(); handleSearch(false); }}
                  style={{
                    width: "100%",
                    padding: "12px",
                    marginTop: "10px",
                    background: "#994d52",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "16px",
                    fontWeight: "bold",
                    cursor: "pointer"
                  }}
                  disabled={loading}
                >
                  {loading ? "로딩 중..." : "더보기"}
                </button>
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
          maxHeight: "50vh",
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
            검색어를 입력하여 음식점을 찾아보세요
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
              background: "#fff", borderRadius: 12, width: "90vw", maxWidth: 600, height: "80vh", position: "relative"
            }}
          >
            <button
              onClick={() => setModalOpen(false)}
              style={{
                position: "absolute", top: 10, right: 10, background: "none", border: "none", fontSize: 24, cursor: "pointer"
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
    </div>
  );
} 