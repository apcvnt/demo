/* ЛАДНО — скрипты сайта */
const CONFIG = {
  phone: '+7 919 934-54-54', phoneHref: 'tel:+79199345454',
  maxUrl: 'https://max.ru/join/dplYfGCwXYH5dEIGvfwO4_H_sBzt-JHOqxUhsV0CYhI', // ссылка MAX — заменить на новую «Ладно»
  chatUrl: '',      // адрес бота-консультанта (n8n). Пусто — бот отвечает заглушкой
  orderUrl: '',     // адрес приёма заявок (n8n → админ в MAX)
  handoverUrl: ''   // адрес «позвать администратора» (n8n → админ в MAX)
};
const $ = (s, r=document) => r.querySelector(s), $$ = (s, r=document) => [...r.querySelectorAll(s)];
const esc = t => { const d=document.createElement('div'); d.textContent=t; return d.innerHTML; };
const IMG = 'assets/img/';
const session = (() => { try { let s=sessionStorage.getItem('ladno-sid'); if(!s){ s='s'+Date.now()+Math.random().toString(16).slice(2,8); sessionStorage.setItem('ladno-sid',s);} return s; } catch(e){ return 's'+Date.now(); } })();

/* ---------- слой-подложка и панели ---------- */
const veil = $('#veil');
function closeAll(){ $$('.drawer,.sheet,.modal,.search').forEach(p=>p.classList.remove('on')); veil.classList.remove('on'); document.body.style.overflow=''; }
function openPanel(el){ closeAll(); closeChat(); el.classList.add('on'); veil.classList.add('on'); document.body.style.overflow='hidden';
  const f=el.querySelector('button,a,input'); if(f) setTimeout(()=>f.focus(),60); }
veil.addEventListener('click', closeAll);
document.addEventListener('keydown', e=>{ if(e.key==='Escape'){ closeAll(); closeChat(); } });
$$('[data-open-menu]').forEach(b=>b.addEventListener('click',()=>openPanel($('#drawer'))));
$$('[data-open-lines]').forEach(b=>b.addEventListener('click',()=>openPanel($('#linesSheet'))));
$$('[data-close]').forEach(b=>b.addEventListener('click',closeAll));
$$('#drawer a').forEach(a=>a.addEventListener('click',()=>{ if(a.getAttribute('href').startsWith('#')) closeAll(); }));

/* ---------- заявка (корзина) ---------- */
let cart = [];
try { cart = JSON.parse(localStorage.getItem('ladno-cart')||'[]'); } catch(e){ cart=[]; }
function save(){ try{ localStorage.setItem('ladno-cart',JSON.stringify(cart)); }catch(e){} }
function total(){ return cart.reduce((a,i)=>a+i.q,0); }
function add(id,name){ const it=cart.find(i=>i.id===id); if(it) it.q++; else cart.push({id,name,q:1}); save(); paintCart(); }
function paintCart(){
  const n=total();
  $$('.cnt').forEach(c=>{ c.textContent=n; c.classList.toggle('on',n>0); });
  const html = cart.length ? cart.map(i=>
    '<li><b>'+esc(i.name)+'</b><span class="qty"><button type="button" data-q="-1" data-id="'+i.id+'" aria-label="Меньше">−</button><span>'+i.q+'</span><button type="button" data-q="1" data-id="'+i.id+'" aria-label="Больше">+</button></span></li>').join('')
    : '<li class="empty">Пока пусто. Нажмите «В заявку» у блюда в каталоге — или просто напишите, что хотите, в комментарии.</li>';
  $$('#cartList,#cartList2').forEach(u=>u.innerHTML=html);
  $$('.goods [data-add]').forEach(b=>{ const on=cart.some(i=>i.id===b.dataset.add); b.classList.toggle('added',on); b.textContent= on ? 'В заявке ✓' : 'В заявку'; });
}
$$('#cartList,#cartList2').forEach(u=>u.addEventListener('click',e=>{
  const b=e.target.closest('[data-q]'); if(!b) return;
  const it=cart.find(i=>i.id===b.dataset.id); if(!it) return;
  it.q+=Number(b.dataset.q); if(it.q<1) cart=cart.filter(i=>i!==it); save(); paintCart();
}));
$$('[data-go-form]').forEach(a=>a.addEventListener('click',e=>{ e.preventDefault(); closeAll(); setTimeout(()=>{ $('#zayavka').scrollIntoView({behavior:'smooth'}); },60); }));
$$('[data-open-cart]').forEach(b=>b.addEventListener('click',e=>{ e.preventDefault(); openPanel($('#sheet')); }));

