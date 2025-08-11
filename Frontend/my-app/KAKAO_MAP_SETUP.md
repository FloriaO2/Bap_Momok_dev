# 카카오맵 API 설정 가이드

## 문제 해결

카카오맵 스크립트 로드 오류가 발생하는 경우 다음 단계를 따라 설정해주세요.

## 1. 카카오 개발자 계정 설정

1. [카카오 개발자 콘솔](https://developers.kakao.com)에 로그인
2. 애플리케이션 생성 또는 기존 애플리케이션 선택
3. **JavaScript 키** 복사 (앱 키가 아님)

## 2. 환경 변수 설정

프로젝트 루트 디렉토리에 `.env.local` 파일을 생성하고 다음 내용을 추가:

```env
NEXT_PUBLIC_KAKAO_MAP_API_KEY=your_javascript_key_here
```

**주의**: `NEXT_PUBLIC_` 접두사가 반드시 필요합니다.

## 3. 도메인 등록

카카오 개발자 콘솔에서 다음 도메인들을 등록:

### 개발 환경
- `http://localhost:3000`
- `http://127.0.0.1:3000`

### 프로덕션 환경
- `https://bap-momok-dev.vercel.app`
- `https://www.bap-momok-dev.vercel.app`
- `https://your-domain.com` (기타 도메인)
- `https://www.your-domain.com` (기타 도메인)

**중요**: 도메인 등록 후 몇 분 정도 기다려야 변경사항이 적용됩니다.

## 4. 플랫폼 설정

카카오 개발자 콘솔에서:
1. **플랫폼** → **Web** 선택
2. **사이트 도메인**에 위의 도메인들 추가
3. **JavaScript 키** 확인

## 5. 앱 키 확인

- **JavaScript 키**를 사용해야 합니다 (앱 키가 아님)
- 키는 보통 `[앱키]` 형태로 표시됩니다

## 6. 재시작

환경 변수를 설정한 후 개발 서버를 재시작:

```bash
npm run dev
# 또는
yarn dev
```

## 7. 디버깅

브라우저 개발자 도구 콘솔에서 다음 메시지들을 확인:

- `KakaoMap - API Key exists: true`
- `KakaoMap - Script loaded successfully`
- `KakaoMap - Maps loaded successfully`

## 8. 일반적인 오류

### "API key is not valid"
- JavaScript 키가 올바른지 확인
- 도메인이 등록되었는지 확인

### "Domain not registered"
- 카카오 개발자 콘솔에서 도메인 등록 확인
- `localhost`와 `127.0.0.1` 모두 등록

### "Script load error" / "403 Forbidden"
- **가장 일반적인 원인**: 도메인이 카카오 개발자 콘솔에 등록되지 않음
- 카카오 개발자 콘솔에서 사이트 도메인 확인
- 도메인 등록 후 몇 분 기다린 후 다시 시도
- JavaScript 키가 올바른지 확인 (REST API 키가 아님)
- 네트워크 연결 확인
- 브라우저 콘솔에서 구체적인 오류 메시지 확인

## 9. 추가 도움

문제가 지속되면:
1. 브라우저 개발자 도구의 Network 탭에서 스크립트 로드 상태 확인
2. 카카오 개발자 콘솔의 앱 설정 재확인
3. 다른 브라우저에서 테스트 