// Validates lesson data: node tools/validate.js js/lessons
global.window = global; const fs=require('fs'), path=require('path');
const dir=process.argv[2]; fs.readdirSync(dir).sort().forEach(f=>eval(fs.readFileSync(path.join(dir,f),'utf8')));
const L=window.LESSONS; let errs=0; const e=m=>{errs++;console.log('ERR',m)};
const ids=new Set(); L.forEach(l=>{ if(ids.has(l.id))e('dup '+l.id); ids.add(l.id);
  const sc=l.scene||{}; ['quiz','cheat','steps','summary','next','overview'].forEach(k=>{if(!l[k])e(l.id+' missing '+k)});
  l.quiz.forEach((q,i)=>{if(q.c>=q.a.length)e(l.id+' quiz '+i)});
  l.steps.forEach((s,i)=>{ ['t','sub','body','hook','analogy','words'].forEach(k=>{if(!s[k])e(`${l.id} step ${i} missing ${k}`)});
    if((sc.type||'graph')==='graph'){ const vis=(sc.nodes||[]).concat(s.nodes||[]).filter(n=>n.at==null||i>=n.at).map(n=>n.id);
      if(s.flow){ if(!vis.includes(s.flow.from)||!vis.includes(s.flow.to)) e(`${l.id} step ${i} flow ${s.flow.from}->${s.flow.to} not visible`);}
      (s.focus||[]).forEach(f=>{if(!vis.includes(f))e(`${l.id} step ${i} focus ${f} not visible`)});
      if(s.badge&&!vis.includes(s.badge.node))e(`${l.id} step ${i} badge node`);
    } else if(sc.type==='tree'){ const vis=sc.items.filter(it=>(it[4]==null||i>=it[4])&&(it[5]==null||i<it[5])).map(it=>it[1]);
      (s.focus||[]).forEach(f=>{if(!vis.includes(f))e(`${l.id} step ${i} tree focus ${f}`)}); if(s.pin&&!vis.includes(s.pin))e(`${l.id} step ${i} pin ${s.pin}`);}
  });
});
console.log(L.length,'lessons',L.reduce((a,l)=>a+l.steps.length,0),'steps',L.reduce((a,l)=>a+l.quiz.length,0),'quiz Qs',L.filter(l=>l.challenge).length,'challenges; errors',errs);
