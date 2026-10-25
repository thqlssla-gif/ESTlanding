/* KAIA DESK reminder UI. Loaded before app.js, called after login. */
(function(){
'use strict';
const R=()=>window.KaiaReminders;
const permissionLabel=p=>({granted:'허용됨',default:'허용 전',denied:'차단됨',unsupported:'지원 안 됨'}[p]||'확인 필요');
const box=(name,label,checked)=>'<label class="reminder-choice"><input type="checkbox" name="'+name+'" '+(checked?'checked':'')+'><span>'+label+'</span></label>';
function panel(){
 const c=R().getConfig(db),p=R().state();
 const enableBtn=p==='granted'
 ?'<button type="button" class="btn '+(c.desktop?'':'primary')+'" data-action="reminder-desktop">'+(c.desktop?'PC 알림 끄기':'PC 알림 켜기')+'</button>'
 :'<button type="button" class="btn primary" data-action="reminder-permission" '+(p==='denied'||p==='unsupported'?'disabled':'')+'>PC 알림 권한 허용</button>';
 return '<section class="panel reminder-settings" id="reminder-settings">'+
 '<div class="panel-header"><div><h3 class="panel-title">🔔 알림 설정</h3><p class="muted reminder-intro">수업 일정과 학생 콜백, 업무 마감을 잊지 않도록 설정하세요.</p></div><span class="reminder-status">'+permissionLabel(p)+'</span></div>'+
 '<form data-form="reminders" class="reminder-form">'+
 '<label class="reminder-toggle"><input type="checkbox" name="enabled" '+(c.enabled?'checked':'')+'><span><b>일정 알림 켜기</b><small>선택한 일정이 앱의 알림센터에 표시돼요.</small></span></label>'+
 '<div class="reminder-form-title">알림 항목</div><div class="reminder-picks">'+box('start','개강',c.kinds.start)+box('end','종강',c.kinds.end)+box('task','할 일 마감',c.kinds.task)+box('callback','학생 콜백',c.kinds.callback)+'</div>'+
 '<div class="reminder-form-title">알림 시점 (복수 선택)</div><div class="reminder-picks">'+box('day7','7일 전',c.days.includes(7))+box('day3','3일 전',c.days.includes(3))+box('day1','하루 전',c.days.includes(1))+box('day0','당일',c.days.includes(0))+'</div>'+
 '<div class="reminder-time"><label class="field-label" for="reminder-hour">PC 알림 시작 시간</label><select class="field" id="reminder-hour" name="hour">'+
 Array.from({length:17},(_,i)=>i+6).map(h=>'<option value="'+h+'" '+(c.hour===h?'selected':'')+'>'+String(h).padStart(2,'0')+':00 이후</option>').join('')+'</select></div>'+
 '<button class="btn primary" type="submit">알림 설정 저장</button></form>'+
 '<div class="reminder-system"><div><b>Windows · 브라우저 알림</b><p>PC 알림 '+(c.desktop?'켜짐':'꺼짐')+' · 권한 '+permissionLabel(p)+'</p></div><div class="reminder-system-buttons">'+enableBtn+'<button type="button" class="btn" data-action="reminder-test" '+(p!=='granted'?'disabled':'')+'>테스트 알림</button></div></div>'+
 '<p class="reminder-caveat">PC 알림은 권한이 허용되고 앱이 열린 상태에서 잠금을 해제해야 전송됩니다. 앱을 완전히 종료한 동안의 예약 푸시 알림은 아직 지원하지 않아요. 일정 내용이 PC 알림에 일부 표시될 수 있습니다.</p>'+
 '</section>';
}
function center(){
 const items=R().entries(db),cfg=R().getConfig(db);
 let rows=items.map(it=>'<div class="reminder-feed-item"><span class="reminder-chip">'+E(it.label)+' '+(it.days===0?'당일':'D-'+it.days)+'</span><div class="reminder-feed-copy"><b>'+E(it.title)+'</b><small>'+E(it.date)+(it.subtitle?' · '+E(it.subtitle):'')+'</small></div></div>').join('');
 const html='<div class="reminder-center"><p class="muted">설정한 알림 시점에 해당하는 일정입니다.</p>'+
 (items.length?'<div class="reminder-feed">'+rows+'</div>':'<div class="reminder-empty">'+(cfg.enabled?'지금 확인할 일정 알림이 없어요.':'알림이 꺼져 있어요. 설정에서 켜 주세요.')+'</div>')+
 '<div class="modal-actions"><button type="button" class="btn" data-action="go-reminder-settings">알림 설정</button><button type="button" class="btn primary" data-action="close">확인</button></div></div>';
 dialog('알림센터 · '+items.length+'건',html,'',true);
}
function badge(){
 if(!key)return;
 const n=document.getElementById('reminder-count');if(!n)return;
 const count=R().entries(db).length;n.textContent=count>99?'99+':String(count);n.hidden=!count;
}
function poll(){
 if(!key)return;
 R().check(db,()=>persist());badge();
}
async function handleClick(action){
 if(action==='open-reminders'){center();return true}
 if(action==='go-reminder-settings'){
  modal=null;page='settings';render();
  document.getElementById('reminder-settings')?.scrollIntoView({block:'start',behavior:'smooth'});
  return true;
 }
 if(action==='reminder-permission'){
  if(!('Notification' in window)){notify('이 브라우저에서 PC 알림을 지원하지 않습니다.');return true}
  if(Notification.permission==='denied'){notify('브라우저의 사이트 설정에서 알림 차단을 해제해 주세요.');return true}
  const permission=await Notification.requestPermission();
  if(!key)return true;
  if(permission==='granted'){
    db.settings.reminders={...R().getConfig(db),desktop:true};
    await persist();render();notify('PC 알림 권한을 허용했어요. 테스트 알림으로 확인해 보세요.');poll();
  }else{render();notify('알림 권한이 허용되지 않았습니다.')}
  return true;
 }
 if(action==='reminder-desktop'){
  const old=R().getConfig(db),next=!old.desktop;
  if(next&&R().state()!=='granted'){notify('PC 알림 권한을 먼저 허용해 주세요.');return true}
  db.settings.reminders={...old,desktop:next};await persist();render();
  notify(next?'PC 알림이 켜졌어요.':'PC 알림이 꺼졌어요.');
  if(next)poll();return true;
 }
 if(action==='reminder-test'){
  notify(R().test()?'테스트 알림을 전송했어요. Windows 알림센터를 확인하세요.':'PC 알림을 표시하지 못했습니다. Windows 알림 설정을 확인해 주세요.');
  return true;
 }
 return false;
}
async function save(formData){
 const prior=R().getConfig(db);
 const hour=Number(formData.get('hour'));
 db.settings.reminders={
  ...prior,enabled:formData.has('enabled'),
  kinds:{start:formData.has('start'),end:formData.has('end'),task:formData.has('task'),callback:formData.has('callback')},
  days:[0,1,3,7].filter(d=>formData.has('day'+d)),
  hour:Number.isFinite(hour)?Math.max(0,Math.min(23,hour)):9
 };
 await persist();render();notify('알림 설정을 저장했어요.');poll();
}
window.KaiaUI={panel,center,badge,poll,handleClick,save};
window.setInterval(()=>{if(typeof key!=='undefined'&&key)poll()},60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&typeof key!=='undefined'&&key)poll()});
window.addEventListener('focus',()=>{if(typeof key!=='undefined'&&key)poll()});
}());
