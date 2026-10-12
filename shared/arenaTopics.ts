// AI 아레나 주제. 서버는 topicId로만 주제를 받아, 스파링 페르소나가 임의 주제를 주장하지 않게 한다.

export type ArenaDifficulty = "easy" | "medium" | "hard";

export interface ArenaTopic {
  id: string;
  difficulty: ArenaDifficulty;
  hot?: boolean;
  ko: { title: string; description: string; category: string };
  en: { title: string; description: string; category: string };
}

export const ARENA_TOPICS: ArenaTopic[] = [
  {
    id: "t1", difficulty: "medium", hot: true,
    ko: { title: "AI 시대에 코딩 교육은 여전히 필요한가", description: "LLM이 코드를 작성하는 시대, 인간 개발자의 가치는?", category: "교육" },
    en: { title: "Is coding education still necessary in the age of AI?", description: "When LLMs write code, what is a human developer worth?", category: "Education" },
  },
  {
    id: "t2", difficulty: "easy",
    ko: { title: "주 4일제는 생산성을 높이는가", description: "근무일 단축의 효과와 한계", category: "사회" },
    en: { title: "Does a four-day work week raise productivity?", description: "Effects and limits of a shorter work week", category: "Society" },
  },
  {
    id: "t3", difficulty: "easy", hot: true,
    ko: { title: "재능과 노력 중 무엇이 더 중요한가", description: "성공의 본질에 대한 고전적 논쟁", category: "철학" },
    en: { title: "Which matters more: talent or effort?", description: "A classic debate on what success is made of", category: "Philosophy" },
  },
  {
    id: "t4", difficulty: "hard",
    ko: { title: "베이직 인컴은 실현 가능한 정책인가", description: "재원, 인센티브, 사회적 영향", category: "경제" },
    en: { title: "Is universal basic income a feasible policy?", description: "Funding, incentives and social impact", category: "Economics" },
  },
  {
    id: "t5", difficulty: "medium",
    ko: { title: "소셜 미디어는 민주주의에 도움이 되는가", description: "여론 형성과 알고리즘의 양면성", category: "사회" },
    en: { title: "Is social media good for democracy?", description: "Public opinion and the two faces of algorithms", category: "Society" },
  },
  {
    id: "t6", difficulty: "hard",
    ko: { title: "인간이 화성에 정착해야 하는가", description: "지구 외 거주의 윤리와 우선순위", category: "윤리" },
    en: { title: "Should humans settle on Mars?", description: "Ethics and priorities of living beyond Earth", category: "Ethics" },
  },
];

export const arenaTopic = (id: string) => ARENA_TOPICS.find((t) => t.id === id);
