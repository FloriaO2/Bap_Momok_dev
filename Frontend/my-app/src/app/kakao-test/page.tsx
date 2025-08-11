"use client";
import React, { useState, useEffect } from 'react';

export default function KakaoTestPage() {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 카카오맵 스크립트 로드
    const script = document.createElement('script');
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=45874862ce4eb9af215a1e6f553c9375&libraries=services`;
    script.async = true;
    script.onload = () => {
      console.log('카카오맵 API 로드 완료');
    };
    script.onerror = () => {
      setError('카카오맵 API 로드 실패');
    };
    document.head.appendChild(script);
  }, []);

  const testSearch = () => {
    if (!searchKeyword.trim()) return;
    
    if (typeof window !== 'undefined' && window.kakao && window.kakao.maps && window.kakao.maps.services) {
      setLoading(true);
      setError(null);
      
      const ps = new window.kakao.maps.services.Places();
      ps.keywordSearch(searchKeyword, (data: any[], status: string) => {
        setLoading(false);
        if (status === 'OK') {
          setSearchResults(data);
          console.log('검색 결과:', data);
        } else {
          setError(`검색 실패: ${status}`);
        }
      });
    } else {
      setError('카카오맵 API가 로드되지 않았습니다.');
    }
  };

  const testGeocoding = () => {
    if (typeof window !== 'undefined' && window.kakao && window.kakao.maps && window.kakao.maps.services) {
      setLoading(true);
      setError(null);
      
      const geocoder = new window.kakao.maps.services.Geocoder();
      geocoder.addressSearch('서울특별시 강남구 강남대로 396', (result: any[], status: string) => {
        setLoading(false);
        if (status === 'OK') {
          console.log('주소 검색 결과:', result);
          setSearchResults(result);
        } else {
          setError(`주소 검색 실패: ${status}`);
        }
      });
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>카카오맵 API 테스트</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>1. 키워드 검색 테스트</h3>
        <input
          type="text"
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          placeholder="검색할 키워드를 입력하세요 (예: 강남역)"
          style={{ width: '300px', padding: '8px', marginRight: '10px' }}
        />
        <button onClick={testSearch} disabled={loading}>
          {loading ? '검색 중...' : '검색'}
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>2. 주소 검색 테스트</h3>
        <button onClick={testGeocoding} disabled={loading}>
          {loading ? '검색 중...' : '주소 검색 테스트'}
        </button>
      </div>

      {error && (
        <div style={{ color: 'red', marginBottom: '20px' }}>
          <strong>오류:</strong> {error}
        </div>
      )}

      {searchResults.length > 0 && (
        <div>
          <h3>검색 결과 ({searchResults.length}개)</h3>
          <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #ccc', padding: '10px' }}>
            {searchResults.map((result, index) => (
              <div key={index} style={{ marginBottom: '10px', padding: '10px', border: '1px solid #eee' }}>
                <strong>{result.place_name}</strong><br />
                <small>{result.address_name}</small><br />
                <small>좌표: {result.y}, {result.x}</small>
                {result.phone && <br />}
                {result.phone && <small>전화: {result.phone}</small>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: '30px' }}>
        <h3>3. API 상태 확인</h3>
        <button onClick={() => {
          console.log('window.kakao:', window.kakao);
          console.log('window.kakao.maps:', window.kakao?.maps);
          console.log('window.kakao.maps.services:', window.kakao?.maps?.services);
        }}>
          콘솔에서 API 상태 확인
        </button>
      </div>
    </div>
  );
} 