const form=$('#orderForm'), msg=$('#orderMsg');
form.addEventListener('submit', async e=>{
  e.preventDefault();
  const say=(k,h)=>{ msg.className='msg '+k; msg.innerHTML=h; };
  const phone=form.phone.value.replace(/\D/g,'');
  if(phone.length<10){ say('err','Проверьте номер телефона — без него мы не сможем перезвонить.'); form.phone.focus(); return; }
  if(!form.agree.checked){ say('err','Поставьте, пожалуйста, галочку согласия на обработку данных.'); return; }
  const back='Позвоните: <a href="'+CONFIG.phoneHref+'">'+CONFIG.phone+'</a> или <a href="'+CONFIG.maxUrl+'" target="_blank" rel="noopener">напишите в MAX</a>.';
  if(!CONFIG.orderUrl){ say('ok','Приём заявок с сайта ещё не подключён. '+back); return; }
  const payload={ name:form.name.value, phone:form.phone.value, comment:form.comment.value, delivery:form.delivery.value,
    items:cart.map(i=>i.name+' × '+i.q), page:location.href, session, sent_at:new Date().toISOString() };
  try{
    const r=await fetch(CONFIG.orderUrl,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    if(!r.ok) throw 0;
    cart=[]; save(); paintCart(); form.reset(); say('ok','Спасибо! Заявка у администратора, скоро вам перезвоним.');
  }catch(err){ say('err','Не получилось отправить. '+back); }
});

/* ---------- каталог на странице линейки ---------- */
const cat=$('#catalog[data-line]');
let ITEMS={};
if(cat && window.LADNO_LINES){
  const key=cat.dataset.line, line=LADNO_LINES[key];
  const chips=$('#chips .wrap');
  chips.innerHTML=line.sections.map(s=>'<a href="#'+s.id+'">'+s.name+'</a>').join('');
  cat.innerHTML=line.sections.map(s=>{
    const cards=s.items.map((it,i)=>{
      const id=key+'-'+s.id+'-'+i; const st=it.s||line.status;
      const nm=s.t.replace('%l', it.n.charAt(0).toLowerCase()+it.n.slice(1)).replace('%', it.n);
      ITEMS[id]=Object.assign({id,full:nm,st,sec:s.name},it);
      const ph= it.img ? '<img class="photo" src="'+IMG+it.img+'.webp" alt="'+esc(it.n)+'" loading="lazy">'
                       : '<img class="ico" src="'+IMG+'icon-'+key+'.webp" alt=""><em>фото скоро</em>';
      if(it.card) return '<article class="card design"><div class="ph design"><button class="dimg" type="button" data-more="'+id+'" aria-label="Подробнее: '+esc(it.n)+'">'+
        '<img src="'+IMG+it.card+'.webp" alt="'+esc(nm)+(it.p?', '+it.p+' ₽':'')+'" loading="lazy" width="1159" height="1358"></button>'+
        '<button class="hot" type="button" data-add="'+id+'" aria-label="В заявку: '+esc(nm)+'"></button></div>'+
        '<div class="in"><h3>'+esc(it.n)+'</h3>'+(it.p?'<div class="price">'+it.p.toLocaleString('ru-RU')+' ₽ <small>'+(it.u||'')+'</small></div>':'')+
        '<div class="acts"><button class="btn line sm" type="button" data-more="'+id+'">Подробнее</button><button class="btn sm" type="button" data-add="'+id+'">В заявку</button></div></div></article>';
      return '<article class="card"><button class="ph" type="button" data-more="'+id+'" aria-label="Подробнее: '+esc(it.n)+'">'+ph+
        (st?'<span class="badge '+st+'">'+(st==='stock'?'В наличии':'Под заказ')+'</span>':'')+'</button>'+
        '<div class="in"><h3>'+esc(it.n)+'</h3>'+(it.d?'<p class="d">'+esc(it.d)+'</p>':'')+
        (it.p?'<div class="price">'+it.p.toLocaleString('ru-RU')+' ₽ <small>'+(it.u||'')+'</small></div>':'<div class="price na">Цена уточняется</div>')+
        '<div class="acts"><button class="btn line sm" type="button" data-more="'+id+'">Подробнее</button><button class="btn sm" type="button" data-add="'+id+'">В заявку</button></div></div></article>';
    }).join('');
    return '<section class="sec" id="'+s.id+'"><div class="wrap"><h2>'+s.name+' <small>'+(s.items.length? s.items.length+' поз.':'')+'</small></h2>'+
      '<div class="goods">'+(cards||'<div class="nolist">Ассортимент этого раздела скоро появится. Уже сейчас можно спросить консультанта или оставить заявку. <span class="todo">список от Алёны</span></div>')+'</div></div></section>';
  }).join('');
  cat.addEventListener('click',e=>{
    const a=e.target.closest('[data-add]'); if(a){ add(a.dataset.add, ITEMS[a.dataset.add].full); return; }
    const m=e.target.closest('[data-more]'); if(m) more(m.dataset.more);
  });
  // подсветка активного раздела в полоске-фильтре
  if('IntersectionObserver' in window){
    const io=new IntersectionObserver(es=>es.forEach(en=>{ if(en.isIntersecting){
      $$('a',chips).forEach(a=>a.classList.toggle('on',a.getAttribute('href')==='#'+en.target.id));
      const on=$('a.on',chips); if(on) chips.scrollTo({left:on.offsetLeft-18,behavior:'smooth'});
    }}),{rootMargin:'-45% 0px -50% 0px'});
    $$('.sec',cat).forEach(s=>io.observe(s));
  }
}
const nf=v=>typeof v==='number'? v.toLocaleString('ru-RU') : String(v);
const ICO={
  leaf:'<svg viewBox="0 0 24 24"><path d="M5 19c0-9 6-14 15-14 0 9-5 15-14 15"/><path d="M5 19 13 11"/></svg>',
  fire:'<svg viewBox="0 0 24 24"><path d="M12 21c-4 0-7-2.6-7-6.5 0-3.3 2.4-5.2 3.6-8 1 1.6 1.4 2.8 1.4 4 1.6-1 2.6-3.6 2.4-7.5C16 5.300 19 9.200 19 14.500 19 18.400 16 21 12 21Z"/><path d="M12 21c-1.700 0-3-1.200-3-3 0-1.600 1.300-2.700 2-4 .900 1 2 2 2 2 .600-.500 1-1.200 1-2 1.300 1.200 1 2.500 1 4 0 1.800-1.300 3-3 3Z"/></svg>',
  snow:'<svg viewBox="0 0 24 24"><path d="M12 2v20M3.300 7l17.400 10M3.300 17 20.700 7M9 3.500l3 2.500 3-2.500M9 20.500l3-2.500 3 2.500M3 10.500l3.800-.800L5.600 6M18.400 18l-1.200-3.700 3.800-.800M21 10.500l-3.800-.800L18.400 6M5.600 18l1.200-3.700-3.800-.800"/></svg>',
  weight:'<svg viewBox="0 0 24 24"><path d="M9 7a3 3 0 1 1 6 0"/><path d="M6.500 7h11l2.500 13H4Z"/></svg>',
  pot:'<svg viewBox="0 0 24 24"><path d="M4 10h16v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4Z"/><path d="M2 10h20M9 6c0-1 1-1 1-2M13 6c0-1 1-1 1-2"/></svg>',
  cart:'<svg viewBox="0 0 24 24"><path d="M3 4h2.500l2.200 10.500h10.300L20.500 7.500H7"/><circle cx="9.500" cy="19" r="1.400"/><circle cx="17" cy="19" r="1.400"/></svg>'
};
const LINE_NAMES={sladko:['Ладно Сладко','Десерты и выпечка'],vprok:['Ладно Впрок','Заморозка на каждый день'],gotovo:['Ладно Готово','Готовые блюда'],pasta:['Ладно Паста','Свежая паста и тесто']};
function more(id){
  const it=ITEMS[id], m=$('#modal'), ln=LINE_NAMES[cat.dataset.line]||['',''];
  m.classList.add('pcard');
  $('.ph',m).classList.toggle('design',!!it.card);
  $('.ph',m).innerHTML= it.card ? '<img src="'+IMG+it.card+'.webp" alt="'+esc(it.full)+'" width="1159" height="1358"><button class="hot" type="button" id="mHot" aria-label="В заявку"></button>'
    : it.img ? '<img class="photo" src="'+IMG+it.img+'.webp" alt="'+esc(it.full)+'">' : '<img class="ico" src="'+IMG+'icon-'+cat.dataset.line+'.webp" alt="">';
  // название в две строки, как у Алёны: первое слово крупно, остальное ниже
  const sp=it.full.indexOf(' ');
  const title= sp>0 ? esc(it.full.slice(0,sp))+'<span>'+esc(it.full.slice(sp+1))+'</span>' : esc(it.full);
  const unit=(it.u||'').replace(/^за\s+/,'');
  let h='<div class="pline"><b>'+ln[0]+'</b><span>'+esc(it.sec)+'</span></div>'+
        '<h3 class="ptitle">'+title+'</h3>'+(it.d?'<p class="pdesc">'+esc(it.d)+'</p>':'')+
        '<div class="pprice">'+(it.p?'<b>'+it.p.toLocaleString('ru-RU')+' ₽</b>'+(unit?'<span class="pill">'+esc(unit)+'</span>':'')
                                :'<b class="na">Цена уточняется</b>')+'</div>'+
        '<button class="btn pbuy" type="button" id="mAdd">'+ICO.cart+'<span>В заявку</span></button>';
  let info='<div class="pi wide">'+ICO.leaf+'<h4>Состав</h4><p>'+(it.c?esc(it.c):'Добавим в ближайшее время')+'</p></div>';
  if(it.k) info+='<div class="pi">'+ICO.fire+'<h4>КБЖУ на 100 г</h4><p><b>'+nf(it.k[0])+' ккал</b><br><span>Б: '+nf(it.k[1])+' г</span><br><span>Ж: '+nf(it.k[2])+' г</span><br><span>У: '+nf(it.k[3])+' г</span></p></div>';
  if(it.h) info+='<div class="pi">'+ICO.snow+'<h4>Хранение</h4><p>'+esc(it.h)+'</p></div>';
  if(it.o) info+='<div class="pi">'+ICO.weight+'<h4>Выход</h4><p>'+esc(it.o)+'</p></div>';
  h+='<div class="pinfo">'+info+'</div>';
  if('prep' in it) h+='<details class="pprep"><summary>'+ICO.pot+'<span><b>Как приготовить</b><small>Пошаговая инструкция и видео-рецепт</small></span></summary><p>'+(it.prep?esc(it.prep):'Инструкцию и видео-рецепт добавим в ближайшее время.')+'</p></details>';
  $('.in',m).innerHTML=h;
  $('#mAdd').onclick=()=>{ add(id,it.full); $('#mAdd span').textContent='Добавлено ✓'; };
  if($('#mHot')) $('#mHot').onclick=()=>$('#mAdd').click();
  openPanel(m);
}

/* ---------- облачко → бот-консультант → админ в MAX ---------- */
const cloud=$('#cloud'), chat=$('#chat'), log=$('#chatLog'), cin=$('#chatInput');
function bubble(who,html){ const d=document.createElement('div'); d.className='bub '+who; d.innerHTML=html; log.appendChild(d); log.scrollTop=log.scrollHeight; return d; }
function openChat(){
  closeAll(); chat.classList.add('open'); cloud.classList.add('open'); cloud.setAttribute('aria-expanded','true'); $('.hint',cloud).classList.remove('on');
  if(!log.children.length){
    bubble('bot','Здравствуйте! Я консультант «Ладно». Подскажу состав и сроки, помогу выбрать и оформить заявку.');
    const q=document.createElement('div'); q.className='quick';
    ['Хочу заказать торт','Что есть в наличии?','Как оформить заказ?','Сроки и предоплата'].forEach(t=>{ const b=document.createElement('button'); b.type='button'; b.textContent=t; b.onclick=()=>ask(t); q.appendChild(b); });
    log.appendChild(q);
  }
  setTimeout(()=>cin.focus(),60);
}
function closeChat(){ chat.classList.remove('open'); cloud.classList.remove('open'); cloud.setAttribute('aria-expanded','false'); }
cloud.addEventListener('click',()=> chat.classList.contains('open') ? closeChat() : openChat());
$$('[data-chat]').forEach(b=>b.addEventListener('click',e=>{ e.preventDefault(); openChat(); }));
$('#chatForm').addEventListener('submit',e=>{ e.preventDefault(); const t=cin.value.trim(); if(t){ cin.value=''; ask(t); } });
async function ask(text){
  bubble('me',esc(text)); const w=bubble('bot','…');
  if(!CONFIG.chatUrl){ w.innerHTML='Консультант пока учится и скоро заработает. Нажмите «Позвать администратора» — и вам ответит человек в MAX, или позвоните: <a href="'+CONFIG.phoneHref+'">'+CONFIG.phone+'</a>.'; return; }
  try{
    const r=await fetch(CONFIG.chatUrl,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:session,message:text,cart:cart.map(i=>i.name+' × '+i.q),page:location.href})});
    if(!r.ok) throw 0; const j=await r.json(); w.innerHTML=esc(j.reply||j.output||'').replace(/\n/g,'<br>');
  }catch(err){ w.innerHTML='Не получилось ответить. Позвоните, пожалуйста: <a href="'+CONFIG.phoneHref+'">'+CONFIG.phone+'</a>.'; }
}
$('#human').addEventListener('click', async ()=>{
  if(CONFIG.handoverUrl){
    try{ await fetch(CONFIG.handoverUrl,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:session,page:location.href,cart:cart.map(i=>i.name+' × '+i.q)})});
      bubble('bot','Позвали администратора — он ответит здесь в ближайшее время.'); return; }catch(e){}
  }
  bubble('bot','Администратор отвечает в MAX: <a href="'+CONFIG.maxUrl+'" target="_blank" rel="noopener">открыть чат</a>. Или позвоните: <a href="'+CONFIG.phoneHref+'">'+CONFIG.phone+'</a>.');
});
try{ if(!sessionStorage.getItem('ladno-hint')){ setTimeout(()=>{ if(!chat.classList.contains('open')) $('.hint',cloud).classList.add('on'); sessionStorage.setItem('ladno-hint','1'); setTimeout(()=>$('.hint',cloud).classList.remove('on'),6000); },4000); } }catch(e){}


