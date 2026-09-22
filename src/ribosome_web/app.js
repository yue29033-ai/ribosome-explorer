(() => {
'use strict';
const data=JSON.parse(document.getElementById('structure-data').textContent);
const stage=document.getElementById('stage'), overlay=document.getElementById('leaders'), ctx=overlay.getContext('2d'), labels=document.getElementById('labels'), status=document.getElementById('status');
const T=THREE;
let renderer;
try {renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});} catch(e) {status.textContent='WebGL is unavailable. Open this file in Chrome or Safari.';return;}
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0xffffff,1);stage.prepend(renderer.domElement);
const scene=new T.Scene(), camera=new T.OrthographicCamera(-250,400,230,-230,1,2000);camera.position.set(0,0,700);camera.lookAt(0,0,0);
const upper=new T.Group(),lower=new T.Group();scene.add(upper,lower);
scene.add(new T.HemisphereLight(0xffffff,0x8d939b,2.1));const keyLight=new T.DirectionalLight(0xffffff,2.2);keyLight.position.set(-150,250,400);scene.add(keyLight);
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

const colors={ 'ptc':'#a75439', '23S':'#c49547','5S':'#b36856','LP':'#7586b1','16S':'#489991','SP':'#607dac'};
const config=[{id:'large',cn:'Large subunit',en:'50S large subunit',types:['23S','5S','LP'],heading:true},{id:'23S',cn:'23S rRNA',en:'RNA scaffold of the large subunit',types:['23S']},{id:'5S',cn:'5S rRNA',en:'Short RNA of the large subunit',types:['5S']},{id:'LP',cn:'Large-subunit proteins',en:'50S ribosomal proteins',types:['LP']},{id:'ptc',cn:'PTC',en:'Peptidyl transferase center · 23S rRNA',types:['23S']},{id:'small',cn:'Small subunit',en:'30S small subunit',types:['16S','SP'],heading:true},{id:'16S',cn:'16S rRNA',en:'RNA scaffold of the small subunit',types:['16S']},{id:'SP',cn:'Small-subunit proteins',en:'30S ribosomal proteins',types:['SP']}];
const bytes=Uint8Array.from(atob(data.coordinates),c=>c.charCodeAt(0)),coords=new Int16Array(bytes.buffer);
const chains=[],samples={};Object.keys(colors).forEach(k=>samples[k]=[]);
const vertex=`attribute float atomRadius; uniform float pixelsPerUnit; varying float vRadius; varying vec3 vPosition; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*mv;gl_PointSize=max(1.25,atomRadius*2.0*pixelsPerUnit);vRadius=atomRadius;vPosition=position;}`;
const fragment=`uniform vec3 tint;uniform float fade;uniform float depthRange;varying float vRadius;varying vec3 vPosition;void main(){vec2 xy=gl_PointCoord*2.0-1.0;float rr=dot(xy,xy);if(rr>1.0)discard;float z=sqrt(1.0-rr);vec3 n=vec3(xy.x,-xy.y,z);float light=max(dot(n,normalize(vec3(-0.45,0.65,1.0))),0.0);float rim=pow(1.0-z,2.0);vec3 color=tint*(0.48+0.51*light)+vec3(0.08)*pow(max(dot(n,normalize(vec3(-0.25,0.5,1.0))),0.0),20.0);color-=rim*0.07;color=mix(vec3(1.0),color,fade);color=mix(color*12.92,1.055*pow(max(color,vec3(0.0)),vec3(1.0/2.4))-0.055,step(vec3(0.0031308),color));gl_FragColor=vec4(color,1.0);gl_FragDepthEXT=gl_FragCoord.z-z*vRadius/depthRange;}`;
for(const ch of data.chains){
 const pos=new Float32Array(ch.count*3),radii=new Float32Array(ch.count);
 for(let i=0;i<pos.length;i++)pos[i]=coords[ch.offset*3+i]/10;
 radii.fill(ch.type==='LP'||ch.type==='SP'?1.65:1.58);
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(pos,3));geometry.setAttribute('atomRadius',new T.BufferAttribute(radii,1));geometry.computeBoundingSphere();
 const mat=new T.ShaderMaterial({uniforms:{tint:{value:new T.Color(colors[ch.type])},fade:{value:1},pixelsPerUnit:{value:1},depthRange:{value:1999}},vertexShader:vertex,fragmentShader:fragment,extensions:{fragDepth:true},depthTest:true,depthWrite:true});
 const points=new T.Points(geometry,mat);const group=['16S','SP'].includes(ch.type)?lower:upper;group.add(points);const cartoon=new T.Mesh(cartoonGeometry(ch),new T.MeshStandardMaterial({color:colors[ch.type],roughness:.65,metalness:0,side:T.DoubleSide}));group.add(cartoon);chains.push({...ch,points,cartoon,baseColor:new T.Color(colors[ch.type]),group,pos});
 const step=Math.max(1,Math.floor(ch.count/160));
 for(let i=0;i<ch.count;i+=step)samples[ch.type].push({v:new T.Vector3(pos[i*3],pos[i*3+1],pos[i*3+2]),group});
}
const ptcChain=chains.find(ch=>ch.type==='23S');
const ptcResidues=ptcChain.trace.filter(r=>[2451,2506,2585].includes(r[0]));
if(ptcResidues.length!==3)throw Error('PTC anchor residues missing');
const ptcCenter=ptcResidues.reduce((v,r)=>v.add(new T.Vector3(...r.slice(1,4))),new T.Vector3()).multiplyScalar(1/3);
const ptcAtoms=[];for(let i=0;i<ptcChain.pos.length;i+=3){const v=new T.Vector3(...ptcChain.pos.slice(i,i+3));if(v.distanceTo(ptcCenter)<14)ptcAtoms.push(v.x,v.y,v.z);}
const ptcGeo=new T.BufferGeometry();ptcGeo.setAttribute('position',new T.Float32BufferAttribute(ptcAtoms,3));ptcGeo.setAttribute('atomRadius',new T.Float32BufferAttribute(new Float32Array(ptcAtoms.length/3).fill(1.7),1));
const ptcMat=ptcChain.points.material.clone();ptcMat.uniforms.tint.value.set('#d76d40');ptcMat.depthTest=false;ptcMat.depthWrite=false;
const ptcPoints=new T.Points(ptcGeo,ptcMat);ptcPoints.renderOrder=5;upper.add(ptcPoints);
const ptcRibbon=new T.Group();upper.add(ptcRibbon);let segment=[];
function addPTCSegment(){if(segment.length>1){const m=new T.Mesh(cartoonGeometry({...ptcChain,trace:segment}),new T.MeshStandardMaterial({color:'#c85e35',emissive:'#9a401c',emissiveIntensity:.3,roughness:.6,side:T.DoubleSide,depthTest:false,depthWrite:false}));m.renderOrder=5;ptcRibbon.add(m);}segment=[];}
for(const r of ptcChain.trace){if(new T.Vector3(...r.slice(1,4)).distanceTo(ptcCenter)<14)segment.push(r);else addPTCSegment();}addPTCSegment();
let representation='cartoon';
const modeButtons=[...document.querySelectorAll('[data-model]')];modeButtons.forEach(button=>button.addEventListener('click',()=>{representation=button.dataset.model;modeButtons.forEach(b=>b.setAttribute('aria-pressed',String(b===button)));mark();}));
const axisCanvas=document.getElementById('axes'),axisCtx=axisCanvas.getContext('2d');
function drawAxes(){const dpr=renderer.getPixelRatio(),size=104;axisCanvas.width=size*dpr;axisCanvas.height=size*dpr;axisCtx.setTransform(dpr,0,0,dpr,0,0);const axes=[['X','#d96767',new T.Vector3(1,0,0)],['Y','#63a47a',new T.Vector3(0,1,0)],['Z','#7089cf',new T.Vector3(0,0,1)]].map(([name,color,v])=>({name,color,v:v.applyQuaternion(rotation)})).sort((a,b)=>a.v.z-b.v.z);for(const a of axes){const x=49+a.v.x*32,y=54-a.v.y*32;axisCtx.strokeStyle=a.color;axisCtx.fillStyle=a.color;axisCtx.lineWidth=3.5;axisCtx.lineCap='round';axisCtx.globalAlpha=.65+(a.v.z+1)*.175;axisCtx.beginPath();axisCtx.moveTo(49,54);axisCtx.lineTo(x,y);axisCtx.stroke();axisCtx.beginPath();axisCtx.arc(x,y,3,0,Math.PI*2);axisCtx.fill();axisCtx.font='600 10px system-ui';axisCtx.textAlign='center';axisCtx.fillText(a.name,49+a.v.x*44,58-a.v.y*44);}axisCtx.globalAlpha=1;axisCtx.fillStyle='#8c969b';axisCtx.beginPath();axisCtx.arc(49,54,4,0,Math.PI*2);axisCtx.fill();axisCanvas.dataset.orientation=rotation.toArray().map(v=>v.toFixed(6)).join(',');}
let width=innerWidth,height=innerHeight,worldHeight=460,zoom=1,split=0,targetSplit=0,pressed=false,dragged=false,pinned=false,focus=null,hoverType=null,lastPointer=null,leaveTime=0,raf=0,dirty=true;
const rotation=new T.Quaternion().setFromEuler(new T.Euler(.10,.65,-.04));const initial=rotation.clone();
let pressStart=null,lastInteraction=performance.now(),idlePhase=0,idleAmount=0;
const vec=new T.Vector3(),dq=new T.Quaternion();const labelEls=[];
config.forEach((c,i)=>{const b=document.createElement('button');b.className='label'+(c.heading?' heading':'');b.dataset.id=c.id;b.setAttribute('aria-pressed','false');b.style.setProperty('--color',c.heading?'#506569':colors[c.id]);b.innerHTML=`<span class="main">${c.cn}</span><span class="sub">${c.en}</span>`;labels.appendChild(b);labelEls.push(b);b.addEventListener('pointerenter',()=>{hoverType=c.id;lastInteraction=performance.now();mark();});b.addEventListener('pointerleave',()=>{hoverType=null;mark();});b.addEventListener('click',()=>{focus=focus===c.id?null:c.id;pinned=true;targetSplit=1;labelEls.forEach((el,k)=>el.setAttribute('aria-pressed',String(config[k].id===focus)));mark();});});
function mark(){dirty=true;if(!raf)raf=requestAnimationFrame(tick);}
function resize(){width=innerWidth;height=innerHeight;renderer.setSize(width,height);overlay.width=width*renderer.getPixelRatio();overlay.height=height*renderer.getPixelRatio();overlay.style.width=width+'px';overlay.style.height=height+'px';ctx.setTransform(renderer.getPixelRatio(),0,0,renderer.getPixelRatio(),0,0);labels.style.left=(width<650?width*.68:width*.775)+'px';layout();mark();}
function layout(){const aspect=width/height;worldHeight=Math.max(455,390/aspect)/zoom;const w=worldHeight*aspect;const center=width<650?.335:.375;camera.left=-w*center;camera.right=w*(1-center);camera.top=worldHeight/2;camera.bottom=-worldHeight/2;camera.updateProjectionMatrix();for(const ch of chains)ch.points.material.uniforms.pixelsPerUnit.value=height/worldHeight*renderer.getPixelRatio();const usable=Math.max(230,height-170),top=(height-usable)/2;const ys=[0,.11,.22,.33,.44,.63,.75,.87];labelEls.forEach((b,i)=>b.style.top=(top+usable*ys[i])+'px');}
function project(v,group){return v.clone().applyQuaternion(rotation).add(group.position).project(camera);}
function isBody(x,y){const ndc=new T.Vector2(x/width*2-1,1-y/height*2);for(const ch of chains){const p=project(new T.Vector3(...ch.center),ch.group);const r=Math.max(ch.radius,8)*height/worldHeight;const dx=x-(p.x+1)*width/2,dy=y-(1-p.y)*height/2;if(dx*dx+dy*dy<r*r)return true;}return false;}
function updateLeaders(){ctx.clearRect(0,0,width,height);if(pressed)return;for(let i=0;i<config.length;i++){const c=config[i],el=labelEls[i],rect=el.getBoundingClientRect(),end={x:rect.left-14,y:rect.top+17};const selected=config.find(v=>v.id===focus);const shownTypes=selected?c.types.filter(t=>selected.types.includes(t)):c.types;el.style.opacity=shownTypes.length?1:.42;if(!shownTypes.length)continue;let best=null,score=-Infinity;for(const type of shownTypes)for(const sample of samples[type]){const p=project(sample.v,sample.group);const x=(p.x+1)*width/2,y=(1-p.y)*height/2;if(x>end.x-35||y<35||y>height-60)continue;const s=x-Math.abs(y-end.y)*.34-p.z*25;if(s>score){score=s;best={x,y};}}
 if(c.id==='ptc'){const p=project(ptcCenter,upper);best={x:(p.x+1)*width/2,y:(1-p.y)*height/2};const active=hoverType==='ptc'||focus==='ptc';ctx.strokeStyle=colors.ptc;ctx.lineWidth=active?2:1;ctx.globalAlpha=active?1:.8;ctx.beginPath();ctx.arc(best.x,best.y,active?13:8,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;}
 if(!best)continue;const color=c.heading?'#809091':colors[c.id];ctx.strokeStyle=color;ctx.fillStyle=color;ctx.globalAlpha=c.heading?.45:.64;ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(best.x,best.y);const elbow=Math.max(best.x+12,end.x-55);ctx.lineTo(elbow,end.y);ctx.lineTo(end.x,end.y);ctx.stroke();ctx.beginPath();ctx.arc(best.x,best.y,2.2,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;}
}
let prev=0;
function tick(now){raf=0;const dt=Math.min(.05,(now-prev)/1000||.016);prev=now;const change=targetSplit-split;split=matchMedia('(prefers-reduced-motion: reduce)').matches?targetSplit:split+change*(1-Math.exp(-dt*6));if(Math.abs(targetSplit-split)<.0005)split=targetSplit;
 upper.quaternion.copy(rotation);lower.quaternion.copy(rotation);const idle=!pressed&&now-lastInteraction>1400&&!matchMedia('(prefers-reduced-motion: reduce)').matches;idleAmount+=((idle?1:0)-idleAmount)*(1-Math.exp(-dt*4));if(idle)idlePhase+=dt;const floatY=Math.sin(idlePhase*.85)*2.5*idleAmount,floatX=Math.sin(idlePhase*.43)*1.1*idleAmount;upper.position.set(floatX,split*58+floatY,0);lower.position.set(floatX,-split*58+floatY,0);document.body.dataset.idle=String(idle);document.body.dataset.floatOffset=floatY.toFixed(4);
 const active=config.find(c=>c.id===(hoverType||focus));const selected=config.find(c=>c.id===focus);for(const ch of chains){const visible=!selected||selected.types.includes(ch.type);ch.points.visible=visible&&representation==='spheres';ch.cartoon.visible=visible&&representation==='cartoon';const target=active?.id==='ptc'?.22:active&&!active.types.includes(ch.type)?.095:1;const u=ch.points.material.uniforms.fade;u.value+=(target-u.value)*.2;ch.cartoon.material.color.copy(ch.baseColor).lerp(new T.Color('#ffffff'),1-u.value);}
 const ptcActive=(hoverType||focus)==='ptc';ptcPoints.visible=ptcActive&&representation==='spheres';ptcRibbon.visible=ptcActive&&representation==='cartoon';ptcMat.uniforms.pixelsPerUnit.value=height/worldHeight*renderer.getPixelRatio();
 upper.updateMatrixWorld(true);lower.updateMatrixWorld(true);const ptcScreen=project(ptcCenter,upper);document.body.dataset.ptcAnchor=[(ptcScreen.x+1)*width/2,(1-ptcScreen.y)*height/2].map(x=>x.toFixed(2)).join(',');document.body.dataset.ptcHighlighted=String(ptcActive);renderer.render(scene,camera);updateLeaders();drawAxes();document.body.dataset.representation=representation;document.body.dataset.split=split>.95?'open':split<.05?'closed':'moving';document.body.dataset.focus=focus||'';document.body.dataset.orientation=rotation.toArray().map(v=>v.toFixed(6)).join(',');document.body.dataset.zoom=zoom.toFixed(3);
 if(Math.abs(targetSplit-split)>.0001||chains.some(ch=>Math.abs(ch.points.material.uniforms.fade.value-(active?.id==='ptc'?.22:active&&!active.types.includes(ch.type)?.095:1))>.001))mark();if(!document.hidden&&!matchMedia('(prefers-reduced-motion: reduce)').matches)mark();dirty=false;
}
const canvas=renderer.domElement;
canvas.addEventListener('pointermove',e=>{const point={x:e.clientX,y:e.clientY};lastInteraction=performance.now();if(pressed&&lastPointer){if(!dragged&&Math.hypot(point.x-pressStart.x,point.y-pressStart.y)>5)dragged=true;if(dragged){const dx=point.x-lastPointer.x,dy=point.y-lastPointer.y,axis=new T.Vector3(dy,dx,0);if(axis.lengthSq()>0)rotation.premultiply(dq.setFromAxisAngle(axis.normalize(),Math.hypot(dx,dy)*.006)).normalize();}}else canvas.style.cursor=isBody(point.x,point.y)?'grab':'default';lastPointer=point;mark();});
canvas.addEventListener('pointerdown',e=>{if(e.button!==0||!isBody(e.clientX,e.clientY))return;pressed=true;dragged=false;lastInteraction=performance.now();pressStart=lastPointer={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);document.body.classList.add('rotating');document.body.dataset.labelsHiddenOnPress=getComputedStyle(labels).opacity;canvas.style.cursor='grabbing';mark();});
function release(e){if(!pressed)return;const toggle=e.type==='pointerup'&&!dragged&&Math.hypot(e.clientX-pressStart.x,e.clientY-pressStart.y)<=5;pressed=false;lastInteraction=performance.now();if(toggle){targetSplit=targetSplit?0:1;pinned=!!targetSplit;if(!targetSplit){focus=null;hoverType=null;labelEls.forEach(el=>el.setAttribute('aria-pressed','false'));}}if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);document.body.classList.remove('rotating');canvas.style.cursor='grab';mark();}
canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',()=>{pressed=false;document.body.classList.remove('rotating');mark();});
canvas.addEventListener('pointerleave',()=>{if(!pressed)canvas.style.cursor='default';});
canvas.addEventListener('wheel',e=>{e.preventDefault();lastInteraction=performance.now();zoom=T.MathUtils.clamp(zoom*Math.exp(-e.deltaY*.0007),.65,2.8);layout();mark();},{passive:false});
function reset(){lastInteraction=performance.now();idlePhase=0;rotation.copy(initial);zoom=1;pinned=false;focus=null;hoverType=null;targetSplit=0;labelEls.forEach(el=>el.setAttribute('aria-pressed','false'));layout();mark();}
canvas.addEventListener('dblclick',reset);window.addEventListener('keydown',e=>{if(e.key==='Escape')reset();if(e.key===' '&&document.activeElement===canvas){e.preventDefault();targetSplit=targetSplit?0:1;pinned=!!targetSplit;mark();}if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)&&document.activeElement===canvas){e.preventDefault();const ax=['ArrowLeft','ArrowRight'].includes(e.key)?new T.Vector3(0,1,0):new T.Vector3(1,0,0);rotation.premultiply(dq.setFromAxisAngle(ax,['ArrowLeft','ArrowUp'].includes(e.key)?-.1:.1));lastInteraction=performance.now();mark();}});
canvas.tabIndex=0;canvas.setAttribute('aria-label','Interactive 70S ribosome. Space to expand, arrow keys to rotate, Escape to reset.');canvas.setAttribute('role','img');window.addEventListener('resize',resize);document.addEventListener('visibilitychange',()=>{prev=performance.now();if(!document.hidden)mark();});
status.remove();resize();document.body.dataset.ready='true';
window.ribosomeState=()=>({atoms:data.atoms,chains:chains.length,split,targetSplit,pressed,quaternion:rotation.toArray(),focus,zoom,webgl:renderer.capabilities.isWebGL2});
})();
