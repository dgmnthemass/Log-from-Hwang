# 원본 보관 기록

- 발견 위치: 사용자 PC의 OneDrive 문서 아래 `웨비나 체험/cooling-cost-preview/`.
- 원본 버전: v0.1.0, Apps in Toss SDK 2.10.1.
- 최초 소스 보관 커밋과 v0.2 개선 커밋을 구분했다. 원래 PC 폴더는 수정하지 않았다.
- 보존: React·CSS 소스, public 리소스, 패키지·잠금·TypeScript·ESLint·Granite 설정, HTML 목업, 당시 요구사항.
- 제외: node_modules, 생성된 dist/.granite/.ait, 실행 로그, QR, 개인용 실행 스크립트·에디터 설정, 대용량 외부 SDK 문서 사본. 콘솔 제출용 자산은 원본 폴더에 보존했다.
- 원본 파일별 SHA-256은 `origin-manifest.json`에 기록한다. 공백·개행 정리나 설정 수정이 있는 개선 소스와 구분한다.
- 원본 요구사항·HTML 목업·보관 정보는 이 `docs/archive/` 폴더에 모았다. 해시 목록의 `path`는 보관 당시 원본 구조를 나타내며, 현재 저장소 경로와 구분한다.

## 기존 배포 패키지

| 항목 | 확인 내용 |
|---|---|
| 파일 | 원본 폴더의 `cooling-cost-preview.ait` |
| 크기 | 4,445,621 bytes |
| 최종 수정일 | 2026-06-30 23:40:07 (로컬 파일 정보) |
| SHA-256 | `b0f1d95ff53d0bef85cb0c555fbbb43b7db9a301cda0b8e5ec93a95286daa0c6` |
| 검사 | AIT format 1, SDK 2.10.1, appName 일치, 12개 항목 읽기 성공 |
| 웹 JS 일치 | 원본 dist·원본 AIT·원본 웹 재빌드의 SHA-256 모두 `31961622be4e6b3e5f5125dcffa5b9bc855c041cdcc7759dd405765d515a0fbf` |

이 파일은 v0.1 패키지이며 **v0.2 배포 파일이 아니다**. 실제 토스앱 실행과 재패키징은 이번 브라우저 MVP 완료 기준에서 제외했다. 토스 출시 전 별도 기기·브리지·빌드 검증이 필요하다.
