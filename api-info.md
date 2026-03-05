# 한국산업인력공단 국가기술자격 종목별 시험정보 API 가이드

## 기본 정보

| 항목 | 내용 |
|------|------|
| 데이터명 | 한국산업인력공단_국가기술자격 종목별 시험정보 상세설명 |
| 서비스유형 | REST |
| 데이터포맷 | XML |
| 유효기간 | 2026-03-05 ~ 2028-03-05 |
| 일일 트래픽 한도 | 각 엔드포인트 1,000회 |

## 인증키

```
# Encoding (URL 파라미터에 사용)
Ni8NA6JQYRglvzf8xZsvJGu3lSse17t5roa%2B5FQCiD0gWCh4wPz8kGMfwOXJHyo%2Bzsp0x7YrErhalvLWX09lSg%3D%3D

# Decoding (일반 참조용)
Ni8NA6JQYRglvzf8xZsvJGu3lSse17t5roa+5FQCiD0gWCh4wPz8kGMfwOXJHyo+zsp0x7YrErhalvLWX09lSg==
```

## Base URL

```
http://openapi.q-net.or.kr/api/service/rest/InquiryTestInformationNTQSVC
```

> ⚠️ **주의**: HTTPS가 아닌 HTTP를 사용해야 합니다. HTTPS는 타임아웃 발생.

---

## API 엔드포인트 목록

### 1. 기술사(PE) 시험 시행일정 조회
- **기능명**: `getPEList`
- **설명**: 기술사 등급 시험 시행일정을 조회합니다.
- **URL**: `http://openapi.q-net.or.kr/api/service/rest/InquiryTestInformationNTQSVC/getPEList`

**요청 파라미터**:
| 파라미터명 | 필수 | 설명 |
|-----------|------|------|
| serviceKey | Y | 인증키 (Encoding) |

**응답 필드**:
| 필드명 | 설명 | 예시 |
|--------|------|------|
| description | 시험 회차 설명 | 기술사(2026년도 제138회) |
| docexamdt | 필기시험일 | 20260207 |
| docpassdt | 필기합격발표일 | 20260325 |
| docregstartdt | 필기원서접수 시작일 | 20260106 |
| docregenddt | 필기원서접수 마감일 | 20260109 |
| docsubmitstartdt | 필기합격자서류제출 시작일 | 20260209 |
| docsubmitentdt | 필기합격자서류제출 마감일 | 20260403 |
| pracexamstartdt | 실기시험 시작일 | 20260502 |
| pracexamenddt | 실기시험 마감일 | 20260516 |
| pracpassdt | 최종합격발표일 | 20260529 |
| pracregstartdt | 실기원서접수 시작일 | 20260330 |
| pracregenddt | 실기원서접수 마감일 | 20260402 |

---

### 2. 기능장(MC) 시험 시행일정 조회
- **기능명**: `getMCList`
- **설명**: 기능장 등급 시험 시행일정을 조회합니다.
- **URL**: `http://openapi.q-net.or.kr/api/service/rest/InquiryTestInformationNTQSVC/getMCList`

**요청/응답 구조**: getPEList와 동일

---

### 3. 기사/산업기사(E) 시험 시행일정 조회
- **기능명**: `getEList`
- **설명**: 기사 및 산업기사 등급 시험 시행일정을 조회합니다.
- **URL**: `http://openapi.q-net.or.kr/api/service/rest/InquiryTestInformationNTQSVC/getEList`

**요청/응답 구조**: getPEList와 동일

---

### 4. 기능사(C) 시험 시행일정 조회
- **기능명**: `getCList`
- **설명**: 기능사 등급 시험 시행일정을 조회합니다.
- **URL**: `http://openapi.q-net.or.kr/api/service/rest/InquiryTestInformationNTQSVC/getCList`

**요청/응답 구조**: getPEList와 동일

---

### 5. 종목별 응시수수료 조회
- **기능명**: `getFeeList`
- **설명**: 국가기술자격 종목별 응시 수수료를 조회합니다.
- **URL**: `http://openapi.q-net.or.kr/api/service/rest/InquiryTestInformationNTQSVC/getFeeList`

**요청 파라미터**:
| 파라미터명 | 필수 | 설명 |
|-----------|------|------|
| serviceKey | Y | 인증키 (Encoding) |

**응답 필드** (예상):
| 필드명 | 설명 |
|--------|------|
| jmNm | 종목명 |
| grdNm | 등급명 |
| docFee | 필기시험 수수료 |
| pracFee | 실기시험 수수료 |

---

### 6. 종목별 시행일정 목록 조회
- **기능명**: `getJMList`
- **설명**: 현재연도의 국가기술자격 종목별 시험 시행일정을 조회합니다.
- **URL**: `http://openapi.q-net.or.kr/api/service/rest/InquiryTestInformationNTQSVC/getJMList`

