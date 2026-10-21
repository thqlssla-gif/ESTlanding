'use strict';
/* SO:BIN DESK - 개인용 오프라인 우선, 브라우저 암호화 학생관리 */
const STORAGE='sobin.desk.encrypted.v1';
const TODAY=()=>{let d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const uid=()=>crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random().toString(36).slice(2);
const EMPTY_TEMPLATES=[
{id:'welcome',title:'첫 상담 후 안내',body:'안녕하세요, {이름}님!\n코리아IT아카데미 멘토입니다.\n오늘 말씀 나눈 {분야} 준비 방향을 참고하셔서 궁금한 부분 있으시면 편하게 말씀 주세요. :)'},
{id:'course',title:'수업 / 개강 안내',body:'안녕하세요, {이름}님!\n문의 주신 {과정} 안내드립니다.\n\n개강일 : {개강일}\n수업 시간 : {시간}\n진행 방식 : {방식}\n\n일정 확인 후 궁금하신 점 있으시면 말씀 주세요!'},
{id:'callback',title:'상담 일정 확인',body:'안녕하세요, {이름}님!\n말씀 주신 내용 확인차 연락드렸습니다.\n상담 일정은 {상담일}로 확인되며, 조정이 필요하시면 편하게 말씀 주세요. 감사합니다!'},
{id:'end',title:'수업 마무리 안내',body:'안녕하세요, {이름}님!\n{과정} 학습하시느라 고생 많으셨습니다.\n앞으로 준비하실 방향이나 포트폴리오 관련하여 궁금하신 점 있으시면 언제든 말씀 주세요!'},
{id:'followup',title:'취업 준비 점검',body:'안녕하세요, {이름}님!\n이전에 말씀 주신 {분야} 준비는 잘 진행되고 있으실까요?\n방향이나 학습 순서를 다시 점검하고 싶으시면 편하게 연락 주세요.'}
];
function blank(){return {version:1,students:[],courses:[],tasks:[],templates:JSON.parse(JSON.stringify(EMPTY_TEMPLATES)),settings:{mentor:'소빈',branch:'코리아IT아카데미'}};}
let db=blank(),key=null,page='home',modal=null,month=new Date().getFullYear()+'-'+String(new Date().getMonth()+1).padStart(2,'0'),studentQuery='',studentFilter='전체',messageTemplate='welcome',messageStudent='',messageCourse='',saveChain=Promise.resolve(),toastTimer;
const app=document.getElementById('app');
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const aa=(s)=>E(s).replace(/\n/g,'<br>');
const text=(s)=>String(s??'').trim();
const byId=(xs,id)=>xs.find(x=>x.id===id);
const fmt=s=>{if(!s)return '미정';let x=new Date(s+'T12:00:00');return isNaN(x)?s:(x.getMonth()+1)+'월 '+x.getDate()+'일'};
const niceDate=s=>{if(!s)return '-';let x=new Date(s+'T12:00:00');return isNaN(x)?s:(x.getMonth()+1)+'.'+x.getDate()+' ('+'일월화수목금토'[x.getDay()]+')'};
const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const statusColor=s=>({'상담중':'amber','등록대기':'','수강중':'green','수료':'gray','보류':'gray','종료':'red'}[s]||'');
const pill=(s,cl)=>'<span class="pill '+(cl||'')+'">'+E(s)+'</span>';
const icon=n=>{let m={home:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',students:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',courses:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M9 7h6M9 11h7"/>',calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',tasks:'<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',messages:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m3 6 9 7 9-7"/>',settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.1 2.1-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1 1.56V21h-3v-.8a1.7 1.7 0 0 0-1-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-2.1-2.1.06-.06A1.7 1.7 0 0 0 7 15a1.7 1.7 0 0 0-1.56-1H4.5v-3h.94A1.7 1.7 0 0 0 7 10a1.7 1.7 0 0 0-.34-1.88L6.6 8.06l2.1-2.1.06.06A1.7 1.7 0 0 0 10.64 6a1.7 1.7 0 0 0 1-1.56V3.5h3v.94a1.7 1.7 0 0 0 1 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.1 2.1-.06.06A1.7 1.7 0 0 0 19.4 10a1.7 1.7 0 0 0 1.56 1h.54v3h-.54A1.7 1.7 0 0 0 19.4 15z"/>',lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3"/>'};
return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(m[n]||m.home)+'</svg>'};
function bytesTo64(arr){let str='';for(let i=0;i<arr.length;i+=8192)str+=String.fromCharCode.apply(null,arr.slice(i,i+8192));return btoa(str)}
function b64ToBytes(s){return Uint8Array.from(atob(s),c=>c.charCodeAt(0))}
async function derive(password,salt){const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:250000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt'])}
async function seal(json){const iv=crypto.getRandomValues(new Uint8Array(12));const enc=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(JSON.stringify(json)));const old=JSON.parse(localStorage.getItem(STORAGE)||'{}');return {version:1,salt:old.salt,iv:bytesTo64(iv),data:bytesTo64(new Uint8Array(enc)),savedAt:new Date().toISOString()}}
function persist(){let snapshot=JSON.parse(JSON.stringify(db));saveChain=saveChain.then(async()=>{if(!key)return;try{localStorage.setItem(STORAGE,JSON.stringify(await seal(snapshot)))}catch(err){notify('저장 실패: 브라우저 공간이나 설정을 확인하세요')}});return saveChain}
function notify(s){clearTimeout(toastTimer);document.querySelectorAll('.toast').forEach(x=>x.remove());let el=document.createElement('div');el.className='toast';el.textContent=s;document.body.appendChild(el);toastTimer=setTimeout(()=>el.remove(),3200)}

/* 가상 학생/과정/업무로만 구성한 참고 사이트 체험 데이터 */
function exampleDate(n){const d=new Date(TODAY()+'T12:00:00');d.setDate(d.getDate()+n);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function buildExamples(){return buildReferenceExamples(uid,TODAY())}
function exampleCount(){return ['students','courses','tasks','templates'].reduce((n,k)=>n+db[k].filter(x=>x.example).length,0)}
function seedExamples(){const items=buildExamples();for(const k of ['students','courses','tasks','templates'])db[k].push(...items[k]);db.settings.examplesInitialized=true;db.settings.referenceDemoVersion=2}
function clearExamples(){for(const k of ['students','courses','tasks','templates'])db[k]=db[k].filter(x=>!x.example);db.settings.examplesInitialized=true}
function examplePanel(){
 const old=exampleCount()>0&&db.settings.referenceDemoVersion!==2;
 return '<div class="panel"><div class="panel-header"><h3 class="panel-title">📚 KAIA DESK 원본 공개 예시 데이터</h3>'+pill(exampleCount()+'개 예시')+'</div>'+
 '<p class="muted" style="line-height:1.85;margin:0 0 16px">원본 공개 데모의 <b>학생 5명 · 교육과정 7개 · 할 일 3개 · 저장 문구 3개 · 개강/종강 안내 템플릿 5개</b>를 가져왔어요. 실제 수업 일정, 진도, 과정 연결, 상담 메모도 포함됩니다.</p>'+
 (old?'<div class="alert" style="margin-bottom:15px">이전에 넣었던 임의 예시가 있어요. 아래 버튼으로 원본 데이터로 교체할 수 있어요. 직접 입력한 학생 정보는 유지됩니다.</div>':'')+
 '<div class="flex wrap"><button class="btn primary" data-action="apply-reference">'+(exampleCount()?'원본 공개 예시로 교체':'원본 공개 예시 추가')+'</button>'+
 (exampleCount()?'<button class="btn danger" data-action="remove-examples">예시 데이터만 삭제</button>':'')+'</div>'+
 '<p class="small muted" style="margin:13px 0 0">원본 사이트의 공개 가상 자료만 사용하며, 비공개 사용자 기록이나 원본 멘토의 연락처는 포함하지 않았습니다.</p></div>';
}

/* ----- User timetable_양식.xlsx import, local-only encrypted course storage ----- */
function normalizeCourseDate(value){
 if(value instanceof Date&&!Number.isNaN(+value))return iso(value);
 if(typeof value==="number"&&typeof XLSX!=="undefined"&&XLSX.SSF){
  const d=XLSX.SSF.parse_date_code(value);
  if(d)return [d.y,String(d.m).padStart(2,'0'),String(d.d).padStart(2,'0')].join('-');
 }
 const s=String(value||'').trim();
 let m=s.match(/^(\d{4})[.\/-](\d{1,2})[.\/-](\d{1,2})/);
 if(!m)return '';
 const out=m[1]+'-'+m[2].padStart(2,'0')+'-'+m[3].padStart(2,'0');
 return iso(new Date(out+'T12:00:00'))===out?out:'';
}
function validCourseRow(raw){
 const name=text(raw.name),start=normalizeCourseDate(raw.start),end=normalizeCourseDate(raw.end);
 const total=Number(raw.total)||0;
 if(!name||!start||!end||start>end||!Number.isInteger(total)||total<1||total>1000)return null;
 return {name,start,end,kind:text(raw.kind)||'평일',days:text(raw.days)||'월~금',time:text(raw.time)||'시간 미정',
 total,teacher:text(raw.teacher),room:text(raw.room),memo:text(raw.memo)};
}
function mergeTimetableRows(rows,source){
 let created=0,updated=0,skipped=0;
 for(const original of rows){
  const row=validCourseRow(original);
  if(!row){skipped++;continue}
  const uploadKey=row.kind+'|'+row.name;
  // Import updates only previously imported records or exact matches from same sample. Never rewrite a mentor's original record.
  let existing=db.courses.find(c=>c.uploadSource===source&&c.uploadKey===uploadKey);
  if(!existing)existing=db.courses.find(c=>c.uploadSource==='sample-template'&&c.name===row.name&&c.start===row.start);
  if(existing){
   const retain={id:existing.id,progress:existing.progress||0,uploadSource:source,uploadKey,example:false,
    sourceLabel:source==='sample-template'?'업로드된 엑셀 양식':'엑셀에서 가져온 과정'};
   Object.assign(existing,row,retain);
   delete existing.sessionDates;delete existing.progressDetails;delete existing.daysB;
   existing.progress=Math.min(existing.progress,existing.total);
   updated++;
  }else{
   db.courses.push({id:uid(),...row,progress:0,mode:'오프라인',example:false,uploadSource:source,uploadKey,
    sourceLabel:source==='sample-template'?'업로드된 엑셀 양식':'엑셀에서 가져온 과정'});
   created++;
  }
 }
 return {created,updated,skipped};
}
function ensureTemplateTimetable(){
 if(db.settings.templateTimetableAppliedV1)return false;
 if(typeof UPLOADED_TIMETABLE_ROWS==='undefined')return false;
 mergeTimetableRows(UPLOADED_TIMETABLE_ROWS,'sample-template');
 db.settings.templateTimetableAppliedV1=true;
 return true;
}
async function importTimetableFile(file){
 if(typeof XLSX==='undefined')throw Error('엑셀 읽기 기능이 로드되지 않았어요. 페이지를 새로고침해 주세요.');
 const raw=await file.arrayBuffer(),workbook=XLSX.read(raw,{type:'array',cellDates:true});
 const sheet=workbook.Sheets[workbook.SheetNames.includes('개강표')?'개강표':workbook.SheetNames[0]];
 if(!sheet)throw Error('시간표 시트를 찾지 못했어요.');
 const rows=XLSX.utils.sheet_to_json(sheet,{defval:''});
 if(!rows.length)throw Error('시간표에 과정 데이터가 없습니다.');
 const normalized=rows.map(row=>({
  kind:row['구분'],name:row['과정명'],start:row['개강일'],end:row['종강일'],
  days:row['요일'],time:row['시간'],total:row['시수'],teacher:row['강사'],room:row['강의실'],memo:row['비고']
 }));
 const valid=normalized.filter(x=>validCourseRow(x));
 if(!valid.length)throw Error('과정명·개강일·종강일·시수가 올바르게 입력된 행이 없습니다.');
 if(!confirm(valid.length+'개 과정 데이터를 현재 데스크에 등록할까요? 이미 엑셀에서 가져온 같은 과정은 갱신됩니다. 학생 정보는 유지됩니다.'))return;
 const counts=mergeTimetableRows(valid,'personal-excel');
 await persist();page='courses';render();
 notify('엑셀 시간표: '+counts.created+'개 추가 · '+counts.updated+'개 갱신'+(counts.skipped?' · '+counts.skipped+'개 제외':''));
}

function fresh(){db=blank();page='home';studentQuery='';studentFilter='전체';messageTemplate='welcome';modal=null}
function storeOk(){try{return !!localStorage.getItem(STORAGE)}catch(e){return false}}
function authScreen(){let exists=storeOk();app.innerHTML='<div class="auth-layout"><div class="auth-card"><div class="auth-logo">✿</div><div class="eyebrow" style="margin-top:24px">PERSONAL MENTOR WORKSPACE</div><h1>'+ (exists?'다시 오셨네요!':'나만의 학생관리 데스크')+'</h1><p>'+(exists?'비밀번호를 입력하면 저장해둔 상담 기록과 학생 정보를 불러옵니다.':'학생관리 데이터를 보호할 비밀번호를 처음 한 번 설정해 주세요. 이 비밀번호는 서버로 보내지지 않습니다.')+'</p><form data-form="'+(exists?'unlock':'setup')+'" class="auth-form"><div class="field-group"><label class="field-label" for="pass">비밀번호</label><input id="pass" type="password" name="password" class="field" autocomplete="'+(exists?'current-password':'new-password')+'" minlength="8" required placeholder="8자 이상"></div>'+(exists?'':'<div class="field-group"><label class="field-label">비밀번호 확인</label><input type="password" name="confirm" class="field" minlength="8" autocomplete="new-password" required placeholder="한 번 더 입력"></div>')+'<button type="submit" class="btn primary" style="padding:14px"> '+(exists?'잠금 해제':'개인 데스크 만들기')+' → </button></form><div class="auth-note">🔒 학생 기록은 이 기기의 브라우저에 암호화해 저장됩니다. 비밀번호를 잊으면 기존 데이터를 복구할 수 없습니다. 다른 기기에서는 백업 파일을 가져와야 합니다.</div>'+(exists?'<button class="text-link" data-action="restore">암호화 백업 파일 가져오기</button>':'')+'<p class="lock-note">GitHub Pages는 페이지를 공개하지만, 실제 학생 기록이나 비밀번호를 GitHub 저장소에 올리지 않습니다.</p></div></div>'}
async function setup(password){let salt=crypto.getRandomValues(new Uint8Array(16));key=await derive(password,salt);fresh();seedExamples();ensureTemplateTimetable();localStorage.setItem(STORAGE,JSON.stringify({version:1,salt:bytesTo64(salt),iv:'',data:''}));await persist();render();notify('예시 학생 · 과정 · 상담 기록이 준비됐어요 🍓')}
async function unlock(password){const obj=JSON.parse(localStorage.getItem(STORAGE));const k=await derive(password,b64ToBytes(obj.salt));let raw=await crypto.subtle.decrypt({name:'AES-GCM',iv:b64ToBytes(obj.iv)},k,b64ToBytes(obj.data));let read=JSON.parse(new TextDecoder().decode(raw));if(!read||!Array.isArray(read.students)||!Array.isArray(read.courses)||!Array.isArray(read.tasks))throw new Error('invalid');key=k;db={...blank(),...read,settings:{...blank().settings,...(read.settings||{})}};if(!Array.isArray(db.templates))db.templates=JSON.parse(JSON.stringify(EMPTY_TEMPLATES));page='home';if(!db.settings.referenceDemoVersion && exampleCount()>0 && db.tasks.filter(x=>x.example).length===9 && db.templates.filter(x=>x.example).length===4){clearExamples();seedExamples();await persist()}else if(!db.settings.examplesInitialized&&!db.students.length&&!db.courses.length&&!db.tasks.length){seedExamples();await persist()}if(ensureTemplateTimetable())await persist();render();notify('안전하게 잠금을 해제했어요')}
const tabs=[['home','대시보드'],['students','학생 관리'],['courses','과정 · 시간표'],['calendar','일정 캘린더'],['tasks','할 일 · 콜백'],['messages','문자 템플릿'],['settings','설정 · 백업']];

function shell(content){
 const title=tabs.find(x=>x[0]===page)?.[1]||'대시보드';
 const links=[['home','홈'],['courses','시간표'],['messages','개강안내'],['students','학생'],['calendar','알림'],['tasks','진도 · 할 일'],['settings','설정']];
 const count=dashboardAlerts().length;
 const nav=links.map(([id,name])=>'<button data-nav="'+id+'" class="'+(page===id?'active':'')+'" aria-current="'+(page===id?'page':'false')+'">'+icon(id)+'<span>'+name+'</span>'+(id==='calendar'&&count?'<span class="nav-count">'+count+'</span>':'')+'</button>').join('');
 app.innerHTML='<div class="app"><div class="workspace">'+
 '<header class="desk-header"><div class="desk-dots" aria-hidden="true"><i></i><i></i><i></i></div>'+
 '<div class="desk-wordmark"><span class="symbol">✿</span>SO:BIN DESK</div>'+
 '<nav class="desk-nav" aria-label="학생관리 메뉴">'+nav+'</nav>'+
 '<div class="desk-actions"><div class="desk-shield"><span class="desk-status"></span><span>암호화 저장</span></div>'+
 '<button type="button" class="desk-icon-action" data-action="xlsx-import" title="엑셀 시간표 업로드" aria-label="엑셀 업로드">'+icon('courses')+'</button>'+
 '<button type="button" class="desk-icon-action" data-action="lock" title="잠금" aria-label="잠금">'+icon('lock')+'</button>'+
 '<div class="desk-profile"><div class="avatar">'+E((db.settings.mentor||'소').slice(0,1))+'</div><span><b>'+E(db.settings.mentor)+'</b><small>'+E(db.settings.branch||'개인 멘토')+'</small></span></div></div></header>'+
 '<main class="content '+(page==='home'?'desk-main':'desk-section')+'" aria-label="'+E(title)+'">'+content+'</main></div></div>'+(modal||'');
}

function heading(title,sub,actions){return '<div class="heading"><div><div class="eyebrow">MENTOR WORKSPACE</div><h2>'+E(title)+'</h2><p>'+E(sub||'')+'</p></div>'+(actions||'')+'</div>'}
function empty(iconText,title,desc,button){return '<div class="empty"><div class="emo">'+iconText+'</div><b>'+E(title)+'</b><p>'+E(desc)+'</p>'+(button||'')+'</div>'}
function recentTasks(){return db.tasks.filter(t=>!t.done).sort((a,b)=>(a.due||'9999').localeCompare(b.due||'9999'))}
function latestStudents(){return [...db.students].sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||''))}
function stat(label,num,sub,emoji){return '<div class="stat"><div class="stat-top"><span class="stat-label">'+label+'</span><div class="stat-icon">'+emoji+'</div></div><div class="stat-num">'+num+'</div><div class="stat-sub">'+sub+'</div></div>'}

function daysBetween(a,b){if(!a||!b)return 9999;const x=new Date(a+'T12:00:00'),y=new Date(b+'T12:00:00');return Math.round((y-x)/86400000)}
function dashboardAlerts(){
 const now=TODAY(),alerts=[];
 db.courses.forEach(c=>{
  if(c.start&&daysBetween(now,c.start)>=0&&daysBetween(now,c.start)<=7){
   const n=daysBetween(now,c.start);
   alerts.push({type:'개강',days:n,date:c.start,title:c.name,subtitle:(c.time||'시간 미정')+' · '+(c.room||'강의실 미정'),course:c,tag:'개강 D-'+n});
  }
  if(c.end&&daysBetween(now,c.end)>=0&&daysBetween(now,c.end)<=3){
   const n=daysBetween(now,c.end);
   alerts.push({type:'종강',days:n,date:c.end,title:c.name,subtitle:(c.time||'시간 미정')+' · '+(c.room||'강의실 미정'),course:c,tag:'종강 D-'+n});
  }
 });
 return alerts.sort((a,b)=>a.days-b.days||a.date.localeCompare(b.date));
}
function clockDisplay(){
 const d=new Date();
 return '<span id="desk-live-clock">'+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')+'</span><span id="desk-live-seconds">:'+String(d.getSeconds()).padStart(2,'0')+'</span>';
}
function dashboard(){
 const now=TODAY(),alerts=dashboardAlerts();
 const currCourses=db.courses.filter(c=>c.start&&c.start<=now&&(!c.end||c.end>=now));
 const todayCourses=db.courses.filter(c=>meets(c,now));
 const dueTasks=recentTasks().filter(t=>t.due&&t.due<=now);
 const futureCourses=db.courses.filter(c=>c.start&&c.start>=now).sort((a,b)=>a.start.localeCompare(b.start));
 const upcoming=futureCourses[0];
 const daysToNext=upcoming?daysBetween(now,upcoming.start):null;
 const coursePct=db.courses.length?Math.round(db.courses.reduce((sum,c)=>sum+Math.min(1,Math.max(0,Number(c.progress||0)/Math.max(1,Number(c.total||1)))),0)/db.courses.length*100):0;
 const idx=currCourses.length?Math.round(currCourses.reduce((sum,c)=>sum+(Number(c.progress||0)),0)) :0;
 const date=new Date();
 const dateLabel=new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit',weekday:'long'}).format(date);
 let h='<div class="desk-kicker">SYSTEM CORE · '+currCourses.length+' ACTIVE · '+alerts.length+' ALERTS</div><div class="desk-grid-top">';
 h+='<section class="desk-surface desk-greeting"><div class="desk-line-title">IDENTITY · '+E(db.settings.branch||'개인 멘토')+'</div>'+
 '<h1>좋은 아침이에요,<br>'+E(db.settings.mentor)+'님</h1>'+
 '<div class="desk-clock">'+clockDisplay()+'</div><div class="desk-date">'+E(dateLabel)+' · PERSONAL DESK</div>'+
 '<div class="desk-counts">'+[
  [currCourses.length,'진행 중 과정'],[alerts.length,'확인할 알림'],[todayCourses.length,'오늘 수업'],[dueTasks.length,'오늘까지 할 일']
 ].map(pair=>'<div class="desk-count"><strong>'+pair[0]+'</strong><span>'+pair[1]+'</span></div>').join('')+'</div>'+
 '<div class="desk-greeting-actions"><button class="desk-primary" data-nav="messages">↗ 개강안내</button>'+
 '<button class="desk-outline" data-action="xlsx-import">⇧ 엑셀 올리기</button></div></section>';
 h+='<section class="desk-orbit-wrap"><div class="desk-orbit" style="--orbit-progress:'+Math.max(12,Math.round(coursePct*3.6))+'deg">'+
 '<div class="desk-orbit-ring"></div><div class="desk-orbit-core"><strong>✿</strong></div></div>'+
 '<div class="desk-orbit-summary">STUDENTS '+db.students.length+' · COURSES '+db.courses.length+' · DONE '+idx+' LESSONS</div>'+
 '<div class="desk-orbit-next">'+(upcoming?'<b>D-'+daysToNext+'</b>'+E(upcoming.name)+' · '+E(niceDate(upcoming.start))+' 개강':'<b>'+coursePct+'%</b>전체 과정 평균 진도')+'</div></section>';
 h+='<section class="desk-surface desk-alerts"><div class="desk-line-title">ALERTS · '+alerts.length+'</div><div class="desk-alerts-list">';
 h+=alerts.length?alerts.slice(0,4).map(a=>'<div class="desk-alert-item"><span class="desk-alert-tag">'+E(a.tag)+'</span><div class="desk-alert-body"><b title="'+E(a.title)+'">'+E(a.title)+'</b><small>'+E(niceDate(a.date))+' · '+E(a.subtitle)+'</small></div></div>').join(''):
 '<div class="desk-alert-empty">현재 7일 이내 개강과<br>3일 이내 종강 알림이 없어요.</div>';
 h+='</div><div class="desk-alert-footer"><button class="desk-outline" data-nav="calendar">전체 일정</button><button class="desk-outline" data-nav="messages">개강안내</button></div></section></div>';
 h+='<div class="desk-bottom"><section class="desk-surface"><div class="desk-panel-title"><h3>확인할 알림 <small>개강·종강 D-7 · D-3 · D-1</small></h3><button class="text-link" data-nav="calendar">전체 보기</button></div>';
 h+=alerts.length?alerts.slice(0,5).map(a=>'<div class="desk-notice-line"><span class="desk-alert-tag">'+E(a.tag)+'</span><div class="txt"><b>'+E(a.title)+'</b><small>'+E(niceDate(a.date))+' · '+E(a.subtitle)+'</small></div><button class="desk-outline" data-nav="messages">안내하기</button></div>').join(''):
 '<div class="desk-empty-note">확인할 개강·종강 알림이 없습니다. 과정 일정은 시간표에서 볼 수 있어요.</div>';
 h+='</section><section class="desk-surface"><div class="desk-panel-title"><h3>오늘 수업 <small>'+todayCourses.length+'개</small></h3><button class="text-link" data-nav="courses">시간표 →</button></div><div class="desk-lessons-scroll">';
 h+=todayCourses.length?todayCourses.slice(0,12).map(c=>{
  const total=Math.max(1,Number(c.total)||1),done=Number(c.progress||0),count=Array.isArray(c.sessionDates)?c.sessionDates.indexOf(now)+1:done+1;
  return '<div class="desk-lesson-row"><div style="min-width:0"><strong>'+E(c.name)+'</strong><small>'+E(c.time||'시간 미정')+' · '+E(c.room||'강의실 미정')+' · '+count+'/'+total+'회차</small></div>'+pill(done>=count?'진도 정상':'진도 미체크',done>=count?'green':'amber')+'</div>';
 }).join(''):'<div class="desk-empty-note">오늘 예정된 수업이 없습니다.<br>엑셀 시간표를 추가하면 일정에 자동으로 표시돼요.</div>';
 h+='</div></section></div>';
 
 const templateCourses=db.courses.filter(c=>c.uploadSource==='sample-template');
 if(templateCourses.length){
  h+='<section class="desk-surface" style="margin-top:16px;padding:21px"><div class="desk-panel-title"><h3>엑셀 개강표 <small>시간표_양식.xlsx · '+templateCourses.length+'개 과정</small></h3><button class="text-link" data-nav="courses">전체 시간표 →</button></div><div class="course-grid">';
  h+=templateCourses.map(c=>'<div class="course-card" style="padding:15px 17px;box-shadow:none"><div class="flex" style="justify-content:space-between;gap:8px">'+pill(c.kind||'과정')+'<span class="small muted">'+E(c.room||'강의실 미정')+'</span></div><h3 style="margin:11px 0 6px;font-size:14px">'+E(c.name)+'</h3><div class="small muted">'+E(c.start)+' ~ '+E(c.end)+'</div><div class="small muted" style="margin-top:5px">'+E(c.days)+' · '+E(c.time)+' · '+c.total+'회차</div></div>').join('');
  h+='</div></section>';
 }

 h+='<div class="desk-course-filter"><button class="desk-outline" data-nav="students">학생 '+db.students.length+'명 관리</button><button class="desk-outline" data-nav="tasks">할 일 '+dueTasks.length+'건 확인</button></div>';
 return h;
}

function studentCourseIds(student){
 const ids=Array.isArray(student.courseIds)?student.courseIds.filter(Boolean):[];
 if(student.courseId&&!ids.includes(student.courseId))ids.unshift(student.courseId);
 return ids;
}
function studentCourseNames(student){
 return studentCourseIds(student).map(id=>byId(db.courses,id)?.name).filter(Boolean).join(' · ')||'-';
}
function studentTable(arr){return arr.length?'<div class="table-wrap"><table class="table"><thead><tr><th>학생</th><th>준비 분야</th><th>상담 상태</th><th>연락 예정</th><th>등록 과정</th><th>관리</th></tr></thead><tbody>'+arr.map(s=>'<tr><td class="name-cell"><span class="name-avatar">'+E((s.name||'?')[0])+'</span><button class="text-link" data-view-student="'+E(s.id)+'">'+E(s.name)+'</button></td><td>'+E(s.goal||'-')+'</td><td>'+pill(s.status,statusColor(s.status))+'</td><td>'+E(niceDate(s.nextContact))+'</td><td>'+E(studentCourseNames(s))+'</td><td><div class="row-actions"><button class="btn sm" data-view-student="'+E(s.id)+'">기록</button><button class="btn sm" data-edit-student="'+E(s.id)+'">수정</button></div></td></tr>').join('')+'</tbody></table></div>':empty('🔎','조건에 맞는 학생이 없어요','검색어나 상담 상태를 변경해 보세요.','<button class="btn soft sm" data-add="student">학생 추가</button>')}
function students(){let f=db.students.filter(s=>(studentFilter==='전체'||s.status===studentFilter)&&[s.name,s.goal,s.phone,s.memo,s.source].join(' ').toLowerCase().includes(studentQuery.toLowerCase()));let actions='<button class="btn primary" data-add="student">＋ 학생 등록</button>';
let h=heading('학생 관리','학생별 상담 상태, 준비 분야, 연락 기록을 관리해요.',actions)+'<div class="panel"><div class="toolbar"><input class="search" id="studentSearch" value="'+E(studentQuery)+'" placeholder="이름 · 전화번호 · 준비 분야 검색" aria-label="학생 검색"><select class="field" id="studentFilter" style="width:auto;max-width:170px"><option>전체</option>'+['상담중','등록대기','수강중','수료','보류','종료'].map(s=>'<option '+(studentFilter===s?'selected':'')+'>'+s+'</option>').join('')+'</select><div class="spacer"></div><button class="btn sm" data-action="csv-import">CSV 가져오기</button><span class="muted small">총 '+db.students.length+'명</span></div><div id="studentRows">'+studentTable(f)+'</div></div>';
return h}
function courseCard(c){let now=TODAY(),flag=c.end&&c.end<now?['종강','gray']:c.start&&c.start>now?['개강 예정','']:['진행 중','green'],done=Math.min(Number(c.progress||0),Math.max(1,Number(c.total||1))),pct=Math.round(done/Math.max(1,Number(c.total||1))*100);return '<div class="course-card"><div class="course-head">'+pill(flag[0],flag[1])+'<div class="flex"><button class="btn sm" data-edit-course="'+E(c.id)+'">수정</button></div></div><h3>'+E(c.name)+'</h3><div class="course-desc">'+E((c.batch?c.batch+' · ':'')+(c.memo||'과정 목표와 진행 상태를 관리해 보세요.'))+'</div><div class="course-meta"><span>📅 '+E(niceDate(c.start))+' ~ '+E(niceDate(c.end))+'</span><span>🕘 '+E(c.time||'시간 미정')+'</span><span>📍 '+E(c.room||'미정')+'</span><span>👥 '+db.students.filter(s=>studentCourseIds(s).includes(c.id)).length+'명</span></div><div class="flex" style="justify-content:space-between;margin-bottom:7px"><span class="small muted">수업 진도</span><b class="small">'+done+' / '+(Number(c.total)||1)+'회</b></div><div class="progress"><span style="width:'+pct+'%"></span></div><div class="course-bottom"><span class="muted small">'+E(c.days||'요일 미정')+' · '+E(c.mode||'진행 방식 미정')+'</span><button class="text-link" data-action="progress" data-id="'+E(c.id)+'">진도 변경 →</button></div></div>'}
function courses(){return heading('과정 · 시간표','과정 일정, 수업 회차, 담당 학생을 한눈에 확인해요.','<div class="flex wrap"><button class="btn" data-action="xlsx-import">엑셀 시간표 올리기</button><button class="btn primary" data-add="course">＋ 과정 등록</button></div>')+(db.courses.length?'<div class="course-grid">'+[...db.courses].sort((a,b)=>(a.start||'').localeCompare(b.start||'')).map(courseCard).join('')+'</div>': '<div class="panel">'+empty('📚','첫 과정을 등록해 주세요','개강·종강 일정과 수업 진도, 학생 배정 상태를 연결합니다.','<button class="btn primary" data-add="course">과정 등록</button>')+'</div>')+'<div class="alert section-gap">💡 수업 요일은 “월·수·금”, “월~금”, “토·일” 등으로 입력하면 월간 캘린더에도 표시됩니다.</div>'}
function meets(c,day){if(Array.isArray(c.sessionDates)&&c.sessionDates.length)return c.sessionDates.includes(day);if(!c.start||day<c.start||(c.end&&day>c.end))return false;let wk=new Date(day+'T12:00:00').getDay(),raw=c.days||'';if(raw.includes('매일'))return true;if(raw.includes('평일')||raw.includes('월~금')||raw.includes('월-금'))return wk>=1&&wk<=5;if(raw.includes('주말')||raw.includes('토~일'))return wk===0||wk===6;if(raw.includes('월~토'))return wk>=1&&wk<=6;return !!raw&&raw.includes('일월화수목금토'[wk])}
function calendar(){let [y,m]=month.split('-').map(Number),date=new Date(y,m-1,1),first=date.getDay(),days=new Date(y,m,0).getDate(),cells=Math.ceil((days+first)/7)*7;let h=heading('일정 캘린더','개강·종강·수업일과 콜백 일정을 함께 확인하세요.','<button class="btn primary" data-add="task">＋ 일정 등록</button>')+'<div class="panel"><div class="calendar-head"><div class="flex"><button class="btn sm" data-month="-1" aria-label="이전 달">‹</button><strong style="font-size:20px">'+y+'년 '+m+'월</strong><button class="btn sm" data-month="1" aria-label="다음 달">›</button></div><button class="btn soft sm" data-month="0">이번 달</button></div><div class="calendar-grid">';
h+=''.concat(...['일','월','화','수','목','금','토'].map(d=>'<div class="cal-week">'+d+'</div>'));
for(let i=0;i<cells;i++){let dd=i-first+1,d=new Date(y,m-1,dd),day=iso(d),inside=d.getMonth()===m-1,events=[];db.courses.forEach(c=>{if(c.start===day)events.push(['개강 '+c.name,'']);else if(c.end===day)events.push(['종강 '+c.name,'end']);else if(meets(c,day))events.push([c.name,''])});db.tasks.filter(t=>t.due===day).forEach(t=>events.push([t.title,'task']));db.students.filter(s=>s.nextContact===day).forEach(s=>events.push([s.name+' 콜백','task']));h+='<div class="cal-day '+(!inside?'out':'')+' '+(day===TODAY()?'today':'')+'"><span class="cal-num">'+d.getDate()+'</span>'+events.slice(0,3).map(e=>'<div class="cal-event '+e[1]+'" title="'+E(e[0])+'">'+E(e[0])+'</div>').join('')+(events.length>3?'<div class="small muted">외 '+(events.length-3)+'건</div>':'')+'</div>'}
return h+'</div><div class="small muted" style="margin-top:15px">분홍색: 수업 · 개강 | 연살구: 종강 | 연보라: 할 일 · 콜백</div></div>'}
function tasks(){let list=[...db.tasks].sort((a,b)=>(a.done-b.done)||String(a.due||'9999').localeCompare(String(b.due||'9999')));let h=heading('할 일 · 콜백','상담 연락, 서류 준비, 수업 전 체크 사항을 놓치지 마세요.','<button class="btn primary" data-add="task">＋ 할 일 추가</button>')+'<div class="panel"><div class="panel-header"><h3 class="panel-title">업무 체크리스트</h3>'+pill(db.tasks.filter(t=>!t.done).length+'건 진행 중')+'</div>';h+=list.length?list.map(t=>'<div class="task-line"><input type="checkbox" class="task-check" data-toggle-task="'+E(t.id)+'" '+(t.done?'checked':'')+' aria-label="업무 완료"><div class="grow"><div class="task-title '+(t.done?'task-done':'')+'">'+E(t.title)+'</div><div class="task-note">'+E(niceDate(t.due))+(t.time?' · '+E(t.time):'')+(t.category?'　·　'+E(t.category):'')+(t.memo?'　·　'+E(t.memo):'')+'</div></div>'+pill(t.done?'완료':t.due&&t.due<TODAY()?'기한 초과':t.due===TODAY()?'오늘':'예정',t.done?'gray':t.due&&t.due<=TODAY()?'red':'')+'<button class="btn sm" data-edit-task="'+E(t.id)+'">수정</button><button class="btn sm danger" data-delete-task="'+E(t.id)+'">삭제</button></div>').join(''):empty('✅','등록된 할 일이 없어요','학생 콜백이나 개강 준비 일정을 관리해 보세요.','<button class="btn primary sm" data-add="task">할 일 추가</button>');return h+'</div>'}
function fillMessage(template){
 const student=byId(db.students,messageStudent);
 const course=byId(db.courses,messageCourse)||byId(db.courses,student?.courseId);
 const short=v=>v?v.slice(2).replace(/-/g,'.'):'(날짜 미정)';
 const vals={
  '이름':student?.name||'○○○','분야':student?.goal||'희망 분야','과정':course?.name||'과정명',
  '과목':course?.name||'과목명','기간':course?short(course.start)+' ~ '+short(course.end):'기간 미정',
  '개강일':fmt(course?.start),'종강일':fmt(course?.end),
  '요일':course?.days||'요일 미정','강의실':course?.room||'강의실 미정',
  '시간':course?.time||'별도 안내','방식':course?.mode||'별도 안내',
  '상담일':fmt(student?.nextContact),'회차':course?.total||'미정',
  '지점':db.settings.branch||'코리아IT아카데미','멘토':db.settings.mentor||'담당 멘토',
  '수업일':(course?.sessionDates||[]).map(d=>Number(d.slice(8))).join(', ')||'별도 안내',
  '줌계정':'별도 안내','회의ID':'별도 안내','회의PW':'별도 안내'
 };
 return String(template.body||'').replace(/\{([^}]+)\}/g,(whole,k)=>vals[k]!=null?vals[k]:whole);
}
function messages(){let tpl=byId(db.templates,messageTemplate)||db.templates[0]||EMPTY_TEMPLATES[0];let h=heading('문자 템플릿','학생에게 보낼 메시지를 미리 만들고, 이름과 과정 정보를 자동으로 채워요.','<button class="btn primary" data-add="template">＋ 템플릿 추가</button>')+'<div class="template-grid"><div class="panel"><div class="panel-header"><h3 class="panel-title">저장된 문구</h3></div><div class="template-menu">'+db.templates.map(x=>'<button class="template-choice '+(tpl.id===x.id?'active':'')+'" data-template="'+E(x.id)+'">'+E(x.title)+'</button>').join('')+'</div></div><div class="panel"><div class="panel-header"><h3 class="panel-title">'+E(tpl.title)+'</h3><button class="btn sm" data-edit-template="'+E(tpl.id)+'">문구 수정</button></div><div class="form-grid" style="margin-bottom:15px"><div class="field-group"><label class="field-label">학생 선택</label><select id="messageStudent" class="field"><option value="">학생을 선택하세요</option>'+db.students.map(s=>'<option value="'+E(s.id)+'" '+(messageStudent===s.id?'selected':'')+'>'+E(s.name)+'</option>').join('')+'</select></div><div class="field-group"><label class="field-label">과정 선택</label><select id="messageCourse" class="field"><option value="">학생 등록 과정 / 기본값</option>'+db.courses.map(c=>'<option value="'+E(c.id)+'" '+(messageCourse===c.id?'selected':'')+'>'+E(c.name)+'</option>').join('')+'</select></div></div><div class="msg-preview" id="messagePreview">'+E(fillMessage(tpl))+'</div><div class="flex wrap section-gap"><button class="btn primary" data-action="copy-message">✦ 완성 문구 복사</button><button class="btn" data-action="sms-message">문자 앱 열기</button></div><div class="small muted" style="margin-top:14px">문자는 자동 발송되지 않습니다. 발송 전 내용과 연락처를 확인해 주세요.</div></div></div>';return h}
function settings(){return heading('설정 · 데이터 관리','내 공간을 설정하고 학생 데이터를 안전하게 백업하세요.')+'<div class="panel"><div class="panel-header"><h3 class="panel-title">엑셀 시간표 관리</h3></div><p class="muted">업로드한 시간표_양식.xlsx에 입력된 2개 과정이 등록되어 있어요. 앞으로 동일 양식의 엑셀 파일을 올리면 과정·일정이 자동으로 반영됩니다.</p><button class="btn primary" data-action="xlsx-import">엑셀 시간표 올리기</button></div>'+examplePanel()+'<div class="grid2"><div class="panel"><h3 class="panel-title" style="margin-bottom:20px">프로필 설정</h3><form data-form="settings" class="form-grid"><label class="field-group form-wide"><span class="field-label">멘토명</span><input class="field" name="mentor" maxlength="30" required value="'+E(db.settings.mentor)+'"></label><label class="field-group form-wide"><span class="field-label">소속 표시</span><input class="field" name="branch" maxlength="80" value="'+E(db.settings.branch)+'"></label><div class="form-wide"><button class="btn primary" type="submit">설정 저장</button></div></form></div><div class="panel"><h3 class="panel-title" style="margin-bottom:18px">암호화된 백업 · 복원</h3><div class="alert">학생 정보는 브라우저에서 암호화됩니다. 같은 파일을 다른 PC/휴대폰에서 복원하면 데이터를 옮길 수 있어요. 자동 동기화는 제공하지 않습니다.</div><div class="settings-list"><div class="setting-row"><div><b>암호화 백업 내려받기</b><p>복원하려면 현재 비밀번호가 필요합니다.</p></div><button class="btn primary sm" data-action="backup">백업</button></div><div class="setting-row"><div><b>백업 파일 가져오기</b><p>이 기기의 기존 데이터가 새 파일로 대체됩니다.</p></div><button class="btn sm" data-action="restore">복원</button></div><div class="setting-row"><div><b>학생 CSV 가져오기</b><p>첫 줄: 이름,전화번호,상태,희망분야,메모</p></div><button class="btn sm" data-action="csv-import">CSV</button></div></div></div></div><div class="panel"><div class="panel-header"><h3 class="panel-title">보안 · 데이터 관리</h3></div><div class="setting-row"><div><b>현재 화면 잠그기</b><p>다시 비밀번호를 입력해야 기록을 열 수 있습니다.</p></div><button class="btn" data-action="lock">잠금</button></div><div class="setting-row"><div><b>이 기기의 모든 데이터 삭제</b><p>암호화된 학생 기록을 영구적으로 지웁니다. 복원하려면 별도의 백업 파일이 필요합니다.</p></div><button class="btn danger" data-action="erase">삭제</button></div><div class="small muted" style="margin-top:17px">저장 방식: 이 브라우저의 암호화된 로컬 저장소 · AES-GCM / PBKDF2. GitHub Pages 자체에는 로그인·서버 동기화·푸시 알림 기능이 없습니다. 공용 기기에서 사용하지 마세요.</div></div>'}
function render(){if(!key){authScreen();return}const body={home:dashboard,students:students,courses:courses,calendar:calendar,tasks:tasks,messages:messages,settings:settings}[page]||dashboard;shell(body())}
function dialog(title,body,actions,wide){modal='<div class="modal-shade" data-shade="1"><div class="modal '+(wide?'wide':'')+'" role="dialog" aria-modal="true" aria-label="'+E(title)+'"><div class="modal-head"><h3>'+E(title)+'</h3><button class="modal-close" data-action="close" aria-label="닫기">×</button></div>'+body+(actions||'')+'</div></div>';render();let first=document.querySelector('.modal .field');if(first)first.focus()}
function actions(saveLabel){return '<div class="modal-actions"><button type="button" class="btn" data-action="close">취소</button><button class="btn primary" type="submit">'+(saveLabel||'저장하기')+'</button></div>'}
function options(current,arr){return arr.map(s=>'<option value="'+E(s)+'" '+(current===s?'selected':'')+'>'+E(s)+'</option>').join('')}
function field(label,name,value,type,wide,extra){return '<label class="field-group '+(wide?'form-wide':'')+'"><span class="field-label">'+E(label)+'</span><input class="field" name="'+name+'" type="'+(type||'text')+'" value="'+E(value||'')+'" '+(extra||'')+'></label>'}
function textarea(label,name,value){return '<label class="field-group form-wide"><span class="field-label">'+E(label)+'</span><textarea class="field" name="'+name+'" rows="4">'+E(value||'')+'</textarea></label>'}
function studentForm(id){let s=byId(db.students,id)||{},body='<form data-form="student" data-id="'+E(id||'')+'"><div class="form-grid">'+field('이름 *','name',s.name,'text',false,'required maxlength="40"')+field('전화번호','phone',s.phone,'tel',false,'maxlength="30"')+field('희망 분야 / 학습 목표','goal',s.goal,'text',false,'placeholder="예: 정보보안 취업" maxlength="100"')+'<label class="field-group"><span class="field-label">상담 상태</span><select class="field" name="status">'+options(s.status||'상담중',['상담중','등록대기','수강중','수료','보류','종료'])+'</select></label>'+field('문의 경로','source',s.source,'text',false,'placeholder="예: 블로그 · 소개" maxlength="80"')+field('다음 연락 예정','nextContact',s.nextContact,'date')+'<label class="field-group form-wide"><span class="field-label">연결 과정</span><select class="field" name="courseId"><option value="">연결된 과정 없음</option>'+db.courses.map(c=>'<option value="'+E(c.id)+'" '+(s.courseId===c.id?'selected':'')+'>'+E(c.name)+'</option>').join('')+'</select></label><label class="field-group form-wide"><span class="field-label">추가 수강 과정</span><select class="field" name="secondCourseId"><option value="">추가 과정 없음</option>'+db.courses.map(c=>'<option value="'+E(c.id)+'" '+(studentCourseIds(s)[1]===c.id?'selected':'')+'>'+E(c.name)+'</option>').join('')+'</select></label>'+textarea('상담 요약 · 특이사항','memo',s.memo)+'</div>'+actions(id?'학생 정보 저장':'학생 등록')+'</form>';dialog(id?'학생 정보 수정':'신규 학생 등록',body)}
function courseForm(id){let c=byId(db.courses,id)||{},body='<form data-form="course" data-id="'+E(id||'')+'"><div class="form-grid">'+field('과정명 *','name',c.name,'text',true,'required maxlength="100" placeholder="예: 정보보안 온라인 과정"')+field('개강일','start',c.start,'date')+field('종강일','end',c.end,'date')+field('수업 요일','days',c.days,'text',false,'placeholder="월~금 / 화·목"')+field('수업 시간','time',c.time,'text',false,'placeholder="09:00 ~ 18:00"')+field('총 회차','total',c.total||1,'number',false,'min="1" max="1000" required')+field('완료 회차','progress',c.progress||0,'number',false,'min="0" max="1000"')+field('진행 방식','mode',c.mode||'온라인','text',false,'placeholder="온라인 / 오프라인"')+field('담당 강사','teacher',c.teacher,'text')+textarea('과정 설명 / 커리큘럼','memo',c.memo)+'</div>'+actions(id?'과정 수정 저장':'과정 등록')+'</form>';dialog(id?'과정 정보 수정':'새 과정 등록',body)}
function taskForm(id){let t=byId(db.tasks,id)||{},body='<form data-form="task" data-id="'+E(id||'')+'"><div class="form-grid">'+field('업무 제목 *','title',t.title,'text',true,'required maxlength="140" placeholder="예: 홍길동 학생 재상담 전화"')+field('예정일','due',t.due||TODAY(),'date')+field('시간','time',t.time,'time')+'<label class="field-group form-wide"><span class="field-label">분류</span><select class="field" name="category">'+options(t.category||'콜백',['콜백','상담','수업','개강준비','서류','기타'])+'</select></label>'+textarea('메모','memo',t.memo)+'</div>'+actions(id?'업무 수정 저장':'할 일 추가')+'</form>';dialog(id?'할 일 수정':'할 일 · 콜백 추가',body)}
function templateForm(id){let t=byId(db.templates,id)||{},body='<form data-form="template" data-id="'+E(id||'')+'"><div class="form-grid">'+field('템플릿 제목 *','title',t.title,'text',true,'required maxlength="70"')+textarea('문자 내용 *','body',t.body)+'</div><div class="alert" style="margin-top:15px">{이름}, {분야}, {과정}, {개강일}, {시간}, {방식}, {상담일}을 사용하면 내용이 자동으로 바뀝니다.</div>'+actions(id?'문구 저장':'템플릿 추가')+'</form>';dialog(id?'문구 수정':'문자 템플릿 추가',body)}
function studentDetail(id){let s=byId(db.students,id);if(!s)return;let log=(s.logs||[]).slice().sort((a,b)=>(b.date||'').localeCompare(a.date||'')),data=[['전화번호',s.phone||'-'],['희망 분야',s.goal||'-'],['문의 경로',s.source||'-'],['연락 예정',niceDate(s.nextContact)],['상담 상태',s.status],['연결 과정',studentCourseNames(s)]];let body='<div class="flex wrap"><div class="detail-title">'+E(s.name)+'</div>'+pill(s.status,statusColor(s.status))+'</div><div class="detail-grid">'+data.map(x=>'<div class="detail-cell"><label>'+E(x[0])+'</label><b>'+E(x[1])+'</b></div>').join('')+'</div><h4>상담 요약</h4><div class="alert" style="white-space:pre-wrap">'+E(s.memo||'아직 남긴 메모가 없습니다.')+'</div><div class="flex wrap section-gap"><strong>상담 기록</strong><button class="btn primary sm" data-add-log="'+E(s.id)+'">＋ 기록 남기기</button></div><div class="timeline">'+(log.length?log.map(x=>'<div class="log-entry"><small>'+E(x.date||'')+'</small><p>'+E(x.body)+'</p></div>').join(''):'<p class="small muted">아직 상담 기록이 없습니다.</p>')+'</div><div class="modal-actions"><button class="btn danger" data-delete-student="'+E(s.id)+'">학생 삭제</button><div class="grow"></div><button class="btn" data-action="close">닫기</button><button class="btn primary" data-edit-student="'+E(s.id)+'">정보 수정</button></div>';dialog('학생 상세 · 상담 히스토리',body,'',true)}
function logForm(id){let s=byId(db.students,id);if(!s)return;dialog(s.name+' · 상담 기록 추가','<form data-form="log" data-id="'+E(id)+'"><div class="form-grid">'+field('기록 날짜','date',TODAY(),'date',true,'required')+textarea('상담 내용 · 다음 안내 사항','body','')+'</div>'+actions('기록 저장')+'</form>')}
function download(name,content,type){let blob=new Blob([content],{type:type||'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000)}
function parseCsv(s){let res=[],row=[],cell='',quoted=false;for(let i=0;i<s.length;i++){let c=s[i];if(quoted){if(c==='"'&&s[i+1]==='"'){cell+='"';i++}else if(c==='"')quoted=false;else cell+=c}else if(c==='"')quoted=true;else if(c===','){row.push(cell);cell=''}else if(c==='\n'){row.push(cell.replace(/\r$/,''));if(row.some(x=>x.trim()))res.push(row);row=[];cell=''}else cell+=c}row.push(cell.replace(/\r$/,''));if(row.some(x=>x.trim()))res.push(row);return res}
async function restoreFile(file){let obj=JSON.parse(await file.text());if(obj.version!==1||!obj.salt||!obj.iv||!obj.data)throw new Error('파일 형식이 맞지 않습니다.');if(!confirm('이 기기의 현재 데이터가 백업 파일로 교체됩니다. 계속할까요?'))return;localStorage.setItem(STORAGE,JSON.stringify(obj));key=null;fresh();authScreen();notify('백업을 가져왔어요. 기존 백업 비밀번호로 잠금 해제하세요.')}
async function importCsv(file){let data=parseCsv((await file.text()).replace(/^\uFEFF/,''));if(data.length<2)throw new Error('표의 두 번째 줄부터 학생 정보를 넣어 주세요.');let head=data[0].map(x=>x.trim()),at=(row,col)=>{let i=head.findIndex(h=>h===col);return i>=0?text(row[i]):''};if(!head.includes('이름'))throw new Error('첫 줄에 이름 열이 필요합니다.');let batch=data.slice(1).filter(r=>at(r,'이름')).slice(0,3000).map(r=>({id:uid(),name:at(r,'이름'),phone:at(r,'전화번호'),status:at(r,'상태')||'상담중',goal:at(r,'희망분야'),source:'CSV 가져오기',nextContact:'',courseId:'',memo:at(r,'메모'),logs:[],updatedAt:new Date().toISOString()}));if(!batch.length)throw new Error('가져올 이름이 없습니다.');if(!confirm(batch.length+'명의 학생을 추가할까요? (기존 학생은 유지됩니다)'))return;db.students.unshift(...batch);await persist();render();notify(batch.length+'명의 학생을 가져왔어요')}
function updateStudentRows(){const e=document.getElementById('studentRows');if(e)e.innerHTML=studentTable(db.students.filter(s=>(studentFilter==='전체'||s.status===studentFilter)&&[s.name,s.goal,s.phone,s.memo,s.source].join(' ').toLowerCase().includes(studentQuery.toLowerCase())))}
document.addEventListener('click',async ev=>{const btn=ev.target.closest('button');if(!btn){if(ev.target.matches('[data-shade]')){modal=null;render()}return}
const ds=btn.dataset;
if(ds.nav){page=ds.nav;modal=null;render();window.scrollTo(0,0);return}
if(ds.add){if(ds.add==='student')studentForm();if(ds.add==='course')courseForm();if(ds.add==='task')taskForm();if(ds.add==='template')templateForm();return}
if(ds.viewStudent){studentDetail(ds.viewStudent);return}
if(ds.editStudent){studentForm(ds.editStudent);return}
if(ds.editCourse){courseForm(ds.editCourse);return}
if(ds.editTask){taskForm(ds.editTask);return}
if(ds.editTemplate){templateForm(ds.editTemplate);return}
if(ds.addLog){logForm(ds.addLog);return}
if(ds.template){messageTemplate=ds.template;render();return}
if(ds.month!==undefined){if(ds.month==='0'){let d=new Date();month=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')}else{let [y,m]=month.split('-').map(Number);let d=new Date(y,m-1+Number(ds.month),1);month=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')}render();return}
if(ds.deleteTask){if(!confirm('이 할 일을 삭제할까요?'))return;db.tasks=db.tasks.filter(t=>t.id!==ds.deleteTask);await persist();render();notify('할 일이 삭제됐어요');return}
if(ds.deleteStudent){if(!confirm('학생과 해당 학생의 상담 기록을 모두 삭제할까요?'))return;db.students=db.students.filter(s=>s.id!==ds.deleteStudent);modal=null;await persist();render();notify('학생이 삭제됐어요');return}
if(!ds.action)return;
switch(ds.action){
case 'close':modal=null;render();break;
case 'lock':key=null;fresh();authScreen();notify('화면을 잠갔어요');break;
case 'add-examples':
case 'apply-reference':{
 if(exampleCount()&&!confirm('저장된 기존 예시만 KAIA DESK 원본 공개 예시로 교체할까요? 직접 등록한 기록은 유지됩니다.'))break;
 clearExamples();seedExamples();await persist();render();notify('KAIA DESK 공개 예시 반영 완료: 학생 5명 · 과정 7개 · 할 일 3건');break;
}
case 'remove-examples':if(!exampleCount()){notify('삭제할 예시 데이터가 없어요');break}if(!confirm('예시 데이터만 삭제할까요? 직접 등록한 학생 및 기록은 유지됩니다.'))break;clearExamples();await persist();render();notify('예시 데이터만 삭제했어요');break;
case 'backup':await saveChain;download('sobin-desk-encrypted-'+TODAY()+'.json',localStorage.getItem(STORAGE),'application/json');notify('암호화된 백업 파일을 저장했어요');break;
case 'restore':document.getElementById('restoreInput').click();break;
case 'csv-import':document.getElementById('csvInput').click();break;
case 'xlsx-import':document.getElementById('scheduleInput').click();break;
case 'erase':if(prompt('삭제하면 되돌릴 수 없습니다. 계속하려면 "삭제"를 입력해 주세요.')!=='삭제')return;await saveChain;localStorage.removeItem(STORAGE);key=null;fresh();authScreen();notify('이 기기의 기록을 삭제했어요');break;
case 'progress':{let c=byId(db.courses,ds.id);if(!c)return;let val=prompt('현재까지 진행된 회차를 입력하세요. (총 '+c.total+'회)',c.progress||0);if(val===null)return;let n=Number(val);if(!Number.isInteger(n)||n<0||n>Number(c.total||1)){notify('0부터 총 회차까지 입력해 주세요');return}c.progress=n;await persist();render();notify('진도를 수정했어요');break}
case 'copy-message':{let tp=byId(db.templates,messageTemplate)||db.templates[0];if(!tp)return;try{await navigator.clipboard.writeText(fillMessage(tp));notify('문자 내용을 복사했어요')}catch(e){notify('복사 권한을 허용해 주세요')}break}
case 'sms-message':{let tp=byId(db.templates,messageTemplate)||db.templates[0],s=byId(db.students,messageStudent);if(!tp)return;let phone=(s?.phone||'').replace(/[^\d+]/g,'');window.location.href='sms:'+phone+'?body='+encodeURIComponent(fillMessage(tp));break}
}});
document.addEventListener('change',ev=>{let el=ev.target;if(el.matches('[data-toggle-task]')){let t=byId(db.tasks,el.dataset.toggleTask);if(t){t.done=el.checked;persist();render()}}if(el.id==='studentFilter'){studentFilter=el.value;updateStudentRows()}if(el.id==='messageStudent'){messageStudent=el.value;render()}if(el.id==='messageCourse'){messageCourse=el.value;render()}});
document.addEventListener('input',ev=>{if(ev.target.id==='studentSearch'){studentQuery=ev.target.value;updateStudentRows()}});
document.addEventListener('submit',async ev=>{let form=ev.target;if(!form.dataset.form)return;ev.preventDefault();let type=form.dataset.form,fd=new FormData(form),get=k=>text(fd.get(k)),id=form.dataset.id;const submit=form.querySelector('[type="submit"]');if(submit)submit.disabled=true;
try{
if(type==='setup'){let p=get('password');if(p.length<8)throw new Error('8자 이상 비밀번호를 입력해 주세요.');if(p!==get('confirm'))throw new Error('비밀번호 확인이 다릅니다.');await setup(p);return}
if(type==='unlock'){await unlock(get('password'));return}
if(!key)throw new Error('화면 잠금 상태입니다.');
if(type==='student'){let old=byId(db.students,id);let student={id:id||uid(),name:get('name'),phone:get('phone'),goal:get('goal'),status:get('status')||'상담중',source:get('source'),nextContact:get('nextContact'),example:old?.example||false,courseId:get('courseId'),courseIds:[get('courseId'),get('secondCourseId')].filter((v,i,a)=>v&&a.indexOf(v)===i),memo:get('memo'),logs:old?.logs||[],updatedAt:new Date().toISOString()};if(!student.name)throw new Error('학생 이름을 입력해 주세요.');if(old)Object.assign(old,student);else db.students.unshift(student);modal=null;await persist();render();notify('학생 기록이 저장됐어요');return}
if(type==='course'){let old=byId(db.courses,id);let c={id:id||uid(),name:get('name'),start:get('start'),end:get('end'),days:get('days'),example:old?.example||false,time:get('time'),total:Number(get('total')||1),progress:Number(get('progress')||0),mode:get('mode'),teacher:get('teacher'),memo:get('memo')};if(!c.name)throw new Error('과정명을 입력해 주세요.');if(c.start&&c.end&&c.end<c.start)throw new Error('종강일은 개강일 이후여야 합니다.');if(c.progress>c.total||c.progress<0)throw new Error('진행 회차가 총 회차를 초과했습니다.');if(old){if(old.start!==c.start||old.end!==c.end||old.days!==c.days||old.total!==c.total){delete old.sessionDates;delete old.progressDetails;delete old.daysB}Object.assign(old,c)}else db.courses.push(c);modal=null;await persist();render();notify('과정 정보가 저장됐어요');return}
if(type==='task'){let old=byId(db.tasks,id),t={id:id||uid(),title:get('title'),due:get('due'),time:get('time'),category:get('category'),memo:get('memo'),done:old?.done||false,example:old?.example||false};if(!t.title)throw new Error('제목을 입력해 주세요.');if(old)Object.assign(old,t);else db.tasks.unshift(t);modal=null;await persist();render();notify('할 일이 저장됐어요');return}
if(type==='template'){let old=byId(db.templates,id),t={id:id||uid(),title:get('title'),body:get('body'),example:old?.example||false};if(!t.title||!t.body)throw new Error('제목과 문구를 입력해 주세요.');if(old)Object.assign(old,t);else db.templates.push(t);messageTemplate=t.id;modal=null;await persist();render();notify('문자 템플릿이 저장됐어요');return}
if(type==='log'){let s=byId(db.students,id);if(!s)throw new Error('학생을 찾지 못했습니다.');if(!get('body'))throw new Error('상담 내용을 입력해 주세요.');if(!s.logs)s.logs=[];s.logs.push({id:uid(),date:get('date')||TODAY(),body:get('body')});s.updatedAt=new Date().toISOString();modal=null;await persist();studentDetail(id);notify('상담 기록을 추가했어요');return}
if(type==='settings'){db.settings.mentor=get('mentor')||'멘토';db.settings.branch=get('branch');await persist();render();notify('설정을 저장했어요');return}
}catch(e){notify(e.message==='invalid'?'올바른 백업 파일이 아닙니다.':type==='unlock'?'비밀번호가 올바르지 않거나 파일이 손상됐습니다.':e.message||'작업에 실패했습니다.')}finally{if(submit)submit.disabled=false}
});
document.getElementById('restoreInput').addEventListener('change',async ev=>{let file=ev.target.files[0];if(!file)return;try{await restoreFile(file)}catch(e){notify('복원 실패: '+e.message)}ev.target.value=''});
document.getElementById('csvInput').addEventListener('change',async ev=>{let file=ev.target.files[0];if(!file)return;try{await importCsv(file)}catch(e){notify('가져오기 실패: '+e.message)}ev.target.value=''});
document.getElementById('scheduleInput').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;try{await importTimetableFile(f)}catch(err){notify('시간표 가져오기 실패: '+err.message)}e.target.value=''});
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal){modal=null;render()}});

/* 홈 대시보드 시계는 서버 없이 기기 시계로 갱신됩니다. */
if(typeof window!=='undefined'&&typeof window.setInterval==='function'){
 window.setInterval(()=>{
  const clock=document.getElementById('desk-live-clock'),sec=document.getElementById('desk-live-seconds');
  if(!clock||!sec)return;
  const d=new Date();
  clock.textContent=String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
  sec.textContent=':'+String(d.getSeconds()).padStart(2,'0');
 },1000);
}

authScreen();
