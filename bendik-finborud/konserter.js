/* Konsertmodul for artistsider (nettsider-repoet, maler/kunst/konserter.js)
   Leser konserter.csv i samme mappe som siden. Kolonner (første rad):
   dato,tid,sted,by,billett,event,merknad,sluttdato,lat,lng
   dato: ÅÅÅÅ-MM-DD eller DD.MM.ÅÅÅÅ. Bare dato og sted er påkrevd.
   CSV-en skrives av agenten fra kundens Google-ark «Konserter – <navn>» (eller fra e-post).
   Bruk: <section id="konserter" data-lang="no|en"> med <div id="gigList"></div> og <p id="gigEmpty"></p>,
   valgfritt <button id="locateBtn">, <div id="gigMap"></div> (krever Leaflet). */
(function(){
  var root=document.getElementById('konserter'); if(!root) return;
  var en=(root.getAttribute('data-lang')||'no')==='en';
  var T=en?{tickets:'Tickets',cal:'Add to calendar',map:'Map',event:'Event',km:' km away',near:'Nearest you',finding:'Finding your location…',err:'Could not get your location.',more:'Show more',less:'Show fewer'}
          :{tickets:'Billetter',cal:'Legg til i kalender',map:'Kart',event:'Event',km:' km unna',near:'Nærmest deg',finding:'Finner posisjonen din…',err:'Fikk ikke tak i posisjonen din.',more:'Vis flere',less:'Vis færre'};
  var list=document.getElementById('gigList'), empty=document.getElementById('gigEmpty');
  function parseCSV(t){var rows=[],row=[],f='',q=false;for(var i=0;i<t.length;i++){var c=t[i],n=t[i+1];
    if(q){if(c=='"'&&n=='"'){f+='"';i++}else if(c=='"')q=false;else f+=c}
    else{if(c=='"')q=true;else if(c==','){row.push(f);f=''}else if(c=='\r'){}else if(c=='\n'){row.push(f);rows.push(row);row=[];f=''}else f+=c}}
    if(f.length||row.length){row.push(f);rows.push(row)}return rows.filter(function(r){return r.some(function(x){return x.trim()})})}
  function iso(s){var m=(s||'').trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);return m?m[3]+'-'+('0'+m[2]).slice(-2)+'-'+('0'+m[1]).slice(-2):(s||'').trim()}
  function esc(s){return (s||'').replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  function safeUrl(u){u=(u||'').trim();return /^https?:\/\//i.test(u)?u:''}
  function dm(s){var p=s.split('-');return p.length==3?p[2]+'.'+p[1]:s}
  var months=en?['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']:['jan','feb','mar','apr','mai','jun','jul','aug','sep','okt','nov','des'];
  function ics(r){var d=r.dato.replace(/-/g,''),t=(r.tid||'').match(/^(\d{1,2}):(\d{2})/);
    var s=t?'DTSTART:'+d+'T'+('0'+t[1]).slice(-2)+t[2]+'00':'DTSTART;VALUE=DATE:'+d;
    var body=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//nettsider//konsert//NO','BEGIN:VEVENT','UID:'+d+'-'+Math.random().toString(36).slice(2)+'@nettsider',
      'DTSTAMP:'+new Date().toISOString().replace(/[-:]/g,'').slice(0,15)+'Z',s,'SUMMARY:'+(document.title||'Konsert')+' – '+r.sted,'LOCATION:'+r.sted+(r.by?', '+r.by:''),'END:VEVENT','END:VCALENDAR'].join('\r\n');
    var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([body],{type:'text/calendar'}));a.download='konsert-'+d+'.ics';document.body.appendChild(a);a.click();a.remove()}
  function render(recs){
    list.innerHTML='';
    if(!recs.length){if(empty)empty.hidden=false;var lb=document.getElementById('locateBtn');if(lb)lb.hidden=true;return}
    if(empty)empty.hidden=true;
    recs.forEach(function(r,i){
      var d=r.dato.split('-'),el=document.createElement('article');el.className='gig'+(i>=4?' gig-hidden':'');
      el.dataset.lat=r.lat||'';el.dataset.lng=r.lng||'';
      var b=safeUrl(r.billett),ev=safeUrl(r.event),q=encodeURIComponent(r.sted+(r.by?', '+r.by:''));
      el.innerHTML='<div class="gig-date"><b>'+(+d[2])+(r.sluttdato?'–'+(+iso(r.sluttdato).split('-')[2]):'')+'</b><span>'+months[+d[1]-1]+' '+d[0]+'</span></div>'+
        '<div class="gig-where"><b>'+esc(r.sted)+'</b><span>'+esc(r.by)+(r.tid?' · '+esc(r.tid):'')+'</span>'+(r.merknad?'<small>'+esc(r.merknad)+'</small>':'')+'<em class="gig-dist"></em></div>'+
        '<div class="gig-act">'+(b?'<a class="gig-main" href="'+b+'" target="_blank" rel="noopener">'+T.tickets+'</a>':'')+
        '<button type="button" class="gig-cal">'+T.cal+'</button><a href="https://www.google.com/maps/search/?api=1&query='+q+'" target="_blank" rel="noopener">'+T.map+'</a>'+
        (ev?'<a href="'+ev+'" target="_blank" rel="noopener">'+T.event+'</a>':'')+'</div>';
      el.querySelector('.gig-cal').onclick=function(){ics(r)};list.appendChild(el)});
    var more=document.getElementById('gigMore');
    if(more){more.hidden=recs.length<=4;more.textContent=T.more;more.onclick=function(){var open=more.textContent==T.more;
      list.querySelectorAll('.gig').forEach(function(g,i){if(i>=4)g.classList.toggle('gig-hidden',!open)});more.textContent=open?T.less:T.more}}
    var lb=document.getElementById('locateBtn'),msg=document.getElementById('locateMsg');
    var withPos=recs.filter(function(r){return r.lat&&r.lng});
    if(lb){lb.hidden=!withPos.length;lb.onclick=function(){if(msg)msg.textContent=T.finding;
      navigator.geolocation&&navigator.geolocation.getCurrentPosition(function(p){
        var R=6371,rad=Math.PI/180,gs=[].slice.call(list.querySelectorAll('.gig'));
        gs.forEach(function(g){if(!g.dataset.lat){g.dataset.km=99999;return}
          var a=Math.sin((g.dataset.lat-p.coords.latitude)*rad/2)**2+Math.cos(p.coords.latitude*rad)*Math.cos(g.dataset.lat*rad)*Math.sin((g.dataset.lng-p.coords.longitude)*rad/2)**2;
          g.dataset.km=R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));g.querySelector('.gig-dist').textContent=Math.round(g.dataset.km)+T.km});
        gs.sort(function(a,b){return a.dataset.km-b.dataset.km}).forEach(function(g,i){g.classList.toggle('gig-near',i==0);g.classList.remove('gig-hidden');list.appendChild(g)});
        if(msg)msg.textContent=''},function(){if(msg)msg.textContent=T.err})}}
    var mapEl=document.getElementById('gigMap');
    if(mapEl&&window.L&&withPos.length){mapEl.hidden=false;var m=L.map(mapEl,{scrollWheelZoom:false});
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'&copy; OpenStreetMap'}).addTo(m);
      var pts=withPos.map(function(r){L.circleMarker([+r.lat,+r.lng],{radius:8,weight:2,color:'#fff',fillColor:getComputedStyle(root).getPropertyValue('--gig-accent')||'#d29a3a',fillOpacity:1}).addTo(m).bindPopup(esc(r.sted)+', '+esc(r.by)+' – '+dm(r.dato));return[+r.lat,+r.lng]});
      pts.length>1?m.fitBounds(pts,{padding:[30,30]}):m.setView(pts[0],9)}
  }
  fetch('konserter.csv',{cache:'no-store'}).then(function(r){return r.ok?r.text():''}).catch(function(){return''}).then(function(t){
    var rows=parseCSV(t||'');if(rows.length<2){render([]);return}
    var h=rows[0].map(function(x){return x.trim().toLowerCase()}),today=new Date();today.setHours(0,0,0,0);
    var recs=rows.slice(1).map(function(r){var o={};h.forEach(function(k,i){o[k]=(r[i]||'').trim()});o.dato=iso(o.dato);return o})
      .filter(function(o){if(!o.dato||!o.sted)return false;var e=new Date((iso(o.sluttdato)||o.dato)+'T23:59:00');return !(e<today)})
      .sort(function(a,b){return a.dato<b.dato?-1:1});
    render(recs)});
})();
