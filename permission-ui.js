// Permission UI extension: API requires a bound device and server-verified PIN role.
(()=>{'use strict';
const API='https://gps-tracker-api.iumataly.workers.dev';
const page=location.pathname.split('/').pop();
const isWorker=page==='worker.html',isDept=page==='dept.html',isAdmin=page==='admin.html',isReports=page==='reports.html';
if(![isWorker,isDept,isAdmin,isReports].some(Boolean))return;
const button=document.createElement('button');button.type='button';button.textContent=isWorker?'📝 Жооп сурап арыз':'📝 Арыздарды кароо';
Object.assign(button.style,{position:'fixed',right:'14px',bottom:'14px',zIndex:'21000',background:'#1d4ed8',color:'#fff',border:0,borderRadius:'12px',padding:'12px',cursor:'pointer'});
document.body.append(button);
const overlay=document.createElement('div');Object.assign(overlay.style,{display:'none',position:'fixed',inset:0,zIndex:'22000',background:'rgba(15,23,42,.7)',padding:'15px',overflow:'auto'});
const panel=document.createElement('section');Object.assign(panel.style,{maxWidth:'550px',margin:'3vh auto',padding:'20px',background:'#fff',color:'#111827',borderRadius:'16px',fontFamily:'system-ui'});
overlay.append(panel);document.body.append(overlay);
function elem(tag,text){const x=document.createElement(tag);if(text!==undefined)x.textContent=text;return x}
function field(type,placeholder){const x=elem('input');x.type=type;x.placeholder=placeholder;Object.assign(x.style,{display:'block',width:'100%',boxSizing:'border-box',padding:'10px',margin:'8px 0',border:'1px solid #cbd5e1',borderRadius:'8px'});return x}
function action(text,cb){const x=elem('button',text);x.type='button';x.onclick=cb;Object.assign(x.style,{padding:'10px',margin:'5px',borderRadius:'8px',border:'1px solid #94a3b8',cursor:'pointer'});return x}
const msg=elem('p');msg.setAttribute('role','status');let token=null,role='';
const pin=field('password','4 орундуу PIN');pin.maxLength=4;pin.inputMode='numeric';const device=field('text','Телефондун deviceId (ушул түзмөктө автоматтык)');device.value=localStorage.getItem('deviceId')||'';
async function api(path,method='GET',body=null){const r=await fetch(API+path,{method,headers:{'Content-Type':'application/json',...(token?{'Authorization':'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.error||'HTTP '+r.status);return j}
function clear(){panel.replaceChildren();panel.append(action('✕ Жабуу',()=>overlay.style.display='none'),elem('h2','Жооп сурап арыздар'),msg)}
function showLogin(){clear();msg.textContent='PIN жана ушул аккаунтка байланган түзмөк талап кылынат.';panel.append(pin,device,action('Кирүү',async()=>{try{const x=await api('/permission-session','POST',{pin:pin.value.trim(),deviceId:device.value.trim()});token=x.token;role=x.role;pin.value='';render()}catch(e){msg.textContent=e.message}}))}
async function render(){clear();if(isWorker){if(!['employee','head'].includes(role)){msg.textContent='Бул ролго арыз берүү каралган эмес';return}
const from=field('datetime-local','Башталышы'),to=field('datetime-local','Аякташы'),reason=field('text','Себеби');panel.append(elem('h3','Арыз жөнөтүү'),from,to,reason,action('Жөнөтүү',async()=>{try{const d=await api('/permission-request','POST',{from_time:new Date(from.value).toISOString(),to_time:new Date(to.value).toISOString(),reason:reason.value});msg.textContent='Арыз жөнөтүлдү: '+d.id;await listMine()}catch(e){msg.textContent=e.message}}),action('Менин арыздарым',listMine));await listMine();return}
if(isReports){const id=field('text','Кызматкердин туруктуу ID'),from=field('datetime-local','Мезгил башы'),to=field('datetime-local','Мезгил аягы');panel.append(elem('p','Бекитилген уруксат мүнөттөрүн өзүнчө текшерүү. Табелге автоматтык кошулбайт.'),id,from,to,action('Эсептөө',async()=>{try{const q=new URLSearchParams({workerId:id.value,from:new Date(from.value).toISOString(),to:new Date(to.value).toISOString()});const d=await api('/permission-hours?'+q);msg.textContent='Бекитилген уруксат: '+d.approvedMinutes+' мүнөт'}catch(e){msg.textContent=e.message}}));return}
if(!['head','director'].includes(role)){msg.textContent='Арыздарды кароого уруксат жок';return}
panel.append(action('Арыздарды жаңылоо',loadReview));await loadReview()}
async function listMine(){try{const d=await api('/my-permissions');panel.querySelector('#permissionItems')?.remove();const list=elem('div');list.id='permissionItems';for(const x of d.requests||[]){const row=elem('p',x.from_time+' — '+x.to_time+' | '+x.status+' | '+x.reason);list.append(row)}panel.append(list)}catch(e){msg.textContent=e.message}}
async function loadReview(){try{const d=await api('/permission-list');panel.querySelector('#permissionItems')?.remove();const list=elem('div');list.id='permissionItems';for(const x of d.requests||[]){const row=elem('div');row.append(elem('p',x.name+' ('+x.department+'): '+x.reason+' | '+x.from_time+' — '+x.to_time));for(const [status,label] of [['approved','Бекитүү'],['rejected','Четке кагуу']])row.append(action(label,async()=>{if(!confirm(label+'?'))return;try{await api('/permission-review','POST',{id:x.id,status});await loadReview()}catch(e){msg.textContent=e.message}}));list.append(row)}panel.append(list);msg.textContent='Күтүүдөгү арыздар: '+(d.requests||[]).length}catch(e){msg.textContent=e.message}}
button.onclick=()=>{overlay.style.display='block';showLogin()};
})();