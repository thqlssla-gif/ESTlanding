'use strict';
/* KAIA DESK workflow enhancement adapted from the supplied SHOP DESK demo.
   Uses the existing encrypted db, persist() and UI. No remote student data transfer. */
(()=>{
 if(typeof render!=='function'||typeof shell!=='function'||typeof db==='undefined')return;
 let followFilter='urgent',workFilter='open',searchQuery='';
 tabs.splice(2,0,['followups','학생 콜백'],['search','통합 검색']);
 const dayPlus=n=>{const d=new Date(TODAY()+'T12:00:00');d.setDate(d.getDate()+n);return iso(d)};
 const relevant=()=>db.students.filter(x=>x.status!=='종료');
 const stateOf=s=>!s.nextContact?'unset':s.nextContact<TODAY()?'overdue':s.nextContact===TODAY()?'due':'future';
 const statusOf=s=>{const c=stateOf(s);return c==='unset'?'일정 미지정':c==='overdue'?'연락 지연 · '+niceDate(s.nextContact):c==='due'?'오늘 연락':niceDate(s.nextContact)+' 예정'};
 const resultRow=s=>'<div class="desk-flow-item '+stateOf(s)+'"><div class="flow-avatar">'+E((s.name||'?').slice(0,1))+'</div><div class="flow-info"><strong>'+E(s.name)+'</strong><small>'+E(s.goal||'희망 분야 미입력')+' · '+E(s.phone||'연락처 미입력')+' · '+E(s.status||'')+'</small></div><span class="desk-badge '+stateOf(s)+'">'+E(statusOf(s))+'</span><div class="flow-actions"><button class="btn sm" data-view-student="'+E(s.id)+'">상담 기록</button><button class="btn sm primary" data-contact-student="'+E(s.id)+'">연락 기록</button></div></div>';
 const counts=()=>{
  const list=relevant(),t=TODAY(),w=dayPlus(7);
  return [['지난 연락일',list.filter(s=>s.nextContact&&s.nextContact<t).length,'late'],['오늘 연락',list.filter(s=>s.nextContact===t).length,'today'],['7일 내',list.filter(s=>s.nextContact>t&&s.nextContact<=w).length,'week'],['일정 미지정',list.filter(s=>!s.nextContact).length,'done']].map(x=>'<div class="desk-mini-stat '+x[2]+'"><span class="mini-label">'+x[0]+'</span><strong>'+x[1]+'</strong></div>').join('');
 };
 function followups(){
  const t=TODAY(),w=dayPlus(7);
  const list=relevant().filter(s=>followFilter==='all'?true:followFilter==='urgent'?!!s.nextContact&&s.nextContact<=t:followFilter==='week'?s.nextContact>t&&s.nextContact<=w:followFilter==='later'?s.nextContact>w:!s.nextContact).sort((a,b)=>(a.nextContact||'9999').localeCompare(b.nextContact||'9999')||a.name.localeCompare(b.name,'ko'));
  return heading('학생 콜백 관리','지연된 연락부터 확인하고 상담 결과와 다음 연락일을 함께 기록하세요.','<button class="btn primary" data-add="student">＋ 학생 등록</button>')+
   '<div class="desk-workflow"><div class="desk-mini-stats">'+counts()+'</div><div class="panel"><div class="desk-workflow-head" style="margin-bottom:15px"><div><h3>학생 연락 일정</h3><p>완료한 연락은 학생의 상담 히스토리에 남습니다.</p></div><button class="btn sm" data-action="quick-find">전체 검색</button></div>'+
   '<div class="desk-filter-bar">'+[['urgent','지연·오늘'],['week','향후 7일'],['later','그 이후'],['unset','미지정'],['all','전체']].map(x=>'<button data-follow-filter="'+x[0]+'" class="'+(followFilter===x[0]?'on':'')+'">'+x[1]+'</button>').join('')+'</div>'+
   '<div class="desk-flow-list">'+(list.length?list.map(resultRow).join(''):'<div class="empty">이 조건에 해당하는 학생이 없습니다.</div>')+'</div></div></div>';
 }
 function homeFollowups(){
  const urgent=relevant().filter(s=>s.nextContact&&s.nextContact<=TODAY()).sort((a,b)=>a.nextContact.localeCompare(b.nextContact));
  return '<section class="desk-home-followups"><div class="desk-workflow-head" style="margin-bottom:12px"><div><h3>학생 연락 체크 <span class="desk-badge">'+urgent.length+'명 확인 필요</span></h3><p>지난 연락일과 오늘 연락할 학생을 먼저 확인해요.</p></div><button class="btn sm" data-nav="followups">콜백 관리 →</button></div>'+
   (urgent.length?'<div class="desk-flow-list">'+urgent.slice(0,3).map(resultRow).join('')+'</div>':'<p class="small muted">오늘까지 연락할 학생이 없습니다.</p>')+'</section>';
 }
 const originalDashboard=dashboard;
 dashboard=function(){return originalDashboard()+homeFollowups()};
 function searchResults(){
  const q=searchQuery.trim().toLocaleLowerCase('ko-KR');
  const includes=values=>values.map(v=>String(v||'')).join(' ').toLocaleLowerCase('ko-KR').includes(q);
  const a=db.students.filter(x=>includes([x.name,x.phone,x.goal,x.status,x.source,x.memo,studentCourseNames(x)])).slice(0,35);
  const b=db.courses.filter(x=>includes([x.name,x.time,x.days,x.memo,x.teacher])).slice(0,20);
  const c=db.tasks.filter(x=>includes([x.title,x.category,x.memo,byId(db.students,x.studentId)?.name])).slice(0,25);
  const item=(title,sub,button)=>'<div class="desk-search-result"><div class="grow"><b>'+E(title)+'</b><small>'+E(sub)+'</small></div>'+button+'</div>';
  return '<div class="desk-search-group"><h3>학생 <small>'+a.length+'명 표시</small></h3>'+
   (a.length?a.map(x=>item(x.name,(x.goal||x.status)+' · '+(x.phone||'연락처 없음'),'<button class="btn sm" data-view-student="'+E(x.id)+'">상담 보기</button>')).join(''):'<p class="small muted">학생 결과가 없습니다.</p>')+'</div>'+
   '<div class="desk-search-group"><h3>과정 <small>'+b.length+'개 표시</small></h3>'+
   (b.length?b.map(x=>item(x.name,niceDate(x.start)+' ~ '+niceDate(x.end),'<button class="btn sm" data-edit-course="'+E(x.id)+'">과정 보기</button>')).join(''):'<p class="small muted">과정 결과가 없습니다.</p>')+'</div>'+
   '<div class="desk-search-group"><h3>할 일 <small>'+c.length+'개 표시</small></h3>'+
   (c.length?c.map(x=>item(x.title,niceDate(x.due)+' · '+(x.done?'완료':x.category||'진행 중'),'<button class="btn sm" data-edit-task="'+E(x.id)+'">업무 보기</button>')).join(''):'<p class="small muted">업무 결과가 없습니다.</p>')+'</div>';
 }
 function searchDesk(){
  return heading('통합 검색','학생·상담 내용·과정·업무를 한 번에 찾아보세요.')+
   '<div class="panel"><label class="field-label" for="globalSearch">전체 기록 검색</label>'+
   '<input id="globalSearch" class="desk-search-input" type="search" autocomplete="off" placeholder="학생 이름, 전화번호, 과정명, 상담 키워드…" value="'+E(searchQuery)+'">'+
   '<div class="desk-search-hint">Ctrl+K (Mac: ⌘+K) 또는 / 키로 검색을 열 수 있어요. 기록은 이 브라우저에서만 검색합니다.</div>'+
   '<div id="globalSearchResults">'+searchResults()+'</div></div>';
 }
 function tasksEnhanced(){
  const now=TODAY(),rank={'높음':0,'보통':1,'낮음':2};
  const list=[...db.tasks].sort((a,b)=>Number(!!a.done)-Number(!!b.done)||String(a.due||'9999').localeCompare(String(b.due||'9999'))||(rank[a.priority||'보통']-rank[b.priority||'보통'])).filter(t=>workFilter==='open'?!t.done:workFilter==='due'?!t.done&&t.due&&t.due<=now:workFilter==='done'?t.done:true);
  let h=heading('할 일 · 콜백','학생과 업무를 연결하고 기한 및 우선순위를 관리해요.','<button class="btn primary" data-add="task">＋ 할 일 추가</button>')+
   '<div class="panel"><div class="panel-header"><h3 class="panel-title">업무 체크리스트</h3>'+pill(db.tasks.filter(t=>!t.done).length+'건 진행 중')+'</div>'+
   '<div class="desk-filter-bar">'+[['open','진행 중'],['due','오늘·지연'],['done','완료'],['all','전체']].map(x=>'<button data-work-filter="'+x[0]+'" class="'+(workFilter===x[0]?'on':'')+'">'+x[1]+'</button>').join('')+'</div>';
  h+=list.length?list.map(t=>{
   const student=byId(db.students,t.studentId),pri=t.priority||'보통',tone=pri==='높음'?'priority-high':pri==='낮음'?'priority-low':'priority-normal';
   return '<div class="task-line"><input type="checkbox" class="task-check" data-toggle-task="'+E(t.id)+'" '+(t.done?'checked':'')+' aria-label="업무 완료"><div class="grow"><div class="task-title '+(t.done?'task-done':'')+'">'+E(t.title)+' <span class="desk-badge '+tone+'">'+E(pri)+'</span></div><div class="task-note">'+E(niceDate(t.due))+(t.time?' · '+E(t.time):'')+(t.category?' · '+E(t.category):'')+(student?' · '+E(student.name):'')+(t.memo?' · '+E(t.memo):'')+'</div></div>'+
    pill(t.done?'완료':t.due&&t.due<now?'기한 초과':t.due===now?'오늘':'예정',t.done?'gray':t.due&&t.due<=now?'red':'')+
    (student?'<button class="btn sm" data-view-student="'+E(student.id)+'">학생</button>':'')+
    '<button class="btn sm" data-edit-task="'+E(t.id)+'">수정</button><button class="btn sm danger" data-delete-task="'+E(t.id)+'">삭제</button></div>';
  }).join(''):'<div class="empty">해당 조건의 업무가 없습니다.</div>';
  return h+'</div>';
 }
 tasks=tasksEnhanced;
 const baseTaskForm=taskForm;
 taskForm=function(id){
  baseTaskForm(id);
  const t=byId(db.tasks,id)||{},f=document.querySelector('.modal form[data-form="task"]');if(!f)return;
  const spot=f.querySelector('select[name="category"]')?.closest('label');if(!spot)return;
  spot.insertAdjacentHTML('afterend',
   '<label class="field-group"><span class="field-label">우선순위</span><select class="field" name="priority">'+options(t.priority||'보통',['높음','보통','낮음'])+'</select></label>'+
   '<label class="field-group form-wide"><span class="field-label">연결 학생</span><select class="field" name="studentId"><option value="">학생 연결 안 함</option>'+db.students.map(s=>'<option value="'+E(s.id)+'" '+(t.studentId===s.id?'selected':'')+'>'+E(s.name)+'</option>').join('')+'</select></label>');
 };
 function contactForm(id){
  const s=byId(db.students,id);if(!s)return;
  dialog(s.name+' · 연락 결과 기록','<form data-form="contact" data-id="'+E(id)+'"><div class="form-grid">'+
   field('연락 날짜','date',TODAY(),'date',false,'required')+
   field('다음 연락 예정일 (비우면 미지정)','nextContact',s.nextContact,'date')+
   textarea('상담·연락 내용 *','body','')+'</div>'+actions('상담 기록 저장')+'</form>');
 }
 const baseShell=shell;
 shell=function(body){
  baseShell(body);
  const nav=document.querySelector('.desk-nav'),actions=document.querySelector('.desk-actions');
  if(nav){
   const existing=nav.querySelector('[data-nav="calendar"]');
   const b=document.createElement('button');b.dataset.nav='followups';b.className=page==='followups'?'active':'';
   b.innerHTML=icon('bell')+'<span>콜백</span>';b.setAttribute('aria-label','학생 콜백 관리');
   nav.insertBefore(b,existing);
  }
  if(actions){
   const b=document.createElement('button');b.type='button';b.dataset.action='quick-find';
   b.className='desk-icon-action search-launch';b.title='통합 검색 (Ctrl+K)';b.setAttribute('aria-label','통합 검색');
   b.innerHTML=icon('students')+'<span>검색</span>';actions.insertBefore(b,actions.firstChild);
  }
 };
 const baseRender=render;
 render=function(){
  if(!key){baseRender();return;}
  if(page==='followups'||page==='search'){shell(page==='followups'?followups():searchDesk());return;}
  baseRender();
 };
 function csvExport(){
  if(!confirm('CSV는 암호화되지 않은 개인정보 파일입니다. 안전한 위치에 저장하시겠습니까?'))return;
  const rows=[['이름','전화번호','상태','희망분야','문의경로','다음연락일','연결과정','메모'],...db.students.map(s=>[s.name,s.phone,s.status,s.goal,s.source,s.nextContact,studentCourseNames(s),s.memo])];
  const quote=v=>'"'+String(v==null?'':v).replace(/"/g,'""')+'"';
  download('kaia-students-'+TODAY()+'.csv','\uFEFF'+rows.map(r=>r.map(quote).join(',')).join('\r\n'),'text/csv;charset=utf-8');
  notify('학생 CSV를 내보냈어요. 개인정보 파일은 안전하게 보관하세요.');
 }
 const baseStudents=students;
 students=function(){return baseStudents().replace('data-action="csv-import"','data-action="csv-export">CSV 내보내기</button><button class="btn sm" data-action="csv-import"');};
 const baseSettings=settings;
 settings=function(){return baseSettings()+'<div class="panel"><div class="panel-header"><h3 class="panel-title">학생 목록 내보내기</h3></div><p class="muted">학생 명단을 엑셀에서 열 수 있는 CSV로 저장합니다. 암호화 백업과 달리 CSV에는 개인정보가 포함됩니다.</p><button class="btn" data-action="csv-export">학생 CSV 내보내기</button></div>';};
 document.addEventListener('click',ev=>{
  const b=ev.target.closest('button');if(!b||!key)return;
  const d=b.dataset;
  if(d.followFilter){followFilter=d.followFilter;render();return;}
  if(d.workFilter){workFilter=d.workFilter;render();return;}
  if(d.contactStudent){contactForm(d.contactStudent);return;}
  if(d.action==='quick-find'){page='search';modal=null;render();document.getElementById('globalSearch')?.focus();return;}
  if(d.action==='csv-export'){csvExport();return;}
 });
 document.addEventListener('input',ev=>{
  if(ev.target.id==='globalSearch'){searchQuery=ev.target.value;const el=document.getElementById('globalSearchResults');if(el)el.innerHTML=searchResults();}
 });
 // Capture only the two upgraded forms, keeping original behavior for all others.
 document.addEventListener('submit',async ev=>{
  const form=ev.target,type=form.dataset.form;
  if(type!=='contact'&&type!=='task')return;
  ev.preventDefault();ev.stopImmediatePropagation();
  if(!key)return;
  const fd=new FormData(form),get=k=>String(fd.get(k)||'').trim(),id=form.dataset.id;
  const submit=form.querySelector('[type="submit"]');if(submit)submit.disabled=true;
  try{
   if(type==='contact'){
    const s=byId(db.students,id);if(!s)throw Error('학생 정보를 찾지 못했습니다.');
    const memo=get('body');if(!memo)throw Error('상담·연락 내용을 적어 주세요.');
    (s.logs||(s.logs=[])).push({id:uid(),date:get('date')||TODAY(),body:memo});
    s.nextContact=get('nextContact');s.updatedAt=new Date().toISOString();
   }else{
    const old=byId(db.tasks,id),title=get('title');if(!title)throw Error('업무 제목을 입력해 주세요.');
    const item={id:id||uid(),title,due:get('due'),time:get('time'),category:get('category'),
      priority:get('priority')||'보통',studentId:get('studentId'),memo:get('memo'),done:!!old?.done,example:!!old?.example};
    if(old)Object.assign(old,item);else db.tasks.unshift(item);
   }
   modal=null;await persist();render();notify(type==='contact'?'상담 기록과 다음 연락일을 저장했어요':'업무를 저장했어요');
  }catch(e){notify(e.message||'저장에 실패했습니다.');if(submit)submit.disabled=false;}
 },true);
 window.addEventListener('keydown',ev=>{
  if(!key||modal)return;
  const tag=ev.target?.tagName||'',editing=/INPUT|TEXTAREA|SELECT/.test(tag)||!!ev.target?.isContentEditable;
  if(((ev.ctrlKey||ev.metaKey)&&ev.key.toLowerCase()==='k')||(ev.key==='/'&&!editing)){
   ev.preventDefault();page='search';render();document.getElementById('globalSearch')?.focus();
  }
 });
})();