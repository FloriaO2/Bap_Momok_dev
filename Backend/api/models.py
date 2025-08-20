from pydantic import BaseModel, Field, model_validator, RootModel
from typing import Dict, List, Optional, Union
from datetime import datetime
import pytz

def get_kst_now_str():
    kst = pytz.timezone('Asia/Seoul')
    return datetime.now(kst).strftime('%Y-%m-%d %H:%M:%S')

class DetailKakao(BaseModel):
    addr: str
    category: str
    kakao_id: int

class DetailYogiyo(BaseModel):
    category: List[str]
    delivery_time: int
    yogiyo_id: int

class DetailCustom(BaseModel):
    URL: str
    detail: str

class Candidate(BaseModel):
    added_by: str
    name: str
    type: str
    detail: dict
    good: Optional[int] = 0
    bad: Optional[int] = 0
    never: Optional[int] = 0
    soso: Optional[int] = 0
    rank: Optional[int] = None

class Participant(BaseModel):
    nickname: str
    suggest_complete: bool
    voted_count: Optional[int] = 0

class ParticipantJoin(BaseModel):
    nickname: str

class Vote(RootModel[dict[str, str]]):
    pass

class GroupData(BaseModel):
    candidates: Optional[Dict[str, Candidate]] = Field(
        default=None, description="후보 목록. 입력하지 않으면 빈 객체로 자동 처리됩니다.", example={})
    delivery: bool
    delivery_time: Optional[int] = None
    offline: bool
    radius: Optional[int] = None
    participants: Optional[Dict[str, Participant]] = Field(
        default=None, description="참가자 목록. 입력하지 않으면 빈 객체로 자동 처리됩니다.", example={})
    start_votingtime: int = Field(description="투표 시작까지 남은 시간(분)")
    timer_mode: bool = Field(default=False, description="타이머 모드 여부. true면 시간 제한, false면 모든 참가자 완료 시 자동 이동")
    anonymous_mode: bool = Field(default=False, description="익명 모드 여부. true면 투표자 정보 숨김, false면 투표자 정보 공개")
    group_creation_time: Optional[str] = Field(default_factory=get_kst_now_str, description="그룹 생성 시간. 입력하지 않으면 현재 시간으로 자동 처리됩니다.")
    state: str = Field(default="suggestion", description="그룹 상태. 입력하지 않으면 suggestion으로 자동 처리됩니다.")
    votes: Optional[Dict[str, dict]] = Field(
        default=None, description="투표 정보. 입력하지 않으면 빈 객체로 자동 처리됩니다.", example={})
    x: float
    y: float

    def calculate_ranks(self):
        """후보들의 순위를 계산하고 업데이트합니다."""
        if not self.candidates:
            return

        candidate_scores = []
        for candidate_id, candidate in self.candidates.items():
            # 점수 계산: good(+1), soso(0), bad(-2), never(-100)
            score = candidate.good * 1 + candidate.soso * 0 + candidate.bad * (-2) + (candidate.never or 0) * (-100)
            candidate_scores.append({
                'id': candidate_id,
                'candidate': candidate,
                'score': score
            })

        # 점수순 정렬 (높은 점수가 위로)
        candidate_scores.sort(key=lambda x: x['score'], reverse=True)

        # 순위 부여
        current_rank = 1
        for item in candidate_scores:
            item['candidate'].rank = current_rank
            current_rank += 1

    @model_validator(mode="after")
    def fill_defaults(self):
        if self.candidates is None:
            self.candidates = {}
        if self.participants is None:
            self.participants = {}
        if self.votes is None:
            self.votes = {}
        if self.group_creation_time is None:
            from datetime import datetime
            self.group_creation_time = datetime.now().isoformat()
        errors = []
        if self.delivery and self.delivery_time is None:
            errors.append('delivery가 true일 때 delivery_time은 필수입니다.')
        if self.offline and self.radius is None:
            errors.append('offline이 true일 때 radius는 필수입니다.')
        if errors:
            raise ValueError(' / '.join(errors))
        return self

class GroupsData(BaseModel):
    groups: Dict[str, GroupData]

class GroupCreate(BaseModel):
    data: GroupData

class GroupUpdate(BaseModel):
    data: GroupData 