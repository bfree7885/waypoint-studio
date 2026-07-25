(function(){
'use strict';
var root=document.getElementById('viewer');
if(!root)return;
var img=document.getElementById('viewer-img');
var cap=document.getElementById('viewer-cap');
var meta=document.getElementById('viewer-meta');
var items=[];
var index=0;
var lastFocus=null;
function collect(){
items=[];
document.querySelectorAll('[data-gallery-item]').forEach(function(el){
items.push({
src:el.getAttribute('href')||el.getAttribute('data-full')||'',
alt:el.getAttribute('data-alt')||'',
caption:el.getAttribute('data-caption')||'',
meta:el.getAttribute('data-meta')||''
});
});
}
function show(i){
if(!items.length)return;
index=(i+items.length)%items.length;
var it=items[index];
img.src=it.src;img.alt=it.alt||'';
cap.textContent=it.caption||'';
if(meta)meta.textContent=it.meta||'';
root.hidden=false;root.setAttribute('aria-hidden','false');
document.getElementById('viewer-close').focus();
}
function close(){
root.hidden=true;root.setAttribute('aria-hidden','true');
img.removeAttribute('src');
if(lastFocus&&lastFocus.focus)lastFocus.focus();
}
document.addEventListener('click',function(ev){
var a=ev.target.closest&&ev.target.closest('[data-gallery-item]');
if(a){
ev.preventDefault();
collect();
lastFocus=a;
var href=a.getAttribute('href');
var i=0;for(;i<items.length;i++){if(items[i].src===href)break;}
show(i);
}
});
document.getElementById('viewer-close').addEventListener('click',close);
document.getElementById('viewer-prev').addEventListener('click',function(){show(index-1);});
document.getElementById('viewer-next').addEventListener('click',function(){show(index+1);});
document.addEventListener('keydown',function(ev){
if(root.hidden)return;
if(ev.key==='Escape')close();
if(ev.key==='ArrowLeft')show(index-1);
if(ev.key==='ArrowRight')show(index+1);
});
})();
