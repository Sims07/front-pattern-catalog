/* Graphe arborescent navigable : niveaux alignés, toutes les branches conservées.
   HTML/SVG natifs, aucune bibliothèque ni persistance distante. */
(function () {
 'use strict';
 var tree=null,patterns=new Map(),selectedPath=[],graph=null;
 var panel=document.getElementById('treePanel');
 var viewport=document.getElementById('graphViewport');
 var journey=document.getElementById('journeyList');
 var result=document.getElementById('decisionResult');
 var overview=document.getElementById('mapOverview');
 var ctx=overview.getContext('2d');
 var NODE_W=246,NODE_H=94,STEP_X=283,STEP_Y=158;
 var MIN_SCALE=.075,MAX_SCALE=1.8;
 var scale=1,offsetX=0,offsetY=0,animFrame=0;
 var pointers=new Map(),panStart=null,pinchDistance=0,lastDrag=0,expanded=false;
 function esc(value){
  return String(value==null?'':value).replace(/[&<>"']/g,function(c){
   return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c];
  });
 }
 function choiceKey(path){return path.join('.');}
 function urlFor(id,path){return './pattern.html?id='+encodeURIComponent(id)+(path?'&treePath='+encodeURIComponent(path):'');}
 function clamp(v,lo,hi){return Math.min(hi,Math.max(lo,v));}
 function pathFrom(key){return key===''?[]:key.split('.').map(Number);}

 /* L'axe horizontal représente les alternatives, l'axe vertical le rang
    dans le graphe. On compacte chaque rang sans mélanger l'ordre des branches. */
 function buildGraph(){
  var nodes=[],edges=[],byId=new Map(),questionCount=0;
  function drawNode(nodeId,path,depth){
   if(depth>14)throw Error('Arbre trop profond : '+nodeId);
   var data=tree.nodes[nodeId],key=choiceKey(path);
   if(!data)throw Error('Question inconnue : '+nodeId);
   var q={uid:'q:'+key,type:'question',key:key,title:data.title,help:data.help,depth:depth*2,children:[]};
   questionCount++;nodes.push(q);byId.set(q.uid,q);
   data.choices.forEach(function(choice,i){
    var childPath=path.concat(i),childKey=choiceKey(childPath);
    var c={uid:'c:'+childKey,type:'choice',key:childKey,label:choice.label,detail:choice.detail,
     depth:depth*2+1,children:[],rootIndex:depth===0?i:null};
    nodes.push(c);byId.set(c.uid,c);q.children.push(c);
    edges.push({source:q,target:c,key:childKey});
    var next;
    if(choice.to){
     next=drawNode(choice.to,childPath,depth+1);
    }else{
     next={uid:'l:'+childKey,type:'leaf',key:childKey,patterns:choice.patterns,
      depth:depth*2+2,children:[]};
     nodes.push(next);byId.set(next.uid,next);
    }
    c.children.push(next);
    edges.push({source:c,target:next,key:childKey});
   });
   return q;
  }
  var root=drawNode(tree.start,[],0);
  var walk=0,rows=new Map(),maxDepth=0;
  function natural(node){
   if(!node.children.length){node.natural=walk++;return node.natural;}
   var xs=node.children.map(natural);
   node.natural=(xs[0]+xs[xs.length-1])/2;
   return node.natural;
  }
  natural(root);
  nodes.forEach(function(n){
   if(!rows.has(n.depth))rows.set(n.depth,[]);
   rows.get(n.depth).push(n);
   maxDepth=Math.max(maxDepth,n.depth);
  });
  var widest=Math.max.apply(null,Array.from(rows.values()).map(a=>a.length));
  var width=Math.max(1000,widest*STEP_X+160),height=(maxDepth+1)*STEP_Y+120;
  rows.forEach(function(group,depth){
   group.sort(function(a,b){return a.natural-b.natural;});
   var start=width/2-(group.length-1)*STEP_X/2;
   group.forEach(function(n,i){n.x=start+i*STEP_X;n.y=80+depth*STEP_Y;});
  });
  graph={nodes:nodes,edges:edges,byId:byId,width:width,height:height,questionCount:questionCount,root:root};
  return graph;
 }
 function nodeHTML(node){
  var x=node.x,y=node.y,position='style="left:'+x+'px;top:'+y+'px"';
  if(node.type==='question'){
   return '<section class="graph-node tree-question" data-depth="'+node.depth+'" data-node-path="'+esc(node.key)+'" '+position+
    '><span class="node-type">'+(node.depth===0?'Départ':'Décision')+'</span><strong>'+esc(node.title)+
    '</strong><small>'+esc(node.help)+'</small></section>';
  }
  if(node.type==='choice'){
   var rootId=node.rootIndex===null?'':' id="'+['tree-cms','tree-app','tree-async'][node.rootIndex]+'"';
   return '<div class="graph-node tree-branch" data-depth="'+node.depth+'" data-choice-path="'+esc(node.key)+'"'+rootId+' '+position+'>'+
    '<button class="tree-choice" type="button" data-select-path="'+esc(node.key)+'" aria-pressed="false" title="'+esc(node.detail)+'">'+
    '<span class="choice-indicator">✓ Choix retenu</span><strong>'+esc(node.label)+'</strong><span class="desc">'+esc(node.detail)+'</span></button></div>';
  }
  return '<div class="graph-node tree-leaf" data-depth="'+node.depth+'" data-leaf-path="'+esc(node.key)+'" '+position+'>'+
   '<span class="node-type">Architectures envisageables</span><ul>'+
   node.patterns.map(function(id){
    var p=patterns.get(id);
    return p?'<li><a href="'+esc(urlFor(id,node.key))+'" title="Ouvrir la fiche '+esc(p.title)+'">'+esc(p.title)+' ↗</a></li>':'';
   }).join('')+'</ul></div>';
 }
 function edgeHTML(edge){
  var a=edge.source,b=edge.target,x=a.x,y=a.y+NODE_H/2,ex=b.x,ey=b.y-NODE_H/2;
  var mid=(ey-y)*.49;
  var path='M '+x+' '+y+' C '+x+' '+(y+mid)+', '+ex+' '+(ey-mid)+', '+ex+' '+ey;
  return '<path class="graph-link" data-edge-path="'+esc(edge.key)+'" d="'+path+'"/>';
 }
 function renderGraph(){
  var g=buildGraph();
  panel.style.width=g.width+'px';panel.style.height=g.height+'px';
  panel.innerHTML='<svg class="graph-links" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" width="'+g.width+'" height="'+g.height+'" viewBox="0 0 '+g.width+' '+g.height+'">'+
   g.edges.map(edgeHTML).join('')+'</svg>'+g.nodes.map(nodeHTML).join('');
  document.getElementById('branchCount').textContent=g.questionCount+' questions · '+g.edges.length+' liaisons';
 }
 /* Le chemin est déterminé uniquement par les indices des réponses, pas
    par leur position graphique. Les URL restent rétrocompatibles. */
 function readPath(path){
  var id=tree.start,steps=[],outcome=null;
  for(var j=0;j<path.length;j++){
   var node=tree.nodes[id];
   if(!node||!Number.isInteger(path[j])||path[j]<0||path[j]>=node.choices.length)return null;
   var choice=node.choices[path[j]];
   steps.push({node:id,choice:path[j],label:choice.label,question:node.title});
   if(choice.to){id=choice.to;outcome=null;}
   else{if(j<path.length-1)return null;outcome=choice;id=null;}
  }
  return {steps:steps,current:id,outcome:outcome};
 }
 function showSide(steps,state){
  journey.innerHTML=steps.length?steps.map(function(step,i){
   return '<li><strong>'+esc(step.question)+'</strong><button type="button" data-rewind="'+i+'" title="Revenir à cette décision">'+esc(step.label)+' ↶</button></li>';
  }).join(''):'<li class="path-empty">Sélectionnez une réponse pour construire votre parcours.</li>';
  if(state.outcome){
   var ids=state.outcome.patterns.filter(function(id){return patterns.has(id);});
   result.innerHTML='<div class="choices-summary"><strong>Résultat · '+ids.length+' architecture'+(ids.length>1?'s':'')+'</strong>'+
    '<p>'+esc(state.outcome.why||'Comparez les compromis avant de décider.')+'</p></div>'+
    '<ul class="result-links">'+ids.map(function(id){
     return '<li><a href="'+esc(urlFor(id,choiceKey(selectedPath)))+'">'+esc(patterns.get(id).title)+' · ouvrir la fiche ↗</a></li>';
    }).join('')+'</ul>'+
    (ids.length>=2?'<a class="btn primary result-compare" href="./index.html#compare='+ids.map(encodeURIComponent).join(',')+'">Comparer ces architectures ↗</a>':'')+
    '<p class="mini-hint">Ces propositions peuvent être combinées ; ce n’est pas un classement.</p>';
  }else if(steps.length){
   var next=state.current?tree.nodes[state.current]:null;
   result.innerHTML='<div class="choices-summary"><strong>Décision suivante</strong><p>'+
    esc(next?next.title:'Sélectionnez une réponse.')+'</p></div>'+
    '<p class="mini-hint">Les autres embranchements restent accessibles dans la carte.</p>';
  }else{
   result.innerHTML='<p class="path-empty">Choisissez une réponse dans le graphe. Les architectures s’afficheront ici.</p>';
  }
  document.getElementById('focusPath').disabled=!steps.length;
 }
 function highlight(){
  var state=readPath(selectedPath);
  if(!state)return;
  var selected=new Set(selectedPath.map(function(_,i){return choiceKey(selectedPath.slice(0,i+1));}));
  panel.querySelectorAll('.tree-choice').forEach(function(el){
   var on=selected.has(el.dataset.selectPath);
   el.classList.toggle('is-chosen',on);el.setAttribute('aria-pressed',String(on));
  });
  panel.querySelectorAll('.tree-branch').forEach(function(el){
   el.classList.toggle('is-on-path',selected.has(el.dataset.choicePath));
  });
  panel.querySelectorAll('.tree-leaf').forEach(function(el){
   el.classList.toggle('is-chosen',state.outcome!==null&&el.dataset.leafPath===choiceKey(selectedPath));
  });
  panel.querySelectorAll('.tree-question').forEach(function(el){
   el.classList.toggle('is-current',Boolean(state.current)&&el.dataset.nodePath===choiceKey(selectedPath));
  });
  panel.querySelectorAll('.graph-link').forEach(function(el){
   el.classList.toggle('is-active',selected.has(el.dataset.edgePath));
  });
  showSide(state.steps,state);
  drawOverview();
 }
 function setSelection(path,move){
  if(!readPath(path))return;
  selectedPath=path.slice();
  history.replaceState(null,'',location.pathname+location.search+(path.length?'#path='+choiceKey(path):''));
  highlight();
  if(move)focusPath();
 }
 function viewportSize(){return {w:viewport.clientWidth,h:viewport.clientHeight};}
 function setView(s,x,y,animate){
  scale=clamp(s,MIN_SCALE,MAX_SCALE);offsetX=x;offsetY=y;
  panel.classList.toggle('is-animating',Boolean(animate));
  panel.style.transform='translate('+offsetX+'px,'+offsetY+'px) scale('+scale+')';
  document.getElementById('zoomValue').textContent=Math.round(scale*100)+' %';
  drawOverview();
 }
 function fitNodes(nodes,maxZoom){
  if(!graph||!nodes.length)return;
  var minX=Math.min.apply(null,nodes.map(function(n){return n.x-NODE_W/2;}));
  var maxX=Math.max.apply(null,nodes.map(function(n){return n.x+NODE_W/2;}));
  var minY=Math.min.apply(null,nodes.map(function(n){return n.y-NODE_H/2;}));
  var maxY=Math.max.apply(null,nodes.map(function(n){return n.y+NODE_H/2;}));
  var size=viewportSize(),pad=32;
  var s=clamp(Math.min((size.w-pad*2)/(maxX-minX),(size.h-pad*2)/(maxY-minY),maxZoom||1.1),MIN_SCALE,MAX_SCALE);
  setView(s,size.w/2-(minX+maxX)/2*s,size.h/2-(minY+maxY)/2*s,true);
 }
 function focusStart(){
  if(!graph)return;
  fitNodes(graph.nodes.filter(function(n){return n.depth<=2;}),1.02);
 }
 function fitGraph(){
  if(!graph)return;
  fitNodes(graph.nodes,1);
 }
 function focusPath(){
  if(!graph)return;
  if(!selectedPath.length){focusStart();return;}
  var key=choiceKey(selectedPath),q=graph.byId.get('q:'+key);
  if(q){fitNodes([q].concat(q.children),1.08);return;}
  var leaf=graph.byId.get('l:'+key),choice=graph.byId.get('c:'+key);
  fitNodes([choice,leaf].filter(Boolean),1.08);
 }
 function focusBranch(key){
  if(!graph)return;
  var choice=graph.byId.get('c:'+key),next=graph.byId.get('q:'+key)||graph.byId.get('l:'+key);
  if(!choice)return;
  fitNodes([choice,next].concat(next&&next.children||[]).filter(Boolean),1.02);
 }
 function zoomAt(factor,cx,cy){
  var old=scale,newScale=clamp(old*factor,MIN_SCALE,MAX_SCALE);
  var wx=(cx-offsetX)/old,wy=(cy-offsetY)/old;
  setView(newScale,cx-wx*newScale,cy-wy*newScale,false);
 }
 function zoomStep(dir){
  var size=viewportSize();
  zoomAt(dir>0?1.25:.8,size.w/2,size.h/2);
 }
 function drawOverview(){
  if(!graph||!ctx)return;
  var cw=overview.width,ch=overview.height,pad=9;
  ctx.clearRect(0,0,cw,ch);
  ctx.fillStyle='#10283b';ctx.fillRect(0,0,cw,ch);
  var factor=Math.min((cw-pad*2)/graph.width,(ch-pad*2)/graph.height);
  var dx=(cw-graph.width*factor)/2,dy=(ch-graph.height*factor)/2;
  graph.edges.forEach(function(e){
   ctx.beginPath();ctx.moveTo(dx+e.source.x*factor,dy+e.source.y*factor);
   ctx.lineTo(dx+e.target.x*factor,dy+e.target.y*factor);
   ctx.strokeStyle='#43677b';ctx.lineWidth=.6;ctx.stroke();
  });
  graph.nodes.forEach(function(n){
   ctx.fillStyle=n.type==='leaf'?'#ada4f9':n.type==='question'?'#80d9cf':'#829db1';
   ctx.fillRect(dx+n.x*factor-1.5,dy+n.y*factor-1.5,3,3);
  });
  var sz=viewportSize();
  ctx.strokeStyle='#e8fff5';ctx.lineWidth=1.5;
  ctx.strokeRect(dx-offsetX/scale*factor,dy-offsetY/scale*factor,sz.w/scale*factor,sz.h/scale*factor);
 }
 function moveCenterTo(wx,wy){
  var size=viewportSize();
  setView(scale,size.w/2-wx*scale,size.h/2-wy*scale,true);
 }
 function renderFromHash(){
  var match=location.hash.match(/^#path=([0-9.]+)$/);
  var candidate=match?pathFrom(match[1]):[];
  selectedPath=readPath(candidate)?candidate:[];
  highlight();
  if(selectedPath.length)focusPath();else focusStart();
 }
 function load(){
  Promise.all([
   fetch('./decision-tree.json',{cache:'no-store'}).then(function(res){if(!res.ok)throw Error('Arbre inaccessible');return res.json();}),
   fetch('./patterns.json',{cache:'no-store'}).then(function(res){if(!res.ok)throw Error('Catalogue inaccessible');return res.json();})
  ]).then(function(data){
   tree=data[0];patterns=new Map(data[1].patterns.map(function(p){return [p.id,p];}));
   if(!tree||!tree.nodes||!tree.nodes[tree.start])throw Error('Données de décision invalides');
   renderGraph();renderFromHash();
  }).catch(function(error){
   panel.innerHTML='<p role="alert">Impossible de charger le graphe : '+esc(error.message)+
    '</p><button type="button" id="retryLoad">Réessayer</button>';
   panel.querySelector('#retryLoad').addEventListener('click',load);
  });
 }
 panel.addEventListener('click',function(event){
  var choice=event.target.closest('[data-select-path]');
  if(choice&&Date.now()-lastDrag>250)setSelection(pathFrom(choice.dataset.selectPath),true);
 });
 journey.addEventListener('click',function(event){
  var btn=event.target.closest('[data-rewind]');
  if(!btn)return;
  var index=Number(btn.dataset.rewind);
  if(Number.isInteger(index)&&index>=0){
   setSelection(selectedPath.slice(0,index),false);
   var key=choiceKey(selectedPath);
   if(graph){var q=graph.byId.get('q:'+key);if(q)fitNodes([q].concat(q.children),1.06);else focusStart();}
  }
 });
 document.getElementById('startOver').addEventListener('click',function(){if(tree){setSelection([],false);focusStart();}});
 document.getElementById('focusStart').addEventListener('click',focusStart);
 document.getElementById('fitGraph').addEventListener('click',fitGraph);
 document.getElementById('focusPath').addEventListener('click',focusPath);
 document.getElementById('zoomIn').addEventListener('click',function(){zoomStep(1);});
 document.getElementById('zoomOut').addEventListener('click',function(){zoomStep(-1);});
 document.querySelectorAll('[data-jump-to]').forEach(function(btn,i){
  btn.addEventListener('click',function(){focusBranch(String(i));});
 });
 function toggleExpand(force){
  expanded=typeof force==='boolean'?force:!expanded;
  document.getElementById('fullTree').classList.toggle('graph-expanded',expanded);
  document.getElementById('expandGraph').setAttribute('aria-pressed',String(expanded));
  document.getElementById('expandGraph').textContent=expanded?'Réduire':'Agrandir';
  if(graph){if(selectedPath.length)focusPath();else focusStart();}
 }
 document.getElementById('expandGraph').addEventListener('click',function(){toggleExpand();});
 viewport.addEventListener('wheel',function(event){
  if(!graph)return;
  event.preventDefault();
  var box=viewport.getBoundingClientRect();
  zoomAt(Math.exp(-event.deltaY*.0016),event.clientX-box.left,event.clientY-box.top);
 },{passive:false});
 viewport.addEventListener('keydown',function(event){
  if(event.target!==viewport)return;
  if(event.key==='+'||event.key==='='){event.preventDefault();zoomStep(1);}
  else if(event.key==='-'){event.preventDefault();zoomStep(-1);}
  else if(event.key==='ArrowLeft'||event.key==='ArrowRight'||event.key==='ArrowUp'||event.key==='ArrowDown'){
   event.preventDefault();
   setView(scale,offsetX+(event.key==='ArrowLeft'?65:event.key==='ArrowRight'?-65:0),
    offsetY+(event.key==='ArrowUp'?65:event.key==='ArrowDown'?-65:0),false);
  }
 });
 window.addEventListener('keydown',function(event){if(event.key==='Escape'&&expanded)toggleExpand(false);});
 viewport.addEventListener('pointerdown',function(event){
  if(event.target.closest('button,a,.graph-overview'))return;
  pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
  viewport.setPointerCapture(event.pointerId);
  panel.classList.remove('is-animating');
  if(pointers.size===1){panStart={x:event.clientX,y:event.clientY,ox:offsetX,oy:offsetY,moved:false};}
  else if(pointers.size===2){
   var p=Array.from(pointers.values());
   pinchDistance=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);
   panStart=null;
  }
 });
 viewport.addEventListener('pointermove',function(event){
  if(!pointers.has(event.pointerId)||!graph)return;
  pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
  if(pointers.size===2){
   var ps=Array.from(pointers.values()),rect=viewport.getBoundingClientRect();
   var dist=Math.hypot(ps[0].x-ps[1].x,ps[0].y-ps[1].y);
   if(pinchDistance>0){
    zoomAt(dist/pinchDistance,(ps[0].x+ps[1].x)/2-rect.left,(ps[0].y+ps[1].y)/2-rect.top);
    lastDrag=Date.now();
   }
   pinchDistance=dist;
  }else if(panStart){
   var dx=event.clientX-panStart.x,dy=event.clientY-panStart.y;
   if(Math.abs(dx)+Math.abs(dy)>4)panStart.moved=true;
   if(panStart.moved){
    viewport.classList.add('is-panning');
    setView(scale,panStart.ox+dx,panStart.oy+dy,false);
    lastDrag=Date.now();
   }
  }
 });
 function releasePointer(event){
  pointers.delete(event.pointerId);
  if(viewport.hasPointerCapture(event.pointerId))viewport.releasePointerCapture(event.pointerId);
  if(pointers.size!==1)panStart=null;
  else{
   var p=Array.from(pointers.values())[0];
   panStart={x:p.x,y:p.y,ox:offsetX,oy:offsetY,moved:false};
  }
  if(pointers.size<2)pinchDistance=0;
  viewport.classList.remove('is-panning');
 }
 viewport.addEventListener('pointerup',releasePointer);
 viewport.addEventListener('pointercancel',releasePointer);
 overview.addEventListener('click',function(event){
  if(!graph)return;
  var box=overview.getBoundingClientRect(),cw=overview.width,ch=overview.height,pad=9;
  var factor=Math.min((cw-pad*2)/graph.width,(ch-pad*2)/graph.height);
  var dx=(cw-graph.width*factor)/2,dy=(ch-graph.height*factor)/2;
  var px=(event.clientX-box.left)*cw/box.width,py=(event.clientY-box.top)*ch/box.height;
  moveCenterTo((px-dx)/factor,(py-dy)/factor);
 });
 overview.addEventListener('keydown',function(event){
  if(!graph)return;
  var delta=event.key==='ArrowLeft'?-200:event.key==='ArrowRight'?200:0;
  var dy=event.key==='ArrowUp'?-200:event.key==='ArrowDown'?200:0;
  if(delta||dy){
   event.preventDefault();var v=viewportSize();
   moveCenterTo((v.w/2-offsetX)/scale+delta,(v.h/2-offsetY)/scale+dy);
  }
 });
 window.addEventListener('hashchange',function(){if(graph)renderFromHash();});
 var resizeObserver=new ResizeObserver(function(){if(graph){if(selectedPath.length)focusPath();else focusStart();}});
 resizeObserver.observe(viewport);
 load();
})();