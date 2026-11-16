(function () {
  'use strict';
  var tree=null, patterns=new Map(), current='purpose', history=[], outcome=null;
  var panel=document.getElementById('treePanel'), journey=document.getElementById('journeyList');
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]});}
  function showError(message){panel.innerHTML='<div class="question"><h2>Impossible de charger l’arbre</h2><p>'+esc(message)+'</p><button class="btn" id="retryLoad" type="button">Réessayer</button></div>';panel.querySelector('#retryLoad').addEventListener('click',load);}
  function renderJourney(){
    if(!history.length){journey.innerHTML='<li class="journey-empty">Commence par choisir une branche.</li>';return;}
    journey.innerHTML=history.map(function(step,i){
      var node=tree.nodes[step.node],choice=node.choices[step.choice];
      return '<li><strong>'+esc(node.title)+'</strong><span>'+esc(choice.label)+'</span><button type="button" data-back="'+i+'">Modifier ce choix</button></li>';
    }).join('');
  }
  function renderQuestion(){
    var node=tree.nodes[current], index=history.length+1;
    panel.innerHTML='<div class="step-label">Question '+index+' · choisis une branche</div>'+
      '<div class="question"><h2>'+esc(node.title)+'</h2><p>'+esc(node.help)+'</p></div>'+
      '<div class="tree-stem" aria-hidden="true"></div>'+
      '<div class="branches">'+node.choices.map(function(choice,i){
        return '<button type="button" class="branch" data-choice="'+i+'"><span class="branch-index">Branche '+(i+1)+'</span><strong>'+esc(choice.label)+'</strong><span class="desc">'+esc(choice.detail)+'</span><span class="advance">'+(choice.to?'Continuer →':'Voir les architectures →')+'</span></button>';
      }).join('')+'</div>'+
      '<p class="guidance-note">La sélection affine le contexte, sans attribuer un score artificiel aux architectures.</p>';
  }
  function renderResult(){
    var ids=outcome.patterns.filter(function(id){return patterns.has(id)});
    var comparable=ids.length>=2;
    panel.innerHTML='<div class="step-label">Fin de la branche · pistes à explorer</div><div class="recommendations">'+
      '<h2>Architectures à étudier</h2><p>Voici les options cohérentes avec les choix exprimés. Leurs compromis restent à vérifier dans ton contexte.</p>'+
      (outcome.why?'<div class="recommendation-why">'+esc(outcome.why)+'</div>':'')+
      '<div class="result-grid">'+ids.map(function(id,i){
        var p=patterns.get(id);
        return '<article class="result"><span class="order">Option '+(i+1)+'</span><h3>'+esc(p.title)+'</h3><p>'+esc(p.simple||p.summary)+'</p>'+
          '<ul class="traits"><li><strong>Rendu : </strong>'+esc(p.rendering)+'</li><li><strong>Hébergement : </strong>'+esc(p.hosting)+'</li><li><strong>Compromis : </strong>'+esc(p.tradeoffs[0])+'</li></ul>'+
          '<a class="btn" href="./index.html#pattern='+encodeURIComponent(id)+'">Voir la fiche détaillée ↗</a></article>';
      }).join('')+'</div>'+
      '<div class="result-actions">'+(comparable?'<a class="btn primary" href="./index.html#compare='+ids.map(encodeURIComponent).join(',')+'">Comparer ces '+ids.length+' architectures ↗</a>':'')+
      '<button type="button" class="btn ghost" id="retryJourney">Explorer une autre branche</button>'+
      '</div></div>';
  }
  function render(){renderJourney();if(outcome)renderResult();else renderQuestion();}
  function choose(index){
    var node=tree.nodes[current], choice=node&&node.choices[index];if(!choice)return;
    history.push({node:current,choice:index});
    if(choice.to){current=choice.to;outcome=null;}else{outcome=choice;}
    render();
    panel.scrollIntoView({behavior:'smooth',block:'start'});
  }
  function rewind(index){
    if(index<0||index>=history.length)return;
    current=history[index].node;history=history.slice(0,index);outcome=null;render();
    panel.scrollIntoView({behavior:'smooth',block:'start'});
  }
  function reset(){current=tree.start;history=[];outcome=null;render();panel.scrollIntoView({behavior:'smooth',block:'start'});}
  function load(){
    Promise.all([
      fetch('./decision-tree.json',{cache:'no-store'}).then(function(r){if(!r.ok)throw Error('Arbre indisponible ('+r.status+')');return r.json()}),
      fetch('./patterns.json',{cache:'no-store'}).then(function(r){if(!r.ok)throw Error('Catalogue indisponible ('+r.status+')');return r.json()})
    ]).then(function(data){
      tree=data[0];patterns=new Map(data[1].patterns.map(function(p){return [p.id,p]}));
      if(!tree||!tree.nodes||!tree.nodes[tree.start])throw Error('Format de l’arbre invalide');
      current=tree.start;history=[];outcome=null;render();
    }).catch(function(e){showError(e.message)});
  }
  panel.addEventListener('click',function(e){
    var choice=e.target.closest('[data-choice]');if(choice)choose(Number(choice.dataset.choice));
    var retry=e.target.closest('#retryJourney');if(retry)reset();
  });
  journey.addEventListener('click',function(e){var b=e.target.closest('[data-back]');if(b)rewind(Number(b.dataset.back));});
  document.getElementById('startOver').addEventListener('click',function(){if(tree)reset()});
  load();
})();
