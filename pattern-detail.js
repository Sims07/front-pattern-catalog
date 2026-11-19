(function () {
  'use strict';
  var content=document.getElementById('pageContent'),status=document.getElementById('status');
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });}
  function list(items){return '<ul class="bullet-list">'+items.map(function(s){return '<li>'+esc(s)+'</li>'}).join('')+'</ul>';}
  function simpleSection(id,title,body){
    return '<section class="detail-section" id="'+id+'"><h2>'+title+'</h2>'+body+'</section>';
  }
  function anchor(id,title){return '<a href="#'+id+'">'+title+'</a>';}
  function downloadFile(text,title){
    var blob=new Blob([text],{type:'text/markdown;charset=utf-8'});
    var link=document.createElement('a');var url=URL.createObjectURL(blob);
    link.href=url;link.download=title+'.md';link.click();
    setTimeout(function(){URL.revokeObjectURL(url)},1000);
  }
  function md(p){
    var a=p.architecture,lines=[
      '# '+p.title,'','## En clair',p.simple,'','## Exemple',p.example,
      '','## Quand choisir',p.when,'','## Déroulement'
    ];
    p.steps.forEach(function(step,i){lines.push((i+1)+'. '+step)});
    lines.push('','## Architecture verticale');
    a.stages.forEach(function(stage,i){
      lines.push('### '+(i+1)+'. '+stage.label);
      stage.nodes.forEach(function(n){lines.push('- '+n.name+' : '+n.detail)});
    });
    lines.push('','## Liaisons');
    a.links.forEach(function(x){lines.push('- '+x.from+' → '+x.to+' : '+x.label)});
    lines.push('','## Avantages',...p.benefits.map(function(x){return '- '+x}));
    lines.push('','## Compromis',...p.tradeoffs.map(function(x){return '- '+x}));
    lines.push('','## Mise en œuvre',...p.implementation.map(function(x){return '- '+x}));
    if(p.serverless){
      lines.push('','## Serverless');
      Object.keys(p.serverless).forEach(function(k){lines.push('- '+k+' : '+p.serverless[k])});
    }
    lines.push('','## Sécurité',p.security,'','## Observabilité',p.operations);
    return lines.join('\n')+'\n';
  }
  var treePath=new URLSearchParams(location.search).get('treePath');
  var treeBack=treePath&&/^[0-9]+(?:\.[0-9]+)*$/.test(treePath)?'./decision-tree.html#path='+treePath:'./decision-tree.html';
  var menuTree=document.getElementById('treeNavLink');if(menuTree)menuTree.href=treeBack;
  function render(p,patterns,sources){
    document.title=p.title+' · Front Pattern Catalog';
    document.getElementById('breadcrumbCurrent').textContent=p.title;
    var idx=patterns.findIndex(function(x){return x.id===p.id});
    var prev=patterns[(idx+patterns.length-1)%patterns.length];
    var next=patterns[(idx+1)%patterns.length];
    var audience=p.audience.map(function(a){
      return '<span class="audience-item'+(a==='mobile'?' mobile':'')+'">'+
        '<span class="audience-symbol" aria-hidden="true">'+(a==='mobile'?'▣':'◎')+'</span>'+
        esc(a==='mobile'?'Mobile natif':'Web / PWA')+'</span>';
    }).join('');
    var refs=p.refs.map(function(id){return sources.get(id)}).filter(Boolean).filter(function(r){return /^https:\/\//.test(r.url)});
    var links=refs.map(function(r){
      return '<a href="'+esc(r.url)+'" target="_blank" rel="noopener noreferrer">'+esc(r.title)+' ↗</a>';
    }).join('');
    var serverless=p.serverless?simpleSection('serverless','Zoom sur le serverless',
      '<p>Les fonctions s’exécutent dans un service managé, mais les données, les quotas et la sécurité restent à concevoir.</p>'+
      '<div class="serverless-grid">'+[
        ['Déclencheur','trigger'],['Exécution','compute'],['État & données','state'],
        ['Scalabilité','scale'],['Surveillance','watch'],['Compromis','tradeoff']
      ].map(function(k){return '<div><strong>'+k[0]+'</strong><span>'+esc(p.serverless[k[1]])+'</span></div>';}).join('')+'</div>'):'';
    var header='<header class="header-intro"><span class="eyebrow">Fiche de référence · '+esc(p.subtitle)+'</span>'+
      '<h1>'+esc(p.title)+'</h1><p class="summary">'+esc(p.summary)+'</p>'+
      '<div class="pattern-specs" role="group" aria-label="Caractéristiques de l’architecture">'+
      '<div class="audience" aria-label="Canaux concernés">'+audience+'</div>'+
      '<dl class="facts">'+
      '<div class="fact"><dt>Rendu</dt><dd>'+esc(p.rendering)+'</dd></div>'+
      '<div class="fact"><dt>Hébergement</dt><dd>'+esc(p.hosting)+'</dd></div>'+
      '<div class="fact"><dt>Complexité</dt><dd>'+esc(p.complexity)+'</dd></div></dl></div>'+
      '<nav class="controls" aria-label="Actions sur la fiche"><a class="btn primary" href="./index.html#compare='+encodeURIComponent(p.id)+'">Ajouter à la comparaison ↗</a>'+
      '<a class="btn" href="'+esc(treeBack)+'">Retour à l’arbre de décision ↗</a>'+
      '<button type="button" class="btn" id="downloadMd">Exporter la fiche Markdown</button></nav>'+
      '<div class="intro-panel"><strong>En clair</strong><p>'+esc(p.simple)+'</p></div></header>';
    var diagram='<section class="architecture-section" id="architecture">'+
      '<h2>Schéma d’architecture détaillé</h2>'+
      '<p class="section-sub">Lecture de haut en bas : composants, échanges et responsabilités. Les branches ne sont pas toutes des étapes obligatoires.</p>'+
      PatternDiagrams.renderVertical(p)+'</section>';
    var nav='<aside class="toc"><h2>Dans cette fiche</h2><nav aria-label="Sommaire">'+
      [['architecture','Schéma complet'],['steps','Comment ça marche ?'],['example','Exemple concret'],
      ['choice','Quand la choisir ?'],['tradeoffs','Bénéfices & limites'],['implementation','Mise en œuvre'],
      ...(p.serverless?[['serverless','Zoom serverless']]:[]),
      ['channels','Web & mobile'],['security','Sécurité'],['operations','Observabilité'],
      ['references','Références']].map(function(x){return anchor(x[0],x[1])}).join('')+'</nav></aside>';
    var sections=
      simpleSection('steps','Comment ça marche ?', '<ol class="steps">'+p.steps.map(function(s){return '<li>'+esc(s)+'</li>'}).join('')+'</ol>')+
      simpleSection('example','Exemple concret','<div class="callout"><strong>Cas d’usage</strong><p>'+esc(p.example)+'</p></div>')+
      simpleSection('choice','Quand choisir cette architecture ?','<p>'+esc(p.when)+'</p><p>'+esc(p.problem)+'</p>')+
      simpleSection('tradeoffs','Bénéfices et compromis','<div class="cols">'+
        '<div class="surface"><h3>Ce qu’on gagne</h3>'+list(p.benefits)+'</div>'+
        '<div class="surface"><h3>Ce qu’il faut accepter</h3>'+list(p.tradeoffs)+'</div></div>')+
      simpleSection('implementation','Pour l’implémenter',list(p.implementation))+
      serverless+
      simpleSection('channels','Web versus mobile natif','<p>'+esc(p.audienceDetail)+'</p><div class="mobile-note">'+esc(p.mobileNote)+'</div>')+
      simpleSection('security','Sécurité et identité','<div class="warning">'+esc(p.security)+'</div>')+
      simpleSection('operations','À surveiller en production','<p>'+esc(p.operations)+'</p>')+
      simpleSection('references','Références documentaires','<div class="reference-links">'+links+'</div>');
    var bottom='<nav class="bottom-nav" aria-label="Fiches voisines"><a class="btn" href="./pattern.html?id='+encodeURIComponent(prev.id)+'">← '+esc(prev.title)+'</a>'+
      '<a class="btn" href="./pattern.html?id='+encodeURIComponent(next.id)+'">'+esc(next.title)+' →</a></nav>';
    content.innerHTML=header+diagram+'<div class="content-grid">'+nav+'<article class="content-article">'+sections+'</article></div>'+bottom;
    content.querySelector('#downloadMd').addEventListener('click',function(){downloadFile(md(p),p.id)});
    content.hidden=false;status.hidden=true;
  }
  function fail(message){
    status.innerHTML='<h1>Fiche introuvable</h1><p>'+esc(message)+'</p>'+
      '<a class="btn" href="./index.html">Retour au catalogue</a>';
  }
  var id=new URLSearchParams(location.search).get('id');
  if(!id){fail('Aucune architecture sélectionnée.');return;}
  fetch('./patterns.json',{cache:'no-store'}).then(function(r){
    if(!r.ok)throw Error('Impossible de charger les données ('+r.status+')');
    return r.json();
  }).then(function(data){
    var p=data.patterns.find(function(x){return x.id===id});
    if(!p){fail('Le pattern '+id+' ne figure pas dans le catalogue.');return;}
    render(p,data.patterns,new Map(data.sources.map(function(r){return [r.id,r]})));
  }).catch(function(error){fail(error.message)});
})();
