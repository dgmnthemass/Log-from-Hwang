# 냉방비 미리보기 v0.2.0

사용시간에 따른 참고용 냉방비를 비교하고, 직접 기록과 자동 추정을 구분해 월별로 보관하는 브라우저 MVP입니다. 같은 브라우저에서 다시 열어도 설정·입력·기록을 복원합니다.

**[웹에서 바로 체험하기](https://dgmnthemass.github.io/Log-from-Hwang/cooling-cost-preview/)**

GitHub Pages의 `gh-pages` 브랜치에서 정적 웹 빌드를 제공합니다. 앱은 `cooling-cost-preview/` 경로에 배치하며, Vite의 상대 경로 설정으로 HTML과 자산을 불러옵니다. 배포 시 `pnpm build:web`로 만든 `dist/web/` 내용을 해당 경로에 반영합니다. 배포본의 `deployment.json`에서 소스 커밋을 확인할 수 있습니다.

## 실행

Node **24.19.0**(24 계열), pnpm **11.7.0**을 사용합니다.

```sh
npm install --global pnpm@11.7.0
cd miniapps/cooling-cost-preview
pnpm install --frozen-lockfile
pnpm dev:web
```

브라우저에서 `http://127.0.0.1:5173`을 엽니다. 같은 주소·포트를 계속 사용해야 기존 브라우저 기록이 유지됩니다. 별도 API 키나 서버는 필요하지 않습니다.

```sh
pnpm check             # 타입 검사, lint, 단위 테스트, 웹 빌드
pnpm preview:web       # dist/web 프로덕션 빌드 확인
pnpm exec playwright install chromium
pnpm test:browser      # 로컬 프로덕션 서버를 열어 브라우저 흐름 자동 검사
```

브라우저 검사는 가짜 시계와 제어된 날씨 응답으로 오류·날짜 경계를 재현하며, 결과와 화면은 `test-results/`에 생성합니다. Linux에서 브라우저 시스템 라이브러리가 필요하면 `pnpm exec playwright install --with-deps chromium`을 사용하세요. 설치된 Edge로 검사할 때는 `PLAYWRIGHT_CHANNEL=msedge` 환경변수를 사용할 수 있습니다.

## 주요 기능

- 오늘 기록 저장·수정·취소, 0시간 기록 지원.
- 한국 시간 자정·월말 전환, 미기록 날짜의 평균 사용량 추정.
- 날짜별 설정·날씨·금액 스냅샷, 설정 변경 시 과거 금액 보존.
- 월별 직접 입력/자동 추정 목록과 합계, 오늘 미저장 예상액 구분.
- 날씨 실패 시 같은 지역의 최근 성공값 또는 예시값으로 대체하고 출처 표시.
- 저장 실패·손상·다른 탭 변경 안내, 원문 내보내기 및 백업 후 초기화.

저장소는 기기·브라우저·주소에 종속됩니다. 브라우저 데이터를 지우면 기록도 사라집니다. 로그인·동기화·실제 청구요금 계산은 제공하지 않습니다.

## 토스 실행 모드

`pnpm dev:toss`, `pnpm build:toss`는 기존 SDK 경로를 유지합니다. Granite는 `--mode toss`로 웹 명령을 실행하고, 이 모드에서만 TDSMobileAITProvider를 불러옵니다. 기기 연결용 개발 호스트가 필요하면 `TOSS_DEV_HOST`를 해당 PC 주소로 지정하세요. 개인 IP는 소스에 고정하지 않습니다.

이 버전의 검증 대상은 브라우저입니다. SDK 2.10.1의 React Native·navigation 전이 의존성에 peer 경고가 남아 있으며, 실제 토스앱과 신규 `.ait` 패키징은 검증하지 않았습니다. 이를 출시 준비 완료로 해석하면 안 됩니다.

## 문서

- [프로젝트 기록](../../Cooling-Cost-Preview.md)
- [v0.2 요구사항·계산·저장 설계](docs/design-v0.2.md)
- [검증 결과](docs/verification.md)
- [원본 보관 정보](docs/origin.md)
- [원본 요구사항](docs/requirements-v0.1.md)
- [원본 HTML 목업](aircon-safe-budget-monthly-mockup.html)

날씨: [Open-Meteo](https://open-meteo.com/) / [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). 전기요금 산식의 상수는 원본 프로토타입의 가정이며 공인 요율이나 실측 성능을 뜻하지 않습니다.
