# 방어회방어전 버전 기록

| 항목 | 값 |
|---|---|
| 제품 이름 | 방어회방어전 |
| 앱 패키지 | `alekov-client-starter` |
| 앱 패키지 버전 | `0.2.14` |
| 재현 기준 브랜치 | `stage14-submission` |
| 재현 기준 커밋 | `4d13fab52f54c5e9edb4ee8a9bcc99dae52ac93a` |
| 재현 확인일 | `2026-11-05` |
| 릴리스 상태 | 검증 중 |

## 지원 범위

- Windows PowerShell에서 Node.js 22~24로 로컬 서버를 시작한다. 수업 기준은 Node.js 24.19.0이며 이번 재현 환경은 v24.21.0이었다.
- 현재 기준 커밋에서 외부 npm 의존성, `package-lock.json`, `node_modules` 없이 문법 검사와 `-NoNativeHost` 로컬 실행·종료·재실행을 확인했다.
- 제공 화면과 학생 표시 함수는 현재 커밋에 포함된다. 로컬 API는 미연결 상태를 `ENGINE_NOT_CONNECTED`, 패키지 미설정을 `not_configured`로 반환했다.

## 누락·미해결 사항

- 일반 브라우저의 실제 렌더링과 버튼 조작은 확인하지 못했다.
- 루트 `student/extension.mjs`와 실행본 `on-client/student/extension.mjs`의 `renderEvents`, `renderStatus` 구현 상태가 다르다.
- 접근 제어·XDR, 계정 연결, AI 게이트웨이, 실제 OSV 조회, 실제 보안 조치 집행과 효과 관측은 확인하지 않았다.
- 데이터 보존·백업·복원 계획은 문서화했지만 운영 데이터로 실행하지 않았다.
- 22단계 서버 접수와 AI 원문 검토는 실행하지 않았다.

이 상태를 v1.0 또는 운영 인증 완료로 표시하지 않는다. 재현 세부 증거는 [docs/STUDENT_REPRODUCTION.md](docs/STUDENT_REPRODUCTION.md)를 따른다.
