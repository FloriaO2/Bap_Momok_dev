"use client";
import React, { useEffect, useRef, useState } from "react";

interface KakaoMapProps {
  onLocationChange?: (lat: number, lng: number) => void;
  searchKeyword?: string;
  centerLat?: number | null;
  centerLng?: number | null;
  onMapReady?: (mapInstance: any) => void;
  pinButtonType?: 'gps' | 'group' | 'none';
  onPinClick?: () => void;
}

const KakaoMap = ({ onLocationChange, searchKeyword, centerLat, centerLng, onMapReady, pinButtonType = 'gps', onPinClick }: KakaoMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markerInstance = useRef<any>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 지도/마커 생성 및 중심 이동 시 콜백
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    // API 키 확인
    const apiKey = process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY;
    console.log('KakaoMap - API Key exists:', !!apiKey);
    console.log('KakaoMap - API Key length:', apiKey?.length);
    console.log('KakaoMap - API Key (first 10 chars):', apiKey?.substring(0, 10));
    console.log('KakaoMap - All env vars:', Object.keys(process.env).filter(key => key.includes('KAKAO')));
    
    // API 키가 없으면 오류 메시지 표시
    if (!apiKey) {
      const errorMsg = '카카오맵 API 키가 설정되지 않았습니다. .env.local 파일에 NEXT_PUBLIC_KAKAO_MAP_API_KEY를 설정해주세요.';
      console.error('KakaoMap - API Key is not set. Please set NEXT_PUBLIC_KAKAO_MAP_API_KEY in .env.local');
      setError(errorMsg);
      return;
    }
    
    function createMapAndMarker() {
      // @ts-ignore
      const kakao = window.kakao;
      if (mapRef.current && !mapInstance.current) {
        console.log('KakaoMap - Creating map instance');
        console.log('KakaoMap - centerLat:', centerLat, 'centerLng:', centerLng);
        
        try {
          mapInstance.current = new kakao.maps.Map(mapRef.current, {
            center: (centerLat !== undefined && centerLat !== null && centerLng !== undefined && centerLng !== null)
              ? new kakao.maps.LatLng(centerLat, centerLng)
              : new kakao.maps.LatLng(37.5665, 126.9780),
            level: 3,
          });
          
          console.log('KakaoMap - Map instance created:', mapInstance.current);
          
          // 지도가 준비되면 부모 컴포넌트에 알림
          if (onMapReady) {
            onMapReady(mapInstance.current);
          }
        } catch (error) {
          console.error('KakaoMap - Error creating map instance:', error);
        }
      }
      if (mapInstance.current && !markerInstance.current) {
        try {
          markerInstance.current = new kakao.maps.Marker({
            position: mapInstance.current.getCenter(),
            map: mapInstance.current,
          });
        } catch (error) {
          console.error('KakaoMap - Error creating marker:', error);
        }
      }
      // 지도 이동 시 마커도 중심으로 이동, 콜백 호출
      if (mapInstance.current && markerInstance.current) {
        try {
          kakao.maps.event.addListener(mapInstance.current, 'center_changed', function() {
            const center = mapInstance.current.getCenter();
            markerInstance.current.setPosition(center);
            if (onLocationChange) onLocationChange(center.getLat(), center.getLng());
          });
        } catch (error) {
          console.error('KakaoMap - Error adding event listener:', error);
        }
      }
    }

    // 이미 스크립트가 로드되어 있는지 확인
    if (document.getElementById("kakao-map-script")) {
      // 이미 스크립트가 있으면 바로 지도/마커 로드
      // @ts-ignore
      if (window.kakao && window.kakao.maps) {
        createMapAndMarker();
      } else {
        // 스크립트는 있지만 kakao 객체가 없는 경우, 잠시 후 다시 시도
        setTimeout(() => {
          // @ts-ignore
          if (window.kakao && window.kakao.maps) {
            createMapAndMarker();
          }
        }, 1000);
      }
      return;
    }
    
    const script = document.createElement("script");
    script.id = "kakao-map-script";
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&autoload=false&libraries=services`;
    script.async = true;
    
    // 디버깅: 스크립트 URL 확인
    console.log('KakaoMap - Loading script from:', script.src);
    
    script.onload = () => {
      console.log('KakaoMap - Script loaded successfully');
      // @ts-ignore
      if (window.kakao && window.kakao.maps) {
        // @ts-ignore
        window.kakao.maps.load(() => {
          console.log('KakaoMap - Maps loaded successfully');
          createMapAndMarker();
        });
      } else {
        console.error('KakaoMap - kakao object not available after script load');
      }
    };
    
    script.onerror = (error) => {
      const currentDomain = window.location.hostname;
      const errorMsg = `카카오맵 스크립트 로드에 실패했습니다. (403 Forbidden)

현재 도메인: ${currentDomain}

🔧 해결 방법:
1. 카카오 개발자 콘솔(https://developers.kakao.com)에 로그인
2. 해당 애플리케이션 선택
3. 플랫폼 → Web → 사이트 도메인에 추가:
   • https://${currentDomain}
   • https://www.${currentDomain}

⚠️ 403 오류는 대부분 도메인 미등록이 원인입니다.

자세한 설정 방법은 KAKAO_MAP_SETUP.md 파일을 참조하세요.`;
      
      console.error('KakaoMap - Script load error:', error);
      console.error('KakaoMap - Script URL:', script.src);
      console.error('KakaoMap - Current domain:', currentDomain);
      console.error('KakaoMap - API Key length:', apiKey?.length);
      console.error('KakaoMap - Error type: 403 Forbidden (Domain not registered)');
      console.error('KakaoMap - Please check:');
      console.error('1. API key is valid');
      console.error('2. Domain is registered in Kakao Developer Console');
      console.error('3. Network connection is stable');
      console.error('4. Add domain to Kakao Developer Console:', currentDomain);
      console.error('5. Wait a few minutes after adding domain (propagation delay)');
      console.error('6. Check if using correct JavaScript key (not REST API key)');
      setError(errorMsg);
    };
    
    document.head.appendChild(script);
    // eslint-disable-next-line
  }, []);

  // 외부에서 검색어가 들어오면 지도 중심 이동
  useEffect(() => {
    if (!searchKeyword || !searchKeyword.trim()) return;
    // @ts-ignore
    if (window.kakao && window.kakao.maps && window.kakao.maps.services && mapInstance.current) {
      setSearching(true);
      // @ts-ignore
      const ps = new window.kakao.maps.services.Places();
      ps.keywordSearch(searchKeyword, (data: any[], status: string) => {
        setSearching(false);
        if (status === 'OK' && data.length > 0) {
          const place = data[0];
          const lat = parseFloat(place.y);
          const lng = parseFloat(place.x);
          // @ts-ignore
          const moveLatLng = new window.kakao.maps.LatLng(lat, lng);
          mapInstance.current.setCenter(moveLatLng);
          if (onLocationChange) onLocationChange(lat, lng);
        } else {
          // 검색 결과 없음
        }
      });
    }
  }, [searchKeyword]);

  // centerLat, centerLng가 바뀌면 지도 중심 이동
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.kakao &&
      window.kakao.maps &&
      mapInstance.current &&
      centerLat !== null &&
      centerLng !== null
    ) {
      // @ts-ignore
      const kakao = window.kakao;
      // @ts-ignore
      const moveLatLng = new kakao.maps.LatLng(centerLat, centerLng);
      mapInstance.current.setCenter(moveLatLng);
    }
  }, [centerLat, centerLng]);

  // 핀 버튼 클릭 처리
  const handlePinClick = () => {
    if (pinButtonType === 'gps') {
      // GPS 기능: 현재 위치로 이동
      if (!navigator.geolocation) {
        alert("이 브라우저에서는 위치 추적이 지원되지 않습니다.");
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          // @ts-ignore
          if (window.kakao && window.kakao.maps && mapInstance.current) {
            // @ts-ignore
            const moveLatLng = new window.kakao.maps.LatLng(lat, lng);
            mapInstance.current.panTo(moveLatLng);
            // 부모 콜백 호출
            if (onLocationChange) onLocationChange(lat, lng);
          }
        },
        (err) => {
          alert("위치 정보를 가져올 수 없습니다.");
        }
      );
    } else if (pinButtonType === 'group' && onPinClick) {
      // 그룹 기능: 부모 컴포넌트에서 처리
      onPinClick();
    }
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "250px", margin: "16px 0" }}>
      {error ? (
        <div style={{
          width: "100%",
          height: "100%",
          borderRadius: "10px",
          border: "2px dashed #ccc",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f9f9f9",
          color: "#666",
          fontSize: "14px",
          textAlign: "center",
          padding: "20px"
        }}>
          <div>
            <div style={{ marginBottom: "12px", fontSize: "18px", fontWeight: "bold", color: "#333" }}>
              🗺️ 지도를 불러올 수 없습니다
            </div>
            <div style={{ 
              whiteSpace: "pre-line", 
              lineHeight: "1.5",
              maxWidth: "300px"
            }}>
              {error}
            </div>
            <div style={{ 
              marginTop: "16px", 
              fontSize: "12px", 
              color: "#999",
              borderTop: "1px solid #ddd",
              paddingTop: "12px"
            }}>
              💡 팁: 카카오 개발자 콘솔에서 도메인 설정을 확인해주세요
            </div>
          </div>
        </div>
      ) : (
        <>
          <div
            ref={mapRef}
            style={{ width: "100%", height: "100%", borderRadius: "10px" }}
          />
          {/* 핀 버튼 */}
          {pinButtonType !== 'none' && (
            <button
              onClick={handlePinClick}
              style={{
                position: "absolute",
                right: 16,
                bottom: 16,
                zIndex: 10,
                background: pinButtonType === 'group' ? "#994d52" : "#fff",
                border: pinButtonType === 'group' ? "none" : "1px solid #994d52",
                borderRadius: "50%",
                width: 48,
                height: 48,
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: pinButtonType === 'group' ? "#fff" : "#000",
              }}
              title={pinButtonType === 'gps' ? "현재 위치로 이동" : "그룹 위치로 이동"}
            >
              <span role="img" aria-label="pin">📍</span>
            </button>
          )}
          {/* 검색중 표시 */}
          {searching && (
            <div style={{position:'absolute',top:8,right:8,zIndex:30,background:'#fff',padding:'4px 12px',borderRadius:8,fontSize:14,border:'1px solid #ccc'}}>검색중...</div>
          )}
        </>
      )}
    </div>
  );
};

export default KakaoMap; 