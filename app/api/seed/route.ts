import { prisma } from "@/lib/prisma";

export async function POST() {
  await prisma.project.deleteMany();
  await prisma.expectedProject.deleteMany();
  await prisma.participant.deleteMany();

  await prisma.project.createMany({
    data: [
      { category: "개찰", orderNum: 1, name: "154kV 상운S/S", leader: "추영욱", submitDate: "2/2", presentDate: "2/10", openDate: "3/9", cost: 23.6, notes: "안전 김영국" },
      { category: "개찰", orderNum: 2, name: "충주 시민의 숲 목재문화관", leader: "김기욱", submitDate: "2/12", presentDate: "2/13", openDate: "추후", cost: 19.2, notes: "건축 윤권수" },
      { category: "개찰", orderNum: 3, name: "서원 국민체육센터", leader: "김종완", submitDate: "2/9", presentDate: "2/13", openDate: "추후", cost: 20, notes: "" },
      { category: "진행중", orderNum: 4, name: "의정부법조타운 S-2BL 및 S-3BL", leader: "황창석", submitDate: "2/25", presentDate: "3/12", openDate: "3/12", cost: 194.5, notes: "건축 모길주, 토목 장정환, 안전 노태락, 기계 정관희" },
      { category: "진행중", orderNum: 5, name: "154kV 학운변전소", leader: "이영춘", submitDate: "2/25", presentDate: "추후", openDate: "3/11", cost: 23.6, notes: "안전 허석준" },
      { category: "진행중", orderNum: 6, name: "시제물품 보관창고 신축 외 4건", leader: "김기욱", submitDate: "2/20", presentDate: "2/23", openDate: "3/11", cost: 13.9, notes: "건축 윤권수" },
      { category: "진행중", orderNum: 7, name: "쌍문1동 공공복합청사", leader: "신경철", submitDate: "3/4", presentDate: "3/10", openDate: "3/18", cost: 28.5, notes: "건축 박종혁" },
      { category: "진행중", orderNum: 8, name: "26-A-00부대(A005)", leader: "김지훈", submitDate: "2/25", presentDate: "3/5", openDate: "3/10", cost: 18.7, notes: "건축 박재흥, 토목 오인환" },
    ],
  });

  await prisma.expectedProject.createMany({
    data: [
      { orderNum: 1, name: "", client: "", leader: "", budget: null, planMonth: "", serviceCost: null, notes: "" },
      { orderNum: 2, name: "", client: "", leader: "", budget: null, planMonth: "", serviceCost: null, notes: "" },
    ],
  });

  await prisma.participant.createMany({
    data: [
      { name: "추영욱", role: "책임기술자" },
      { name: "김종완", role: "책임기술자" },
      { name: "황창석", role: "책임기술자" },
      { name: "김기욱", role: "책임기술자" },
      { name: "이영춘", role: "책임기술자" },
      { name: "신경철", role: "책임기술자" },
      { name: "김지훈", role: "책임기술자" },
      { name: "윤권수", role: "건축" },
      { name: "모길주", role: "건축", company: "KD" },
      { name: "박재흥", role: "건축" },
      { name: "박종혁", role: "건축" },
      { name: "장정환", role: "토목", company: "ITM" },
      { name: "오인환", role: "토목" },
      { name: "김영국", role: "안전" },
      { name: "노태락", role: "안전", company: "ITM" },
      { name: "허석준", role: "안전" },
      { name: "정관희", role: "기계" },
    ],
  });

  return Response.json({ ok: true, message: "시드 데이터 입력 완료" });
}
