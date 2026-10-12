import type { Field } from './preferences';

// Field는 데이터에 쓰이는 한국어 키다. 화면에는 이 키로 사전의 표시 이름을 찾아 쓴다.
export const FIELD_KEY = {
  '기술·사회': 'fieldTechSociety',
  '사회': 'fieldSociety',
  '경제': 'fieldEconomy',
  '철학': 'fieldPhilosophy',
  '윤리': 'fieldEthics',
  '노동': 'fieldLabor',
  '커리어': 'fieldCareer',
  '라이프스타일': 'fieldLifestyle',
  '교육': 'fieldEducation',
} as const satisfies Record<Field, string>;
