'use strict';
const $=id=>document.getElementById(id);const $$=q=>[...document.querySelectorAll(q)];
const DB_NAME='mi-apuntador-db',STORE='works';const THEME_KEY='mi-apuntador-theme';let db,works=[],activeId=null,tab='home',editSceneId=null,session=null,recognizer=null,speaking=null,autosaveTimers=new Map(),recognitionEpoch=0,recTimer=null,recRestartTimer=null,directionTimer=null,voiceTrace=[],voiceSessionNumber=0,currentVoiceTurn=null;

// v2: structured script identity, language and shared-participant support.
const LANGUAGES={'ca-ES':'Català','es-ES':'Español','en-US':'English','fr-FR':'Français','de-DE':'Deutsch','it-IT':'Italiano'};
const DEFAULT_CAST=['GABY','SUZON','CATHERINE','ANIA','MAMY','AUGUSTINE','MADAME CHANEL','LOUISE','PIERRETTE'];
function canon(name){let n=String(name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[.]/g,' ').replace(/\s+/g,' ').trim();if(/^(M|MME|MADAME)\s*CHANEL$/.test(n))return 'MADAME CHANEL';if(n==='A UGUSTINE')return 'AUGUSTINE';if(n==='A NIA')return 'ANIA';if(n==='C ATHERINE')return 'CATHERINE';if(n==='T OTES'||n==='TODAS')return 'TOTES';return n}
function participants(line,work){const raw=Array.isArray(line.participants)&&line.participants.length?line.participants:((line.speaker||'').split(/\s*(?:,|\+|\s+I\s+|\s+Y\s+)\s*/i));let result=raw.map(canon).filter(Boolean);if(result.includes('TOTES')||result.includes('TODAS'))return [...new Set([...(Array.isArray(work?.cast)&&work.cast.length?work.cast:DEFAULT_CAST).map(canon),...result.filter(x=>x!=='TOTES'&&x!=='TODAS')])];return [...new Set(result)]}
function isMine(line,work,actor){return !isDirection(line)&&participants(line,work).includes(canon(actor))}
function isDirection(line){return line.type==='direction'||['ACOTACIÓN','ACOTACION','NARRADOR','DIRECCIÓN','DIRECCION'].includes(canon(line.speaker))}
function cleanForSpeech(line){return String(line.text||'').replace(/\([^()]*\)/g,' ').replace(/\s+/g,' ').trim()}
function getLang(work){return LANGUAGES[work?.language]?work.language:'es-ES'}
function themePreference(){let t=localStorage.getItem(THEME_KEY);return ['light','dark','auto'].includes(t)?t:'auto'}
function applyTheme(preference=themePreference()){
  let dark=window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  let actual=preference==='auto'?(dark?'dark':'light'):preference;
  document.documentElement.dataset.theme=actual;
  let meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=actual==='dark'?'#101522':'#f6f7fa';
  document.querySelectorAll('[data-theme-choice]').forEach(b=>{let selected=b.dataset.themeChoice===preference;b.classList.toggle('active',selected);b.setAttribute('aria-pressed',String(selected))});
}
function workReady(w){return !!w?.reviewed&&Array.isArray(w?.scenes)&&w.scenes.some(sc=>sc.lines?.length)}
function migrate(work){if(typeof work.reviewed!=='boolean')work.reviewed=Array.isArray(work.scenes)&&work.scenes.some(s=>s.lines?.length>0);work.rate=Number(work.rate)||1.15;work.pauseSeconds=Number(work.pauseSeconds)||5;work.autoRetry=work.autoRetry!==false;work.characterVoices=work.characterVoices||{};work.language=work.language||(/\b(?:dones|misteri|acte)\b/i.test(work.title||'')?'ca-ES':'es-ES');if(!Array.isArray(work.selected))work.selected=[];if(!Array.isArray(work.cast))work.cast=[];for(const scene of work.scenes||[]){scene.stageDirections=Array.isArray(scene.stageDirections)?scene.stageDirections:[];for(const line of scene.lines||[]){line.type=line.type|| (isDirection(line)?'direction':'dialogue');line.participants=participants(line,work).filter(x=>x!=='TOTES');}}return work}
function validateStructured(json){if(!json||typeof json!=='object'||!Array.isArray(json.scenes)||!json.scenes.length)throw Error('El JSON debe contener scenes (lista de escenas).');for(const [i,scene] of json.scenes.entries()){if(!Array.isArray(scene.lines))throw Error('La escena '+(i+1)+' no tiene lines.');for(const [j,line] of scene.lines.entries()){if(typeof line.text!=='string'||typeof line.speaker!=='string')throw Error('Intervención '+(j+1)+' de escena '+(i+1)+' sin speaker/text.');}if(scene.stageDirections!==undefined&&!Array.isArray(scene.stageDirections))throw Error('stageDirections debe ser una lista.')}return true}
function sceneEvents(scene){const events=[];for(const dir of scene.stageDirections||[]){if(!dir.afterLine)events.push({id:dir.id||uid(),speaker:'ACOTACIÓN',text:dir.text||'',type:'direction',sourcePage:dir.sourcePage});}for(const line of scene.lines){events.push(line);for(const dir of (scene.stageDirections||[]).filter(d=>d.afterLine===line.id)){events.push({id:dir.id||uid(),speaker:'ACOTACIÓN',text:dir.text||'',type:'direction',sourcePage:dir.sourcePage});}}return events}
function voiceFor(lang,chosen){const voices=speechSynthesis.getVoices();return voices.find(v=>v.voiceURI===chosen&&v.lang.toLowerCase().startsWith(lang.slice(0,2).toLowerCase()))||voices.find(v=>v.lang.toLowerCase()===lang.toLowerCase())||voices.find(v=>v.lang.toLowerCase().startsWith(lang.slice(0,2).toLowerCase()))||null}
function renderVoices(){let w=getWork(),lang=getLang(w),sel=$('voice');if(!sel)return;let available='speechSynthesis'in window?speechSynthesis.getVoices().filter(v=>v.lang.toLowerCase().startsWith(lang.slice(0,2).toLowerCase())):[];sel.innerHTML='<option value="">Voz automática del dispositivo</option>'+available.map(v=>'<option value="'+escapeHTML(v.voiceURI)+'">'+escapeHTML(v.name)+' ('+escapeHTML(v.lang)+')</option>').join('');sel.value=available.some(v=>v.voiceURI===w?.voice)?w.voice:'';$('voice-status').textContent=available.length?'Voces disponibles: '+available.length:('No se ha detectado una voz '+(LANGUAGES[lang]||lang)+'. Android podría usar una voz de otro idioma: comprueba sus ajustes de texto a voz.')}

