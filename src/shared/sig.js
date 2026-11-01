function sigOn(){return @X@.show!=='N'&&!!(@X@.caFirm||@X@.caName||@X@.place||@X@.dsign||@X@.sg1)}
function sigModel(){const _s=@X@,L=[],R=[];
 if(_s.caFirm||_s.caName)L.push({t:"AUDITORS' REPORT",u:1},{t:'As per our separate report of even date attached'},{t:_s.caFirm?'For '+_s.caFirm:'',i:1},{t:_s.caType?'('+_s.caType+')':'',i:1},...(_s.caFrn?[{t:'FRN : '+_s.caFrn,i:1}]:[]),{t:_s.sg||'',i:1},{t:''},{t:_s.caName?'('+_s.caName+')':'',i:3},{t:_s.caDesig||'',i:3},...(_s.caNo?[{t:'M. No. : '+_s.caNo,i:3}]:[]),...(_s.caUdin?[{t:'UDIN : '+_s.caUdin,i:3}]:[]));
 R.push({t:'For '+(_s.firm||'')},{t:_s.sg||''},{t:''},{t:_s.sg1||''});
 const F=[];if(_s.place)F.push('PLACE : '+_s.place);if(_s.dsign)F.push('DATE : '+_s.dsign);return{L,R,F}}
function sigHtml(inl){if(!sigOn())return'';const{L,R,F}=sigModel(),ln=(a,r)=>a.map(x=>`<div style="min-height:1.6em;padding-left:${r?0:(x.i||0)*16}px${x.u?';text-decoration:underline':''}">${esc(x.t)||'&nbsp;'}</div>`).join('');
 const bd=`<div style="display:flex;justify-content:space-between;gap:24px;flex-wrap:wrap"><div>${ln(L)}</div><div style="text-align:right">${ln(R,1)}</div></div>${F.length?`<div style="margin-top:12px">${F.map(x=>`<div>${esc(x)}</div>`).join('')}</div>`:''}`;
 return inl?`<div style="padding:10px;border-top:1px solid var(--line);font-size:13px">${bd}</div>`:`<div class="card" style="margin-top:12px;padding:10px;font-size:13px">${bd}</div>`}
function migSig(o){const mp={ca:'caFirm',frn:'caFrn',can:'caName',mno:'caNo',plc:'place',cdt:'dsign'};for(const k in mp){if(k in o){if(o[k]&&!o[mp[k]])o[mp[k]]=o[k];delete o[k]}}if('sig' in o)delete o.sig;return o}
