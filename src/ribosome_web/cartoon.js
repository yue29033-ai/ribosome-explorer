// Cartoon paths follow deposited C-alpha / C4-prime coordinates.
// Protein ribbon widths follow deposited helix and sheet annotations.
function cartoonGeometry(ch){
 const positions=[],indices=[];let count=0;
 const protein=['LP','SP'].includes(ch.type);
 function appendRings(rings){const start=count;
  for(const ring of rings)for(const p of ring){positions.push(p.x,p.y,p.z);count++;}
  const n=rings[0].length;
  for(let i=0;i<rings.length-1;i++)for(let j=0;j<n;j++){const a=start+i*n+j,b=start+i*n+(j+1)%n,c=a+n,d=b+n;indices.push(a,b,c,b,d,c);}
 }
 function rod(a,b,r){if(a.distanceTo(b)<.05)return;const tangent=b.clone().sub(a).normalize();let u=new T.Vector3(1,0,0);if(Math.abs(tangent.x)>.9)u.set(0,1,0);u.cross(tangent).normalize();const v=new T.Vector3().crossVectors(tangent,u);appendRings([a,b].map(p=>Array.from({length:6},(_,j)=>p.clone().addScaledVector(u,Math.cos(j*Math.PI/3)*r).addScaledVector(v,Math.sin(j*Math.PI/3)*r))));}
 const runs=[];let run=[];
 for(const r of ch.trace){const p=new T.Vector3(...r.slice(1,4)),guide=new T.Vector3(...r.slice(4,7));const prev=run.at(-1);
  if(prev&&(r[0]!==prev.seq+1||p.distanceTo(prev.p)>(protein?4.8:10))){runs.push(run);run=[];}
  run.push({seq:r[0],p,guide,ss:r[7]});if(!protein)rod(p,guide,.22);
 }if(run.length)runs.push(run);
 for(const path of runs){if(path.length<2)continue;
  const curve=new T.CatmullRomCurve3(path.map(r=>r.p),false,'centripetal');
  const guides=path.map((r,i)=>{const tangent=path[Math.min(i+1,path.length-1)].p.clone().sub(path[Math.max(0,i-1)].p).normalize();const v=r.guide.clone().sub(r.p);v.addScaledVector(tangent,-v.dot(tangent));if(v.lengthSq()<.001)v.set(1,.2,.1).cross(tangent);return v.normalize();});
  for(let i=1;i<guides.length;i++)if(guides[i].dot(guides[i-1])<0)guides[i].negate();
  const rings=[],steps=(path.length-1)*5;
  for(let k=0;k<=steps;k++){const t=k/steps,f=t*(path.length-1),i=Math.min(Math.floor(f),path.length-2),mix=f-i,p=curve.getPoint(t),tangent=curve.getTangent(t).normalize();let u=guides[i].clone().lerp(guides[i+1],mix);u.addScaledVector(tangent,-u.dot(tangent)).normalize();const v=new T.Vector3().crossVectors(tangent,u).normalize();
   const residue=path[Math.min(Math.round(f),path.length-1)],ss=residue.ss;let w=protein?(ss==='H'?1.25:ss==='E'?1.65:.3):.72;let thick=protein?(ss==='C'?.3:.18):.22;
   // Arrowheads identify the C-terminal end of deposited beta strands.
   if(protein&&ss==='E'){let end=Math.round(f);while(end+1<path.length&&path[end+1].ss==='E')end++;const distance=end-f;if(distance<1.4)w=Math.max(.12,2.4*Math.max(0,distance)/1.4);}
   rings.push(Array.from({length:8},(_,j)=>p.clone().addScaledVector(u,w*Math.cos(j*Math.PI/4)).addScaledVector(v,thick*Math.sin(j*Math.PI/4))));
  }appendRings(rings);
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();g.computeBoundingSphere();return g;
}
