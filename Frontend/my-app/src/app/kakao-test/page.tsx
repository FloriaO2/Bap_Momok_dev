"use client";
import React, { useState, useEffect } from 'react';

export default function KakaoTestPage() {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // API 키 확인 (환경변수 또는 하드코딩된 키 사용)
    let apiKey = process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY;
    
    console.log('KakaoTest - Environment check:');
    console.log('KakaoTest - NODE_ENV:', process.env.NODE_ENV);
    console.log('KakaoTest - Raw env var:', process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY);
    console.log('KakaoTest - All NEXT_PUBLIC env vars:', Object.keys(process.env).filter(key => key.startsWith('NEXT_PUBLIC_')));
    
    // 환경변수가 없으면 하드코딩된 키 사용 (개발용)
    if (!apiKey) {
      apiKey = '69c81adb721c68e625317f7870e4213a';
      console.log('KakaoTest - Using fallback API key');
    }
    
    console.log('KakaoTest - Final API Key exists:', !!apiKey);
    console.log('KakaoTest - Final API Key length:', apiKey?.length);
    console.log('KakaoTest - Final API Key (first 10 chars):', apiKey?.substring(0, 10));
    
    if (!apiKey) {
      setError('카카오맵 API 키가 설정되지 않았습니다.');
      return;
    }

    // 카카오맵 스크립트 로드
    const script = document.createElement('script');
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&autoload=false&libraries=services`;
    script.async = true;
    script.onload = () => {
      console.log('카카오맵 API 로드 완료');
      // @ts-ignore
      if (window.kakao && window.kakao.maps) {
        // @ts-ignore
        window.kakao.maps.load(() => {
          console.log('카카오맵 Maps 로드 완료');
        });
      }
    };
    script.onerror = (error) => {
      console.error('카카오맵 API 로드 실패:', error);
      setError('카카오맵 API 로드 실패 - 도메인 등록을 확인해주세요');
    };
    document.head.appendChild(script);
  }, []);

  const testSearch = () => {
    if (!searchKeyword.trim()) return;
    
    // @ts-ignore
    if (typeof window !== 'undefined' && window.kakao && window.kakao.maps && window.kakao.maps.services) {
      setLoading(true);
      setError(null);
      
      // @ts-ignore
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
      setError('카카오맵 API가 로드되지 않았습니다. 페이지를 새로고침해주세요.');
    }
  };

  const testGeocoding = () => {
    // @ts-ignore
    if (typeof window !== 'undefined' && window.kakao && window.kakao.maps && window.kakao.maps.services) {
      setLoading(true);
      setError(null);
      
      // @ts-ignore
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
    } else {
      setError('카카오맵 API가 로드되지 않았습니다. 페이지를 새로고침해주세요.');
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
          // @ts-ignore
          console.log('window.kakao:', window.kakao);
          // @ts-ignore
          console.log('window.kakao.maps:', window.kakao?.maps);
          // @ts-ignore
          console.log('window.kakao.maps.services:', window.kakao?.maps?.services);
          // @ts-ignore
          if (window.kakao && window.kakao.maps) {
            // @ts-ignore
            window.kakao.maps.load(() => {
              console.log('Maps loaded successfully via manual load');
            });
          }
        }}>
          콘솔에서 API 상태 확인
        </button>
      </div>
    </div>
  );
} 