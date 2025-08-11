'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import KakaoMap from './components/KakaoMap';
import GuideModal from './components/GuideModal';

export default function HomePage() {
  const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000') as string;
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRandomModal, setShowRandomModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [joinRoomInput, setJoinRoomInput] = useState('');
  const router = useRouter();

  // URL 파라미터 확인하여 모달 자동 열기
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    
    if (action === 'create') {
      setShowCreateModal(true);
      // URL에서 파라미터 제거
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (action === 'join') {
      setShowJoinModal(true);
      // URL에서 파라미터 제거
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Create Room 모달 상태
  const [createRoomData, setCreateRoomData] = useState({
    location: '',
    startTime: '',
    delivery: false,
    deliveryTime: '',
    visit: false,
    visitTime: ''
  });
  const [showWarning, setShowWarning] = useState(false);

  // Random Room 모달 상태
  const [randomRoomData, setRandomRoomData] = useState({
    location: '',
    delivery: false,
    deliveryTime: '',
    visit: false,
    visitTime: ''
  });
  const [showRandomWarning, setShowRandomWarning] = useState(false);

  const [searchKeyword, setSearchKeyword] = useState('');
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [centerLat, setCenterLat] = useState<number | null>(null);
  const [centerLng, setCenterLng] = useState<number | null>(null);

  useEffect(() => {
    if (showCreateModal || showRandomModal) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            setLocationLat(lat);
            setLocationLng(lng);
            setCenterLat(lat);
            setCenterLng(lng);
          },
          (err) => {
            // 위치 권한 거부 등 무시
          }
        );
      }
    }
    // eslint-disable-next-line
  }, [showCreateModal, showRandomModal]);

  // 방 참여 함수
  const joinRoom = (inputRoomId: string) => {
    console.log('joinRoom 함수 호출됨, inputRoomId:', inputRoomId);
    
    if (inputRoomId && inputRoomId.trim()) {
      console.log('방 ID가 유효함, 참여 화면으로 이동');
      // 참여 화면으로 직접 이동
      router.push(`/participate/${inputRoomId.trim()}`);
      setShowJoinModal(false);
      setJoinRoomInput('');
    } else {
      console.log('방 ID가 유효하지 않음');
      alert('방 ID를 입력해주세요.');
    }
  };

  // 방 참여 모달 열기
  const openJoinModal = () => {
    console.log('방 참여 모달 열기');
    setShowJoinModal(true);
  };

  // 방 참여 모달 닫기
  const closeJoinModal = () => {
    setShowJoinModal(false);
    setJoinRoomInput('');
  };

  // Random Room 모달 열기
  const openRandomModal = () => {
    console.log('Random Room 모달 열기');
    setShowRandomModal(true);
  };

  // Random Room 모달 닫기
  const closeRandomModal = () => {
    setShowRandomModal(false);
    setRandomRoomData({
      location: '',
      delivery: false,
      deliveryTime: '',
      visit: false,
      visitTime: ''
    });
    setShowRandomWarning(false);
  };

  // Create Room 모달 열기
  const openCreateModal = () => {
    console.log('Create Room 모달 열기');
    setShowCreateModal(true);
  };

  // Create Room 모달 닫기
  const closeCreateModal = () => {
    setShowCreateModal(false);
    setCreateRoomData({
      location: '',
      startTime: '',
      delivery: false,
      deliveryTime: '',
      visit: false,
      visitTime: ''
    });
    setShowWarning(false);
  };

  // Create Room 데이터 업데이트
  const updateCreateRoomData = (field: string, value: any) => {
    setCreateRoomData(prev => {
      const newData = {
        ...prev,
        [field]: value
      };
      
      // delivery나 visit가 선택되면 경고 메시지 숨김
      if (field === 'delivery' || field === 'visit') {
        if (newData.delivery || newData.visit) {
          setShowWarning(false);
        }
      }
      
      return newData;
    });
  };

  // Random Room 데이터 업데이트
  const updateRandomRoomData = (field: string, value: any) => {
    setRandomRoomData(prev => {
      const newData = {
        ...prev,
        [field]: value
      };
      
      // delivery나 visit가 선택되면 경고 메시지 숨김
      if (field === 'delivery' || field === 'visit') {
        if (newData.delivery || newData.visit) {
          setShowRandomWarning(false);
        }
      }
      
      return newData;
    });
  };

  // 방 생성 함수
  const createRoom = async () => {
    console.log('방 생성 데이터:', createRoomData);
    
    if (!createRoomData.startTime) {
      alert('후보 추천 시간을 선택해주세요.');
      return;
    }
    if (locationLat === null || locationLng === null) {
      alert('지도의 위치를 지정해주세요.');
      return;
    }
    
    // delivery와 visit 중 하나는 반드시 선택해야 함
    if (!createRoomData.delivery && !createRoomData.visit) {
      setShowWarning(true);
      return;
    }
    
    // delivery를 선택했다면 배달 시간도 필수
    if (createRoomData.delivery && !createRoomData.deliveryTime) {
      alert('최대 배달 소요 시간을 선택해주세요.');
      return;
    }
    
    // visit를 선택했다면 도보 시간도 필수
    if (createRoomData.visit && !createRoomData.visitTime) {
      alert('최대 도보 소요 시간을 선택해주세요.');
      return;
    }

    // 값 변환
    const delivery = createRoomData.delivery;
    const offline = createRoomData.visit;
    const delivery_time = delivery ? Number(createRoomData.deliveryTime) : 0;
    const visit_time = offline ? Number(createRoomData.visitTime) : 0;
    const radius = offline ? 70 * visit_time : 0; // 방문(오프라인)일 때만 radius 계산
    const x = locationLat;
    const y = locationLng;
    const start_votingtime = createRoomData.startTime;

    const body = {
      data: {
        delivery,
        delivery_time,
        offline,
        radius,
        start_votingtime: Number(start_votingtime),
        state: 'suggestion',
        x,
        y
      }
    };

    console.log('📤 백엔드로 보내는 데이터:', body);

    try {
      const response = await fetch(`${BACKEND_URL}/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const result = await response.json();
      if (result.group_id) {
        router.push(`/participate/${result.group_id}`);
      } else {
        alert('방 생성 실패');
      }
    } catch (e) {
      alert('에러 발생');
    }
    closeCreateModal();
  };

  // Random Room 생성 함수
  const createRandomRoom = async () => {
    console.log('Random Room 생성 데이터:', randomRoomData);
    
    if (locationLat === null || locationLng === null) {
      alert('지도의 위치를 지정해주세요.');
      return;
    }
    
    // delivery와 visit 중 하나는 반드시 선택해야 함
    if (!randomRoomData.delivery && !randomRoomData.visit) {
      setShowRandomWarning(true);
      return;
    }
    
    // delivery를 선택했다면 배달 시간도 필수
    if (randomRoomData.delivery && !randomRoomData.deliveryTime) {
      alert('최대 배달 소요 시간을 선택해주세요.');
      return;
    }
    
    // visit를 선택했다면 도보 시간도 필수
    if (randomRoomData.visit && !randomRoomData.visitTime) {
      alert('최대 도보 소요 시간을 선택해주세요.');
      return;
    }

    // 값 변환
    const delivery = randomRoomData.delivery;
    const offline = randomRoomData.visit;
    const delivery_time = delivery ? Number(randomRoomData.deliveryTime) : 0;
    const visit_time = offline ? Number(randomRoomData.visitTime) : 0;
    const radius = offline ? 70 * visit_time : 0; // 방문(오프라인)일 때만 radius 계산
    const x = locationLat;
    const y = locationLng;

    const body = {
      data: {
        delivery,
        delivery_time,
        offline,
        radius,
        start_votingtime: 0, // 랜덤룸은 투표가 없으므로 0으로 설정
        state: 'random',
        x,
        y
      }
    };

    console.log('랜덤룸 생성 요청 데이터:', body);

    try {
      const response = await fetch(`${BACKEND_URL}/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const result = await response.json();
      if (result.group_id) {
        router.push(`/random-room/${result.group_id}`);
      } else {
        alert('Random Room 생성 실패');
      }
    } catch (e) {
      alert('에러 발생');
    }
    closeRandomModal();
  };

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
          {/* 가이드 버튼 */}
          <button 
            className={styles.guideButton}
            onClick={() => setShowGuideModal(true)}
            title="사용 가이드"
          >
            💡 GUIDE
          </button>
          
          {/* 메인 콘텐츠 */}
          <div className={styles.content}>
            {/* 타이틀 */}
            <h1 className={styles.title}>Bap! Momok?</h1>
            
            {/* 버튼 컨테이너 */}
            <div className={styles.buttonContainer}>
              {/* Create Room 버튼 */}
              <button 
                className={styles.createButton}
                onClick={openCreateModal}
              >
                Vote Room
              </button>
              {/* Create Room 버튼 */}
              
              {/* Random Room 버튼 */}
              <button 
                className={styles.joinButton}
                onClick={openRandomModal}
              >
                Random Room
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Random Room 모달 */}
      {showJoinModal && (
        <div className={styles.modalOverlay} onClick={closeJoinModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>방 참여</h2>
            <input
              className={styles.modalInput}
              type="text"
              placeholder="방 ID를 입력하세요"
              value={joinRoomInput}
              onChange={(e) => setJoinRoomInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  joinRoom(joinRoomInput);
                }
              }}
            />
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px' }}>
              <button
                className={styles.modalButton}
                onClick={() => joinRoom(joinRoomInput)}
              >
                참여
              </button>
              <button
                className={styles.modalButton}
                onClick={closeJoinModal}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Room 모달 */}
      {showCreateModal && (
        <div className={styles.modalOverlay} onClick={closeCreateModal}>
          <div className={styles.createModalContent} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>그룹 생성</h2>
            
            {/* 위치 검색 */}
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>📍 위치 검색</label>
              <form
                onSubmit={e => {
                  e.preventDefault();
                  setSearchKeyword(createRoomData.location);
                }}
                style={{ display: 'flex', gap: 8 }}
              >
                <input
                  className={styles.modalInput}
                  type="text"
                  placeholder="장소, 주소 검색..."
                  value={createRoomData.location}
                  onChange={e => updateCreateRoomData('location', e.target.value)}
                  style={{ flex: 1 }}
                />
                <button
                  type="submit"
                  className={styles.searchButton}
                >
                  검색
                </button>
              </form>
            </div>

            {/* 카카오 지도 */}
            <KakaoMap
              searchKeyword={searchKeyword}
              onLocationChange={(lat, lng) => {
                setLocationLat(lat);
                setLocationLng(lng);
                setCenterLat(lat);
                setCenterLng(lng);
              }}
              centerLat={centerLat}
              centerLng={centerLng}
              pinButtonType="gps"
            />

            {/* 후보 추천 시간 */}
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>⏰ 후보 추천 시간</label>
              <select
                className={styles.timeSelect}
                value={createRoomData.startTime}
                onChange={(e) => updateCreateRoomData('startTime', e.target.value)}
              >
                <option value="">시간 선택</option>
                {[...Array(10)].map((_, i) => (
                  <option key={i+1} value={String(i+1)}>{i+1}분</option>
                ))}
              </select>
            </div>

            {/* 필수 선택 안내 */}
            {showWarning && (
              <div style={{ 
                marginBottom: '20px', 
                padding: '10px', 
                background: '#fff3cd', 
                border: '1px solid #ffeaa7', 
                borderRadius: '8px',
                fontSize: '14px',
                color: '#856404'
              }}>
                ⚠️ 배달 또는 방문 중 하나는 반드시 선택해주세요.
              </div>
            )}

            {/* Delivery 옵션 */}
            <div className={styles.optionGroup}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input
                  type="checkbox"
                  id="delivery"
                  checked={createRoomData.delivery}
                  onChange={(e) => updateCreateRoomData('delivery', e.target.checked)}
                  className={styles.checkbox}
                />
                <label htmlFor="delivery" className={styles.checkboxLabel}>Delivery</label>
                {createRoomData.delivery && (
                  <select
                    className={styles.timeSelect}
                    value={createRoomData.deliveryTime}
                    onChange={(e) => updateCreateRoomData('deliveryTime', e.target.value)}
                    required
                  >
                    <option value="">최대 배달 소요 시간</option>
                    <option value="10">10분</option>
                    <option value="20">20분</option>
                    <option value="30">30분</option>
                    <option value="40">40분</option>
                    <option value="50">50분</option>
                    <option value="60">60분</option>
                  </select>
                )}
              </div>
            </div>

            {/* Visit 옵션 */}
            <div className={styles.optionGroup}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input
                  type="checkbox"
                  id="visit"
                  checked={createRoomData.visit}
                  onChange={(e) => updateCreateRoomData('visit', e.target.checked)}
                  className={styles.checkbox}
                />
                <label htmlFor="visit" className={styles.checkboxLabel}>Visit</label>
                {createRoomData.visit && (
                  <select
                    className={styles.timeSelect}
                    value={createRoomData.visitTime}
                    onChange={(e) => updateCreateRoomData('visitTime', e.target.value)}
                    required
                  >
                    <option value="">최대 도보 소요 시간</option>
                    <option value="5">5분</option>
                    <option value="10">10분</option>
                    <option value="20">20분</option>
                    <option value="30">30분</option>
                    <option value="40">40분</option>
                  </select>
                )}
              </div>
            </div>

            {/* 버튼들 */}
            <div className={styles.modalButtonGroup}>
              <button
                className={styles.modalButton}
                onClick={createRoom}
              >
                Create room
              </button>
              <button
                className={styles.modalButton}
                onClick={closeCreateModal}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Random Room 모달 */}
      {showRandomModal && (
        <div className={styles.modalOverlay} onClick={closeRandomModal}>
          <div className={styles.createModalContent} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>랜덤룸 생성</h2>
            
            {/* 위치 검색 */}
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>📍 위치 검색</label>
              <form
                onSubmit={e => {
                  e.preventDefault();
                  setSearchKeyword(randomRoomData.location);
                }}
                style={{ display: 'flex', gap: 8 }}
              >
                <input
                  className={styles.modalInput}
                  type="text"
                  placeholder="장소, 주소 검색..."
                  value={randomRoomData.location}
                  onChange={e => updateRandomRoomData('location', e.target.value)}
                  style={{ flex: 1 }}
                />
                <button
                  type="submit"
                  className={styles.searchButton}
                >
                  검색
                </button>
              </form>
            </div>

            {/* 카카오 지도 */}
            <KakaoMap
              searchKeyword={searchKeyword}
              onLocationChange={(lat, lng) => {
                setLocationLat(lat);
                setLocationLng(lng);
                setCenterLat(lat);
                setCenterLng(lng);
              }}
              centerLat={centerLat}
              centerLng={centerLng}
              pinButtonType="gps"
            />

            {/* 필수 선택 안내 */}
            {showRandomWarning && (
              <div style={{ 
                marginBottom: '20px', 
                padding: '10px', 
                background: '#fff3cd', 
                border: '1px solid #ffeaa7', 
                borderRadius: '8px',
                fontSize: '14px',
                color: '#856404'
              }}>
                ⚠️ 배달 또는 방문 중 하나는 반드시 선택해주세요.
              </div>
            )}

            {/* Delivery 옵션 */}
            <div className={styles.optionGroup}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input
                  type="checkbox"
                  id="random-delivery"
                  checked={randomRoomData.delivery}
                  onChange={(e) => updateRandomRoomData('delivery', e.target.checked)}
                  className={styles.checkbox}
                />
                <label htmlFor="random-delivery" className={styles.checkboxLabel}>Delivery</label>
                {randomRoomData.delivery && (
                  <select
                    className={styles.timeSelect}
                    value={randomRoomData.deliveryTime}
                    onChange={(e) => updateRandomRoomData('deliveryTime', e.target.value)}
                    required
                  >
                    <option value="">최대 배달 소요 시간</option>
                    <option value="10">10분</option>
                    <option value="20">20분</option>
                    <option value="30">30분</option>
                    <option value="40">40분</option>
                    <option value="50">50분</option>
                    <option value="60">60분</option>
                  </select>
                )}
              </div>
            </div>

            {/* Visit 옵션 */}
            <div className={styles.optionGroup}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input
                  type="checkbox"
                  id="random-visit"
                  checked={randomRoomData.visit}
                  onChange={(e) => updateRandomRoomData('visit', e.target.checked)}
                  className={styles.checkbox}
                />
                <label htmlFor="random-visit" className={styles.checkboxLabel}>Visit</label>
                {randomRoomData.visit && (
                  <select
                    className={styles.timeSelect}
                    value={randomRoomData.visitTime}
                    onChange={(e) => updateRandomRoomData('visitTime', e.target.value)}
                    required
                  >
                    <option value="">최대 도보 소요 시간</option>
                    <option value="5">5분</option>
                    <option value="10">10분</option>
                    <option value="20">20분</option>
                    <option value="30">30분</option>
                    <option value="40">40분</option>
                  </select>
                )}
              </div>
            </div>

            {/* 버튼들 */}
            <div className={styles.modalButtonGroup}>
              <button
                className={styles.modalButton}
                onClick={createRandomRoom}
              >
                Create Room
              </button>
              <button
                className={styles.modalButton}
                onClick={closeRandomModal}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 가이드 모달 */}
      <GuideModal 
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
      />
    </div>
  );
}
