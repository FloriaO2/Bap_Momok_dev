"use client";
import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";

export default function ResultsPage({ params }: { params: Promise<{ group_id: string }> }) {
  const resolvedParams = use(params);
  const groupId = resolvedParams.group_id;
  
  const router = useRouter();
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [windowWidth, setWindowWidth] = useState(0);

  useEffect(() => {
    // 즉시 현재 화면 너비 설정
    setWindowWidth(window.innerWidth);
    console.log('Initial window width:', window.innerWidth);
    
    const handleResize = () => {
      const newWidth = window.innerWidth;
      setWindowWidth(newWidth);
      console.log('Window resized to:', newWidth);
    };
    
    window.addEventListener('resize', handleResize);
    
    const fetchResults = async () => {
      try {
        // URL 정규화 함수 - 끝에 슬래시 제거
        const normalizeUrl = (url: string) => {
          return url.endsWith('/') ? url.slice(0, -1) : url;
        };
        const backendUrl = normalizeUrl(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000');
        const response = await fetch(`${backendUrl}/groups/${groupId}/results`);
        const data = await response.json();
        setResults(data);
      } catch (error) {
        console.error("결과 가져오기 실패:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
    
    return () => window.removeEventListener('resize', handleResize);
  }, [groupId]);

  // 화면 크기에 따른 점수 표시 크기 계산
  const getScoreFontSize = () => {
    console.log('getScoreFontSize called, windowWidth:', windowWidth);
    if (windowWidth === 0) {
      console.log('Window width is 0, returning 1.68vh');
      return "1.68vh";
    }
    const fontSize = windowWidth <= 450 ? "1.44vh" : "1.68vh";
    console.log(`Window width: ${windowWidth}px, Font size: ${fontSize}`);
    return fontSize;
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: "100vh", 
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <div style={{ color: "#fff", fontSize: "2.16vh" }}>결과를 불러오는 중...</div>
      </div>
    );
  }

  if (!results) {
    return (
      <div style={{ 
        minHeight: "100vh", 
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <div style={{ color: "#fff", fontSize: "2.16vh" }}>결과를 찾을 수 없습니다.</div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: "100vh", 
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      padding: "2.4vh",
      fontFamily: "Arial, sans-serif"
    }}>
      <div style={{ 
        maxWidth: "72vh", 
        margin: "0 auto", 
        background: "#fff", 
                borderRadius: "2.4vh",
        padding: "3.6vh",
        boxShadow: "0 1.2vh 3.6vh rgba(0,0,0,0.2)"
      }}>
        {/* 제목 */}
        <h1 style={{ 
          fontSize: "3.2vh",
          fontWeight: "bold", 
          color: "#333", 
          marginBottom: "3.6vh",
          textAlign: "center"
        }}>
          🏆 투표 결과 🏆
        </h1>

        {/* Top3 섹션 */}
        {results.top3 && results.top3.length > 0 && (
          <div style={{ marginBottom: "4.8vh" }}>
            <h2 style={{ 
              fontSize: "2.88vh", 
              fontWeight: "bold", 
              color: "#333", 
              marginBottom: "2.4vh",
              textAlign: "center"
            }}>
              🥇 Top 3
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.8vh" }}>
              {results.top3.map((candidate: any, index: number) => (
                <div key={candidate.id} style={{ 
                  background: index === 0 ? "linear-gradient(135deg, #ffd700, #ffed4e)" : 
                           index === 1 ? "linear-gradient(135deg, #c0c0c0, #e8e8e8)" :
                           "linear-gradient(135deg, #cd7f32, #daa520)",
                  borderRadius: "1.8vh",
                  padding: "2.4vh",
                  display: "flex",
                  alignItems: "center",
                  gap: "1.8vh",
                  boxShadow: "0 0.48vh 1.8vh rgba(0,0,0,0.1)"
                }}>
                  <div style={{ 
                    fontSize: "2.88vh", 
                    fontWeight: "bold",
                    color: "#333",
                    minWidth: "4.8vh"
                  }}>
                    {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                                          fontSize: "2.16vh", 
                    fontWeight: "bold", 
                    color: "#333",
                    marginBottom: "0.6vh"
                    }}>
                      {candidate.name}
                    </div>
                    <div style={{ 
                                          fontSize: "1.2vh", 
                    color: "#666",
                    display: "flex",
                    gap: "1.8vh"
                    }}>
                                              <span style={{ fontSize: "1.2vh" }}>👍 {candidate.good}</span>
                        <span style={{ fontSize: "1.2vh" }}>👌 {candidate.soso}</span>
                    </div>
                  </div>
                  <div style={{ 
                    fontSize: "2.4vh", 
                    fontWeight: "bold", 
                    color: "#333"
                  }}>
                    {candidate.rank}위
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 전체 결과 */}
        <div>
          <h2 style={{ 
            fontSize: "2.88vh", 
            fontWeight: "bold", 
            color: "#333", 
            marginBottom: "2.4vh",
            textAlign: "center"
          }}>
            📊 전체 순위
          </h2>
          <div style={{ 
            maxHeight: "48vh", 
            overflowY: "auto",
            background: "#f8f9fa",
            borderRadius: "1.8vh",
            padding: "2.4vh",
            textAlign: "center"
          }}>
            {results.all_results && results.all_results.length > 0 ? (
              results.all_results.map((candidate: any, index: number) => (
                <div key={candidate.id} style={{ 
                  display: "flex",
                  alignItems: "center",
                  padding: "1.44vh 0",
                  borderBottom: index < results.all_results.length - 1 ? "0.12vh solid #e9ecef" : "none",
                  gap: "1.8vh"
                }}>
                  <div style={{ 
                    fontSize: "2.16vh", 
                    fontWeight: "bold", 
                    color: "#333",
                    minWidth: "6vh"
                  }}>
                    {candidate.rank}위
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      fontSize: "1.92vh", 
                      fontWeight: "bold", 
                      color: "#333",
                      marginBottom: "0.36vh"
                    }}>
                      {candidate.name}
                    </div>
                    <div style={{ 
                      fontSize: "1.44vh", 
                      color: "#666",
                      display: "flex",
                      gap: "1.2vh"
                    }}>
                      {/* 투표 개수 숨김 */}
                    </div>
                  </div>
                  {/* NEVER 태그 제거 */}
                </div>
              ))
            ) : (
              <div style={{ color: "#dc3545", fontSize: "2.16vh", fontWeight: "bold", padding: "4.8vh 0" }}>
                후보가 없습니다.
              </div>
            )}
          </div>
        </div>

        {/* 버튼 그룹 */}
        <div style={{ marginTop: "3.6vh", textAlign: "center", display: "flex", gap: "1.8vh", justifyContent: "center" }}>
          <button
            onClick={() => router.back()}
            style={{ 
              background: "#6c757d", 
              color: "#fff", 
              border: "none", 
              borderRadius: "3vh", 
              padding: "1.44vh 2.88vh", 
              fontSize: "1.92vh", 
              fontWeight: "bold", 
              cursor: "pointer",
              transition: "all 0.3s ease"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "#5a6268";
              e.currentTarget.style.transform = "translateY(-0.24vh)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "#6c757d";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            뒤로가기
          </button>
          <button
            onClick={() => router.push('/?action=create')}
            style={{ 
              background: "#dc3545", 
              color: "#fff", 
              border: "none", 
              borderRadius: "3vh", 
              padding: "1.44vh 2.88vh", 
              fontSize: "1.92vh", 
              fontWeight: "bold", 
              cursor: "pointer",
              transition: "all 0.3s ease"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "#c82333";
              e.currentTarget.style.transform = "translateY(-0.24vh)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "#dc3545";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            새 투표 시작
          </button>
        </div>
      </div>
    </div>
  );
} 