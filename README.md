# Log from Hwang

**만들고, 확인하고, 개선한 프로젝트의 기록.**

Hwang의 프로젝트 포트폴리오입니다. 각 기록에는 해결하려는 문제, 실제 사용 흐름, 설계에서 고민한 지점과 확인한 결과를 담습니다.

## Projects

|  프로젝트  | 한 줄 소개 | 살펴보기 |
| --- |---|---|
| **___에서 살아남기** | 흩어진 교환학생 준비 정보를 학교·체류 조건에 맞는 할 일로 연결하는 웹서비스 | [프로젝트 기록](projects/compass/) · [서비스 체험](https://compass-puce-gamma.vercel.app) |
| **냉방비 미리보기** | 오늘 사용량과 자동 추정을 구분해 월별 냉방비를 살펴보는 브라우저 MVP | [프로젝트 기록](projects/cooling-cost-preview/) · [서비스 체험](https://dgmnthemass.github.io/Log-from-Hwang/cooling-cost-preview/) · [소스·실행 안내](projects/cooling-cost-preview/app/) |

## 읽는 방법

- **서비스를 먼저 보고 싶다면:** 각 프로젝트의 체험 링크를 열어 주요 기능을 사용해 보세요.
- **제작 과정을 보고 싶다면:** 프로젝트 기록에서 문제 정의, 기능, 설계와 검증 내용을 살펴보세요.

새 프로젝트의 기록도 이 목록에 이어서 추가합니다.

## 파일 구성

```text
projects/
├─ compass/
│  ├─ README.md              # 프로젝트 소개·체험 안내
│  └─ assets/                # 화면 이미지
└─ cooling-cost-preview/
   ├─ README.md              # 프로젝트 소개·체험 안내
   ├─ app/                   # 실행 소스·설정·테스트
   ├─ docs/                  # 설계·검증 기록
   │  └─ archive/            # 원본 요구사항·목업·보관 정보
   └─ assets/                # 화면 이미지
```

프로젝트 자료는 `projects/<프로젝트명>/` 안에서 관리합니다. 각 폴더의 `README.md`에서 소개와 체험 링크를 확인하고, 실행 코드가 있는 프로젝트는 `app/README.md`의 안내를 따릅니다. 자동 검사 설정은 저장소 공통 위치인 `.github/workflows/`에 두고 해당 프로젝트의 앱 경로를 검사합니다.

---

[GitHub · dgmnthemass](https://github.com/dgmnthemass)