/* ---------- выпадающее меню «Каталог» ---------- */
$$('.dd').forEach(dd=>{
  const b=$('.dd-btn',dd);
  b.addEventListener('click',e=>{ e.stopPropagation(); const on=!dd.classList.contains('on'); dd.classList.toggle('on',on); b.setAttribute('aria-expanded',on); });
  dd.addEventListener('mouseenter',()=>{ dd.classList.add('on'); b.setAttribute('aria-expanded','true'); });
  dd.addEventListener('mouseleave',()=>{ dd.classList.remove('on'); b.setAttribute('aria-expanded','false'); });
});
document.addEventListener('click',()=>$$('.dd').forEach(d=>d.classList.remove('on')));

/* ---------- поиск по каталогу ---------- */
const sIn=$('#searchInput'), sRes=$('#searchRes');
const PAGES={sladko:'sladko.html',vprok:'vprok.html',gotovo:'gotovo.html',pasta:'pasta.html'};
function searchIndex(){
  const out=[]; if(!window.LADNO_LINES) return out;
  for(const [k,l] of Object.entries(LADNO_LINES)) for(const s of l.sections) for(const it of s.items)
    out.push({n:s.t.replace('%l',it.n.charAt(0).toLowerCase()+it.n.slice(1)).replace('%',it.n), url:PAGES[k]+'#'+s.id, where:l.title+' · '+s.name});
  return out;
}
const IDX=searchIndex();
$$('[data-open-search]').forEach(b=>b.addEventListener('click',()=>{ openPanel($('#search')); setTimeout(()=>sIn.focus(),80); }));
sIn.addEventListener('input',()=>{
  const q=sIn.value.trim().toLowerCase().replace(/ё/g,'е');
  if(q.length<2){ sRes.innerHTML=''; return; }
  const r=IDX.filter(i=>(i.n+' '+i.where).toLowerCase().replace(/ё/g,'е').includes(q)).slice(0,30);
  sRes.innerHTML= r.length ? r.map(i=>'<li><a href="'+i.url+'">'+esc(i.n)+'<small>'+esc(i.where)+'</small></a></li>').join('')
    : '<li class="none">Ничего не нашли. Спросите консультанта — он подскажет.</li>';
});
sRes.addEventListener('click',e=>{ if(e.target.closest('a')) closeAll(); });

paintCart();

/* ---------- облачко «пристёгнуто» к картинке первого экрана ---------- */
const heroPic=$('.hero2 .pic');
if(heroPic){
  const dock=()=>{
    const r=heroPic.getBoundingClientRect(), hdr=$('.hdr').getBoundingClientRect().bottom;
    const top=r.bottom-64-14;
    if(top>hdr+8 && r.bottom<innerHeight){ cloud.classList.add('docked'); cloud.style.top=top+'px'; }
    else { cloud.classList.remove('docked'); cloud.style.top=''; }
  };
  addEventListener('scroll',dock,{passive:true}); addEventListener('resize',dock); dock(); setTimeout(dock,300);
}
