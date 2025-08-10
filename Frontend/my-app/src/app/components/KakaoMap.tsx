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

  // 지도/마커 생성 및 중심 이동 시 콜백
  useEffect(() => {
    if (typeof window === "undefined") return;
    function createMapAndMarker() {
      // @ts-ignore
      const kakao = window.kakao;
      if (mapRef.current && !mapInstance.current) {
        mapInstance.current = new kakao.maps.Map(mapRef.current, {
          center: (centerLat !== undefined && centerLat !== null && centerLng !== undefined && centerLng !== null)
            ? new kakao.maps.LatLng(centerLat, centerLng)
            : new kakao.maps.LatLng(37.5665, 126.9780),
          level: 3,
        });
        // 지도가 준비되면 부모 컴포넌트에 알림
        if (onMapReady) {
          onMapReady(mapInstance.current);
        }
      }
      if (mapInstance.current && !markerInstance.current) {
        markerInstance.current = new kakao.maps.Marker({
          position: mapInstance.current.getCenter(),
          map: mapInstance.current,
        });
      }
      // 지도 이동 시 마커도 중심으로 이동, 콜백 호출
      if (mapInstance.current && markerInstance.current) {
        kakao.maps.event.addListener(mapInstance.current, 'center_changed', function() {
          const center = mapInstance.current.getCenter();
          markerInstance.current.setPosition(center);
          if (onLocationChange) onLocationChange(center.getLat(), center.getLng());
        });
      }
    }

    if (document.getElementById("kakao-map-script")) {
      // 이미 스크립트가 있으면 바로 지도/마커 로드
      // @ts-ignore
      if (window.kakao && window.kakao.maps) {
        createMapAndMarker();
      }
      return;
    }
    const script = document.createElement("script");
    script.id = "kakao-map-script";
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY}&autoload=false&libraries=services`;
    script.async = true;
    script.onload = () => {
      // @ts-ignore
      window.kakao.maps.load(() => {
        createMapAndMarker();
      });
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
    </div>
  );
};

export default KakaoMap; 