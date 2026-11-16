/* Arbre intégral : toutes les branches sont montées une seule fois.
   Une sélection met le chemin en évidence sans supprimer les autres nœuds. */
(function () {
  'use strict';
  var tree=null, patterns=new Map(), selectedPath=[], routes=0;
  var panel=document.getElementById('treePanel');
  var journey=document.getElementById('journeyList');
  var result=document.getElementById('decisionResult');
  function esc(v){
    return String(v==null?'':v).replace(/[&<>"']/g,function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  function urlFor(id,path){return './pattern.html?id='+encodeURIComponent(id)+(path?'&treePath='+encodeURIComponent(path):'');}
  function choiceKey(path){return path.join('.');}

  /* Déplier tout le graphe de décisions, y compris les issues non choisies.
     Les sous-arbres partagés peuvent apparaître dans plusieurs branches. */
  function drawNode(nodeId, ancestors, depth){
    if(depth>14)throw Error('Arbre trop profond : '+nodeId);
    var node=tree.nodes[nodeId];
    if(!node)throw Error('Question inconnue : '+nodeId);
    routes++;
    var head=depth===0
      ? '<div class="tree-root-head"><span class="tree-step">Départ</span><strong>'+esc(node.title)+'</strong><small>'+esc(node.help)+'</small></div>'
      : '<div class="tree-question-head"><span class="tree-step">Question '+(depth+1)+'</span><strong>'+esc(node.title)+'</strong><small>'+esc(node.help)+'</small></div>';
    var branches=node.choices.map(function(choice,i){
      var path=ancestors.concat([i]);
      var key=choiceKey(path), rootAnchor=depth===0?(' id="'+['tree-cms','tree-app','tree-async'][i]+'"'):'';
      var subtree=choice.to
        ? drawNode(choice.to,path,depth+1)
        : '<div class="tree-leaf" data-leaf-path="'+key+'"><strong>Architectures possibles</strong><ul>'+
          choice.patterns.map(function(id){
            var p=patterns.get(id);
            return '<li><a href="'+esc(urlFor(id,key))+'" title="Lire la fiche de '+esc(p.title)+'">'+esc(p.title)+' ↗</a></li>';
          }).join('')+'</ul></div>';
      return '<div class="tree-branch" data-choice-path="'+key+'"'+rootAnchor+'>'+
        '<span class="tree-option-label">Réponse '+(i+1)+' sur '+node.choices.length+'</span>'+ 
        '<button class="tree-choice" type="button" data-select-path="'+key+'" aria-pressed="false">'+
        '<strong><span class="choice-indicator">✓ Chemin retenu · </span>'+esc(choice.label)+'</strong>'+
        '<span>'+esc(choice.detail)+'</span></button>'+
        '<div class="tree-descendant">'+subtree+'</div></div>';
    }).join('');
    return '<section class="tree-question'+(depth===0?' root':'')+'" data-depth="'+depth+'" data-node-path="'+choiceKey(ancestors)+'">'+
      head+'<div class="tree-branches">'+branches+'</div></section>';
  }

  /* Retourne uniquement les décisions effectivement retenues, sans re-rendre l'arbre. */
  function readPath(path){
    var id=tree.start,steps=[],outcome=null;
    for(var j=0;j<path.length;j++){
      var node=tree.nodes[id];
      if(!node||!Number.isInteger(path[j])||path[j]<0||path[j]>=node.choices.length)return null;
      var choice=node.choices[path[j]];
      steps.push({node:id,choice:path[j],label:choice.label,question:node.title});
      if(choice.to){id=choice.to;outcome=null;}
      else {if(j<path.length-1)return null;outcome=choice;id=null;}
    }
    return {steps,current:id,outcome:outcome};
  }
  function showSide(steps,state){
    journey.innerHTML=steps.length?steps.map(function(step,i){
      return '<li><strong>'+esc(step.question)+'</strong>'+
        '<button type="button" data-rewind="'+i+'" title="Modifier cette réponse">'+esc(step.label)+' ↶</button></li>';
    }).join(''):'<li class="path-empty">Clique sur une réponse dans l’arbre : ton parcours s’affichera ici.</li>';
    if(state.outcome){
      var ids=state.outcome.patterns.filter(function(id){return patterns.has(id)});
      result.innerHTML='<div class="choices-summary"><strong>Choix atteint · '+ids.length+' architecture'+(ids.length>1?'s':'')+'</strong>'+
        '<p>'+esc(state.outcome.why||'Plusieurs options peuvent convenir. Consulte leurs compromis.')+'</p></div>'+
        '<ul class="result-links">'+ids.map(function(id){
          return '<li><a href="'+esc(urlFor(id,choiceKey(selectedPath)))+'">'+esc(patterns.get(id).title)+' · voir la fiche ↗</a></li>';
        }).join('')+'</ul>'+
        (ids.length>=2?'<a class="btn primary result-compare" href="./index.html#compare='+ids.map(encodeURIComponent).join(',')+'">Comparer ces architectures ↗</a>':'')+
        '<p class="mini-hint">Ces propositions sont des pistes, pas un classement.</p>';
    }else if(steps.length){
      var next=state.current?tree.nodes[state.current]:null;
      result.innerHTML='<div class="choices-summary"><strong>Parcours conservé</strong>'+
        '<p>'+esc(next?'Prochaine question : '+next.title:'Sélectionne une autre réponse.')+'</p></div>'+
        '<p class="mini-hint">Les branches précédentes et les alternatives restent toutes affichées dans l’arbre.</p>';
    }else{
      result.innerHTML='<p class="path-empty">Choisis une réponse pour commencer. Toutes les branches restent visibles.</p>';
    }
  }
  function highlight(){
    var state=readPath(selectedPath);
    if(!state)return;
    panel.querySelectorAll('.tree-choice.is-chosen').forEach(function(el){
      el.classList.remove('is-chosen');el.setAttribute('aria-pressed','false');
    });
    panel.querySelectorAll('.tree-branch.is-on-path').forEach(function(el){el.classList.remove('is-on-path');});
    panel.querySelectorAll('.tree-leaf.is-chosen,.tree-question.is-current').forEach(function(el){
      el.classList.remove('is-chosen','is-current');
    });
    selectedPath.forEach(function(_,idx){
      var key=choiceKey(selectedPath.slice(0,idx+1));
      var branch=Array.from(panel.querySelectorAll('[data-choice-path]')).find(function(el){
        return el.dataset.choicePath===key;
      });
      if(branch){
        branch.classList.add('is-on-path');
        var button=branch.querySelector(':scope > .tree-choice');
        if(button){button.classList.add('is-chosen');button.setAttribute('aria-pressed','true');}
        var leaf=branch.querySelector(':scope > .tree-descendant > .tree-leaf');
        if(leaf&&idx===selectedPath.length-1)leaf.classList.add('is-chosen');
      }
    });
    if(state.current){
      var currentKey=choiceKey(selectedPath);
      var next=Array.from(panel.querySelectorAll('[data-node-path]')).find(function(el){
        return el.dataset.nodePath===currentKey;
      });
      if(next)next.classList.add('is-current');
    }
    showSide(state.steps,state);
  }
  function setSelection(path,scrollTarget){
    if(!readPath(path))return;
    selectedPath=path;
    window.history.replaceState(null,'',location.pathname+location.search+(path.length?'#path='+choiceKey(path):''));
    highlight();
    if(scrollTarget){
      var el=Array.from(panel.querySelectorAll('[data-choice-path]')).find(function(x){
        return x.dataset.choicePath===choiceKey(path);
      });
      if(el)el.scrollIntoView({behavior:'smooth',block:'nearest'});
    }
  }
  function load(){
    Promise.all([
      fetch('./decision-tree.json',{cache:'no-store'}).then(function(res){
        if(!res.ok)throw Error('Arbre inaccessible ('+res.status+')');return res.json();
      }),
      fetch('./patterns.json',{cache:'no-store'}).then(function(res){
        if(!res.ok)throw Error('Catalogue inaccessible ('+res.status+')');return res.json();
      })
    ]).then(function(data){
      tree=data[0];patterns=new Map(data[1].patterns.map(function(p){return [p.id,p]}));
      if(!tree||!tree.nodes||!tree.nodes[tree.start])throw Error('Format d’arbre invalide');
      routes=0;panel.innerHTML=drawNode(tree.start,[],0);
      document.getElementById('branchCount').textContent=routes+' questions représentées';
      var old=location.hash.match(/^#path=([0-9.]+)$/);
      var candidates=old?old[1].split('.').map(Number):[];
      selectedPath=readPath(candidates)?candidates:[];
      highlight();
    }).catch(function(e){
      panel.innerHTML='<p role="alert">Impossible de charger l’arbre de décision : '+esc(e.message)+'</p>'+
        '<button type="button" class="btn" id="retryLoad">Réessayer</button>';
      panel.querySelector('#retryLoad').addEventListener('click',load);
    });
  }
  panel.addEventListener('click',function(event){
    var btn=event.target.closest('[data-select-path]');
    if(btn){
      var path=btn.dataset.selectPath.split('.').map(Number);
      setSelection(path,false);
    }
  });
  journey.addEventListener('click',function(event){
    var btn=event.target.closest('[data-rewind]');
    if(!btn)return;
    var index=Number(btn.dataset.rewind);
    if(Number.isInteger(index)){
      var prefix=selectedPath.slice(0,index);
      setSelection(prefix,false);
      var question=Array.from(panel.querySelectorAll('[data-node-path]')).find(function(el){
        return el.dataset.nodePath===choiceKey(prefix);
      });
      if(question)question.scrollIntoView({behavior:'smooth',block:'center'});
    }
  });
  document.getElementById('startOver').addEventListener('click',function(){if(tree)setSelection([],false)});
  document.querySelectorAll('[data-jump-to]').forEach(function(btn){
    btn.addEventListener('click',function(){
      var target=document.getElementById(btn.dataset.jumpTo);
      if(target)target.scrollIntoView({behavior:'smooth',block:'start'});
    });
  });
  window.addEventListener('hashchange',function(){
    if(!tree)return;
    var match=location.hash.match(/^#path=([0-9.]+)$/);
    if(match){var path=match[1].split('.').map(Number);if(readPath(path)){selectedPath=path;highlight();}}
  });
  load();
})();
