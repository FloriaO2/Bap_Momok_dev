"use client";
import React, { useState, useEffect, use } from "react";
import Head from 'next/head';
// Firebase SDK import
import { ref, onValue, off } from "firebase/database";
import { database } from "../../../firebase";

export default function ParticipatePage({ params }: { params: Promise<{ group_id: string }> }) {
  const resolvedParams = use(params);
  const groupId = resolvedParams.group_id;
  
  const [showNicknameModal, setShowNicknameModal] = useState(true);
  const [nickname, setNickname] = useState("");
  const [participants, setParticipants] = useState({});
  const [groupData, setGroupData] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 투표 마감 시간 계산 및 게이지 업데이트
  useEffect(() => {
    if (groupData?.start_votingtime && groupData?.group_creation_time) {
      const timer = setInterval(() => {
        const now = new Date().getTime();
        const creationTime = new Date(groupData.group_creation_time).getTime();
        
        // start_votingtime은 분 단위 정수이므로, 그룹 생성 시점에서 해당 분 수만큼 후가 투표 시작 시간
        const votingDurationMinutes = groupData.start_votingtime;
        const votingTime = creationTime + (votingDurationMinutes * 60 * 1000);
        const timeDiff = votingTime - now;
        
        if (timeDiff > 0) {
          const hours = Math.floor(timeDiff / (1000 * 60 * 60));
          const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
          
          if (hours > 0) {
            setTimeLeft(`${hours}시간 ${minutes}분`);
          } else if (minutes > 0) {
            setTimeLeft(`${minutes}분 ${seconds}초`);
          } else {
            setTimeLeft(`${seconds}초`);
          }
        } else {
          setTimeLeft("후보 제안 시간 종료");
          // 투표 시간이 끝나면 3초 후 결과 화면으로 이동
          setTimeout(() => {
            window.location.href = `/tinder?group_id=${groupId}`;
          }, 3000);
        }
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [groupData, groupId]);

  // 게이지 퍼센트 계산
  const getProgressPercentage = () => {
    if (!groupData?.start_votingtime || !groupData?.group_creation_time) {
      return 100;
    }
    
    const now = new Date().getTime();
    const creationTime = new Date(groupData.group_creation_time).getTime();
    
    // start_votingtime은 분 단위 정수이므로, 그룹 생성 시점에서 해당 분 수만큼 후가 투표 시작 시간
    const votingDurationMinutes = groupData.start_votingtime;
    const votingTime = creationTime + (votingDurationMinutes * 60 * 1000);
    
    // 전체 기간 (그룹 생성부터 투표 시작까지)
    const totalDuration = votingTime - creationTime;
    
    // 남은 시간
    const remainingTime = votingTime - now;
    
    if (remainingTime <= 0) return 0;
    
    // 남은 퍼센트 계산
    const remainingPercentage = (remainingTime / totalDuration) * 100;
    
    return Math.max(0, Math.min(100, remainingPercentage));
  };

  const [groupNotFound, setGroupNotFound] = useState(false);
  const [shouldGoToVote, setShouldGoToVote] = useState(false);
  const [voteMessage, setVoteMessage] = useState("");

  // 그룹 데이터 가져오기
  useEffect(() => {
    const fetchGroupData = async () => {
      try {
        // URL 정규화 함수 - 끝에 슬래시 제거
        const normalizeUrl = (url: string) => {
          return url.endsWith('/') ? url.slice(0, -1) : url;
        };
        const backendUrl = normalizeUrl(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000');
        const response = await fetch(`${backendUrl}/groups/${groupId}`);
        if (response.ok) {
          const data = await response.json();
          setGroupData(data);
        } else {
          // 그룹이 존재하지 않는 경우
          setGroupNotFound(true);
        }
      } catch (error) {
        console.error("그룹 데이터 가져오기 실패:", error);
        setGroupNotFound(true);
      }
    };
    fetchGroupData();
  }, [groupId]);

  const handleNicknameSubmit = async () => {
    // 이미 등록된 참가자라면 함수 종료
    if (sessionStorage.getItem(`participant_id_${groupId}`)) {
      showToast("이미 참가자로 등록되어 있습니다.");
      return;
    }
    if (nickname.trim()) {
      sessionStorage.setItem("nickname", nickname.trim());
      try {
        setIsSubmitting(true); // 중복 제출 방지
        // URL 정규화 함수 - 끝에 슬래시 제거
        const normalizeUrl = (url: string) => {
          return url.endsWith('/') ? url.slice(0, -1) : url;
        };
        const backendUrl = normalizeUrl(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000');
        const response = await fetch(
          `${backendUrl}/groups/${groupId}/participants`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nickname: nickname.trim() }),
          }
        );
        const result = await response.json();
        if (result.participant_id) {
          sessionStorage.setItem(`participant_id_${groupId}`, result.participant_id);
          
          // 기존 멤버들의 후보 추천 완료 상태 확인
          const participantsResponse = await fetch(`${backendUrl}/groups/${groupId}`);
          const groupData = await participantsResponse.json();
          const existingParticipants = groupData.participants || {};
          
          // 기존 멤버가 있고, 모든 기존 멤버가 후보 추천을 완료했는지 확인
          const existingParticipantIds = Object.keys(existingParticipants).filter(id => id !== result.participant_id);
          const allExistingCompleted = existingParticipantIds.length > 0 && 
            existingParticipantIds.every(id => existingParticipants[id]?.suggest_complete);
          
          if (allExistingCompleted) {
            console.log('기존 멤버들이 모두 후보 추천을 완료했습니다. 자동으로 후보 추천 완료 상태로 변경합니다.');
            // 자동으로 후보 추천 완료 상태로 변경
            await fetch(`${backendUrl}/groups/${groupId}/participants/${result.participant_id}/suggest-complete`, {
              method: 'POST'
            });
            setShouldGoToVote(true);
            setVoteMessage("기존 멤버들이 모두 후보 추천을 완료했습니다.\n투표 화면으로 이동할 수 있습니다.");
          }
          
          setShowNicknameModal(false);
        } else {
          alert("참가 등록 실패");
        }
      } catch (e) {
        console.error("참가 등록 중 오류:", e);
        alert("에러 발생");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  useEffect(() => {
    const participantsRef = ref(database, `groups/${groupId}/participants`);
    const unsubscribe = onValue(participantsRef, (snapshot) => {
      setParticipants(snapshot.val() || {});
    });
    return () => off(participantsRef, "value", unsubscribe);
  }, [groupId]);

  // QR코드 생성 (간단한 URL 기반)
  const generateQRCode = (url: string) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
  };

  // 링크 복사
  const copyLink = async () => {
    const inviteUrl = `${process.env.NEXT_PUBLIC_FRONTEND_URL}/participate/${groupId}`;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      showToast("링크가 복사되었습니다!");
    } catch (err) {
      console.error("링크 복사 실패:", err);
      showToast("링크 복사에 실패했습니다.");
    }
  };

  // 카카오톡 공유 SDK 동적 로드 및 초기화
  useEffect(() => {
    // 카카오 SDK 동적 로드
    // Bap! Momok? 앱 키로 등록, 하드코딩
    if (typeof window !== 'undefined' && !(window as any).Kakao) {
      const script = document.createElement('script');
      script.src = 'https://developers.kakao.com/sdk/js/kakao.min.js';
      script.async = true;
      script.onload = () => {
        if ((window as any).Kakao && !(window as any).Kakao.isInitialized()) {
          (window as any).Kakao.init('7597cf1893872edc8f5093c4038c116c');
        }
      };
      document.body.appendChild(script);
    } else if ((window as any).Kakao && !(window as any).Kakao.isInitialized()) {
      (window as any).Kakao.init('7597cf1893872edc8f5093c4038c116c');
    }
  }, []);

  // 카카오톡 공유하기
  const shareLink = async () => {
    const inviteUrl = `${process.env.NEXT_PUBLIC_FRONTEND_URL}/participate/${groupId}`;
    if ((window as any).Kakao && (window as any).Kakao.Share) {
      (window as any).Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: 'Bap! Momok?에 초대합니다!',
          description: 'Bap! Momok? 투표에 참여해주세요!',
          imageUrl: `${process.env.NEXT_PUBLIC_FRONTEND_URL}/logo.png`,
          link: {
            mobileWebUrl: inviteUrl,
            webUrl: inviteUrl,
          },
        },
        buttons: [
          {
            title: '참여하러 가기',
            link: {
              mobileWebUrl: inviteUrl,
              webUrl: inviteUrl,
            },
          },
        ],
      });
    } else {
      alert('카카오톡 공유를 사용할 수 없습니다.');
    }
  };

  // 그룹이 존재하지 않는 경우 표시할 UI
  if (groupNotFound) {
    return (
      <>
        <Head>
          <title>Bap! Momok? - 존재하지 않는 페이지</title>
          <meta name="description" content="입력하신 그룹 ID가 올바르지 않거나 해당 그룹이 존재하지 않습니다." />
          <meta property="og:title" content="Bap! Momok? - 존재하지 않는 페이지" />
          <meta property="og:description" content="입력하신 그룹 ID가 올바르지 않거나 해당 그룹이 존재하지 않습니다." />
          <meta property="og:image" content={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/logo.png`} />
          <meta property="og:image:width" content="512" />
          <meta property="og:image:height" content="512" />
          <meta property="og:url" content={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/participate/${groupId}`} />
          <meta property="og:type" content="website" />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content="Bap! Momok? - 존재하지 않는 페이지" />
          <meta name="twitter:description" content="입력하신 그룹 ID가 올바르지 않거나 해당 그룹이 존재하지 않습니다." />
          <meta name="twitter:image" content={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/logo.png`} />
        </Head>
        <div style={{ 
          minHeight: "100vh", 
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
          fontFamily: "Arial, sans-serif"
        }}>
          <div style={{ 
            background: "#fff", 
            borderRadius: "20px", 
            padding: "40px", 
            textAlign: "center",
            boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
            maxWidth: "400px",
            width: "100%"
          }}>
            <div style={{ 
              fontSize: "80px", 
              marginBottom: "20px"
            }}>
              🚧
            </div>
            <h1 style={{ 
              fontSize: "24px", 
              fontWeight: "bold", 
              color: "#333", 
              marginBottom: "10px"
            }}>
              존재하지 않는 페이지입니다!
            </h1>
            <p style={{ 
              fontSize: "16px", 
              color: "#666", 
              marginBottom: "30px"
            }}>
              입력하신 그룹 ID가 올바르지 않거나<br />
              해당 그룹이 존재하지 않습니다.
            </p>
            <button
              onClick={() => window.location.href = '/'}
              style={{ 
                background: "#994d52", 
                color: "#fff", 
                border: "none", 
                borderRadius: "25px", 
                padding: "15px 30px", 
                fontSize: "16px", 
                fontWeight: "bold", 
                cursor: "pointer",
                transition: "all 0.3s ease"
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = "#8a4449";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = "#994d52";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              홈으로 가기
            </button>
          </div>
        </div>
      </>
    );
  }

  useEffect(() => {
    // 이미 참가자 등록되어 있으면 닉네임 모달 띄우지 않음
    if (typeof window !== "undefined" && sessionStorage.getItem(`participant_id_${groupId}`)) {
      setShowNicknameModal(false);
    }
  }, [groupId]);

  return (
    <>
      <Head>
        <title>Bap! Momok? - 참여하기</title>
        <meta name="description" content="Bap! Momok? 투표에 참여해주세요! 함께 맛있는 음식을 선택해보세요." />
        <meta property="og:title" content="Bap! Momok? - 참여하기" />
        <meta property="og:description" content="Bap! Momok? 투표에 참여해주세요! 함께 맛있는 음식을 선택해보세요." />
        <meta property="og:image" content={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/logo.png`} />
        <meta property="og:image:width" content="512" />
        <meta property="og:image:height" content="512" />
        <meta property="og:url" content={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/participate/${groupId}`} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Bap! Momok? - 참여하기" />
        <meta name="twitter:description" content="Bap! Momok? 투표에 참여해주세요! 함께 맛있는 음식을 선택해보세요." />
        <meta name="twitter:image" content={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/logo.png`} />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/logo.png" />
      </Head>
      <div style={{ 
        minHeight: "100vh", 
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        padding: "20px",
        fontFamily: "Arial, sans-serif"
      }}>
        {toast && (
          <div style={{
            position: "fixed",
            bottom: "40px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#333",
            color: "#fff",
            padding: "16px 32px",
            borderRadius: "24px",
            fontSize: "16px",
            zIndex: 9999,
            boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
            minWidth: "280px",
            maxWidth: "90vw",
            textAlign: "center",
            wordBreak: "keep-all",
            whiteSpace: "normal"
          }}>
            {toast}
          </div>
        )}
        {showNicknameModal && (
          <div style={{
            position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
          }}>
            <div style={{ background: "#fff", borderRadius: 12, padding: 32, minWidth: 300, boxShadow: "0 4px 16px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <h2 style={{ marginBottom: 16, color: '#222' }}>닉네임을 입력하세요</h2>
              <input
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                placeholder="닉네임"
                style={{
                  fontSize: 18,
                  padding: "10px 16px",
                  borderRadius: 8,
                  border: "1px solid #ccc",
                  marginBottom: 16,
                  width: "100%",
                  color: '#222',
                  outline: 'none',
                }}
                onFocus={e => {
                  e.target.style.border = '2px solid #994d52';
                  e.target.style.boxShadow = '0 0 0 2px rgba(153,77,82,0.15)';
                }}
                onBlur={e => {
                  e.target.style.border = '1px solid #ccc';
                  e.target.style.boxShadow = 'none';
                }}
                onKeyDown={e => { if (e.key === "Enter" && !isSubmitting) handleNicknameSubmit(); }}
                autoFocus
                disabled={isSubmitting}
              />
              <button
                onClick={handleNicknameSubmit}
                disabled={isSubmitting}
                style={{ background: "#994d52", color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 16, fontWeight: 600, cursor: isSubmitting ? "not-allowed" : "pointer" }}
              >
                {isSubmitting ? "등록 중..." : "확인"}
              </button>
            </div>
          </div>
        )}
        
        {!showNicknameModal && (
          <div style={{ 
            maxWidth: "400px", 
            margin: "0 auto", 
            background: "#fff", 
            borderRadius: "20px", 
            padding: "30px", 
            boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
            textAlign: "center"
          }}>
            {/* 제목 */}
            <h1 style={{ 
              fontSize: "28px", 
              fontWeight: "bold", 
              color: "#333", 
              marginBottom: "30px",
              marginTop: "0"
            }}>
              Invite
            </h1>

            {/* 투표까지 남은 시간 */}
            <div style={{ marginBottom: "30px" }}>
              <div style={{ 
                fontSize: "16px", 
                color: "#666", 
                marginBottom: "10px" 
              }}>
                투표까지 남은시간
              </div>
              <div style={{ 
                fontSize: "20px", 
                fontWeight: "bold", 
                color: timeLeft === "후보 제안 시간 종료" ? "#dc3545" : "#333" 
              }}>
                {timeLeft}
              </div>
              {timeLeft === "후보 제안 시간 종료" && (
                <div style={{ 
                  fontSize: "14px", 
                  color: "#dc3545", 
                  marginTop: "5px" 
                }}>
                  투표 화면으로 이동합니다.
                </div>
              )}
              {/* 진행바 */}
              <div style={{ 
                width: "100%", 
                height: "8px", 
                background: "#f0f0f0", 
                borderRadius: "4px", 
                marginTop: "10px",
                overflow: "hidden"
              }}>
                <div style={{ 
                  width: `${getProgressPercentage()}%`, 
                  height: "100%", 
                  background: timeLeft === "후보 제안 시간 종료" 
                    ? "linear-gradient(90deg, #dc3545, #c82333)" 
                    : "linear-gradient(90deg, #667eea, #764ba2)", 
                  borderRadius: "4px",
                  transition: "width 0.3s ease"
                }}></div>
              </div>
            </div>

            {/* QR코드 섹션 */}
            <div style={{ marginBottom: "30px" }}>
              <h2 style={{ 
                fontSize: "20px", 
                fontWeight: "bold", 
                color: "#333", 
                marginBottom: "20px" 
              }}>
                Room
              </h2>
              <div style={{ 
                display: "flex", 
                justifyContent: "center", 
                marginBottom: "20px" 
              }}>
                <img 
                  src={generateQRCode(`${process.env.NEXT_PUBLIC_FRONTEND_URL}/participate/${groupId}`)}
                  alt="QR Code"
                  style={{ 
                    width: "200px", 
                    height: "200px", 
                    borderRadius: "10px",
                    border: "2px solid #f0f0f0"
                  }}
                />
              </div>
              
              {/* 링크 */}
              <div style={{ 
                background: "#f8f9fa", 
                borderRadius: "10px", 
                padding: "15px", 
                marginBottom: "15px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}>
                <span style={{ 
                  fontSize: "1.6vh", 
                  color: "#666", 
                  wordBreak: "break-all",
                  flex: 1,
                  textAlign: "left"
                }}>
                  {`${process.env.NEXT_PUBLIC_FRONTEND_URL}/participate/${groupId}`}
                </span>
                <div style={{ display: "flex", gap: "10px", marginLeft: "10px" }}>
                  <button 
                    onClick={copyLink}
                    style={{ 
                      background: "none", 
                      border: "none", 
                      cursor: "pointer",
                      padding: "5px"
                    }}
                  >
                    📋
                  </button>
                  <button 
                    onClick={shareLink}
                    style={{ 
                      background: "#FEE500", 
                      border: "none", 
                      cursor: "pointer",
                      padding: "0px 6px",
                      borderRadius: "6px",
                      fontSize: "10px",
                      fontWeight: "bold",
                      color: "#3C1E1E",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      transition: "all 0.2s ease"
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = "#FDD835";
                      e.currentTarget.style.transform = "scale(1.05)";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = "#FEE500";
                      e.currentTarget.style.transform = "scale(1)";
                    }}
                  >
                    KAKAO
                  </button>
                </div>
              </div>

            </div>

            {/* 멤버 리스트 */}
            <div style={{ 
              marginBottom: "30px",
              textAlign: "left"
            }}>
              <h3 style={{ 
                fontSize: "18px", 
                fontWeight: "bold", 
                color: "#333", 
                marginBottom: "15px",
                textAlign: "center"
              }}>
                참여자 목록 ({Object.keys(participants).length}명)
              </h3>
              <div style={{ 
                maxHeight: "150px", 
                overflowY: "auto",
                background: "#f8f9fa",
                borderRadius: "10px",
                padding: "15px"
              }}>
                {Object.values(participants).length > 0 ? (
                  Object.values(participants).map((p: any, idx) => (
                    <div key={idx} style={{ 
                      padding: "8px 0", 
                      borderBottom: idx < Object.values(participants).length - 1 ? "1px solid #e9ecef" : "none",
                      fontSize: "14px",
                      color: "#333"
                    }}>
                      👤 {p.nickname}
                    </div>
                  ))
                ) : (
                  <div style={{ 
                    textAlign: "center", 
                    color: "#999", 
                    fontSize: "14px",
                    padding: "20px 0"
                  }}>
                    아직 참여자가 없습니다
                  </div>
                )}
              </div>
            </div>

            {/* 안내 메시지 */}
            {voteMessage && (
              <div style={{
                background: "#e8f5e8",
                border: "1px solid #4caf50",
                borderRadius: "12px",
                padding: "15px",
                marginBottom: "15px",
                textAlign: "center",
                fontSize: "14px",
                color: "#2e7d32",
                lineHeight: "1.5",
                whiteSpace: "pre-line"
              }}>
                {voteMessage.split('\n').map((line, index) => (
                  <React.Fragment key={index}>
                    {line}
                    {index < voteMessage.split('\n').length - 1 && <br />}
                  </React.Fragment>
                ))}
              </div>
            )}

            {/* 버튼 */}
            <button
              onClick={() => {
                if (shouldGoToVote) {
                  window.location.href = `${process.env.NEXT_PUBLIC_FRONTEND_URL}/tinder?group_id=${groupId}`;
                } else {
                  window.location.href = `${process.env.NEXT_PUBLIC_FRONTEND_URL}/suggest/${groupId}`;
                }
              }}
              style={{ 
                background: shouldGoToVote ? "#28a745" : "#dc3545", 
                color: "#fff", 
                border: "none", 
                borderRadius: "25px", 
                padding: "15px 30px", 
                fontSize: "16px", 
                fontWeight: "bold", 
                cursor: "pointer",
                width: "100%",
                boxShadow: shouldGoToVote ? "0 4px 15px rgba(40, 167, 69, 0.3)" : "0 4px 15px rgba(220, 53, 69, 0.3)",
                transition: "all 0.3s ease"
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = shouldGoToVote ? "#218838" : "#c82333";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = shouldGoToVote ? "#28a745" : "#dc3545";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              {shouldGoToVote ? "투표하러 가기" : "제안하러 가기"}
            </button>
          </div>
        )}
      </div>
    </>
  );
} 