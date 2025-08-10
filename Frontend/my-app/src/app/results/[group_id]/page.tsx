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
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'}/groups/${groupId}/results`);
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
      console.log('Window width is 0, returning 14px');
      return "14px";
    }
    const fontSize = windowWidth <= 450 ? "12px" : "14px";
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
        <div style={{ color: "#fff", fontSize: "18px" }}>결과를 불러오는 중...</div>
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
        <div style={{ color: "#fff", fontSize: "18px" }}>결과를 찾을 수 없습니다.</div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: "100vh", 
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      padding: "20px",
      fontFamily: "Arial, sans-serif"
    }}>
      <div style={{ 
        maxWidth: "600px", 
        margin: "0 auto", 
        background: "#fff", 
        borderRadius: "20px", 
        padding: "30px", 
        boxShadow: "0 10px 30px rgba(0,0,0,0.2)"
      }}>
        {/* 제목 */}
        <h1 style={{ 
          fontSize: "32px", 
          fontWeight: "bold", 
          color: "#333", 
          marginBottom: "30px",
          textAlign: "center"
        }}>
          🏆 투표 결과 🏆
        </h1>

        {/* Top3 섹션 */}
        {results.top3 && results.top3.length > 0 && (
          <div style={{ marginBottom: "40px" }}>
            <h2 style={{ 
              fontSize: "24px", 
              fontWeight: "bold", 
              color: "#333", 
              marginBottom: "20px",
              textAlign: "center"
            }}>
              🥇 Top 3
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              {results.top3.map((candidate: any, index: number) => (
                <div key={candidate.id} style={{ 
                  background: index === 0 ? "linear-gradient(135deg, #ffd700, #ffed4e)" : 
                           index === 1 ? "linear-gradient(135deg, #c0c0c0, #e8e8e8)" :
                           "linear-gradient(135deg, #cd7f32, #daa520)",
                  borderRadius: "15px",
                  padding: "20px",
                  display: "flex",
                  alignItems: "center",
                  gap: "15px",
                  boxShadow: "0 4px 15px rgba(0,0,0,0.1)"
                }}>
                  <div style={{ 
                    fontSize: "24px", 
                    fontWeight: "bold",
                    color: "#333",
                    minWidth: "40px"
                  }}>
                    {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      fontSize: "18px", 
                      fontWeight: "bold", 
                      color: "#333",
                      marginBottom: "5px"
                    }}>
                      {candidate.name}
                    </div>
                    <div style={{ 
                      fontSize: "10px", 
                      color: "#666",
                      display: "flex",
                      gap: "15px"
                    }}>
                      <span style={{ fontSize: "10px" }}>👍 {candidate.good}</span>
                      <span style={{ fontSize: "10px" }}>👌 {candidate.soso}</span>
                    </div>
                  </div>
                  <div style={{ 
                    fontSize: "20px", 
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
            fontSize: "24px", 
            fontWeight: "bold", 
            color: "#333", 
            marginBottom: "20px",
            textAlign: "center"
          }}>
            📊 전체 순위
          </h2>
          <div style={{ 
            maxHeight: "400px", 
            overflowY: "auto",
            background: "#f8f9fa",
            borderRadius: "15px",
            padding: "20px",
            textAlign: "center"
          }}>
            {results.all_results && results.all_results.length > 0 ? (
              results.all_results.map((candidate: any, index: number) => (
                <div key={candidate.id} style={{ 
                  display: "flex",
                  alignItems: "center",
                  padding: "12px 0",
                  borderBottom: index < results.all_results.length - 1 ? "1px solid #e9ecef" : "none",
                  gap: "15px"
                }}>
                  <div style={{ 
                    fontSize: "18px", 
                    fontWeight: "bold", 
                    color: "#333",
                    minWidth: "50px"
                  }}>
                    {candidate.rank}위
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      fontSize: "16px", 
                      fontWeight: "bold", 
                      color: "#333",
                      marginBottom: "3px"
                    }}>
                      {candidate.name}
                    </div>
                    <div style={{ 
                      fontSize: "12px", 
                      color: "#666",
                      display: "flex",
                      gap: "10px"
                    }}>
                      {/* 투표 개수 숨김 */}
                    </div>
                  </div>
                  {/* NEVER 태그 제거 */}
                </div>
              ))
            ) : (
              <div style={{ color: "#dc3545", fontSize: "18px", fontWeight: "bold", padding: "40px 0" }}>
                후보가 없습니다.
              </div>
            )}
          </div>
        </div>

        {/* 버튼 그룹 */}
        <div style={{ marginTop: "30px", textAlign: "center", display: "flex", gap: "15px", justifyContent: "center" }}>
          <button
            onClick={() => router.back()}
            style={{ 
              background: "#6c757d", 
              color: "#fff", 
              border: "none", 
              borderRadius: "25px", 
              padding: "12px 24px", 
              fontSize: "16px", 
              fontWeight: "bold", 
              cursor: "pointer",
              transition: "all 0.3s ease"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "#5a6268";
              e.currentTarget.style.transform = "translateY(-2px)";
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
              borderRadius: "25px", 
              padding: "12px 24px", 
              fontSize: "16px", 
              fontWeight: "bold", 
              cursor: "pointer",
              transition: "all 0.3s ease"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "#c82333";
              e.currentTarget.style.transform = "translateY(-2px)";
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