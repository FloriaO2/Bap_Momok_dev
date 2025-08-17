"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface BestCoupleResponse {
  best_couple: string[];
  best_couple_ids: string[];
  max_inner_product: number | null;
}

interface GroupData {
  candidates: Record<string, { name: string }>;
  votes: Record<string, Record<string, string>>;
}

// URL 정규화 함수 - 끝에 슬래시 제거
const normalizeUrl = (url: string) => {
  return url.endsWith('/') ? url.slice(0, -1) : url;
};

const BACKEND_URL = normalizeUrl(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000');

export default function BestCouplePage() {
  const params = useParams();
  const groupId = params.group_id as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bestCouple, setBestCouple] = useState<BestCoupleResponse | null>(null);
  const [groupData, setGroupData] = useState<GroupData | null>(null);
  const [clickCount, setClickCount] = useState<number>(0);
  const [lastClickTime, setLastClickTime] = useState<number>(0);

  useEffect(() => {
    if (!groupId) return;
    setLoading(true);
    setError(null);
    
    // best_couple API 호출
    fetch(`${BACKEND_URL}/groups/${groupId}/best_couple`)
      .then(async res => {
        if (!res.ok) {
          const errorText = await res.text();
          //throw new Error(`best_couple API 호출 실패: ${res.status} - ${errorText}`);
          throw new Error(`정보가 충분하지 않습니다.`);
        }
        return res.json();
      })
      .then(data => {
        console.log('best_couple 데이터 성공:', data);
        setBestCouple(data);
      })
      .catch(e => {
        console.log('best_couple API 에러 발생:', e.message);
        setError(e.message);
        setLoading(false);
      });
    
    // 그룹 데이터 API 호출
    fetch(`${BACKEND_URL}/groups/${groupId}`)
      .then(res => {
        if (!res.ok) throw new Error("그룹 데이터 조회 실패");
        return res.json();
      })
      .then(data => {
        console.log('그룹 데이터 성공:', data);
        setGroupData(data);
        setLoading(false);
      })
      .catch(e => {
        console.log('그룹 데이터 에러 발생:', e.message);
        setError(e.message);
        setLoading(false);
      });
  }, [groupId]);

  // 에러 발생 시 3초 후 홈으로 이동
  useEffect(() => {
    console.log('에러 상태 변경:', error);
    if (error) {
      console.log('에러 발생! 5초 후 홈으로 이동합니다.');
      const timer = setTimeout(() => {
        console.log('타이머 실행! 홈으로 이동합니다.');
        window.location.href = '/';
      }, 5000);
      return () => {
        console.log('타이머 정리');
        clearTimeout(timer);
      };
    }
  }, [error]);

  // 빈 결과일 때도 3초 후 홈으로 이동
  useEffect(() => {
    if (bestCouple && (!bestCouple.best_couple || bestCouple.best_couple.length === 0)) {
      console.log('빈 결과! 5초 후 홈으로 이동합니다.');
      const timer = setTimeout(() => {
        console.log('빈 결과 타이머 실행! 홈으로 이동합니다.');
        window.location.href = '/';
      }, 5000);
      return () => {
        console.log('빈 결과 타이머 정리');
        clearTimeout(timer);
      };
    }
  }, [bestCouple]);

  // 5회 클릭 시 홈으로 이동하는 핸들러 (이스터에그)
  const handleSecretClick = () => {
    const now = Date.now();
    
    // 1초 내에 클릭해야 연속으로 인정 (시간 제한 단축)
    if (now - lastClickTime > 1000) {
      setClickCount(1);
    } else {
      setClickCount(prev => prev + 1);
    }
    
    setLastClickTime(now);
    
    // 5회 클릭 시 홈으로 이동
    if (clickCount + 1 >= 5) {
      window.location.href = '/';
    }
  };

  if (loading) return (
    <div 
      onClick={handleSecretClick}
      onTouchStart={handleSecretClick}
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #fbeaec 0%, #f3e9e7 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer"
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{background: "#fff", borderRadius: 20, padding: 40, textAlign: "center", boxShadow: "0 10px 30px rgba(0,0,0,0.2)", color:'#222'}}
      >
        로딩 중...
      </div>
    </div>
  );
  if (error) return (
    <div 
      onClick={handleSecretClick}
      onTouchStart={handleSecretClick}
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #fbeaec 0%, #f3e9e7 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer"
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{background: "#fff", borderRadius: 20, padding: 40, textAlign: "center", boxShadow: "0 10px 30px rgba(0,0,0,0.2)", color:'#994d52'}}
      >
        <div style={{marginBottom: 20, whiteSpace: "pre-line"}}>{error}</div>
        <div style={{fontSize: 14, color: '#666'}}>3초 후 홈으로 이동합니다...</div>
      </div>
    </div>
  );
  console.log('렌더링 상태:', { bestCouple, groupData, loading, error });
  
  if (!bestCouple || !groupData) return (
    <div 
      onClick={handleSecretClick}
      onTouchStart={handleSecretClick}
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #fbeaec 0%, #f3e9e7 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer"
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{background: "#fff", borderRadius: 20, padding: 40, textAlign: "center", boxShadow: "0 10px 30px rgba(0,0,0,0.2)", color:'#222'}}
      >
        데이터가 없습니다.
      </div>
    </div>
  );
  if (!bestCouple.best_couple || bestCouple.best_couple.length < 2) return (
    <div 
      onClick={handleSecretClick}
      onTouchStart={handleSecretClick}
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #fbeaec 0%, #f3e9e7 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer"
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{background: "#fff", borderRadius: 20, padding: 40, textAlign: "center", boxShadow: "0 10px 30px rgba(0,0,0,0.2)", color:'#222'}}
      >
        <div style={{marginBottom: 15}}>
          {!bestCouple.best_couple || bestCouple.best_couple.length === 0 
            ? "참여자가 2명 이상이거나 결과가 반영된 후보가 2개 이상이어야 Best Couple을 찾을 수 있습니다." 
            : "정보가 충분하지 않습니다."}
        </div>
        <div style={{fontSize: 14, color: '#666'}}>
          5초 후 홈으로 이동합니다...
        </div>
      </div>
    </div>
  );

  const [name1, name2] = bestCouple.best_couple;
  const [id1, id2] = bestCouple.best_couple_ids;
  const candidates = groupData.candidates || {};
  const votes = groupData.votes || {};
  const vote1 = votes[id1] || {};
  const vote2 = votes[id2] || {};
  const voteLabel = { good: "좋아요", soso: "쏘쏘", bad: "싫어요", never: "절대안돼" };
  const voteColor = { good: "#994d52", soso: "#bdb76b", bad: "#e57373", never: "#616161" };

  return (
    <div 
      onClick={handleSecretClick}
      onTouchStart={handleSecretClick}
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #fbeaec 0%, #f3e9e7 100%)",
        padding: "20px",
        fontFamily: "Arial, sans-serif",
        cursor: "pointer"
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 600,
          margin: "40px auto",
          background: "#fff",
          borderRadius: 20,
          boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
          padding: 40,
          border: "none"
        }}
      >
        <h2 style={{textAlign:'center', marginBottom:24, color:'#222', fontWeight:700, fontSize:28, letterSpacing:-1}}>Best Couple</h2>
        <div style={{display:'flex', justifyContent:'center', alignItems:'center', marginBottom:24}}>
          <div style={{fontWeight:'bold', fontSize:20, color:'#222'}}>{name1}</div>
          <div style={{fontSize:28, color:'#994d52', margin:'0 8px'}} aria-label="하트" title="하트">❤️</div>
          <div style={{fontWeight:'bold', fontSize:20, color:'#222'}}>{name2}</div>
        </div>
        <div style={{display:'flex', justifyContent:'center', alignItems:'center', marginBottom:24}}>
          <div style={{fontSize:16, color:'#222', background:'#fbeaec', borderRadius:8, padding:'6px 18px', fontWeight:600}}>
            유사도 점수: <span style={{color:'#994d52'}}>{bestCouple.max_inner_product}</span>
          </div>
        </div>
        <table style={{width:'100%', borderCollapse:'collapse', background:'#faf9f6', borderRadius:12, overflow:'hidden', color:'#222'}}>
          <thead>
            <tr style={{background:'#f3e9e7', color:'#222'}}>
              <th style={{padding:10, borderBottom:'1px solid #eee', fontWeight:700}}>후보</th>
              <th style={{padding:10, borderBottom:'1px solid #eee', fontWeight:700}}>{name1}의 선택</th>
              <th style={{padding:10, borderBottom:'1px solid #eee', fontWeight:700}}>{name2}의 선택</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(candidates).map(([cid, c]) => {
              const v1 = vote1[cid];
              const v2 = vote2[cid];
              let highlight = undefined;
              if (v1 && v1 === v2) {
                if (v1 === "good") highlight = { background: "#ffe4ec" };
                else if (v1 === "bad") highlight = { background: "#f3e9e7" };
                else if (v1 === "soso") highlight = { background: "#fff9e3" };
                else if (v1 === "never") highlight = { background: "#e0e0e0" };
              }
              return (
                <tr key={cid} style={{color:'#222', ...highlight}}>
                  <td style={{padding:10, borderBottom:'1px solid #eee'}}>{c.name}</td>
                  <td style={{padding:10, borderBottom:'1px solid #eee', color:voteColor[v1 as keyof typeof voteColor] || '#222', fontWeight:500}}>
                    {voteLabel[v1 as keyof typeof voteLabel] || '-'}
                  </td>
                  <td style={{padding:10, borderBottom:'1px solid #eee', color:voteColor[v2 as keyof typeof voteColor] || '#222', fontWeight:500}}>
                    {voteLabel[v2 as keyof typeof voteLabel] || '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{marginTop:32, textAlign:'center', color:'#333', fontSize:15}}>
          두 참가자가 각 후보에 대해 얼마나 비슷한 선택을 했는지 내적 점수로 보여줍니다.<br/>
          점수가 높을수록 취향이 비슷합니다.
        </div>
      </div>
    </div>
  );
} 