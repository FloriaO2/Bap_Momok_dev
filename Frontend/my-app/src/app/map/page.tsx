'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './map.module.css';
import { Suspense } from 'react';

declare global {
  interface Window {
    kakao: any;
  }
}

function MapPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomId = searchParams.get('roomId');
  const mapRef = useRef<HTMLDivElement>(null);

  const goBack = () => {
    router.push('/');
  };

  // 웹에서는 접속을 막고 개발 중 메시지 표시
  return (
    <div className={styles.container}>
      {/* 배경 이미지 */}
      <div 
        className={styles.backgroundImage}
        style={{
          backgroundImage: 'url(/background_img.png)'
        }}
      >
        {/* 오버레이 그라데이션 */}
        <div className={styles.overlay}>
          {/* 헤더 */}
          <div className={styles.header}>
            <button 
              className={styles.backButton} 
              onClick={goBack}
            >
              ← 뒤로
            </button>
            <h1 className={styles.title}>카카오지도</h1>
            {roomId && <span className={styles.roomId}>방 ID: {roomId}</span>}
          </div>
          {/* 개발 중 메시지 */}
          <div className={styles.developmentMessage}>
            <h2 className={styles.developmentTitle}>🚧 개발 중입니다!</h2>
            <p className={styles.developmentText}>
              카카오지도 기능은 현재 개발 중입니다.
              <br />
              나중에 완성되면 여기에 지도가 표시될 예정입니다.
            </p>
            <div className={styles.developmentInfo}>
              <p>📱 모바일 앱에서는 정상 작동할 예정입니다.</p>
              <p>🌐 웹에서는 현재 개발 중인 상태입니다.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MapPage() {
  return (
    <Suspense fallback={<div>로딩중...</div>}>
      <MapPageContent />
    </Suspense>
  );
}