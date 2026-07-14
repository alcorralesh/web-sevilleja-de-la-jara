const $=s=>document.querySelector(s);
const KEY='sevilleja_portal_v1';
const defaultEvents=[
  {id:'e1',title:'Ruta por los molinos de La Jara',date:'2026-08-15',time:'09:00',place:'Plaza Mayor',description:'Paseo guiado para todas las edades.',capacity:40},
  {id:'e2',title:'Noche de música en la plaza',date:'2026-08-22',time:'22:00',place:'Plaza Mayor',description:'Música al aire libre y encuentro vecinal.',capacity:120},
  {id:'e3',title:'Taller de memoria y fotografías',date:'2026-09-05',time:'11:00',place:'Centro social',description:'Trae tus fotos antiguas y comparte su historia.',capacity:25}
];
let stored=load();
const database=window.SevillejaDB;
function load(){try{const saved=JSON.parse(localStorage.getItem(KEY)||'{}');return {...saved,events:(saved.events||defaultEvents).map(e=>({...e,capacity:Number(e.capacity)||50})),signups:saved.signups||[]}}catch{return {events:defaultEvents,signups:[]}}}
function save(){localStorage.setItem(KEY,JSON.stringify(stored));renderEvents()}
const escapeHTML=s=>String(s||'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2800)}
function addEventToCalendar(event){const escapeICS=value=>String(value||'').replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;'),start=event.date.replaceAll('-','')+'T'+event.time.replace(':','')+'00',stamp=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');const content=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//ACR La Jara//Eventos Sevilleja//ES','CALSCALE:GREGORIAN','METHOD:PUBLISH','BEGIN:VEVENT',`UID:${event.id}@acrlajara.es`,`DTSTAMP:${stamp}`,`DTSTART:${start}`,`SUMMARY:${escapeICS(event.title)}`,`LOCATION:${escapeICS(event.place)}`,`DESCRIPTION:${escapeICS(event.description)}`,'END:VEVENT','END:VCALENDAR'].join('\r\n'),url=URL.createObjectURL(new Blob([content],{type:'text/calendar;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download=`${event.date}-${event.title.toLowerCase().replace(/[^a-z0-9áéíóúñ]+/gi,'-').replace(/^-|-$/g,'')}.ics`;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Evento preparado para añadir al calendario.')}
function renderEvents(){
  const months=['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
  const events=[...stored.events].sort((a,b)=>a.date.localeCompare(b.date));
  $('#eventCount').textContent=`${events.length} evento${events.length===1?'':'s'}`;
  $('#allEventsList').innerHTML=events.length?events.map(event=>{
    const date=new Date(event.date+'T12:00:00');
    const enrolled=database?.configured?Number(event.registered_count||0):stored.signups.filter(signup=>signup.eventId===event.id).length;
    const capacity=Number(event.capacity)||50;
    const remaining=Math.max(0,capacity-enrolled);
    const full=enrolled>=capacity;
    return `<article class="event-row ${full?'is-full':''}"><div class="event-date"><strong>${String(date.getDate()).padStart(2,'0')}</strong><span>${months[date.getMonth()]}</span></div><div class="event-info"><h3>${escapeHTML(event.title)}</h3><span>${escapeHTML(event.description)}</span><small class="event-capacity ${full?'full':''}">${full?`Aforo completo · Límite de ${capacity} personas`:`${remaining} plaza${remaining===1?'':'s'} disponible${remaining===1?'':'s'} de ${capacity}`}</small></div><div class="event-place"><span>⌖</span><span>${escapeHTML(event.place)} · ${escapeHTML(event.time)} h</span></div><div class="event-actions"><button class="btn btn-calendar calendar-add" type="button" data-id="${event.id}">＋ Calendario</button>${full?'<button class="btn event-full" type="button" disabled>Inscripciones completas</button>':`<button class="btn btn-dark signup-open" data-id="${event.id}">Quiero apuntarme →</button>`}</div></article>`
  }).join(''):'<div class="empty">No hay eventos publicados en este momento.</div>';
}
function openSignup(eventId){const event=stored.events.find(item=>item.id===eventId);if(!event)return;$('#signupTitle').textContent=event.title;$('#signupForm').eventId.value=event.id;$('#signupModal').classList.add('open');$('#signupModal').setAttribute('aria-hidden','false')}
function closeModal(){$('#signupModal').classList.remove('open');$('#signupModal').setAttribute('aria-hidden','true')}
document.addEventListener('click',event=>{const signup=event.target.closest('.signup-open');if(signup)openSignup(signup.dataset.id);const calendar=event.target.closest('.calendar-add');if(calendar){const selected=stored.events.find(item=>item.id===calendar.dataset.id);if(selected)addEventToCalendar(selected)}if(event.target.closest('[data-close]'))closeModal()});
$('#signupForm').addEventListener('submit',async event=>{event.preventDefault();const form=new FormData(event.target),selected=stored.events.find(item=>item.id===form.get('eventId')),enrolled=database?.configured?Number(selected?.registered_count||0):stored.signups.filter(item=>item.eventId===selected?.id).length;if(!selected||enrolled>=Number(selected.capacity)){closeModal();renderEvents();toast('Lo sentimos, el evento ya ha completado su aforo.');return}const payload={eventId:selected.id,firstName:form.get('firstName').trim(),lastName:form.get('lastName').trim(),birthDate:form.get('birthDate')};try{if(database?.configured){await database.registerEvent(payload);stored.events=await database.getEvents()}else{stored.signups.push({id:crypto.randomUUID(),...payload,createdAt:new Date().toISOString()});save()}event.target.reset();closeModal();renderEvents();toast('¡Inscripción confirmada! Nos vemos allí.')}catch(error){console.error(error);closeModal();toast(String(error.message||'').includes('EVENT_FULL')?'Lo sentimos, el evento ya ha completado su aforo.':'No se pudo completar la inscripción. Inténtalo de nuevo.')}});
$('#year').textContent=new Date().getFullYear();
renderEvents();
if(database?.configured){database.getEvents().then(events=>{stored.events=events;renderEvents()}).catch(error=>{console.error(error);toast('No se pudieron cargar los eventos compartidos.')})}
