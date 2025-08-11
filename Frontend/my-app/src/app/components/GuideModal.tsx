import React, { useState } from 'react';
import styles from './GuideModal.module.css';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GuideModal({ isOpen, onClose }: GuideModalProps) {
  const [activeTab, setActiveTab] = useState<'vote' | 'random'>('vote');
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleStepClick = (stepNumber: number) => {
    setExpandedStep(expandedStep === stepNumber ? null : stepNumber);
  };

  const handleClose = () => {
    setExpandedStep(null);
    onClose();
  };

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>📖 사용 가이드</h2>
          <button className={styles.closeButton} onClick={handleClose}>✕</button>
        </div>

        <div className={styles.tabContainer}>
          <button
            className={`${styles.tabButton} ${activeTab === 'vote' ? styles.active : ''}`}
            onClick={() => {
              setActiveTab('vote');
              setExpandedStep(null);
            }}
          >
            🗳️ Vote Room
          </button>
          <button
            className={`${styles.tabButton} ${activeTab === 'random' ? styles.active : ''}`}
            onClick={() => {
              setActiveTab('random');
              setExpandedStep(null);
            }}
          >
            🎲 Random Room
          </button>
        </div>

        <div className={styles.content}>
          {activeTab === 'vote' && (
            <div className={styles.guideSection}>
              <h3>🗳️ Vote Room 사용법</h3>
              
              <div className={styles.stepContainer}>
                <div className={styles.step} onClick={() => handleStepClick(1)}>
                  <div className={styles.stepNumber}>1</div>
                  <div className={styles.stepContent}>
                    <h4>방 생성</h4>
                    <p>홈화면에서 "Vote Room" 버튼을 클릭하여 새로운 방을 생성합니다.</p>
                    {expandedStep === 1 && (
                      <div className={styles.detailText}>
                        <h5>상세 설명</h5>
                        <p>홈화면의 "Vote Room" 버튼을 클릭하면 방 생성 모달이 열립니다. 여기서 방의 기본 설정을 할 수 있습니다.</p>
                        {/* 추후 이미지 추가 예정 */}
                      </div>
                    )}
                  </div>
                </div>

                <div className={styles.step} onClick={() => handleStepClick(2)}>
                  <div className={styles.stepNumber}>2</div>
                  <div className={styles.stepContent}>
                    <h4>위치 및 옵션 설정</h4>
                    <p>지도에서 약속 위치를 선택하고, 직접가기와 배달 옵션을 설정합니다.</p>
                    <ul>
                      <li><strong>직접가기</strong>: 방문 가능한 식당들을 카카오맵에서 검색</li>
                      <li><strong>배달</strong>: 배달 가능한 식당들을 요기요에서 검색</li>
                    </ul>
                    {expandedStep === 2 && (
                      <div className={styles.detailText}>
                        <h5>상세 설명</h5>
                        <p>지도에서 만날 위치를 클릭하여 선택하고, 직접가기와 배달 옵션을 체크박스로 설정할 수 있습니다.</p>
                        {/* 추후 이미지 추가 예정 */}
                      </div>
                    )}
                  </div>
                </div>

                <div className={styles.step} onClick={() => handleStepClick(3)}>
                  <div className={styles.stepNumber}>3</div>
                  <div className={styles.stepContent}>
                    <h4>방 ID 공유</h4>
                    <p>생성된 방 ID를 친구들에게 공유하여 함께 참여할 수 있습니다.</p>
                    {expandedStep === 3 && (
                      <div className={styles.detailText}>
                        <h5>상세 설명</h5>
                        <p>방이 생성되면 고유한 방 ID가 생성됩니다. 이 ID를 친구들에게 공유하여 함께 참여할 수 있습니다.</p>
                        {/* 추후 이미지 추가 예정 */}
                      </div>
                    )}
                  </div>
                </div>

                <div className={styles.step} onClick={() => handleStepClick(4)}>
                  <div className={styles.stepNumber}>4</div>
                  <div className={styles.stepContent}>
                    <h4>후보 제안</h4>
                    <p>참여자들이 직접가기/배달 탭에서 원하는 식당을 검색하고 후보로 추가합니다.</p>
                    <ul>
                      <li>모든 참여자가 원하는 식당을 자유롭게 제안</li>
                      <li>슬롯머신을 통해 랜덤 추천도 가능</li>
                    </ul>
                    {expandedStep === 4 && (
                      <div className={styles.detailText}>
                        <h5>상세 설명</h5>
                        <p>참여자들이 직접가기와 배달 탭을 통해 원하는 식당을 검색하고 후보로 추가할 수 있습니다. 슬롯머신 룰렛을 통해 랜덤 추천도 가능합니다.</p>
                        {/* 추후 이미지 추가 예정 */}
                      </div>
                    )}
                  </div>
                </div>

                <div className={styles.step} onClick={() => handleStepClick(5)}>
                  <div className={styles.stepNumber}>5</div>
                  <div className={styles.stepContent}>
                    <h4>투표</h4>
                    <p>제안된 후보들 중에서 투표하여 최종 식당을 결정합니다.</p>
                    <ul>
                      <li>모든 참여자가 제안된 후보들에 대해 투표</li>
                      <li>투표 결과를 집계해 각 식당의 선호도 계산</li>
                    </ul>
                    {expandedStep === 5 && (
                      <div className={styles.detailText}>
                        <h5>상세 설명</h5>
                        <p>제안된 후보들에 대해 모든 참여자가 투표를 진행합니다. 투표 결과를 집계하여 각 식당의 선호도를 계산합니다.</p>
                        {/* 추후 이미지 추가 예정 */}
                      </div>
                    )}
                  </div>
                </div>

                <div className={styles.step} onClick={() => handleStepClick(6)}>
                  <div className={styles.stepNumber}>6</div>
                  <div className={styles.stepContent}>
                    <h4>결과 확인</h4>
                    <p>투표 결과를 확인하고 선택된 식당의 정보를 볼 수 있습니다.</p>
                    {expandedStep === 6 && (
                      <div className={styles.detailText}>
                        <h5>상세 설명</h5>
                        <p>투표가 완료되면 최종 선택된 식당의 상세 정보를 확인할 수 있습니다.</p>
                        {/* 추후 이미지 추가 예정 */}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'random' && (
            <div className={styles.guideSection}>
              <h3>🎲 Random Room 사용법</h3>
              
              <div className={styles.stepContainer}>
                <div className={styles.step} onClick={() => handleStepClick(1)}>
                  <div className={styles.stepNumber}>1</div>
                  <div className={styles.stepContent}>
                    <h4>방 생성</h4>
                    <p>홈화면에서 "Random Room" 버튼을 클릭하여 새로운 방을 생성합니다.</p>
                    {expandedStep === 1 && (
                      <div className={styles.detailText}>
                        <h5>상세 설명</h5>
                        <p>홈화면의 "Random Room" 버튼을 클릭하면 방 생성 모달이 열립니다. 여기서 방의 기본 설정을 할 수 있습니다.</p>
                        {/* 추후 이미지 추가 예정 */}
                      </div>
                    )}
                  </div>
                </div>

                <div className={styles.step} onClick={() => handleStepClick(2)}>
                  <div className={styles.stepNumber}>2</div>
                  <div className={styles.stepContent}>
                    <h4>위치 및 옵션 설정</h4>
                    <p>지도에서 약속 위치를 선택하고, 직접가기와 배달 옵션을 설정합니다.</p>
                    <ul>
                      <li><strong>직접가기</strong>: 방문 가능한 식당들을 카카오맵에서 검색</li>
                      <li><strong>배달</strong>: 배달 가능한 식당들을 요기요에서 검색</li>
                    </ul>
                    {expandedStep === 2 && (
                      <div className={styles.detailText}>
                        <h5>상세 설명</h5>
                        <p>지도에서 만날 위치를 클릭하여 선택하고, 직접가기와 배달 옵션을 체크박스로 설정할 수 있습니다.</p>
                        {/* 추후 이미지 추가 예정 */}
                      </div>
                    )}
                  </div>
                </div>

                <div className={styles.step} onClick={() => handleStepClick(3)}>
                  <div className={styles.stepNumber}>3</div>
                  <div className={styles.stepContent}>
                    <h4>후보 랜덤 선택</h4>
                    <p>설정된 조건에 따라 시스템이 자동으로 식당 후보들을 랜덤으로 선택합니다.</p>
                    <ul>
                      <li>설정한 위치와 반경 내의 식당들 중에서 선택</li>
                      <li>직접가기/배달 옵션에 따라 적절한 식당들 선별</li>
                    </ul>
                    {expandedStep === 3 && (
                      <div className={styles.detailText}>
                        <h5>상세 설명</h5>
                        <p>설정한 위치와 반경 내에서 시스템이 자동으로 식당 후보들을 랜덤으로 선택합니다. 직접가기와 배달 옵션에 따라 적절한 식당들을 선별합니다.</p>
                        {/* 추후 이미지 추가 예정 */}
                      </div>
                    )}
                  </div>
                </div>

                <div className={styles.step} onClick={() => handleStepClick(4)}>
                  <div className={styles.stepNumber}>4</div>
                  <div className={styles.stepContent}>
                    <h4>룰렛 돌리기</h4>
                    <p>시스템이 선택한 후보들 중에서 룰렛을 돌려 최종 식당을 결정합니다.</p>
                    <ul>
                      <li>선택된 후보들로 룰렛 진행</li>
                      <li>룰렛이 멈춘 위치의 식당이 최종 선택됨</li>
                      <li>후보가 마음에 안 든다면 후보 새로고침도 가능</li>
                    </ul>
                    {expandedStep === 4 && (
                      <div className={styles.detailText}>
                        <h5>상세 설명</h5>
                        <p>시스템이 선택한 후보들로 룰렛을 진행합니다. 룰렛이 멈춘 위치의 식당이 최종 선택되며, 후보가 마음에 들지 않으면 새로고침 버튼을 통해 새로운 후보들을 받을 수 있습니다.</p>
                        {/* 추후 이미지 추가 예정 */}
                      </div>
                    )}
                  </div>
                </div>

                <div className={styles.step} onClick={() => handleStepClick(5)}>
                  <div className={styles.stepNumber}>5</div>
                  <div className={styles.stepContent}>
                    <h4>결과 확인</h4>
                    <p>룰렛 결과로 선택된 식당의 정보를 확인할 수 있습니다.</p>
                    {expandedStep === 5 && (
                      <div className={styles.detailText}>
                        <h5>상세 설명</h5>
                        <p>룰렛 결과로 최종 선택된 식당의 상세 정보를 확인할 수 있습니다.</p>
                        {/* 추후 이미지 추가 예정 */}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 