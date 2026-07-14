const $=selector=>document.querySelector(selector);
const KEY='sevilleja_portal_v1';
const defaultPosts=[
  {id:'p1',title:'La primavera vuelve a nuestros caminos',category:'Naturaleza',date:'2026-04-18',excerpt:'Los senderos de La Jara recuperan su color. Una invitación a recorrerlos con calma y descubrir el paisaje que nos rodea.',image:'assets/sevilleja-hero.png'},
  {id:'p2',title:'Así vivimos la jornada vecinal',category:'Comunidad',date:'2026-05-06',excerpt:'Una mañana para compartir ideas, recuperar tradiciones y seguir construyendo juntos el pueblo que queremos.',image:'assets/sevilleja-hero.png'},
  {id:'p3',title:'Memoria viva: historias de nuestra gente',category:'Historias',date:'2026-05-22',excerpt:'Conversamos con quienes mejor conocen estas calles para conservar sus recuerdos y hacerlos parte de nuestro futuro.',image:'assets/sevilleja-hero.png'}
];
function loadPosts(){try{return JSON.parse(localStorage.getItem(KEY)||'{}').posts||defaultPosts}catch{return defaultPosts}}
const escapeHTML=value=>String(value||'').replace(/[&<>'"]/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[character]));
const dateLong=date=>new Intl.DateTimeFormat('es-ES',{day:'numeric',month:'long',year:'numeric'}).format(new Date(date+'T12:00:00'));
function renderPosts(){
  const posts=[...loadPosts()].sort((a,b)=>b.date.localeCompare(a.date));
  $('#postCount').textContent=`${posts.length} entrada${posts.length===1?'':'s'}`;
  $('#allPostsGrid').innerHTML=posts.length?posts.map(post=>`<article class="post-card" id="post-${post.id}"><div class="post-image"><img src="${post.image||'assets/sevilleja-hero.png'}" alt="Imagen de ${escapeHTML(post.title)}"></div><div class="post-body"><div class="post-meta"><span>${escapeHTML(post.category)}</span><span>${dateLong(post.date)}</span></div><h3>${escapeHTML(post.title)}</h3><p>${escapeHTML(post.excerpt)}</p></div></article>`).join(''):'<div class="empty">Todavía no hay publicaciones en el blog.</div>';
}
$('#year').textContent=new Date().getFullYear();
renderPosts();
