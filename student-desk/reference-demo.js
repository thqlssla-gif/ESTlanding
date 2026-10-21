/* Reference demo data source: public LigLess/kaia-desk makeDemo(), DEFAULT_SNIPPETS, TPL_DEFAULT.
   All names / phones below are those explicitly labeled as fictional demos in that public source.
   Does not read protected account data. Mentor contact details removed. */
const REFERENCE_HOLIDAYS = new Set(["2026-01-01","2026-02-16","2026-02-17","2026-02-18","2026-03-01","2026-03-02","2026-05-05","2026-05-24","2026-05-25","2026-06-03","2026-06-06","2026-08-15","2026-08-17","2026-09-24","2026-09-25","2026-09-26","2026-10-03","2026-10-05","2026-10-09","2026-12-25","2027-01-01","2027-02-06","2027-02-07","2027-02-08","2027-02-09","2027-03-01","2027-05-05","2027-05-13","2027-06-06","2027-08-15","2027-08-16","2027-09-14","2027-09-15","2027-09-16","2027-10-03","2027-10-04","2027-10-09","2027-10-11","2027-12-25","2027-12-27","2028-01-01","2028-01-25","2028-01-26","2028-01-27","2028-03-01","2028-05-02","2028-05-05","2028-06-06","2028-08-15","2028-10-02","2028-10-03","2028-10-04","2028-10-05","2028-10-09","2028-12-25"]);
const REFERENCE_SNIPPETS = [{"title":"국비 상담 준비물","text":"국비 상담 오실 때 준비해 주세요.\n· 신분증\n· 국민내일배움카드(없으시면 발급 절차 함께 안내드려요)\n· 최종학력 확인 가능한 서류(필요 시)"},{"title":"학원 위치 안내","text":"학원 위치 안내드립니다.\n· 주소: (주소를 입력해 주세요)\n· 대중교통: (가까운 역 · 출구)\n· 주차: (주차 안내)"},{"title":"수업 결석 연락 받았을 때","text":"연락 주셔서 감사합니다. 결석 처리해 둘게요.\n빠진 수업 내용은 강사님께 자료 요청해 두고, 다음 수업 전에 따로 공유드리겠습니다."}];
const REFERENCE_NOTICES = {"s7":"코리아AI아카데미 {과목} 개강안내입니다: )\n\n○날짜 : {기간}\n○과목 : {과목}\n○시간 : {시간}\n○요일 : {요일}\n○강의실 : {강의실}\n\n실시간 비대면 강의 희망하실 경우,\n줌 계정으로 로그인 후, 실시간 강의 참여 가능\n\n{줌계정}\n회의 ID : {회의ID}\n회의 PW : {회의PW}\n\n▶상기 등록된 사항은 개강 3일전까지만 취소, 연기, 시간 및 과목변경 등이 가능하며, 그 이후는 취소, 연기, 시간 및 과목변경이 불가능 합니다.\n\n▶코리아그룹-스마트러닝어플 수업일정 확인가능합니다.\n\n▶수업일정 미확인으로 인한 결석은 수강생 본임책임입니다.\n\n▶결석/비대면수업참여시 담당멘토에게 미리 꼭~! 연락부탁드립니다.\n\n담당 멘토 : {멘토}","s7z":"코리아AI아카데미 {과목} 개강안내입니다 :)\n\n○날짜 : {기간}\n({수업일})\n○과목 : {과목}\n○시간 : {시간}\n○요일 : {요일}\n○ ZOOM링크를 통한 실시간 비대면 수업입니다.\n\n※ 개강 전 ZOOM 링크 & 회의 번호와 비밀번호 발송예정입니다.(자동으로 스팸,광고처리 되는 경우도있으니 확인부탁드립니다)\n\n※ 수업 당일 오전까지 전달 못받았을 경우 담당멘토에게 연락부탁드립니다.\n\n※ 상기 등록된 사항은 개강 3일전까지만 취소, 연기, 시간 및 과목변경 등이 가능하며, 그 이후는 취소, 연기, 시간 및 과목변경이 불가능 합니다.\n\n※수업 일정 미확인이나 개인 사유로 인한 결석으로 수업 참여가 어려운 경우에는 별도 보장이 어려운 점 양해 부탁드립니다. (원활한 학습을 위해 최대한 결석 없도록 적극적인 참여 부탁드려요!!!)\n\n※녹화본 유효기간 1주일\n\n담당 멘토 : {멘토}","s1":"안녕하세요 {이름}님, {지점} {멘토}입니다.\n내일 {개강일} 「{과정}」 과정이 개강합니다.\n\n· 수업 시간: {시간}\n· 강의실: {강의실}\n\n첫 수업이라 10분 정도 일찍 오시면 자리 안내 도와드릴게요. 내일 뵙겠습니다!","e7":"안녕하세요 {이름}님, {지점} {멘토}입니다.\n수강 중이신 「{과정}」 과정이 {종강일} 종강 예정입니다.\n남은 수업과 이후 학습 방향(다음 과정 · 자격증 일정)이 궁금하시면 상담 일정 잡아드릴게요.","e1":"안녕하세요 {이름}님, {지점} {멘토}입니다.\n내일 {종강일}이 「{과정}」 과정 마지막 수업입니다.\n그동안 정말 수고 많으셨어요. 수료 후 다음 단계도 함께 챙겨드릴게요."};
function buildReferenceExamples(makeId,today){
 const courses=[],students=[],tasks=[],templates=[];
 const dow="일월화수목금토";
 const toYMD=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
 const parse=s=>new Date(s+"T12:00:00");
 const shift=(s,n)=>{const d=parse(s);d.setDate(d.getDate()+n);return toYMD(d)};
 const label = d => d.map(i=>dow[i]).join("·");
 const sessions=c=>{
  const out=[],startDay=parse(c.start),sunday=new Date(startDay);
  sunday.setDate(sunday.getDate()-sunday.getDay());
  let cursor=c.start, guard=0;
  while(out.length<c.total&&guard++<800){
   const dt=parse(cursor),wd=dt.getDay(),week=Math.floor(Math.round((dt-sunday)/864e5)/7);
   const days=(c.daysB&&week%2)?c.daysB:c.daysA;
   if(days.includes(wd)&&!REFERENCE_HOLIDAYS.has(cursor))out.push(cursor);
   cursor=shift(cursor,1);
  }
  return out;
 };
 const makeCourse=(o,batch)=>{
  const c={id:makeId(),name:o.name,kind:o.kind||"평일",daysA:o.days||[1,2,3,4,5],daysB:o.daysB||null,
   days:label(o.days||[1,2,3,4,5])+(o.daysB?" / "+label(o.daysB)+" 격주":""),start:o.start,
   total:o.total,progress:0,time:o.time.replace("–"," ~ "),teacher:o.teacher||"",room:o.room||"",
   mode:"오프라인",memo:o.room||"",batch:batch||"",example:true,sourceKey:batch||o.name};
  c.sessionDates=sessions(c);
  c.end=c.sessionDates.at(-1)||c.start;
  c.progressDetails={};
  courses.push(c);
  return c;
 };
 const a=makeCourse({name:"정보처리기사 실기 평일반",kind:"평일",days:[1,2,3,4,5],time:"19:30–22:00",start:shift(today,7),total:20,teacher:"김정훈",room:"301호"});
 const sqlStart=shift(today,((6-parse(today).getDay()+7)%7)||7);
 const b=makeCourse({name:"SQLD 단기 주말반",kind:"주말",days:[6,0],time:"09:30–13:30",start:sqlStart,total:8,teacher:"박서연",room:"302호"});
 const c=makeCourse({name:"파이썬 기초 (화·목)",kind:"평일",days:[2,4],time:"10:00–13:00",start:shift(today,-30),total:12,teacher:"이도윤",room:"303호"});
 const topics=["변수와 자료형","조건문","반복문","리스트","딕셔너리","함수","모듈","파일 입출력","예외 처리"];
 c.sessionDates.filter(d=>d<today).slice(0,-1).forEach((date,i)=>c.progressDetails[date]={done:true,topic:topics[i]||""});
 c.progress=Object.keys(c.progressDetails).length;
 const d=makeCourse({name:"리눅스마스터 2급 평일반",kind:"평일",days:[1,3,5],time:"19:00–22:00",start:shift(today,-20),total:12,teacher:"최민",room:"301호"});
 d.sessionDates.filter(date=>date<today).forEach(date=>d.progressDetails[date]={done:true,topic:""});
 d.progress=Object.keys(d.progressDetails).length;
 const nextMon=n=>shift(today,((8-parse(today).getDay())%7||7)+7*n);
 [0,4,8].forEach((n,i)=>makeCourse({name:"DBMS",kind:"평일",days:[1,3,5],daysB:[1,3],time:"19:00–22:00",start:nextMon(n),total:10,teacher:"",room:"4층 B강의장"},"DBMS "+(i+1)+"차"));
 const makeStudent=(name,phone,status,enroll,memo)=>{
  students.push({id:makeId(),name,phone,status,courseId:enroll[0]?.id||"",
   courseIds:enroll.map(x=>x.id),goal:"",source:"",nextContact:"",memo,
   logs:[{id:makeId(),date:shift(today,-12),body:"첫 상담 · 국비 가능 여부 확인"}],
   updatedAt:new Date().toISOString(),example:true});
 };
 makeStudent("예시 이서준","010-0000-1234","수강중",[a,c],"비전공 · 정처기 준비");
 makeStudent("예시 박지민","010-0000-5678","등록대기",[a],"평일 저녁만 가능");
 makeStudent("예시 최유나","010-0000-2468","수강중",[b],"");
 makeStudent("예시 정하늘","010-0000-1357","수강중",[d],"리눅스 → 정보보안 희망");
 makeStudent("예시 한도윤","010-0000-9999","상담중",[],"다음 주 재상담");
 const makeTask=(title,due,time,category)=>tasks.push({id:makeId(),title,due,time,category,memo:"",done:false,example:true});
 makeTask("예시 한도윤 콜백",today,"15:00","콜백");
 makeTask("정처기 실기 교재 수량 확인",shift(today,2),"","개강준비");
 makeTask("국비 서류 스캔 정리",shift(today,-1),"","서류");
 REFERENCE_SNIPPETS.forEach(s=>templates.push({id:makeId(),title:s.title,body:s.text,kind:"snippet",example:true}));
 const titles={s7:"개강안내",s7z:"개강안내 (비대면)",s1:"개강 전날",e7:"종강 안내",e1:"종강 전날"};
 Object.entries(REFERENCE_NOTICES).forEach(([k,v])=>templates.push({id:makeId(),title:titles[k],body:v,kind:"notice",referenceType:k,example:true}));
 return {students,courses,tasks,templates};
}