// v2.3: fixed, accessible palette for roles (stable across sessions).
const ROLE_COLORS=['#e58e57','#65b9db','#b59af2','#6ccc9f','#e6bf62','#ed8caa','#8fb6f4','#c4b0a0','#75d4c8','#d5a1e2','#acc76b'];
function roleColor(speaker){let key=canon(speaker);if(key==='TOTES')return '#d5a1e2';if(key==='ACOTACION'||key==='ACOTACIÓN')return '#94a3b8';let known=DEFAULT_CAST.indexOf(key);if(known>=0)return ROLE_COLORS[known%ROLE_COLORS.length];let hash=0;for(let c of key)hash=((hash*31)+c.charCodeAt(0))>>>0;return ROLE_COLORS[hash%ROLE_COLORS.length]}
function renderCharacterVoices(){let w=getWork(),host=$('character-voices');if(!host)return;if(!w){host.innerHTML='';return}let lang=getLang(w),voices='speechSynthesis'in window?speechSynthesis.getVoices().filter(v=>v.lang.toLowerCase().startsWith(lang.slice(0,2).toLowerCase())):[];let names=actors(w).filter(n=>canon(n)!==canon(w.actor));host.innerHTML=names.map(n=>{let chosen=w.characterVoices?.[n]||'';return '<div class="character-voice-row"><span class="role-dot" style="background:'+roleColor(n)+'"></span><label>'+escapeHTML(n)+'</label><select class="character-voice-select" data-character="'+escapeHTML(n)+'" aria-label="Voz de '+escapeHTML(n)+'"><option value="">Automática / voz general</option>'+voices.map(v=>'<option value="'+escapeHTML(v.voiceURI)+'" '+(chosen===v.voiceURI?'selected':'')+'>'+escapeHTML(v.name)+' ('+escapeHTML(v.lang)+')</option>').join('')+'</select></div>'}).join('');host.querySelectorAll('.character-voice-select').forEach(select=>select.onchange=()=>{w.characterVoices[select.dataset.character]=select.value;saveSoon(w)});$('character-voices-help').textContent=voices.length?voices.length+' voces disponibles para '+(LANGUAGES[lang]||lang)+'. Puedes asignar la misma voz a varios personajes.':'No hay varias voces del idioma principal instaladas. Se utilizará la voz general; puedes instalar más voces en Android.'}
function voiceChoiceForLine(w,line){let key=participants(line,w).find(x=>x!=='TOTES')||canon(line.speaker);return w?.characterVoices?.[key]||w?.voice||''}
function refreshPauseButton(){let el=$('pause-ensayo');if(!el||!session)return;el.textContent=session.paused?'▶ Reanudar':'⏸ Pausar';el.setAttribute('aria-pressed',String(!!session.paused));$('rehearsal-paused').classList.toggle('hidden',!session.paused)}
function updateActorProgress(){if(!session)return;let w=getWork(),own=session.lines.filter(l=>isMine(l,w,session.actor)),done=new Set(session.completedIds||[]),completed=own.filter(l=>done.has(l.id)).length;let remaining=own.length-completed;$('actor-progress').textContent='🎭 '+session.actor+': '+completed+' realizadas · '+remaining+' pendientes';$('actor-progress').setAttribute('aria-label',completed+' intervenciones realizadas de '+own.length+' en el ensayo preparado');$('actor-progress-bar').style.width=(own.length?completed/own.length*100:100)+'%';$('actor-progress-note').textContent=remaining===0?'Has terminado todas tus intervenciones seleccionadas. Puedes pausar o salir del ensayo.':'Cuenta las intervenciones que has completado, no los saltos a otras frases.'}
const uid=()=>globalThis.crypto?.randomUUID?.()||('id'+Date.now()+Math.random().toString(36).slice(2));
function toast(msg){$('toast').textContent=msg;$('toast').classList.remove('hidden');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').classList.add('hidden'),3100)}
function openDB(){return new Promise((res,rej)=>{let req=indexedDB.open(DB_NAME,1);req.onupgradeneeded=()=>req.result.createObjectStore(STORE,{keyPath:'id'});req.onsuccess=()=>res(req.result);req.onerror=()=>rej(req.error)})}
function tx(mode,fn){return new Promise((res,rej)=>{let t=db.transaction(STORE,mode),r=fn(t.objectStore(STORE));t.oncomplete=()=>res(r?.result);t.onerror=()=>rej(t.error)})}
async function persist(w){w.updated=Date.now();$('save-status').textContent='Guardando…';await tx('readwrite',s=>s.put(w));$('save-status').textContent='Guardado ✓'}
function saveSoon(w){if(!w)return;clearTimeout(autosaveTimers.get(w.id));$('save-status').textContent='Cambios pendientes';autosaveTimers.set(w.id,setTimeout(()=>persist(w).catch(e=>toast('Error guardando: '+e.message)),350))}
const getWork=()=>works.find(w=>w.id===activeId);const getScene=(w,id)=>w?.scenes.find(s=>s.id===id);
const escapeHTML=t=>String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function show(tabName){if(tabName==='prepare'&&!workReady(getWork())){toast('Antes de ensayar, revisa y valida una obra');tabName=getWork()?'edit':'library'}if(tabName==='rehearsal'&&!session){toast('Primero prepara un ensayo');return}if(tab==='rehearsal'&&tabName!=='rehearsal')stopAll('leave-rehearsal');tab=tabName;$$('.page').forEach(p=>p.classList.toggle('hidden',p.id!==tab));$$('.tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));if(tab==='home')renderHome();if(tab==='library')renderWorks();if(tab==='edit')renderEdit();if(tab==='prepare')renderPrepare();if(tab==='settings')renderSettings();if(tab==='rehearsal'&&session)renderRehearsal(false);window.scrollTo(0,0)}
function syncSessionTab(){let b=$('rehearsal-tab');b.hidden=!session;let prep=document.querySelector('[data-tab=prepare]');if(prep)prep.hidden=!workReady(getWork())}
function renderHome(){
  let w=getWork(),ready=workReady(w),onboard=!ready;syncSessionTab();
  $('home-onboarding').classList.toggle('hidden',!onboard);
  $('home-dashboard').classList.toggle('hidden',onboard);
  if(onboard){
    $('onboard-title').textContent=w?'Termina de preparar tu obra':'Tu escenario está listo';
    $('onboard-description').textContent=w?'«'+w.title+'» está importada, pero falta revisar y validar los diálogos. Al validarla, aparecerán tus opciones de ensayo.':'Importa tu primera obra, revisa sus diálogos y empieza a ensayar.';
    $('onboard-action').textContent=w?'✏️ Revisar y validar diálogos':'+ Añadir mi primera obra';return;
  }
  $('home-title').textContent=w.title;
  $('home-summary').textContent='🎭 '+(w.actor||'Personaje por elegir')+' · 🌐 '+(LANGUAGES[getLang(w)]||getLang(w))+' · '+w.scenes.length+' bloques';
  let data=w.practiceState;
  $('home-resume').hidden=!data?.config;
  $('home-resume').textContent=data?.config?'▶ Continuar · '+(data.sceneName||'Ensayo anterior'):'';
  $('home-scenes').innerHTML=w.scenes.map((sc,i)=>'<button type="button" class="scene-shortcut" data-home-scene="'+escapeHTML(sc.id)+'"><strong>'+escapeHTML(sc.name)+'</strong><small>'+sc.lines.length+' intervenciones · Preparar escena</small></button>').join('');
  $('home-scenes').querySelectorAll('[data-home-scene]').forEach(b=>b.onclick=()=>{
    w.selected=[b.dataset.homeScene];w.sceneSelectionInitialized=true;
    w.practiceOptions={...(w.practiceOptions||{}),scope:'chosen'};
    saveSoon(w);show('prepare');
  });
}
$('onboard-action').onclick=()=>show(getWork()?'edit':'library');$('home-prepare').onclick=()=>show('prepare');$('home-resume').onclick=()=>resumePractice();$('open-editor').onclick=()=>show('edit');$('manage-works').onclick=()=>show('library');$('library-back').onclick=()=>show('settings');$('edit-back').onclick=()=>show('library');$('validate-work').onclick=()=>{let w=getWork();if(!w)return;if(!w.scenes?.some(sc=>sc.lines?.length)){toast('Añade al menos una intervención antes de validar');return}w.reviewed=true;saveSoon(w);renderHome();show('home');toast('Obra validada. Ya puedes preparar el ensayo.');};document.querySelectorAll('[data-theme-choice]').forEach(b=>b.onclick=()=>{localStorage.setItem(THEME_KEY,b.dataset.themeChoice);applyTheme();});window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change',()=>{if(themePreference()==='auto')applyTheme()});
function renderSettings(){applyTheme();let w=getWork();$('rate').value=w?.rate||1.15;$('pause').value=w?.pauseSeconds||5;$('auto-retry').checked=w?.autoRetry!==false;$('rate-display').textContent=Number($('rate').value).toFixed(2)+'×';$('pause-display').textContent=$('pause').value+' s'}
$('rate').oninput=e=>updateRate(Number(e.target.value));$('rehearsal-rate').oninput=e=>updateRate(Number(e.target.value));function updateRate(v){let w=getWork();if(!w)return;w.rate=v;saveSoon(w);$('rate').value=v;$('rehearsal-rate').value=v;$('rate-display').textContent=v.toFixed(2)+'×';$('rehearsal-rate-display').textContent=v.toFixed(2)+'×'}
$('pause').oninput=e=>{let w=getWork();if(w){w.pauseSeconds=Number(e.target.value);saveSoon(w)}$('pause-display').textContent=e.target.value+' s'};$('auto-retry').onchange=e=>{let w=getWork();if(w){w.autoRetry=e.target.checked;saveSoon(w)}};
$$('.tab').forEach(b=>b.addEventListener('click',()=>show(b.dataset.tab)));
function parseScript(raw,title){const lines=raw.replace(/\r\n?/g,'\n').split('\n');let scenes=[],current=null,buffer=[],lastSpeaker=null;
function scene(name){current={id:uid(),name:name||'Escena '+(scenes.length+1),lines:[]};scenes.push(current);lastSpeaker=null}
function add(speaker,text){if(!text.trim())return;if(!current)scene('Escena 1');current.lines.push({id:uid(),speaker:speaker||'ACOTACIÓN',text:text.trim().replace(/\s+/g,' ')})}
function flush(){if(buffer.length){add(lastSpeaker,buffer.join(' '));buffer=[]}}
const sceneRe=/^(?:(?:ACTO|JORNADA|ESCENA|CUADRO|SCENE|ACT)\s+[\w\dIVXLCDM]+(?:\s*[:.\-–—]\s*.*)?|(?:ACTO|ESCENA)\s+ÚNICO|\[\s*(?:ESCENA|ACTO)\b.+\])$/i;
const speakerRe=/^([A-ZÁÉÍÓÚÜÑ][A-ZÁÉÍÓÚÜÑ\s.'’\-]{0,48})\s*[:：.\-–—]\s*(.*)$/;
const labelRe=/^([A-ZÁÉÍÓÚÜÑ][A-ZÁÉÍÓÚÜÑ\s.'’\-]{0,30})$/;
for(let item of lines){let s=item.trim();if(!s){flush();continue}if(sceneRe.test(s)){flush();scene(s.replace(/^\[|\]$/g,''));continue}let m=s.match(speakerRe);if(m&&m[1].trim().length>=2){flush();lastSpeaker=m[1].trim();if(m[2].trim())buffer.push(m[2].trim());continue}let only=s.match(labelRe);if(only&&s.length<30&&!/^(FIN|TELÓN|OSCURO|PAUSA|SILENCIO|MÚSICA|APARTE)$/i.test(s)){flush();lastSpeaker=s;continue}
if(/^\(.*\)$|^\[.*\]$/.test(s)){flush();add('ACOTACIÓN',s);lastSpeaker=null;continue}
if(!lastSpeaker){add('ACOTACIÓN',s)}else{buffer.push(s)} }
flush();if(!scenes.length)scene('Escena 1');return {id:uid(),title:title||'Obra sin título',raw,scenes,actor:'',selected:[],language:'es-ES',created:Date.now(),updated:Date.now()}}
const SAMPLE=`ACTO I\nESCENA 1 - La llegada\nMARTA: ¿Has venido solo?\nCARLOS: Sí. Nadie sabe que estoy aquí.\nMARTA: Pensé que no volverías nunca.\nCARLOS: Yo también lo pensé.\nMARTA: ¿Y por qué has regresado?\nCARLOS: Porque necesito decirte algo antes de que sea tarde.\n(Una pausa incómoda.)\nMARTA: Entonces habla.\nACTO I\nESCENA 2 - La decisión\nCARLOS: No puedo seguir fingiendo que no ocurrió nada.\nELENA: Nadie te está pidiendo eso.\nCARLOS: Tú no estabas allí.\nELENA: Pero conozco la historia.\nCARLOS: Solo conoces una parte.`;
function choose(w){if(!w)return;activeId=w.id;editSceneId=w.scenes[0]?.id;localStorage.setItem('mi-apuntador-active',activeId);renderWorks();renderHome()}
function optionsWorks(){return works.map(w=>`<option value="${escapeHTML(w.id)}">${escapeHTML(w.title)}</option>`).join('')}
function renderWorks(){let host=$('works');if(!works.length){host.innerHTML='<div class="empty muted">Aún no has importado ninguna obra.</div>';return}host.innerHTML=works.map(w=>`<div class="scene-item"><div class="content"><strong>${escapeHTML(w.title)}</strong><div class="muted">${w.scenes.length} escenas · ${w.scenes.reduce((n,s)=>n+s.lines.length,0)} intervenciones · ${new Date(w.updated).toLocaleDateString('es-ES')} · ${escapeHTML(LANGUAGES[getLang(w)]||getLang(w))}</div></div><button class="btn tiny ${w.id===activeId?'primary':''}" data-work="${escapeHTML(w.id)}">${w.id===activeId?'Activa':'Elegir'}</button><button class="btn tiny danger" data-delete="${escapeHTML(w.id)}">Eliminar</button></div>`).join('');host.querySelectorAll('[data-work]').forEach(b=>b.onclick=()=>{choose(works.find(w=>w.id===b.dataset.work));toast('Obra seleccionada')});host.querySelectorAll('[data-delete]').forEach(b=>b.onclick=async()=>{let w=works.find(w=>w.id===b.dataset.delete);if(!confirm('¿Eliminar «'+w.title+'» del dispositivo? Esta acción es irreversible salvo que tengas una copia.'))return;await tx('readwrite',s=>s.delete(w.id));works=works.filter(x=>x.id!==w.id);if(activeId===w.id){activeId=works[0]?.id||null;localStorage.setItem('mi-apuntador-active',activeId||'')}renderWorks();renderHome()})}
$('sample').onclick=async()=>{let w=parseScript(SAMPLE,'El regreso (obra de ejemplo)');w.actor='CARLOS';w.reviewed=false;works.push(w);await persist(w);choose(w);show('prepare');toast('Ejemplo cargado')};
function exportJSON(obj,name){let b=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}),url=URL.createObjectURL(b),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)}
$('backup').onclick=()=>exportJSON({app:'mi-apuntador',version:2,works},'mi-apuntador-copia-'+new Date().toISOString().slice(0,10)+'.json');
$('restore').onchange=async e=>{let f=e.target.files[0];if(!f)return;try{let obj=JSON.parse(await f.text());let incoming=Array.isArray(obj.works)?obj.works:[obj];if(!confirm('¿Importar '+incoming.length+' obras? Las obras que tengan el mismo identificador se actualizarán.'))return;for(let w of incoming){if(!w.id||!Array.isArray(w.scenes)||typeof w.title!=='string')throw Error('Formato de copia inválido');validateStructured(w);migrate(w);await persist(w);works=works.filter(x=>x.id!==w.id);works.push(w)}if(!activeId&&works.length)choose(works[0]);renderWorks();toast('Copia restaurada')}catch(err){toast('No se ha podido restaurar: '+err.message)}e.target.value=''};
async function loadPDF(file){let pdfjs=window.pdfjsLib;if(!pdfjs){await new Promise((res,rej)=>{let script=document.createElement('script');script.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';script.onload=res;script.onerror=()=>rej(new Error('No se pudo cargar el lector PDF. Conéctate a Internet y vuelve a intentarlo.'));document.head.appendChild(script)});pdfjs=window.pdfjsLib}pdfjs.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';let data=new Uint8Array(await file.arrayBuffer()),doc=await pdfjs.getDocument({data}).promise,parts=[];for(let p=1;p<=doc.numPages;p++){let page=await doc.getPage(p),content=await page.getTextContent(),rows=[],lastY=null,line=[];for(const it of content.items){if(!it.str)continue;let y=Math.round(it.transform?.[5]||0);if(lastY!==null&&Math.abs(lastY-y)>3){if(line.length)rows.push(line.join(' '));line=[]}line.push(it.str);lastY=y;if(it.hasEOL){rows.push(line.join(' '));line=[];lastY=null}}if(line.length)rows.push(line.join(' '));parts.push(rows.join('\n'))}let text=parts.join('\n\n');if(text.trim().length<40)throw Error('El PDF parece escaneado o no contiene texto seleccionable. Prueba con un PDF de texto o conviértelo a TXT.');return text}
$('import').onclick=async()=>{let file=$('import-file').files[0];if(!file){toast('Selecciona un archivo PDF, TXT, MD o JSON');return}let button=$('import');button.disabled=true;button.textContent='Importando…';try{let title=$('new-title').value.trim()||file.name.replace(/\.[^.]+$/,'');let w;if(file.name.toLowerCase().endsWith('.json')){let json=JSON.parse(await file.text());w=json.works?null:json;if(!w||!Array.isArray(w.scenes))throw Error('JSON de obra inválido: usa Restaurar copia para archivos con varias obras');validateStructured(w);w=migrate({...w,id:uid(),reviewed:false,title:($('new-title').value.trim()||w.title||title),created:Date.now(),updated:Date.now()});if(!w.actor&&actors(w).includes('LOUISE'))w.actor='LOUISE'}else{let raw=file.name.toLowerCase().endsWith('.pdf')?await loadPDF(file):await file.text();w=migrate({...parseScript(raw,title),reviewed:false})}works.push(w);await persist(w);choose(w);show('edit');toast('Guion importado. Revisa personajes y escenas.')}catch(err){toast('Error de importación: '+err.message)}finally{button.disabled=false;button.textContent='Importar y revisar guion'}};
function renderEdit(){let w=getWork();$('edit-work').innerHTML=optionsWorks();$('edit-work').value=activeId||'';if(!w){$('review-status').textContent='Importa una obra para comenzar.';$('edit-lines').innerHTML='<p class="muted">Importa una obra para editarla.</p>';$('edit-scene').innerHTML='';$('raw').value='';$('directions').innerHTML='';return}$('review-status').classList.toggle('ready',workReady(w));$('review-status').textContent=workReady(w)?'✓ Obra validada. Puedes seguir corrigiéndola; los cambios se guardan automáticamente.':'Pendiente de revisión: comprueba personajes, escenas y parlamentos y pulsa «He revisado esta obra» al finalizar.';if(!getScene(w,editSceneId))editSceneId=w.scenes[0]?.id;$('edit-scene').innerHTML=w.scenes.map(s=>`<option value="${escapeHTML(s.id)}">${escapeHTML(s.name)}</option>`).join('');$('edit-scene').value=editSceneId;$('raw').value=w.raw||'';let s=getScene(w,editSceneId);$('edit-count').textContent=(s?.lines.length||0)+' intervenciones';$('edit-lines').innerHTML=(s?.lines||[]).map((l,i)=>`<div class="line" data-line="${escapeHTML(l.id)}"><input aria-label="Personaje intervención ${i+1}" class="speaker" value="${escapeHTML(l.speaker)}" list="speaker-suggestions" placeholder="Personaje"><div><select class="line-type" aria-label="Tipo de intervención ${i+1}"><option value="dialogue" ${l.type==='dialogue'||!l.type?'selected':''}>Diálogo</option><option value="song" ${l.type==='song'?'selected':''}>Canción</option><option value="direction" ${l.type==='direction'?'selected':''}>Acotación</option></select><textarea class="line-text" aria-label="Texto intervención ${i+1}">${escapeHTML(l.text)}</textarea><label>Fragmentos e idiomas (JSON)</label><textarea class="language-segments" aria-label="Fragmentos de idioma ${i+1}" placeholder='[{"text":"Hola","language":"ca-ES"}]'>${escapeHTML(JSON.stringify(l.languageSegments||[],null,2))}</textarea><div class="tinyhint language-warning" aria-live="polite"></div></div><div class="line-actions"><button class="btn tiny" data-up title="Subir intervención">↑</button><button class="btn tiny" data-down title="Bajar intervención">↓</button><button class="btn tiny danger" data-remove title="Eliminar intervención">✕</button></div></div>`).join('')+`<datalist id="speaker-suggestions">${[...new Set(w.scenes.flatMap(x=>x.lines.map(l=>l.speaker)))].map(p=>`<option value="${escapeHTML(p)}">`).join('')}</datalist>`;$$('#edit-lines .line').forEach(div=>{let l=s.lines.find(x=>x.id===div.dataset.line);div.querySelector('.speaker').oninput=e=>{l.speaker=e.target.value;l.participants=participants({...l,participants:[]},w);saveSoon(w)};div.querySelector('.line-text').oninput=e=>{l.text=e.target.value;saveSoon(w)};div.querySelector('.language-segments').onchange=e=>{try{let value=JSON.parse(e.target.value||'[]');if(!Array.isArray(value)||value.some(x=>typeof x.text!=='string'||!LANGUAGES[x.language]))throw Error('Usa una lista de objetos con text y language válidos');if(value.length&&value.map(x=>x.text).join('')!==l.text)throw Error('Los fragmentos concatenados deben coincidir exactamente con el texto de la intervención');l.languageSegments=value;div.querySelector('.language-warning').textContent='✓ Fragmentos guardados';saveSoon(w)}catch(err){div.querySelector('.language-warning').textContent='⚠ '+err.message}};div.querySelector('.line-type').onchange=e=>{l.type=e.target.value;saveSoon(w)};div.querySelector('[data-remove]').onclick=()=>{s.lines=s.lines.filter(x=>x.id!==l.id);saveSoon(w);renderEdit()};div.querySelector('[data-up]').onclick=()=>{let i=s.lines.indexOf(l);if(i>0){[s.lines[i-1],s.lines[i]]=[s.lines[i],s.lines[i-1]];saveSoon(w);renderEdit()}};div.querySelector('[data-down]').onclick=()=>{let i=s.lines.indexOf(l);if(i<s.lines.length-1){[s.lines[i+1],s.lines[i]]=[s.lines[i],s.lines[i+1]];saveSoon(w);renderEdit()}}});renderDirections()}
function renderDirections(){let w=getWork(),sc=getScene(w,editSceneId),host=$('directions');if(!sc){host.innerHTML='';return}sc.stageDirections=sc.stageDirections||[];host.innerHTML=sc.stageDirections.map((d,i)=>`<div class="scene-item" data-direction="${i}" style="align-items:start;flex-direction:column"><label>Después de la intervención</label><select class="direction-anchor"><option value="">Al inicio de escena</option>${sc.lines.map((l,j)=>`<option value="${escapeHTML(l.id)}" ${d.afterLine===l.id?'selected':''}>${j+1} · ${escapeHTML(l.speaker)} · ${escapeHTML(l.text.slice(0,36))}</option>`).join('')}</select><label>Acotación</label><textarea class="direction-text">${escapeHTML(d.text)}</textarea><button class="btn tiny danger" data-delete-direction>Eliminar acotación</button></div>`).join('');host.querySelectorAll('[data-direction]').forEach(div=>{let d=sc.stageDirections[Number(div.dataset.direction)];div.querySelector('.direction-anchor').onchange=e=>{d.afterLine=e.target.value||null;saveSoon(w)};div.querySelector('.direction-text').oninput=e=>{d.text=e.target.value;saveSoon(w)};div.querySelector('[data-delete-direction]').onclick=()=>{sc.stageDirections=sc.stageDirections.filter(x=>x!==d);saveSoon(w);renderDirections()}})}
$('add-direction').onclick=()=>{let w=getWork(),sc=getScene(w,editSceneId);if(!sc)return;sc.stageDirections.push({id:uid(),afterLine:sc.lines.at(-1)?.id||null,text:'',sourcePage:null});saveSoon(w);renderDirections()};
$('edit-work').onchange=e=>{choose(works.find(w=>w.id===e.target.value));renderEdit()};$('edit-scene').onchange=e=>{editSceneId=e.target.value;renderEdit()};
$('add-scene').onclick=()=>{let w=getWork();if(!w)return;let name=prompt('Nombre de la nueva escena','Escena '+(w.scenes.length+1));if(!name)return;let s={id:uid(),name:name.trim(),lines:[]};w.scenes.push(s);editSceneId=s.id;saveSoon(w);renderEdit()};
$('rename-scene').onclick=()=>{let w=getWork(),s=getScene(w,editSceneId);if(!s)return;let n=prompt('Nuevo nombre',s.name);if(n?.trim()){s.name=n.trim();saveSoon(w);renderEdit()}};
$('delete-scene').onclick=()=>{let w=getWork(),s=getScene(w,editSceneId);if(!s)return;if(w.scenes.length===1){toast('Debe quedar al menos una escena');return}if(!confirm('¿Eliminar escena y todas sus intervenciones?'))return;w.scenes=w.scenes.filter(x=>x!==s);editSceneId=w.scenes[0].id;saveSoon(w);renderEdit()};
$('add-line').onclick=()=>{let w=getWork(),s=getScene(w,editSceneId);if(!s)return;s.lines.push({id:uid(),speaker:w.actor||'PERSONAJE',text:''});saveSoon(w);renderEdit();$('edit-lines').scrollTop=$('edit-lines').scrollHeight};
$('reparse').onclick=()=>{let w=getWork();if(!w)return;if(!confirm('¿Reanalizar el texto? Se sustituirán todas las escenas e intervenciones editadas.'))return;let p=parseScript($('raw').value,w.title);w.raw=p.raw;w.scenes=p.scenes;editSceneId=w.scenes[0].id;w.selected=[];saveSoon(w);renderEdit();toast('Guion reanalizado')};
$('export-work').onclick=()=>{let w=getWork();if(w)exportJSON(w,w.title.toLowerCase().replace(/[^a-z0-9]+/g,'-')+'.json')};
function actors(w){return [...new Set([...(w.cast||[]).map(canon),...w.scenes.flatMap(s=>s.lines.filter(l=>!isDirection(l)).flatMap(l=>participants(l,w)))] .filter(p=>p&&p!=='TOTES'))].sort((a,b)=>a.localeCompare(b,'es'))}
function renderPrepare(){let w=getWork();$('prepare-work').innerHTML=optionsWorks();$('prepare-work').value=activeId||'';if(!w){$('actor').innerHTML='';$('scene-choices').innerHTML='<p class="muted">Importa o carga una obra primero.</p>';return}$('scope').value=w.practiceOptions?.scope||'all';let names=actors(w);if(!names.includes(w.actor))w.actor=names.includes('LOUISE')?'LOUISE':names[0]||'';$('actor').innerHTML=names.map(n=>`<option value="${escapeHTML(n)}">${escapeHTML(n)}</option>`).join('');$('actor').value=w.actor;$('language').value=getLang(w);renderVoices();renderCharacterVoices();if(!Array.isArray(w.selected)||(!w.selected.length&&!w.sceneSelectionInitialized)){w.selected=w.scenes.map(s=>s.id);w.sceneSelectionInitialized=true;saveSoon(w)}$('scene-choices').innerHTML=w.scenes.map(s=>`<label class="scene-item"><input type="checkbox" class="scene-check" value="${escapeHTML(s.id)}" ${w.selected.includes(s.id)?'checked':''}><div class="content"><strong>${escapeHTML(s.name)}</strong><div class="muted">${s.lines.length} intervenciones</div></div></label>`).join('');$('scene-choices').classList.toggle('hidden',$('scope').value==='all');$$('.scene-check').forEach(el=>el.onchange=()=>{w.selected=$$('.scene-check:checked').map(e=>e.value);saveSoon(w);renderStartChoices()});$('mode').value=w.practiceOptions?.mode||$('mode').value;renderModeDescription();$('autovoice').checked=w.practiceOptions?.autovoice!==false;$('autorec').checked=w.practiceOptions?.autorec!==false;renderStartChoices();}
// v2.6: independent presentation rules for each rehearsal mode.
function modeRules(mode){
 return {
  normal:{showMine:true,showLive:true,showFeedback:true,help:true,description:'Texto visible: practica interpretación y ritmo.'},
  memory:{showMine:false,showLive:true,showFeedback:true,help:true,description:'Memoriza sin ver tus frases; usa pistas si te bloqueas.'},
  continuous:{showMine:false,showLive:false,showFeedback:false,help:true,description:'Simulación de función: sin transcripción ni porcentaje visibles; ayudas solo si las solicitas.'},
  entries:{showMine:false,showLive:true,showFeedback:true,help:true,description:'Solo tus turnos y la réplica que los precede; puedes pedir pistas.'}
 }[mode]||{showMine:false,showLive:true,showFeedback:true,help:true,description:''};
}
function selectEntryLines(lines,work,actor){
 const keep=new Set();
 lines.forEach((line,index)=>{
  if(!isMine(line,work,actor))return;
  keep.add(index);
  // The latest external spoken cue in the same scene, skipping stage directions.
  for(let j=index-1;j>=0&&lines[j].scene===line.scene;j--){
   if(isMine(lines[j],work,actor))break;
   if(!isDirection(lines[j])){keep.add(j);break;}
  }
 });
 return lines.filter((_,i)=>keep.has(i));
}
function modeHintText(line,hint){
 if(hint===0)return 'Tu turno: habla o pulsa «He terminado».';
 const words=line.text.split(/\s+/);
 return 'Pista: '+words.slice(0,hint===1?2:5).join(' ')+'…';
}
function preparedLines(){let w=getWork();if(!w)return[];let chosen=$('scope').value==='all'?w.scenes:w.scenes.filter(s=>w.selected.includes(s.id));let result=chosen.flatMap(s=>sceneEvents(s).map(l=>({...l,scene:s.name})));if($('mode').value==='entries')result=selectEntryLines(result,w,w.actor);return result}
function renderStartChoices(){let lines=preparedLines(),filter=normalize($('start-filter').value);let prev=$('start-line').value;$('start-line').innerHTML=lines.map((l,i)=>({l,i})).filter(({l})=>normalize(l.speaker+' '+l.text+' '+l.scene).includes(filter)).map(({l,i})=>'<option value="'+i+'">'+(i+1)+' · '+escapeHTML(l.scene)+' · '+escapeHTML(l.speaker)+' — '+escapeHTML(l.text.slice(0,75))+'</option>').join('');if([...$('start-line').options].some(o=>o.value===prev))$('start-line').value=prev;else if(!filter)$('start-line').value='0'}
function renderModeDescription(){let el=$('mode-description');if(el)el.textContent=modeRules($('mode').value).description}
$('start-filter').oninput=renderStartChoices;$('mode').onchange=()=>{renderStartChoices();renderModeDescription()};
$('prepare-work').onchange=e=>{choose(works.find(w=>w.id===e.target.value));renderPrepare()};$('actor').onchange=e=>{let w=getWork();if(w){w.actor=e.target.value;saveSoon(w);renderStartChoices();renderCharacterVoices()}};$('scope').onchange=e=>{let w=getWork();if(w){w.practiceOptions={...(w.practiceOptions||{}),scope:e.target.value};saveSoon(w)}renderPrepare()};$('language').onchange=e=>{let w=getWork();if(!w)return;w.language=e.target.value;w.voice='';saveSoon(w);renderVoices();renderCharacterVoices()};$('voice').onchange=e=>{let w=getWork();if(w){w.voice=e.target.value;saveSoon(w)}};if('speechSynthesis' in window)speechSynthesis.addEventListener?.('voiceschanged',()=>{if(tab==='prepare'){renderVoices();renderCharacterVoices()}});
const normalize=s=>(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-zñ0-9\s]/g,' ').replace(/\s+/g,' ').trim();
function score(expected,said){let a=normalize(expected).split(' ').filter(Boolean),b=new Set(normalize(said).split(' ').filter(Boolean));if(!a.length)return 0;return Math.round(100*a.filter(x=>b.has(x)).length/a.length)}
// Local, bounded diagnostic trace: no audio or full transcriptions are stored.
function traceVoice(kind,info={}){
 const entry={time:new Date().toISOString().slice(11,23),kind,...info};
 voiceTrace.push(entry);if(voiceTrace.length>350)voiceTrace.shift();
 const target=$('voice-log');if(target)target.value=voiceTrace.map(x=>JSON.stringify(x)).join('\n');
}
function mergeRecognized(base,incoming){
 base=String(base||'').trim();incoming=String(incoming||'').trim();
 if(!base)return incoming;if(!incoming)return base;
 const a=base.split(/\s+/),b=incoming.split(/\s+/);
 const norm=x=>x.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
 // A fresh SpeechRecognition session may start with the final result of the previous one.
 // Compare overlapping word *sequences*, never just isolated repeated words.
 let overlap=0;
 for(let n=Math.min(a.length,b.length);n>=2;n--){
  if(a.slice(-n).every((v,i)=>norm(v)===norm(b[i]))){overlap=n;break}
 }
 // If Chrome returned the whole previously confirmed text as a snapshot.
 if(overlap===b.length)return base;
 return [base,...b.slice(overlap)].join(' ').trim();
}
// Chrome may expose a succession of *cumulative hypotheses* as separate final
// SpeechRecognitionResult entries. Joining every final row repeats the whole utterance.
// Collapse actual expansions into one hypothesis; join genuinely independent chunks.
function snapshotRecognition(results){
 const rows=Array.from(results||[]).map(r=>({text:String(r?.[0]?.transcript||'').trim(),final:!!r?.isFinal})).filter(r=>r.text);
 const words=t=>String(t||'').trim().split(/\s+/).filter(Boolean);
 const canonical=t=>normalize(t);
 const starts=(a,b)=>{const A=words(canonical(a)),B=words(canonical(b));return B.length>0&&A.length>=B.length&&B.every((v,i)=>v===A[i])};
 const pieces=[];let expansions=0,duplicates=0;
 for(const row of rows){
  if(!pieces.length){pieces.push(row);continue}
  const previous=pieces[pieces.length-1];
  // Previous result is a prefix of a longer cumulative result (Chrome Android).
  if(starts(row.text,previous.text) && words(row.text).length>words(previous.text).length){
   pieces[pieces.length-1]=row;expansions++;continue;
  }
  if(starts(previous.text,row.text)){
   // Replayed or shorter draft, do not duplicate the earlier phrase.
   duplicates++;continue;
  }
  // Partially overlapping finalized chunks may be successive revisions too.
  const prev=words(previous.text),next=words(row.text);
  let overlap=0;
  for(let n=Math.min(prev.length,next.length);n>=2;n--){
   if(prev.slice(-n).map(canonical).every((v,i)=>v===canonical(next[i]))){overlap=n;break}
  }
  if(overlap){
   pieces[pieces.length-1]={text:[...prev,...next.slice(overlap)].join(' '),final:previous.final&&row.final};
   expansions++;continue;
  }
  pieces.push(row);
 }
 return {final:pieces.filter(x=>x.final).map(x=>x.text).join(' ').trim(),
  interim:pieces.filter(x=>!x.final).map(x=>x.text).join(' ').trim(),
  rows:rows.length,groups:pieces.length,expansions,duplicates};
}
$('voice-copy').onclick=()=>{const data=$('voice-log').value||'Sin eventos';if(navigator.clipboard?.writeText){navigator.clipboard.writeText(data).then(()=>toast('Registro copiado')).catch(()=>toast('No se pudo copiar: usa seleccionar texto'))}else{ $('voice-log').focus();$('voice-log').select();toast('Selecciona y copia el registro')} };
$('voice-clear').onclick=()=>{voiceTrace=[];$('voice-log').value='';toast('Registro borrado')};
function stopAll(reason='unspecified'){traceVoice('STOP_ALL',{reason,epoch:recognitionEpoch,hadRecognizer:!!recognizer,hadRetry:!!recRestartTimer,turnIndex:session?.index});currentVoiceTurn=null;clearTimeout(directionTimer);directionTimer=null;recognitionEpoch++;clearTimeout(recTimer);clearTimeout(recRestartTimer);recTimer=null;recRestartTimer=null;if('speechSynthesis'in window)speechSynthesis.cancel();speaking=null;const old=recognizer;recognizer=null;try{old?.abort()}catch{}}
function langParts(line,w){let parts=Array.isArray(line.languageSegments)?line.languageSegments.filter(p=>p&&typeof p.text==='string'&&p.text.trim()):[];if(parts.length&&parts.map(p=>p.text).join('')===line.text)return parts.map(p=>({text:p.text,language:LANGUAGES[p.language]?p.language:getLang(w)}));return [{text:cleanForSpeech(line),language:LANGUAGES[line.language]?line.language:getLang(w)}]}
function speechLine(line,done){if(!('speechSynthesis'in window)){toast('Este navegador no admite síntesis');return}let w=getWork(),parts=langParts(line,w),epoch=recognitionEpoch;window.speechSynthesis.cancel();let i=0;function part(){if(epoch!==recognitionEpoch||session?.paused)return;if(i>=parts.length){speaking=null;done?.();return}let x=parts[i++],u=new SpeechSynthesisUtterance(x.text);u.lang=x.language;u.rate=w?.rate||1.15;let v=voiceFor(x.language,voiceChoiceForLine(w,line));if(v)u.voice=v;u.onend=()=>{if(epoch===recognitionEpoch)part()};u.onerror=()=>{speaking=null;$('feedback').textContent='No se pudo leer la frase con la voz seleccionada. Puedes avanzar manualmente.'};speaking=u;speechSynthesis.speak(u)}part()}
function storePractice(){if(!session)return;let w=works.find(w=>w.id===session.workId);if(!w)return;w.practiceState={config:session.config,index:session.index,completedIds:[...(session.completedIds||[])],sceneName:currentLine()?.scene||'',timestamp:Date.now()};saveSoon(w)}
function startPractice(config,index=0,completedIds=[]){config={...config,mode:['normal','memory','continuous','entries'].includes(config.mode)?config.mode:'normal'};let w=works.find(x=>x.id===config.workId);if(!w)return;choose(w);let all=config.sceneIds.flatMap(id=>{let s=getScene(w,id);return s?sceneEvents(s).map(l=>({...l,scene:s.name})):[]});if(config.mode==='entries')all=selectEntryLines(all,w,config.actor);if(!all.length){toast('No quedan intervenciones para esta selección');return}stopAll('new-practice');session={workId:w.id,actor:config.actor,config,lines:all,index:Math.max(0,Math.min(index,all.length-1)),mode:config.mode,autovoice:config.autovoice,autorec:config.autorec,revealed:false,hint:0,started:Date.now(),heard:'',segmentIndex:0,paused:false,completedIds:new Set(completedIds)};syncSessionTab();updateRate(w.rate||1.15);storePractice();show('rehearsal');renderRehearsal(true)}
$('start').onclick=()=>{let w=getWork();if(!w){toast('Selecciona una obra');return}let ids=($('scope').value==='all'?w.scenes.map(s=>s.id):w.selected);if(!ids.length){toast('Selecciona al menos una escena');return}let all=preparedLines();if(!all.length){toast('No hay intervenciones');return}let idx=Number($('start-line').value||0);let config={workId:w.id,actor:w.actor,sceneIds:ids,mode:$('mode').value,autovoice:$('autovoice').checked,autorec:$('autorec').checked};w.practiceOptions={scope:$('scope').value,mode:config.mode,autovoice:config.autovoice,autorec:config.autorec};startPractice(config,idx)};
function resumePractice(){let w=getWork(),data=w?.practiceState;if(!workReady(w)){show('edit');return}if(!data?.config){toast('Primero prepara un ensayo');return}startPractice(data.config,data.index||0,data.completedIds||[])}
function currentLine(){return session?.lines[session.index]}
function renderJumpChoices(){if(!session)return;let filter=normalize($('jump-filter').value),old=$('jump-line').value;$('jump-line').innerHTML=session.lines.map((l,i)=>({l,i})).filter(({l})=>normalize(l.speaker+' '+l.text+' '+l.scene).includes(filter)).map(({l,i})=>'<option value="'+i+'">'+(i+1)+' · '+escapeHTML(l.speaker)+' · '+escapeHTML(l.text.slice(0,70))+'</option>').join('');if([...$('jump-line').options].some(o=>o.value===old))$('jump-line').value=old;else if(!filter)$('jump-line').value=String(session.index)}
$('jump-filter').oninput=renderJumpChoices;$('jump-go').onclick=()=>{let idx=Number($('jump-line').value);if(!Number.isInteger(idx)||idx<0||idx>=session?.lines.length)return;stopAll('jump');session.index=idx;session.paused=false;resetTurn();storePractice();renderRehearsal(true)};
function resetTurn(){if(!session)return;session.revealed=false;session.hint=0;session.heard='';session.segmentIndex=0}
function renderRehearsal(auto=false){
 if(!session)return;
 const l=currentLine(),w=getWork(),direction=isDirection(l),me=isMine(l,w,session.actor),rules=modeRules(session.mode);
 $('rehearsal-title').textContent=w?.title||'Ensayo';
 $('rehearsal-counter').textContent=(session.index+1)+' / '+session.lines.length;
 $('rehearsal-scene').textContent=l.scene+(l.type==='song'?' · 🎵 Canción':direction?' · Acotación':'');
 $('rehearsal-mode').textContent=({normal:'Normal',memory:'Memorización',continuous:'Función completa',entries:'Solo mis entradas'})[session.mode]||'Ensayo';
 const showText=direction||!me||session.mode==='normal'||rules.showMine||session.revealed;
 const text=showText?l.text:modeHintText(l,session.hint);
 $('dialogue').className='voice-bubble '+(me?'you':'');
 $('dialogue').style.setProperty('--role-color',roleColor(l.speaker));
 $('dialogue').innerHTML='<div class="person"><span class="role-dot" style="background:'+roleColor(l.speaker)+'"></span>'+escapeHTML(l.speaker)+(me?' · TU INTERVENCIÓN':direction?' · NO SE LEE':'')+'</div><p>'+escapeHTML(text)+'</p>';
 $('bar').style.width=((session.index+1)/session.lines.length*100)+'%';
 $('feedback').textContent=direction?'Acotación: no se lee en voz alta.':me?(session.mode==='continuous'?'Tu turno. Di tu texto o pulsa «He terminado».':rules.showMine?'Tu turno: lee o recita la frase y termina cuando quieras.':'Tu turno. Recuerda la frase o pide una pista.'):'Escucha la réplica.';
 $('transcript-area').classList.toggle('hidden',!rules.showLive||!session.heard);
 if(rules.showLive&&session.heard)$('transcript').textContent=session.heard;
 $('listen').disabled=direction||me||session.paused;
 $('talk').disabled=!me||session.paused;
 $('done-speaking').hidden=!me;
 $('done-speaking').disabled=session.paused;
 $('repeat-cue').disabled=session.index===0||session.paused;
 $('prev').disabled=session.paused||session.index===0;
 $('next').disabled=session.paused;
 $('next').textContent=session.index===session.lines.length-1?'Terminar ✓':'Siguiente →';
 // In Normal mode the script is already visible; hints/reveal add no value.
 $('hint').hidden=!me||rules.showMine;
 $('reveal').hidden=!me||rules.showMine;
 $('reveal').textContent=session.revealed?'🙈 Ocultar texto':'👁 Ver texto';
 updateActorProgress();refreshPauseButton();
 $('rehearsal-rate').value=w?.rate||1.15;
 $('rehearsal-rate-display').textContent=Number(w?.rate||1.15).toFixed(2)+'×';
 renderJumpChoices();
 if(auto&&!session.paused){if(direction){ // no auto-reading, continue through direction after a short visual pause
  if(session.autovoice){let epoch=recognitionEpoch;directionTimer=setTimeout(()=>{if(session&&!session.paused&&epoch===recognitionEpoch&&tab==='rehearsal'&&currentLine()===l)move(1)},1000)}
}else if(!me&&session.autovoice){speechLine(l,()=>{if(session&&!session.paused&&tab==='rehearsal'&&currentLine()===l)move(1)})}else if(me&&session.autorec){listenSpeech()}}}
$('pause-ensayo').onclick=()=>{if(!session)return;if(!session.paused){session.paused=true;stopAll('pause');$('feedback').textContent='Ensayo en pausa. No se escucha el micrófono ni avanza el guion.';refreshPauseButton();storePractice()}else{session.paused=false;stopAll('resume');resetTurn();renderRehearsal(true);storePractice();toast('Turno reanudado desde el inicio')}};
function move(delta,completed=false){if(!session||session.paused)return;if(delta>0&&completed&&isMine(currentLine(),getWork(),session.actor)){session.completedIds.add(currentLine().id)}stopAll('move:'+delta+(completed?':completed':''));let next=session.index+delta;if(next>=session.lines.length){finishSession(true);return}session.index=Math.max(0,next);resetTurn();storePractice();renderRehearsal(true)}
$('next').onclick=()=>move(1);$('prev').onclick=()=>move(-1);$('done-speaking').onclick=()=>move(1,true);$('restart').onclick=()=>{if(!session||session.paused)return;stopAll('repeat-current-turn');resetTurn();renderRehearsal(true)};
$('repeat-cue').onclick=()=>{if(!session||session.paused)return;let w=getWork();let cue=session.lines.slice(0,session.index).reverse().find(l=>!isDirection(l)&&!isMine(l,w,session.actor));if(!cue){toast('No hay réplica anterior de otro personaje');return}stopAll('repeat-cue');speechLine(cue,()=>{if(session&&isMine(currentLine(),w,session.actor)&&session.autorec)listenSpeech()})};
$('listen').onclick=()=>{if(!session||session.paused)return;let l=currentLine();if(isDirection(l)||isMine(l,getWork(),session.actor)){toast('Esta frase es tuya o es una acotación');return}stopAll('listen-other');speechLine(l)};
$('hint').onclick=()=>{if(!session)return;if(!isMine(currentLine(),getWork(),session.actor)){toast('Las pistas son para tus intervenciones');return}session.hint=Math.min(2,session.hint+1);renderRehearsal(false)};
$('reveal').onclick=()=>{if(!session)return;session.revealed=!session.revealed;renderRehearsal(false)};
// A new recognizer owns exactly one temporary snapshot. Only finalized words are
// committed on end, once. Old callbacks and multiple starts are explicitly ignored.
function listenSpeech(source='automatic'){
 if(!session||session.paused||!isMine(currentLine(),getWork(),session.actor))return;
 const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!SR){toast('Reconocimiento no disponible. Usa Chrome Android o «He terminado».');return}
 // Re-rendering a turn or tapping Hablar must not reset a live recognition.
 if(currentVoiceTurn?.valid() && currentVoiceTurn.index===session.index){
  traceVoice('TURN_REQUEST_IGNORED',{source,index:session.index,active:!!recognizer,retryPending:!!recRestartTimer});
  if(source==='manual' && !recognizer){
   clearTimeout(recRestartTimer);recRestartTimer=null;
   currentVoiceTurn.startRecognizer();
  }
  return;
 }
 stopAll('start-listening:'+source);
 const epoch=recognitionEpoch,index=session.index,w=getWork(),line=currentLine(),parts=langParts(line,w);
 let segment=0,completedSegments=[],committed='',silentRestarts=0,consecutiveStarts=0,activeRecognizer=null,turnFinished=false;
 const valid=()=>!turnFinished&&epoch===recognitionEpoch&&session&&!session.paused&&session.index===index&&tab==='rehearsal';
 const combine=(...items)=>items.map(v=>String(v||'').trim()).filter(Boolean).join(' ').trim();
 const showLive=live=>{
  if(!valid())return;
  session.heard=combine(...completedSegments,mergeRecognized(committed,live));
  if(modeRules(session.mode).showLive){$('transcript-area').classList.toggle('hidden',!session.heard);$('transcript').textContent=session.heard;}else{$('transcript-area').classList.add('hidden')}
 };
 function scheduleRestart(reason){
  if(!valid())return;
  if(!w.autoRetry||silentRestarts>=2||consecutiveStarts>=12){
   traceVoice('RETRY_BLOCKED',{reason,silentRestarts,consecutiveStarts});
   $('feedback').textContent='Escucha detenida. Pulsa «Hablar» para continuar o «He terminado».';
   return;
  }
  // Exact user-selected pause, not a hardcoded subsecond interval.
  const delay=Math.max(2,Number(w.pauseSeconds)||5)*1000;
  clearTimeout(recRestartTimer);
  traceVoice('RETRY_SCHEDULED',{reason,delayMs:delay});
  recRestartTimer=setTimeout(()=>{recRestartTimer=null;if(valid()&&!activeRecognizer)startRecognizer()},delay);
 }
 function startRecognizer(){
  if(!valid()||activeRecognizer||recognizer){traceVoice('START_BLOCKED',{active:!!activeRecognizer,global:!!recognizer});return}
  const r=new SR(),sid=++voiceSessionNumber;
  activeRecognizer=r;recognizer=r;consecutiveStarts++;
  const lang=parts[segment]?.language||getLang(w);
  r.lang=lang;r.interimResults=true;r.continuous=true;r.maxAlternatives=1;
  let lastFinal='',lastInterim='',hadResult=false,closed=false,fatal=false,nextSegment=false,finalized=false,started=false;
  const owned=()=>valid()&&activeRecognizer===r&&recognizer===r&&!closed;
  const summary=()=>({sid,epoch,segment,finalWords:lastFinal.trim()?lastFinal.trim().split(/\s+/).length:0,interimWords:lastInterim.trim()?lastInterim.trim().split(/\s+/).length:0});
  const finishRecording=()=>{if(!owned())return;try{r.stop()}catch(error){traceVoice('STOP_ERROR',{sid,message:String(error.message||error)})}};
  // Watchdog for a genuinely stalled recognition session, independent of the retry pause.
  clearTimeout(recTimer);
  recTimer=setTimeout(()=>{if(owned()){traceVoice('WATCHDOG_STOP',summary());finishRecording()}},45000);
  r.onstart=()=>{if(owned()){started=true;traceVoice('START', {sid,epoch,lang,segment})}};
  r.onaudiostart=()=>{if(owned())traceVoice('AUDIO_START',{sid})};
  r.onaudioend=()=>{if(owned())traceVoice('AUDIO_END',{sid})};
  r.onresult=e=>{
   if(!owned())return;
   // Android Chrome often returns growing *cumulative* hypotheses as final rows.
   // Assemble each snapshot once; never concatenate its expanding alternatives.
   const snapshot=snapshotRecognition(e.results);
   lastFinal=snapshot.final;
   lastInterim=snapshot.interim;
   const live=combine(lastFinal,lastInterim);
   if(!live)return;
   hadResult=true;silentRestarts=0;
   showLive(live);
   traceVoice('RESULT',{...summary(),resultCount:snapshot.rows,resultIndex:e.resultIndex,groups:snapshot.groups,expansions:snapshot.expansions,duplicates:snapshot.duplicates,heardWords:session.heard.trim().split(/\s+/).filter(Boolean).length});
   const expected=parts[segment]?.text||'';
   const pct=score(expected,mergeRecognized(committed,live));
   $('feedback').textContent=modeRules(session.mode).showFeedback?'Escuchando ('+lang+') · coincidencia aproximada '+pct+'%. Puedes pulsar «He terminado».':'Escuchando tu intervención…';
   // Reset the watchdog on actual recognition progress.
   clearTimeout(recTimer);recTimer=setTimeout(()=>{if(owned()){traceVoice('WATCHDOG_STOP',summary());finishRecording()}},45000);
   if(pct>=87&&expected.trim().length>3){
    if(segment<parts.length-1){
     // Do not commit here and again in onend: exactly one path owns the snapshot.
     nextSegment=true;
     traceVoice('SEGMENT_MATCH',{sid,segment,pct});
     finishRecording();
    }else{
     turnFinished=true;
     traceVoice('TURN_COMPLETE',{sid,pct});
     move(1,true);
    }
   }
  };
  r.onerror=e=>{
   if(!owned())return;
   traceVoice('ERROR',{sid,code:e.error||'unknown'});
   if(['not-allowed','service-not-allowed','network','audio-capture'].includes(e.error)){
    fatal=true;$('feedback').textContent='Reconocimiento no disponible ('+e.error+'). Usa «He terminado».';
   }
  };
  r.onend=()=>{
   if(closed)return;
   closed=true;
   if(!valid()||activeRecognizer!==r||recognizer!==r){traceVoice('STALE_END',{sid,epoch,nowEpoch:recognitionEpoch});return}
   traceVoice('END',{...summary(),hadResult,started,nextSegment,fatal});
   clearTimeout(recTimer);recTimer=null;
   activeRecognizer=null;recognizer=null;
   // onresult may fire multiple times with the same finalized snapshot.
   // Commit that snapshot ONCE, at the close of this recognizer instance.
   if(!finalized){
    finalized=true;
    committed=mergeRecognized(committed,lastFinal);
    showLive('');
   }
   if(fatal)return;
   if(nextSegment){
    completedSegments.push(committed);committed='';segment++;
    silentRestarts=0;
    scheduleRestart('language-segment');
    return;
   }
   if(!hadResult)silentRestarts++;
   $('feedback').textContent=hadResult?'Esperando que continúes…':'Sin voz detectada. Esperando…';
   scheduleRestart(hadResult?'recognition-ended':'no-speech');
  };
  try{
   traceVoice('START_REQUEST',{sid,epoch,lang,segment});
   r.start();$('feedback').textContent='Activando micrófono en '+(LANGUAGES[lang]||lang)+'…';
  }catch(error){
   clearTimeout(recTimer);recTimer=null;closed=true;activeRecognizer=null;recognizer=null;
   traceVoice('START_EXCEPTION',{sid,message:String(error.message||error)});
   $('feedback').textContent='No se pudo activar el micrófono: '+error.message;
  }
 }
 currentVoiceTurn={epoch,index,valid,startRecognizer};
 traceVoice('TURN_START',{source,epoch,index,mode:session.mode,showMine:modeRules(session.mode).showMine,language:parts[0]?.language||getLang(w),segments:parts.length,retrySeconds:w.pauseSeconds});
 startRecognizer();
}
$('talk').onclick=()=>listenSpeech('manual');
async function finishSession(completed=false){if(!session)return;stopAll('finish-session');let w=works.find(w=>w.id===session.workId);if(w){w.lastPractice=Date.now();w.lastActor=session.actor;if(completed)w.practiceState=null;else storePractice();await persist(w)}session=null;syncSessionTab();show('home');toast(completed?'Ensayo completado':'Ensayo guardado para continuar')}
$('finish').onclick=()=>finishSession(false);
async function init(){applyTheme();try{db=await openDB();works=await tx('readonly',s=>s.getAll())||[];works.forEach(migrate);works.sort((a,b)=>b.updated-a.updated);activeId=localStorage.getItem('mi-apuntador-active');if(!works.some(w=>w.id===activeId))activeId=works[0]?.id||null;if(activeId)editSceneId=getWork()?.scenes[0]?.id;renderWorks();renderHome();syncSessionTab();show('home');if(location.protocol==='https:'&&'serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});}catch(e){$('save-status').textContent='Sin almacenamiento';toast('No se pudo abrir la base de datos local: '+e.message)}}
init();
