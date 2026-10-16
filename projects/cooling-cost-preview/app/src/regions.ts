export interface WeatherValues {
  text: string;
  temp: number;
  humidity: number;
}
interface Region {
  name: string;
  lat: number;
  lon: number;
  fallback: WeatherValues;
}
export const regions = {
  seoul: {
    name: "서울",
    lat: 37.5665,
    lon: 126.978,
    fallback: { text: "맑음", temp: 31, humidity: 68 },
  },
  gyeonggi: {
    name: "경기",
    lat: 37.2636,
    lon: 127.0286,
    fallback: { text: "구름 조금", temp: 31, humidity: 66 },
  },
  incheon: {
    name: "인천",
    lat: 37.4563,
    lon: 126.7052,
    fallback: { text: "구름 조금", temp: 29, humidity: 72 },
  },
  busan: {
    name: "부산",
    lat: 35.1796,
    lon: 129.0756,
    fallback: { text: "흐림", temp: 29, humidity: 73 },
  },
  daegu: {
    name: "대구",
    lat: 35.8714,
    lon: 128.6014,
    fallback: { text: "폭염", temp: 34, humidity: 58 },
  },
  daejeon: {
    name: "대전",
    lat: 36.3504,
    lon: 127.3845,
    fallback: { text: "맑음", temp: 32, humidity: 63 },
  },
  gwangju: {
    name: "광주",
    lat: 35.1595,
    lon: 126.8526,
    fallback: { text: "구름 많음", temp: 30, humidity: 70 },
  },
  ulsan: {
    name: "울산",
    lat: 35.5384,
    lon: 129.3114,
    fallback: { text: "흐림", temp: 30, humidity: 71 },
  },
  sejong: {
    name: "세종",
    lat: 36.48,
    lon: 127.289,
    fallback: { text: "맑음", temp: 31, humidity: 64 },
  },
  gangwon: {
    name: "강원",
    lat: 37.8813,
    lon: 127.7298,
    fallback: { text: "구름 조금", temp: 29, humidity: 67 },
  },
  chungbuk: {
    name: "충북",
    lat: 36.6424,
    lon: 127.489,
    fallback: { text: "맑음", temp: 32, humidity: 62 },
  },
  chungnam: {
    name: "충남",
    lat: 36.8151,
    lon: 127.1139,
    fallback: { text: "구름 많음", temp: 31, humidity: 68 },
  },
  jeonbuk: {
    name: "전북",
    lat: 35.8242,
    lon: 127.148,
    fallback: { text: "구름 많음", temp: 31, humidity: 69 },
  },
  jeonnam: {
    name: "전남",
    lat: 34.8118,
    lon: 126.3922,
    fallback: { text: "비", temp: 29, humidity: 78 },
  },
  gyeongbuk: {
    name: "경북",
    lat: 36.019,
    lon: 129.3435,
    fallback: { text: "맑음", temp: 33, humidity: 61 },
  },
  gyeongnam: {
    name: "경남",
    lat: 35.2281,
    lon: 128.6811,
    fallback: { text: "흐림", temp: 30, humidity: 72 },
  },
  jeju: {
    name: "제주",
    lat: 33.4996,
    lon: 126.5312,
    fallback: { text: "비", temp: 28, humidity: 82 },
  },
} satisfies Record<string, Region>;
export type RegionKey = keyof typeof regions;