**요청 파라미터**:
| 파라미터명 | 필수 | 설명 |
|-----------|------|------|
| serviceKey | Y | 인증키 (Encoding) |
| jmNm | N | 종목명 (검색 필터) |

> ⚠️ **참고**: 종목별 일정이 등급별 일정과 상이할 수 있으므로, 종목에 따른 시험일정은 이 API를 이용해야 합니다.

---

## 공통 응답 구조

```xml
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<response>
  <header>
    <resultCode>00</resultCode>      <!-- 00: 정상, 기타: 오류 -->
    <resultMsg>NORMAL SERVICE.</resultMsg>
  </header>
  <body>
    <items>
      <item>
        <!-- 각 API별 필드 -->
      </item>
    </items>
  </body>
</response>
```

### 결과코드 목록

| resultCode | 설명 |
|------------|------|
| 00 | 정상 |
| 01 | 어플리케이션 오류 |
| 10 | 잘못된 요청 파라미터 오류 |
| 20 | 서비스 접근 거부 |
| 30 | 등록되지 않은 서비스 키 |
| 31 | 기간만료된 서비스 키 |
| 32 | 등록되지 않은 IP |
| 99 | 서비스 오류 |

---

## 호출 예시

```javascript
// JavaScript Fetch 예시
const API_KEY = 'Ni8NA6JQYRglvzf8xZsvJGu3lSse17t5roa%2B5FQCiD0gWCh4wPz8kGMfwOXJHyo%2Bzsp0x7YrErhalvLWX09lSg%3D%3D';
const BASE_URL = 'http://openapi.q-net.or.kr/api/service/rest/InquiryTestInformationNTQSVC';

// 기사/산업기사 시험 일정 조회
async function getEngineerSchedule() {
  const url = `${BASE_URL}/getEList?serviceKey=${API_KEY}`;
  const response = await fetch(url);
  const xmlText = await response.text();
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
  return xmlDoc;
}

// 종목별 시험 일정 조회 (자격증명으로 검색)
async function getScheduleByItem(itemName) {
  const url = `${BASE_URL}/getJMList?serviceKey=${API_KEY}&jmNm=${encodeURIComponent(itemName)}`;
  const response = await fetch(url);
  const xmlText = await response.text();
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
  return xmlDoc;
}
```

---

## 날짜 형식

모든 날짜 필드는 `YYYYMMDD` 형식입니다.
- 예: `20260207` → 2026년 02월 07일

---

## 인기 자격증 종목별 API 엔드포인트 매핑

| 자격증명 | 등급 | 해당 API |
|---------|------|---------|
| 기술사 | 기술사 | getPEList |
| 전기기능장 | 기능장 | getMCList |
| 전기기사 | 기사 | getEList |
| 산업안전기사 | 기사 | getEList |
| 정보처리기사 | 기사 | getEList |
| 토목기사 | 기사 | getEList |
| 건축기사 | 기사 | getEList |
| 소방설비기사 | 기사 | getEList |
| 전기산업기사 | 산업기사 | getEList |
| 전기기능사 | 기능사 | getCList |
| 지게차운전기능사 | 기능사 | getCList |
| 한식조리기능사 | 기능사 | getCList |
| 굴착기운전기능사 | 기능사 | getCList |
| 제과기능사 | 기능사 | getCList |

---

## 제약사항 및 주의사항

1. **프로토콜**: HTTP만 사용 (HTTPS 불가)
2. **일일 트래픽**: 각 엔드포인트당 1,000회/일
3. **유효기간**: 2026-03-05 ~ 2028-03-05
4. **CORS 이슈**: 브라우저에서 직접 호출 시 CORS 에러 발생 가능 → 프록시 서버 사용 권장
5. **데이터 업데이트 주기**: 연간 시험 계획 기준으로 업데이트

---

## 웹앱 연동 시 CORS 해결 방법

브라우저에서 직접 `http://openapi.q-net.or.kr` 호출 시 CORS 오류가 발생할 수 있습니다.

### 방법 1: CORS 프록시 서버 활용 (개발용)
```javascript
const PROXY = 'https://corsproxy.io/?';
const apiUrl = `${PROXY}${encodeURIComponent(BASE_URL + '/getEList?serviceKey=' + API_KEY)}`;
```

### 방법 2: 자체 백엔드 서버 구축 (권장)
- Node.js / Express 서버에서 API 호출 후 JSON으로 변환하여 프론트엔드에 전달

### 방법 3: 공공데이터포털 JSONP 지원 확인
- `_type=json` 파라미터로 JSON 응답 요청 시도

---

*최종 업데이트: 2026-03-05*
