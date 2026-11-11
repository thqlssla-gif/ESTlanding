'use strict';
/* KAIA DESK student spreadsheet and reference-site workflow enhancements.
   Personal data is read in the browser and stored through the existing encrypted DB. */
(function(){
  if(typeof db==='undefined'||typeof students!=='function'||typeof settings!=='function')return;
  const COLS=['이름','전화번호','상태','희망분야','문의경로','다음연락일','연결과정','추가과정','메모','상담일'];
  const STATES=['상담중','등록대기','수강중','수료','보류','종료'];
  const ALIASES={
    name:['이름','학생명','성명','학생이름','고객명','name'],
    phone:['전화번호','연락처','휴대폰','휴대폰번호','핸드폰','핸드폰번호','휴대전화','phone','mobile'],
    status:['상태','상담상태','진행상태','수강상태','status'],
    goal:['희망분야','준비분야','관심분야','관심과정','학습목표','수강목적','goal','field'],
    source:['문의경로','문의출처','유입경로','유입출처','출처','source'],
    nextContact:['다음연락일','다음연락예정','다음연락예정일','콜백일','재연락일','연락예정','연락예정일','nextcontact'],
    course:['연결과정','수강과정','과정명','교육과정','등록과정','course'],
    secondCourse:['추가과정','추가수강과정','두번째과정','secondcourse'],
    memo:['메모','상담메모','상담내용','상담요약','특이사항','비고','memo','notes'],
    consultDate:['상담일','상담날짜','최초상담일','consultdate']
  };
  const INPUTS=[
    ['sheet','학생 엑셀 업로드','.xlsx,.xls,.csv'],
    ['legacy','이전 프로그램 JSON 가져오기','.json,application/json']
  ];
  const inputs={};
  INPUTS.forEach(function(cfg){
    const input=document.createElement('input');
    input.type='file';input.accept=cfg[2];input.hidden=true;
    input.setAttribute('aria-label',cfg[1]);
    document.body.appendChild(input);inputs[cfg[0]]=input;
  });
  let pending=null;
  const norm=function(s){return String(s==null?'':s).trim().toLowerCase().replace(/[\s_\-()·./]/g,'')};
  const cell=function(v){return String(v==null?'':v).trim()};
  const short=function(v,n){return cell(v).slice(0,n)};
  const uniqueKey=function(s){
    const name=norm(s.name),phone=cell(s.phone).replace(/\D/g,'');
    return name ? (phone.length>=8?'p:'+name+':'+phone:'n:'+name+':'+(phone||'blank')) : '';
  };
  const safeUrl=function(s){return /^https:\/\//i.test(s)?s:''};
  function dateValue(v){
    if(v===null||v===undefined||v==='')return '';
    if(v instanceof Date&&!isNaN(v))return v.getFullYear()+'-'+String(v.getMonth()+1).padStart(2,'0')+'-'+String(v.getDate()).padStart(2,'0');
    let t=cell(v).replace(/년|월/g,'-').replace(/일/g,'').replace(/[./]/g,'-');
    if(/^\d{5}$/.test(t)&&typeof XLSX!=='undefined'&&XLSX.SSF){
      const d=XLSX.SSF.parse_date_code(Number(t));
      if(d)return d.y+'-'+String(d.m).padStart(2,'0')+'-'+String(d.d).padStart(2,'0');
    }
    const m=t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if(!m)return null;
    const y=+m[1],mo=+m[2],d=+m[3],dt=new Date(y,mo-1,d);
    if(y<2000||y>2100||dt.getFullYear()!==y||dt.getMonth()!==mo-1||dt.getDate()!==d)return null;
    return y+'-'+String(mo).padStart(2,'0')+'-'+String(d).padStart(2,'0');
  }
  function mapHeader(h){
    const out={};h.forEach(function(v,i){const n=norm(v);Object.keys(ALIASES).forEach(function(k){if(out[k]===undefined&&ALIASES[k].some(function(s){return norm(s)===n}))out[k]=i})});return out;
  }
  function normalizeStatus(v){
    const s=cell(v);
    if(!s)return '상담중';
    if(STATES.includes(s))return s;
    const dict={'상담예정':'상담중','상담완료':'상담중','등록예정':'등록대기','등록완료':'수강중','수강':'수강중','수업중':'수강중','진행중':'수강중','수료완료':'수료','휴면':'보류','상담보류':'보류','미진행':'보류','종결':'종료'};
    return dict[s]||null;
  }
  function rowsFromSheet(workbook){
    const target=workbook.SheetNames.find(function(s){return /학생|명단|student/i.test(s)})||workbook.SheetNames[0];
    if(!target)throw Error('읽을 시트가 없습니다.');
    const grid=XLSX.utils.sheet_to_json(workbook.Sheets[target],{header:1,defval:'',raw:false,blankrows:false});
    if(grid.length<2)throw Error('첫 줄에 제목을 넣고, 두 번째 줄부터 학생을 입력해 주세요.');
    const header=mapHeader(grid[0]||[]);
    if(header.name===undefined)throw Error('첫 번째 줄에 반드시 "이름" 열이 있어야 합니다.');
    if(grid.length>3001)throw Error('한 번에 최대 3,000명까지 등록할 수 있습니다. 파일을 나누어 주세요.');
    return grid.slice(1).map(function(arr,i){
      const v=function(k){return header[k]===undefined?'':arr[header[k]]};
      return {line:i+2,name:short(v('name'),40),phone:short(v('phone'),30),
        status:v('status'),goal:short(v('goal'),100),source:short(v('source'),80),
        nextContact:v('nextContact'),course:short(v('course'),160),
        secondCourse:short(v('secondCourse'),160),memo:short(v('memo'),12000),
        consultDate:v('consultDate')};
    });
  }
  function rowsFromLegacy(data){
    let a=Array.isArray(data)?data:
      Array.isArray(data.students)?data.students:
      Array.isArray(data.data&&data.data.students)?data.data.students:
      Array.isArray(data.records)?data.records:null;
    if(!a)throw Error('이전 프로그램의 학생 목록을 찾지 못했어요. 암호화 백업은 설정의 "복원" 기능을 이용해 주세요.');
    if(a.length>3000)throw Error('한 번에 최대 3,000명까지 가져올 수 있습니다.');
    return a.map(function(v,i){
      const get=function(k){const names=[k].concat(ALIASES[k]||[]);for(const n of names){if(v[n]!==undefined&&v[n]!==null)return v[n];}return ''};
      return {line:i+1,name:short(get('name'),40),phone:short(get('phone'),30),
        status:get('status'),goal:short(get('goal'),100),source:short(get('source'),80),
        nextContact:get('nextContact'),course:short(get('course')||v.courseName,160),
        secondCourse:short(get('secondCourse'),160),memo:short(get('memo'),12000),
        consultDate:get('consultDate'),logs:Array.isArray(v.logs)?v.logs:[]};
    });
  }
  function parseRows(raw){
    const seen=new Set();
    const keys=new Set(db.students.map(uniqueKey).filter(Boolean));
    return raw.map(function(x){
      let row=Object.assign({},x),err='',warning='';
      row.name=cell(row.name);row.phone=cell(row.phone);
      row.status=normalizeStatus(row.status);
      if(!row.name)err='이름 없음';
      else if(!row.status)err='알 수 없는 상담 상태';
      const next=dateValue(row.nextContact),consult=dateValue(row.consultDate);
      if(next===null||consult===null)err=err||'날짜 형식 오류';
      row.nextContact=next||'';row.consultDate=consult||'';
      row._key=uniqueKey(row);
      row._duplicate=keys.has(row._key);
      if(seen.has(row._key))err=err||'파일 안에 중복 학생';
      if(row._key)seen.add(row._key);
      if(!err&&row.phone&&!/^[\d+\-().\s]+$/.test(row.phone))warning='연락처 형식 확인';
      row._error=err;row._warning=warning;
      return row;
    });
  }
  const getCourse=function(name){
    const n=norm(name);
    return n?db.courses.find(function(c){return norm(c.name)===n}):null;
  };
  function showPreview(){
    if(!pending)return;
    const valid=pending.rows.filter(function(x){return !x._error});
    const dup=valid.filter(function(x){return x._duplicate}).length;
    const bad=pending.rows.length-valid.length;
    const unlinked=valid.filter(function(x){return (x.course&&!getCourse(x.course))||(x.secondCourse&&!getCourse(x.secondCourse))}).length;
    const data= pending.rows.slice(0,15).map(function(s){
      const reason=s._error|| (s._duplicate?'기존 학생':'신규')+(s._warning?' · '+s._warning:'');
      return '<tr><td>'+E(String(s.line))+'</td><td>'+E(s.name||'—')+'</td><td>'+E(s.phone||'—')+'</td><td>'+E(s.status||'오류')+'</td><td>'+E(s.goal||'—')+'</td><td>'+E(reason)+'</td></tr>';
    }).join('');
    const content='<div class="bulk-counts"><div><b>'+valid.length+'</b><span>형식 정상</span></div><div><b>'+dup+'</b><span>기존 학생 일치</span></div><div><b>'+bad+'</b><span>검토 필요</span></div><div><b>'+unlinked+'</b><span>과정명 미일치</span></div></div>'+
      '<p class="muted small">파일: '+E(pending.name)+' · 전체 '+pending.rows.length+'행 (미리보기는 15행). 이름과 전화번호가 모두 같으면 중복으로 판단해요. 강의 과정명이 일치할 때만 자동 연결됩니다.</p>'+
      '<div class="table-wrap bulk-table"><table class="table"><thead><tr><th>행</th><th>이름</th><th>연락처</th><th>상태</th><th>희망 분야</th><th>확인</th></tr></thead><tbody>'+data+'</tbody></table></div>'+
      (bad?'<p class="bulk-warning">형식 오류 '+bad+'행은 등록하지 않습니다. 파일 내부의 중복도 건너뜁니다.</p>':'')+
      (unlinked?'<p class="bulk-warning">과정명이 기존 등록 과정과 다르면 연결 없이 학생만 등록됩니다.</p>':'')+
      '<div class="bulk-options"><strong>이미 있는 학생 처리</strong><label><input type="radio" name="bulkMode" value="skip" checked> 기존 정보 유지 · 중복 제외 (권장)</label><label><input type="radio" name="bulkMode" value="update"> 빈칸이 아닌 항목만 기존 정보에 반영 · 상담 기록 보존</label></div>'+
      '<div class="modal-actions"><button type="button" class="btn" data-action="bulk-cancel">취소</button><button type="button" class="btn primary" data-action="bulk-confirm">확인 후 학생 등록</button></div>';
    dialog('학생 명단 가져오기 · 등록 전 확인',content,'',true);
  }
  async function chooseFile(f,kind){
    if(!key)throw Error('잠금 해제 후 이용해 주세요.');
    if(f.size>12*1024*1024)throw Error('파일은 12MB 이하로 올려 주세요.');
    let raw;
    if(kind==='legacy'){
      let parsed;
      try{parsed=JSON.parse(await f.text())}catch(e){throw Error('JSON 형식을 읽을 수 없습니다.')}
      raw=rowsFromLegacy(parsed);
    }else{
      if(/\.csv$/i.test(f.name)){
        let content=await f.text();
        let arr=typeof parseCsv==='function'?parseCsv(content.replace(/^\uFEFF/,'')):null;
        if(!arr||arr.length<2)throw Error('CSV 내용을 읽을 수 없습니다.');
        const header=mapHeader(arr[0]);
        if(header.name===undefined)throw Error('이름 열이 필요합니다.');
        if(arr.length>3001)throw Error('파일은 최대 3,000명까지 지원합니다.');
        raw=arr.slice(1).map(function(x,i){
          const v=function(k){return header[k]===undefined?'':x[header[k]]};
          return {line:i+2,name:short(v('name'),40),phone:short(v('phone'),30),status:v('status'),goal:short(v('goal'),100),
            source:short(v('source'),80),nextContact:v('nextContact'),course:short(v('course'),160),
            secondCourse:short(v('secondCourse'),160),memo:short(v('memo'),12000),consultDate:v('consultDate')};
        });
      }else{
        if(typeof XLSX==='undefined')throw Error('엑셀 처리 프로그램이 로드되지 않았습니다. 인터넷 연결 후 새로고침해 주세요.');
        const wb=XLSX.read(await f.arrayBuffer(),{type:'array',cellDates:true});
        raw=rowsFromSheet(wb);
      }
    }
    if(!raw.length)throw Error('등록할 학생 데이터가 없습니다.');
    pending={name:f.name,rows:parseRows(raw),kind:kind};
    showPreview();
  }
  function convertRow(r){
    const ids=[getCourse(r.course),getCourse(r.secondCourse)].filter(Boolean).map(function(c){return c.id}).filter(function(x,i,a){return a.indexOf(x)===i});
    const logs=[];
    if(r.consultDate&&r.memo)logs.push({id:uid(),date:r.consultDate,body:r.memo});
    if(Array.isArray(r.logs)){
      r.logs.slice(0,500).forEach(function(x){if(!x||typeof x!=='object')return;
        const date=dateValue(x.date)||TODAY(),body=short(x.body||x.memo||x.content,12000);
        if(body)logs.push({id:uid(),date:date,body:body});
      });
    }
    return {name:r.name,phone:r.phone,status:r.status,goal:r.goal,source:r.source||'엑셀 가져오기',
      nextContact:r.nextContact,courseId:ids[0]||'',courseIds:ids,memo:r.memo||'',logs:logs,updatedAt:new Date().toISOString()};
  }
  async function commitImport(){
    if(!pending||!key)throw Error('등록할 파일을 다시 선택해 주세요.');
    const mode=document.querySelector('input[name="bulkMode"]:checked')?.value||'skip';
    const valid=pending.rows.filter(function(r){return !r._error});
    if(!valid.length)throw Error('등록 가능한 학생이 없습니다. 파일을 확인해 주세요.');
    const existing=new Map(db.students.map(function(s){return [uniqueKey(s),s]}));
    const added=[];let updated=0,skipped=0,unlinked=0;
    valid.forEach(function(row){
      if((row.course&&!getCourse(row.course))||(row.secondCourse&&!getCourse(row.secondCourse)))unlinked++;
      const source=convertRow(row);
      const prior=existing.get(row._key);
      if(prior){
        if(mode==='skip'){skipped++;return;}
        ['name','phone','goal','status','source','nextContact'].forEach(function(k){
          if(source[k])prior[k]=source[k];
        });
        if(source.courseIds.length){
          prior.courseIds=Array.from(new Set(studentCourseIds(prior).concat(source.courseIds)));
          prior.courseId=prior.courseIds[0]||'';
        }
        if(source.memo&&source.memo!==prior.memo){
          prior.memo=prior.memo?prior.memo+'\n\n[파일 가져오기 '+TODAY()+']\n'+source.memo:source.memo;
        }
        prior.logs=Array.isArray(prior.logs)?prior.logs:[];
        prior.logs.push.apply(prior.logs,source.logs);
        prior.updatedAt=new Date().toISOString();
        updated++;return;
      }
      const item=Object.assign({id:uid(),example:false},source);
      added.push(item);existing.set(row._key,item);
    });
    if(!added.length&&!updated){pending=null;modal=null;render();notify('추가할 학생이 없어요. 중복 학생은 그대로 유지했어요.');return;}
    db.students.unshift.apply(db.students,added);
    pending=null;modal=null;await persist();await saveChain;render();
    notify('학생 '+added.length+'명 추가 · '+updated+'명 갱신 · '+skipped+'명 중복 제외'+(unlinked?' · 과정 '+unlinked+'명 미연결':''));
  }
  function excelReady(){if(typeof XLSX==='undefined')throw Error('엑셀 기능이 준비되지 않았습니다. 인터넷 연결 후 다시 열어 주세요.');}
  function makeSheet(rows){
    const sh=XLSX.utils.aoa_to_sheet(rows);
    sh['!cols']=[{wch:16},{wch:20},{wch:15},{wch:22},{wch:22},{wch:19},{wch:28},{wch:28},{wch:42},{wch:19}];
    const range=XLSX.utils.decode_range(sh['!ref']);
    for(let i=1;i<=range.e.r;i++){
      const p=sh[XLSX.utils.encode_cell({r:i,c:1})];
      if(p){p.t='s';p.v=String(p.v==null?'':p.v);p.z='@';}
    }
    sh['!autofilter']={ref:'A1:J'+(range.e.r+1)};
    return sh;
  }
  function templateDownload(){
    excelReady();
    const book=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book,makeSheet([COLS,[]]),'학생명단');
    const guide=[
      ['학생 일괄 등록 안내',''],
      ['입력 순서','학생명단 시트의 첫 번째 줄 제목은 지우지 마세요. 두 번째 줄부터 입력합니다.'],
      ['필수 항목','이름만 필수이며 다른 항목은 비워도 됩니다.'],
      ['전화번호','맨 앞 0이 빠지지 않게 텍스트로 입력하세요. (예: 010-1234-5678)'],
      ['상태','상담중 / 등록대기 / 수강중 / 수료 / 보류 / 종료 중 하나'],
      ['날짜','다음연락일과 상담일은 2026-11-20처럼 YYYY-MM-DD 형식'],
      ['연결과정','앱에 등록된 과정명과 정확하게 일치해야 자동 연결됩니다.'],
      ['중복 기준','이름+전화번호가 동일하면 기존 학생으로 분류합니다.'],
      ['기존 정보','기본은 중복 제외. 업로드 전에 기존 데이터 갱신을 선택할 수 있습니다.'],
      ['보안','엑셀 파일은 암호화되지 않습니다. 학원 내부 규정에 따라 안전하게 보관/삭제하세요.'],
      ['예시: 이름','홍길동 (아래 예시는 입력 안내일 뿐, 자동 업로드되지 않습니다)'],
      ['예시: 전화번호','010-1234-5678'],
      ['예시: 상태','상담중']
    ];
    const guideSheet=XLSX.utils.aoa_to_sheet(guide);guideSheet['!cols']=[{wch:22},{wch:96}];
    XLSX.utils.book_append_sheet(book,guideSheet,'작성안내');
    XLSX.writeFile(book,'KAIA_DESK_학생등록_양식.xlsx');
  }
  function exportExcel(){
    excelReady();
    if(!confirm('학생 명단은 암호화되지 않은 엑셀 파일로 저장됩니다. 안전한 위치에 보관하시겠습니까?'))return;
    const data=[COLS].concat(db.students.map(function(s){
      const cs=studentCourseIds(s).map(function(id){return byId(db.courses,id)?.name||''});
      return [s.name||'',String(s.phone||''),s.status||'',s.goal||'',s.source||'',s.nextContact||'',cs[0]||'',cs[1]||'',s.memo||'',Array.isArray(s.logs)&&s.logs[0]?.date||''];
    }));
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,makeSheet(data),'학생명단');
    XLSX.writeFile(wb,'KAIA_DESK_학생명단_'+TODAY()+'.xlsx');
    notify('학생 엑셀을 내보냈어요. 개인정보 파일을 안전하게 보관해 주세요.');
  }
  function showReferenceSettings(){
    const cfg=db.settings||{},rooms=cfg.roomNames||{};
    const f='<form data-form="bulk-extra-settings" class="form-grid">'+
      field('줌 회의 ID','zoomId',cfg.zoomId,'text',false,'maxlength="100"')+
      field('줌 비밀번호','zoomPassword',cfg.zoomPassword,'text',false,'maxlength="100"')+
      field('줌 참여 링크 (HTTPS)','zoomUrl',cfg.zoomUrl,'url',true,'placeholder="https://..." maxlength="500"')+
      field('A 강의실 표시명','roomA',rooms.A||'A','text',false,'maxlength="80"')+
      field('B 강의실 표시명','roomB',rooms.B||'B','text',false,'maxlength="80"')+
      field('C 강의실 표시명','roomC',rooms.C||'C','text',false,'maxlength="80"')+
      '<p class="muted small form-wide">학생 데이터와 동일한 브라우저 암호화 저장소에 보관됩니다. 모든 기기에 자동 동기화되지는 않습니다.</p>'+
      '<div class="form-wide">'+actions('설정 저장')+'</div></form>';
    dialog('온라인 수업 · 강의실 이름 설정',f,'',true);
  }
  const oldStudents=students;
  students=function(){
    return oldStudents().replace('<span class="muted small">총 ',
      '<button class="btn sm" data-action="bulk-template">엑셀 양식</button><button class="btn sm primary" data-action="bulk-pick">엑셀로 학생 추가</button><button class="btn sm" data-action="bulk-export">엑셀 내보내기</button><span class="muted small">총 ');
  };
  const oldSettings=settings;
  settings=function(){
    const html='<div class="panel"><div class="panel-header"><h3 class="panel-title">학생 일괄 관리 · 원본 KAIA DESK 편의 기능</h3></div>'+
      '<p class="muted">기존 학생을 지우지 않고 엑셀로 명단을 추가하거나, 다른 프로그램에서 내보낸 학생 JSON을 가져올 수 있어요.</p>'+
      '<div class="flex wrap"><button class="btn primary" data-action="bulk-pick">학생 엑셀 가져오기</button><button class="btn" data-action="bulk-template">양식 다운로드</button><button class="btn" data-action="bulk-export">학생 엑셀 내보내기</button><button class="btn" data-action="bulk-legacy">이전 프로그램 JSON 가져오기</button></div>'+
      '<p class="muted small" style="margin-top:12px">업로드 파일은 서버/GitHub로 전송하지 않습니다. 암호화된 백업 JSON은 위쪽의 기존 백업 복원을 이용하세요.</p></div>'+
      '<div class="panel"><div class="panel-header"><h3 class="panel-title">줌 계정 · 강의실 이름</h3></div>'+
      '<p class="muted">줌 ID/비밀번호, 강의실 A/B/C의 실제 표시명을 저장하고 문자 문구에 사용할 수 있어요.</p>'+
      '<button class="btn" data-action="bulk-reference">줌 · 강의실 설정</button>'+
      '<p class="muted small" style="margin-top:12px">문자 치환 변수: {줌ID}, {줌비밀번호}, {줌링크}, {강의실}</p></div>'+
      '<div class="panel"><div class="panel-header"><h3 class="panel-title">휴대폰 앱으로 사용</h3></div>'+
      '<p class="muted small">아이폰: Safari 공유 → 홈 화면에 추가. 안드로이드: Chrome 메뉴 → 앱 설치 또는 홈 화면에 추가.</p>'+
      '<p class="muted small">현재 버전은 개인별 암호화 로컬 저장 방식입니다. 원본의 팀원별 서버 로그인·실시간 동기화는 별도 서버 연결과 접근 권한 설정이 필요하여 제공하지 않습니다.</p></div>';
    return oldSettings()+html;
  };
  if(typeof fillMessage==='function'){
    const originalFillMessage=fillMessage;
    fillMessage=function(t){
      let result=originalFillMessage(t),cfg=db.settings||{},rooms=cfg.roomNames||{};
      const s=byId(db.students,messageStudent);
      const c=byId(db.courses,messageCourse)||byId(db.courses,s?.courseId);
      const room=cell(c?.room||''),r=rooms[room]||room;
      const tokens={'줌ID':cfg.zoomId||'미설정','줌비밀번호':cfg.zoomPassword||'미설정',
        '줌링크':safeUrl(cfg.zoomUrl||'')||'미설정','강의실':r||'미정'};
      Object.keys(tokens).forEach(function(k){
        result=result.split('{'+k+'}').join(tokens[k]);
      });
      return result;
    };
  }
  document.addEventListener('click',async function(ev){
    const button=ev.target.closest('button[data-action]');
    if(!button)return;
    const act=button.dataset.action;
    try{
      if(act==='bulk-pick'){inputs.sheet.click();return;}
      if(act==='bulk-template'){templateDownload();return;}
      if(act==='bulk-export'){exportExcel();return;}
      if(act==='bulk-legacy'){inputs.legacy.click();return;}
      if(act==='bulk-reference'){showReferenceSettings();return;}
      if(act==='bulk-cancel'){pending=null;modal=null;render();return;}
      if(act==='bulk-confirm'){
        button.disabled=true;
        try{await commitImport()}finally{button.disabled=false;}
      }
    }catch(err){notify('학생 명단 처리 실패: '+(err?.message||String(err)));}
  });
  INPUTS.forEach(function(cfg){
    inputs[cfg[0]].addEventListener('change',async function(ev){
      const f=ev.target.files&&ev.target.files[0];
      ev.target.value='';
      if(!f)return;
      try{await chooseFile(f,cfg[0]);}catch(err){notify('파일 가져오기 실패: '+(err?.message||String(err)));}
    });
  });
  document.addEventListener('submit',async function(ev){
    const f=ev.target;
    if(f.dataset.form!=='bulk-extra-settings')return;
    ev.preventDefault();
    const form=new FormData(f),get=function(k){return cell(form.get(k))};
    try{
      const url=get('zoomUrl');
      if(url&&!safeUrl(url))throw Error('줌 링크는 HTTPS 주소를 입력해 주세요.');
      db.settings.zoomId=short(get('zoomId'),100);
      db.settings.zoomPassword=short(get('zoomPassword'),100);
      db.settings.zoomUrl=short(url,500);
      db.settings.roomNames={A:short(get('roomA'),80)||'A',B:short(get('roomB'),80)||'B',C:short(get('roomC'),80)||'C'};
      await persist();modal=null;render();notify('줌 · 강의실 설정을 저장했어요.');
    }catch(err){notify(err.message||'설정 저장 실패');}
  });
  if('serviceWorker' in navigator&&location.protocol==='https:'){
    window.addEventListener('load',function(){navigator.serviceWorker.register('./sw.js').catch(function(){/* unsupported browser */});});
  }
})();
