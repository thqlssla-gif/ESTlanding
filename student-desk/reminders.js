/* KAIA DESK reminders: no server, no background push.
   Browser alerts run only while an unlocked page is running. */
(function () {
  'use strict';
  const defaultConfig = {
    enabled: true, desktop: false, hour: 9,
    days: [0, 1, 3, 7],
    kinds: {start:true, end:true, task:true, callback:true}
  };
  const labels = {start:'개강', end:'종강', task:'할 일', callback:'학생 콜백'};
  const isIso = str => typeof str === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(str);
  function localIso(d) {
    return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
  }
  function daysUntil(date, today) {
    if (!isIso(date)) return null;
    const target = new Date(date+'T12:00:00'), from = new Date(today+'T12:00:00');
    if (!Number.isFinite(target.getTime())) return null;
    return Math.round((target-from)/86400000);
  }
  function getConfig(db) {
    const saved=db?.settings?.reminders||{};
    const days=Array.isArray(saved.days)?saved.days.map(Number).filter(n=>[0,1,3,7].includes(n)):[...defaultConfig.days];
    return {
      enabled:saved.enabled!==false,
      desktop:saved.desktop===true,
      hour:Number.isInteger(Number(saved.hour))?Math.max(0,Math.min(23,Number(saved.hour))):9,
      days:[...new Set(days)],
      kinds:{start:saved.kinds?.start!==false,end:saved.kinds?.end!==false,task:saved.kinds?.task!==false,callback:saved.kinds?.callback!==false}
    };
  }
  function entries(db, now=new Date()) {
    if (!db || !db.settings)return [];
    const cfg=getConfig(db); if(!cfg.enabled||!cfg.days.length)return [];
    const today=localIso(now), found=[];
    const add=(kind,id,title,date,subtitle)=>{
      if(!cfg.kinds[kind]||!date)return;
      const days=daysUntil(date,today);
      if(days===null||!cfg.days.includes(days))return;
      found.push({kind,id:String(id||title),title:String(title||'제목 없음'),date,days,
        subtitle:String(subtitle||''),label:labels[kind],key:kind+':'+String(id||title)+':'+date+':'+days});
    };
    (db.courses||[]).forEach((c,i)=>{
      add('start',c.id||i,c.name,c.start,c.time||'');
      add('end',c.id||i,c.name,c.end,c.time||'');
    });
    (db.tasks||[]).forEach((t,i)=>{if(!t.done)add('task',t.id||i,t.title,t.due,t.time||'')});
    (db.students||[]).forEach((s,i)=>add('callback',s.id||i,s.name||'학생',s.nextContact,'상담 연락 예정'));
    return found.sort((a,b)=>a.days-b.days||a.kind.localeCompare(b.kind)||a.title.localeCompare(b.title,'ko'));
  }
  function state() {
    if(!('Notification' in window))return 'unsupported';
    return Notification.permission;
  }
  function display(title,body,tag) {
    if(state()!=='granted')return false;
    try {
      const notice=new Notification(title,{body,icon:'./kaia-app-icon.svg',tag,renotify:false,silent:false});
      notice.onclick=()=>{window.focus();notice.close()};
      return true;
    }catch(e) {return false;}
  }
  function check(db,onSave,now=new Date()) {
    if(!db?.settings)return 0;
    const cfg=getConfig(db);
    if(!cfg.desktop||!cfg.enabled||state()!=='granted'||now.getHours()<cfg.hour)return 0;
    const items=entries(db,now);
    if(!items.length)return 0;
    const seen=db.settings.reminderSeen||{};
    const today=localIso(now);
    // Keep only recent entries, so encrypted backup stays small.
    for(const key of Object.keys(seen))if(seen[key]!==today)delete seen[key];
    const unseen=items.filter(it=>seen[it.key]!==today);
    if(!unseen.length)return 0;
    let delivered=0;
    const selected=unseen.slice(0,2);
    for(const it of selected){
      const body=it.kind==='callback'?'학생 연락 예정일을 확인해 주세요.':
        it.kind==='task'?'할 일 마감일을 확인해 주세요.':
        it.title+(it.days===0?' · 오늘':(' · '+it.days+'일 전'));
      if(display('KAIA DESK · '+it.label+' '+(it.days===0?'당일':'D-'+it.days),body,'kaia:'+it.key)){
        seen[it.key]=today;delivered++;
      }
    }
    if(unseen.length>2){
      const remaining=unseen.slice(2);
      if(display('KAIA DESK · 알림 '+remaining.length+'건 더 있음','앱의 알림센터에서 나머지 일정을 확인해 주세요.','kaia:more:'+today)){
        for(const it of remaining)seen[it.key]=today;
        delivered++;
      }
    }
    if(delivered){db.settings.reminderSeen=seen;if(typeof onSave==='function')onSave()}
    return delivered;
  }
  function test(){return display('KAIA DESK · 알림 테스트','PC 알림이 정상적으로 표시되고 있어요.','kaia:test:'+Date.now())}
  window.KaiaReminders={defaults:defaultConfig,getConfig,entries,state,check,test};
}());
