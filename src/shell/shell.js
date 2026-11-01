/* ---------- header, dialogs, native Save/Open, PDF, auto-save, unsaved-changes warning, checks ---------- */
(function(){
 const NAT=window.bsNative||null,AUTO_MS=window.bsAutoMs||15000;
 const ST={},lab={};F.forEach(([id,l])=>{ST[id]={path:null,base:null,auto:null};lab[id]=l});
 const $=x=>document.getElementById(x);
 const apiOf=id=>{try{const f=$('f_'+id);return(f&&f.contentWindow&&f.contentWindow.bsApi)||null}catch(e){return null}};
 const curId=()=>{const b=bar.querySelector('button.on');return b?b.id.slice(2):null};
 const txt=id=>{const a=apiOf(id);if(!a)return null;try{return JSON.stringify(a.get())}catch(e){return null}};
 const isDirty=id=>{if(!NAT||!ST[id]||ST[id].base===null)return false;const t=txt(id);return t!==null&&t!==ST[id].base};
 const bn=p=>String(p||'').split(/[\\/]/).pop();
 let last='',tt=0;
 function toast(m){let s=$('tst');if(!s){s=document.createElement('span');s.id='tst';bar.appendChild(s)}s.textContent=m;clearTimeout(tt);tt=setTimeout(()=>{s.textContent=''},4000)}

 /* in-app dialog (replaces browser / system message boxes) */
 function modal(o){return new Promise(res=>{
  const ov=document.createElement('div');ov.id='mo';if(o.tour)ov.className='t';
  const bx=document.createElement('div');bx.className='mb'+(o.wide?' wide':'');bx.setAttribute('role','dialog');bx.setAttribute('aria-modal','true');
  const h=document.createElement('h4');h.textContent=o.title||'Balance Sheet';bx.appendChild(h);
  const p=document.createElement('p');p.textContent=o.message||'';bx.appendChild(p);
  if(o.html){const d=document.createElement('div');d.innerHTML=o.html;bx.appendChild(d)}   // fixed text written in this file only
  if(o.detail){const d=document.createElement('pre');d.textContent=o.detail;bx.appendChild(d)}
  const row=document.createElement('div');row.className='mbtn';
  const btns=(o.buttons||['OK']).map((t,i)=>{const b=document.createElement('button');b.textContent=t;if(i!==(o.def||0))b.className='o';b.onclick=()=>done(i);row.appendChild(b);return b});
  bx.appendChild(row);ov.appendChild(bx);
  const prev=document.activeElement;
  const done=i=>{document.removeEventListener('keydown',kd,true);ov.remove();try{prev&&prev.focus&&prev.focus()}catch(e){}res(i)};
  const cancel=o.cancel!=null?o.cancel:(btns.length-1);
  const kd=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();done(cancel)}
   else if(e.key==='Tab'){e.preventDefault();const i=btns.indexOf(document.activeElement);btns[(i+(e.shiftKey?-1:1)+btns.length)%btns.length].focus()}};
  document.addEventListener('keydown',kd,true);
  document.body.appendChild(ov);btns[o.def||0].focus()})}
 const err=(m,d)=>modal({title:'Balance Sheet',message:m,detail:d||''});

 /* header: firm, file name, unsaved mark, validation bar, window title */
 function tick(){
  const id=curId(),a=id?apiOf(id):null,vb=$('vb');
  if(vb){let r=[];try{r=a?a.check():[]}catch(e){}
   if(r.length){const er=r.filter(x=>x.lv==='e'),use=er.length?er:r;vb.className=er.length?'e':'w';vb.textContent=use.slice(0,3).map(x=>x.t).join('   |   ');vb.hidden=false}
   else{vb.hidden=true;vb.textContent=''}}
  const dl=NAT?F.map(x=>x[0]).filter(isDirty):[],cd=!!id&&dl.includes(id);
  let firm='';try{firm=a?a.firm():''}catch(e){}
  const hf=$('hfirm');hf.textContent=firm||'Firm name not entered';hf.className=firm?'':'m';
  let nm='Untitled';if(id&&ST[id].path)nm=bn(ST[id].path);else if(!NAT&&a){try{nm=a.name()}catch(e){}}
  $('hname').textContent=nm;$('hbadge').hidden=!cd;$('hNext').hidden=!(a&&a.nextYear);
  let lg='';try{lg=a&&a.logo?a.logo():''}catch(e){}
  const hl=$('hlogo');if(hl.getAttribute('src')!==(lg||null))lg?hl.src=lg:hl.removeAttribute('src');hl.hidden=!lg;$('hLogoX').hidden=!lg;$('hLogo').textContent=lg?'Change logo':'Logo';
  if(!NAT)return;
  const title=nm+(cd?' *':'');
  const s=JSON.stringify([dl.length>0,title,dl.map(x=>lab[x])]);
  if(s!==last){last=s;NAT.setState({dirty:dl.length>0,title,names:dl.map(x=>lab[x])})}
 }
 window.bsTick=tick;
 window.bsOnFrame=id=>{if(ST[id]&&ST[id].base===null){const t=txt(id);if(t!==null)ST[id].base=t}tick()};
 setInterval(tick,1500);
 const clickIn=sel=>{try{const f=$('f_'+curId());f.contentDocument.querySelector(sel).click()}catch(e){}};


 /* firm logo: stored with the data file, shown in the header and put into the Excel file */
 $('hLogo').onclick=()=>$('hLogoF').click();
 $('hLogoF').onchange=e=>{
  const f=e.target.files[0];e.target.value='';if(!f)return;
  if(!/^image\/(png|jpeg)$/.test(f.type)){err('Please choose a PNG or JPG picture.');return}
  const r=new FileReader();
  r.onload=()=>{const img=new Image();
   img.onload=()=>{
    const s=Math.min(1,240/Math.max(img.width,img.height)),w=Math.max(1,Math.round(img.width*s)),h=Math.max(1,Math.round(img.height*s));
    const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);
    const url=f.type==='image/jpeg'?c.toDataURL('image/jpeg',.88):c.toDataURL('image/png');
    if(url.length>200000){err('This picture is too big.','Please use a simpler or smaller logo.');return}
    const a=apiOf(curId());if(a&&a.setLogo){a.setLogo(url);toast('Logo added');tick()}};
   img.onerror=()=>err('This picture could not be read.');img.src=r.result};
  r.readAsDataURL(f)};
 $('hLogoX').onclick=()=>{const a=apiOf(curId());if(a&&a.setLogo){a.setLogo('');toast('Logo removed');tick()}};

 /* help and first-run tour */
 const HELP='<h5>Quick start</h5><ol><li>Choose a format at the top: <b>Vertical</b> (Schedule III), <b>Horizontal</b> or <b>Annexure</b>. Each keeps its own data.</li>'
  +'<li>Type the firm name, address and dates. Then enter the amounts in <b>Schedules</b> (Annexure: <b>Enter Data</b>).</li>'
  +'<li>The <b>Balance Sheet</b> and <b>Profit &amp; Loss</b> are made automatically. A red bar under the buttons means the Balance Sheet does not tally.</li>'
  +'<li>Fill <b>Auditor / Signature details</b> if you want the Auditors\' report block printed under the statements.</li>'
  +'<li><b>Save</b> your work as a file, then use <b>Export Excel</b> or <b>Export PDF</b> for the client.</li>'
  +'<li>For the next year (Vertical): <b>Next year</b> moves this year\'s figures to the Previous Year column and carries the opening balances.</li></ol>'
  +'<h5>Keys</h5><ul><li><kbd>Ctrl+S</kbd> save &nbsp; <kbd>Ctrl+O</kbd> open &nbsp; <kbd>Ctrl+E</kbd> Excel &nbsp; <kbd>Ctrl+Shift+E</kbd> PDF &nbsp; <kbd>Ctrl+P</kbd> print preview &nbsp; <kbd>F1</kbd> this help</li>'
  +'<li>In the amount boxes <kbd>Enter</kbd> / <kbd>Shift+Enter</kbd> (or the <kbd>&darr;</kbd> / <kbd>&uarr;</kbd> keys) move to the cell below / above.</li></ul>'
  +'<h5>Your work is protected</h5><ul><li>A draft is kept automatically every few seconds. If the app closes badly, it offers to restore it next time.</li>'
  +'<li>Every save keeps the previous version as a <b>.bak</b> file next to your file.</li></ul>';
 async function showHelp(){
  const b=NAT?['Open User Guide (PDF)','Quick tour','Close']:['Quick tour','Close'];
  const r=await modal({title:'Help',message:'',html:HELP,buttons:b,def:b.length-1,cancel:b.length-1,wide:true});
  const pick=b[r];if(pick==='Quick tour')tour();else if(pick&&/User Guide/.test(pick)){const x=await NAT.openGuide();if(x&&x.error)err('The User Guide could not be opened.',x.error)}
 }
 const TOUR=[
  {t:'Welcome',m:'This short tour shows where things are. It takes a minute. You can open it again any time from Help.'},
  {t:'1. Choose the format',m:'Pick Vertical (Schedule III), Horizontal or Annexure here. Each format keeps its own data, so switching never erases anything.',el:'bar'},
  {t:'2. File bar',m:'Your firm name and file name are shown here, with a mark when there are unsaved changes. Open, Save, Logo, Export Excel and Export PDF are all in this one place.',el:'hd2'},
  {t:'3. Enter the amounts',m:'Open the Schedules tab (Annexure: Enter Data) and type the amounts. Press Enter to go to the next row. The Balance Sheet and Profit & Loss are made for you.'},
  {t:'4. Keep an eye on the bar',m:'If the Balance Sheet does not tally, a red bar appears just below the buttons with the difference. Yellow bars are gentle reminders, such as an empty firm name.',el:'vb'},
  {t:'You are ready',m:'Save your work (Ctrl+S). Press F1 any time for help.'}];
 let touring=false;
 async function tour(){
  if(touring)return;touring=true;let i=0,hl=null;
  const clear=()=>{if(hl){hl.classList.remove('tourhl');hl=null}};
  for(;;){
   clear();const s=TOUR[i];let e=s.el?$(s.el):null;if(e&&e.hidden){e=null}if(e){hl=e;e.classList.add('tourhl')}
   const first=i===0,lastS=i===TOUR.length-1;
   const b=[];if(!first)b.push('Back');b.push(lastS?'Done':'Next');if(!lastS)b.push('Skip');
   const r=await modal({title:s.t+'  ('+(i+1)+'/'+TOUR.length+')',message:s.m,buttons:b,def:b.indexOf(lastS?'Done':'Next'),cancel:b.length-1,tour:true});
   const pick=b[r];
   if(pick==='Back')i--;else if(pick==='Next')i++;else break;
  }
  clear();touring=false;try{localStorage.setItem('bsTour','1')}catch(e){}
 }
 async function nextYear(){
  const id=curId(),a=id?apiOf(id):null;
  if(!a||!a.nextYear){await err('Start next year is available in the Vertical format.','Horizontal and Annexure will get it in a later version.');return}
  const r=await modal({title:'Start next year',message:'This year\'s figures move to the Previous Year column. Closing capital, depreciation (WDV), stock and quantities become the opening figures, and the new year starts blank.',detail:'Your saved file is not changed. Save the new year under a new file name.',buttons:['Start next year','Cancel'],def:0,cancel:1});
  if(r!==0)return;
  const x=a.nextYear();if(x&&x.error){await err(x.error);return}
  ST[id].path=null;toast('Year '+x.to+' started - save it as a new file');tick();
 }
 $('hNext').onclick=nextYear;
 $('hHelp').onclick=showHelp;
 document.addEventListener('keydown',e=>{if(e.key==='F1'){e.preventDefault();if(!$('mo'))showHelp()}});
 window.bsHelp=showHelp;window.bsTour=tour;
 const firstRun=()=>{let seen=false;try{seen=localStorage.getItem('bsTour')==='1'}catch(e){}if(!seen)setTimeout(()=>{if(!$('mo'))tour()},700)};

 if(!NAT){
  firstRun();
  $('hOpen').onclick=()=>clickIn('#ld');$('hSave').onclick=()=>clickIn('#sv');$('hXl').onclick=()=>clickIn('#xl');
  return;
 }

 const waitApi=id=>new Promise(res=>{let n=0;const iv=setInterval(()=>{const a=apiOf(id);if(a&&ST[id].base!==null){clearInterval(iv);res(a)}else if(++n>100){clearInterval(iv);res(null)}},50)});
 const detect=o=>{if(!o||typeof o!=='object')return null;if(o._fmt&&ST[o._fmt])return o._fmt;if(o.L&&o.fa&&o.tb)return'a';if(o.M&&o.S&&o.acc&&o.DP&&o.BS&&o.IE)return o.Q?'v':'h';return null};

 async function doSave(id,asNew){
  const a=id?apiOf(id):null;if(!a)return false;
  let text;try{text=JSON.stringify(a.get())}catch(e){await err('Could not read the data to save.',String(e&&e.message||e));return false}
  const r=await NAT.save({path:ST[id].path,name:(a.name()||'Balance_Sheet_Data')+'.bsdata',text,saveAs:!!asNew});
  if(!r||r.canceled)return false;
  if(r.error){await err('Could not save the file.',r.error);return false}
  ST[id].path=r.path;ST[id].base=text;ST[id].auto=null;NAT.autosaveClear(id);
  toast('Saved: '+r.name);tick();return true;
 }
 async function doOpen(p){
  const r=await NAT.open(p||null);
  if(!r||r.canceled)return;
  if(r.error){await err('Could not open the file.',r.error);return}
  let o;try{o=JSON.parse(r.text)}catch(e){await err('This is not a valid Balance Sheet data file.');return}
  const id=detect(o);
  if(!id){await err('This is not a saved Balance Sheet data file.');return}
  show(id);
  const a=await waitApi(id);
  if(!a){await err('The Balance Sheet format could not be opened.');return}
  a.load(o,r.name,!isDirty(id),()=>{ST[id].path=r.path;ST[id].base=JSON.stringify(a.get());ST[id].auto=null;NAT.autosaveClear(id);toast('Opened: '+r.name);tick()});
 }

 /* PDF / print preview: always printed on white with dark text, whatever the screen theme is */
 const PRINT_CSS='html,body{background:#fff!important;color:#000!important;color-scheme:light}:root{--bg:#fff;--card:#fff;--ink:#000;--mut:#333;--line:#8a8a8a;--acc:#1f5c4a;--accbg:#eef2ef;--bad:#b3261e;--on:#fff}'
  +'@media (prefers-color-scheme:dark){:root{--bg:#fff;--card:#fff;--ink:#000;--mut:#333;--line:#8a8a8a;--acc:#1f5c4a;--accbg:#eef2ef;--bad:#b3261e;--on:#fff}}'
  +'body{padding:0;font-size:11px;line-height:1.35}.w{max-width:none;margin:0}.card{overflow:visible;border:0;margin:0 0 8px;background:#fff}table{min-width:0;width:100%}tr{break-inside:avoid}'
  +'th{background:#1f5c4a!important;color:#fff!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}.b td,h3{background:#eef2ef!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}'
  +'.chk,.bar,button{display:none!important}section.pgs{break-after:page}section.pgs:last-child{break-after:auto}';
 async function doPdf(preview){
  const id=curId(),a=id?apiOf(id):null;if(!a)return;
  let d;try{d=a.printDoc()}catch(e){await err('Could not prepare the report.',String(e&&e.message||e));return}
  if(!d||!d.parts||!d.parts.length){await err('Nothing to print.','The statements are not ready yet.');return}
  const html='<!DOCTYPE html><html><head><meta charset="utf-8"><title>Balance Sheet</title><style>'+d.css+'</style><style>'+PRINT_CSS+'</style></head><body><div class="w">'+d.parts.map(p=>'<section class="pgs">'+p+'</section>').join('')+'</div></body></html>';
  toast(preview?'Preparing preview...':'Preparing PDF...');
  const r=await NAT.pdf({html,name:(a.name()||'Balance_Sheet')+'.pdf',preview:!!preview});
  if(!r||r.canceled){toast('');return}
  if(r.error){await err(preview?'Could not open the preview.':'Could not create the PDF.',r.error);return}
  toast(preview?'Preview opened in your PDF viewer':'PDF saved: '+r.name);
 }
 window.bsHasNative=true;
 window.bsSave=()=>doSave(curId(),false);
 window.bsOpen=()=>doOpen(null);
 window.bsPdf=doPdf;
 $('hOpen').onclick=()=>doOpen(null);$('hSave').onclick=()=>doSave(curId(),false);$('hXl').onclick=()=>clickIn('#xl');
 if(NAT.pdf){$('hPdf').hidden=false;$('hPdf').onclick=()=>doPdf(false)}
 NAT.onMenu((cmd,arg)=>{if(cmd==='save')doSave(curId(),false);else if(cmd==='saveas')doSave(curId(),true);else if(cmd==='open')doOpen(null);else if(cmd==='openpath')doOpen(arg);
  else if(cmd==='nextyear')nextYear();else if(cmd==='help')showHelp();else if(cmd==='tour')tour();else if(cmd==='xlsx')clickIn('#xl');else if(cmd==='pdf')doPdf(false);else if(cmd==='preview')doPdf(true)});

 /* closing the window with unsaved work */
 const saveAllThenClose=async()=>{for(const id of F.map(x=>x[0]).filter(isDirty)){show(id);if(!(await doSave(id,false))){NAT.closeCancel();return}}NAT.closeNow()};
 NAT.onSaveAllAndClose(saveAllThenClose);
 NAT.onCloseRequest(async()=>{
  NAT.closeAck();
  const names=F.map(x=>x[0]).filter(isDirty).map(x=>lab[x]);
  const r=await modal({title:'Unsaved changes',message:'You have unsaved changes.',detail:(names.length?'Format: '+names.join(', ')+'\n\n':'')+'Do you want to save before closing?',buttons:['Save',"Don't save",'Cancel'],def:0,cancel:2});
  if(r===0)saveAllThenClose();else if(r===1)NAT.discardAndClose();else NAT.closeCancel();
 });

 /* auto-save: a draft of every changed format is kept every few seconds */
 setInterval(()=>{F.forEach(([id])=>{const t=txt(id);if(t===null||ST[id].base===null)return;
  if(t!==ST[id].base){if(t!==ST[id].auto){ST[id].auto=t;const a=apiOf(id);NAT.autosave(id,{name:a.name()||'',path:ST[id].path,json:t})}}
  else if(ST[id].auto!==null){ST[id].auto=null;NAT.autosaveClear(id)}})},AUTO_MS);

 /* on start: offer to restore unsaved work, then open a double-clicked file */
 (async()=>{
  try{
   const list=await NAT.autosaveList();
   if(list&&list.length){
    const names=list.map(x=>(lab[x.fmt]||x.fmt)+'  ('+new Date(x.savedAt).toLocaleString()+')');
    const r=await modal({title:'Restore unsaved work?',message:'The app was not closed properly last time.',detail:'Unsaved work was found:\n'+names.join('\n')+'\n\nRestore it?',buttons:['Restore','Discard'],def:0,cancel:1});
    if(r===0){
     for(const it of list){let o;try{o=JSON.parse(it.json)}catch(e){continue}
      show(it.fmt);const a=await waitApi(it.fmt);if(!a)continue;
      a.load(o,it.name,true,()=>{ST[it.fmt].path=it.path||null;tick()})}
    }else await NAT.autosaveClear(null);
   }
  }catch(e){}
  try{const p=await NAT.takePendingOpen();if(p)await doOpen(p)}catch(e){}
  firstRun();
 })();
})();
