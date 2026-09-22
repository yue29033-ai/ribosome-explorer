// Nucleus as a complete, slowly turning sphere. The envelope stays translucent so the
// transcription and assembly inside remain visible; molecular dimensions are
// deliberately expanded for teaching.
const environment=new T.Group();scene.add(environment);
const envMat=(color,opacity=1)=>new T.MeshStandardMaterial({color,roughness:.7,metalness:.03,transparent:opacity<1,opacity,depthWrite:opacity>=1,side:T.DoubleSide});
function tube3(points,r,color,opacity=1,parent=environment){const curve=new T.CatmullRomCurve3(points.map(p=>p.isVector3?p:new T.Vector3(...p)));const mesh=new T.Mesh(new T.TubeGeometry(curve,Math.max(12,points.length*2),r,5,false),envMat(color,opacity));parent.add(mesh);return mesh;}
function ribbon3(points,width,color,opacity=1,parent=environment){const pos=[],ind=[];points.forEach((p,i)=>{const a=new T.Vector3(...points[Math.max(0,i-1)]),z=new T.Vector3(...points[Math.min(points.length-1,i+1)]).sub(a).normalize();let side=new T.Vector3(0,0,1).cross(z).normalize().multiplyScalar(width/2);if(side.length()<.1)side.set(width/2,0,0);pos.push(p[0]+side.x,p[1]+side.y,p[2]+side.z,p[0]-side.x,p[1]-side.y,p[2]-side.z);if(i<points.length-1){const n=i*2;ind.push(n,n+1,n+2,n+1,n+3,n+2);}});const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(ind);g.computeVertexNormals();const mesh=new T.Mesh(g,envMat(color,opacity));parent.add(mesh);return mesh;}
const nucleusCenter=new T.Vector3(0,100,-85),nuclearRadius=620;
// Four working channels sit on the visible rim so transport routes cross the envelope
// exactly at a pore; the remaining pores are scattered over the front and far side.
const poreDirs=[.74,.56,.31,.18].map(a=>new T.Vector3(Math.cos(a),Math.sin(a),0));
poreDirs.push(new T.Vector3(.161,.758,.632).normalize(),new T.Vector3(.581,.234,.779).normalize());
for(let i=0;i<80&&poreDirs.length<16;i++){const y=1-2*(i+.5)/80,r=Math.sqrt(Math.max(0,1-y*y)),ph=i*2.399963;const d=new T.Vector3(r*Math.cos(ph),y,r*Math.sin(ph));if(Math.abs(d.z)<.22)continue;if(poreDirs.some(p=>d.angleTo(p)<.34))continue;poreDirs.push(d);}
const poreHole=poreDirs.map((d,i)=>Math.cos((i<4?42:i<6?26:24)/nuclearRadius));
// Four nested shells form the double membrane: each bilayer is a pair of leaflets,
// pierced by pores through a per-fragment test against the pore directions.
const shells=[];
for(const [r,color,opacity] of [[612,0x91b9b1,.075],[618,0xb5cbd0,.055],[632,0xabc9c1,.075],[638,0xd3ded7,.095]]){
 const mat=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.FrontSide,
 uniforms:{tint:{value:new T.Color(color)},alpha:{value:opacity},phase:{value:0},pores:{value:poreDirs},holes:{value:poreHole},poreCount:{value:poreDirs.length}},
 vertexShader:`varying vec3 n;varying vec3 p;void main(){n=normalize(normalMatrix*normal);p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
 fragmentShader:`uniform vec3 tint;uniform float alpha;uniform float phase;uniform vec3 pores[16];uniform float holes[16];uniform int poreCount;varying vec3 n;varying vec3 p;void main(){vec3 dir=normalize(p);float hole=1.;for(int i=0;i<16;i++){if(i>=poreCount)break;float c=dot(dir,normalize(pores[i]));hole*=1.-smoothstep(holes[i]-.0012,holes[i],c);}if(hole<.004)discard;float rim=pow(1.-abs(normalize(n).z),2.8);float sheen=pow(max(0.,dot(normalize(n),normalize(vec3(-.45,.65,.65)))),18.);float light=.96+.04*sin(phase);gl_FragColor=vec4(mix(tint,vec3(1.),sheen*.8),(alpha*light+rim*.12+sheen*.055)*hole);}`});
 const mesh=new T.Mesh(new T.SphereGeometry(r,110,72),mat);mesh.position.set(0,100,-85);mesh.renderOrder=10;environment.add(mesh);shells.push(mesh);
}
function npc(dir,scale=1,dim=1){const g=new T.Group();g.position.set(dir.x*624,100+dir.y*624,-85+dir.z*624);g.scale.setScalar(scale);g.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),dir.clone().normalize());environment.add(g);
 for(const z of [-17,0,17]){const tor=new T.Mesh(new T.TorusGeometry(29,z===0?4.4:3.3,8,64),envMat(z===0?0x8da89d:0x7b9b9c,.96*dim));tor.position.z=z;tor.renderOrder=8;g.add(tor);}
 if(scale>.6){for(let i=0;i<8;i++){const a=i*Math.PI/4,x=Math.cos(a),y=Math.sin(a);tube3([[x*29,y*29,-19],[x*33,y*33,0],[x*29,y*29,20]],3.0,0xb6b595,1,g);tube3([[x*28,y*28,-19],[x*19,y*19,-43],[x*13,y*13,-48]],1.0,0x819c96,.85,g);tube3([[x*29,y*29,19],[x*37,y*37,34],[x*42,y*42,39]],.9,0x91aaa4,.8,g);tube3([[x*22,y*22,0],[x*12,y*12,3],[x*7,y*7,-3]],.65,0xc8b496,.5,g);}
  const basket=new T.Mesh(new T.TorusGeometry(13,.9,5,32),envMat(0x8ba39b,.8));basket.position.z=-48;g.add(basket);}
 // Fused membrane rim around the transport opening.
 const rim=new T.Mesh(new T.TorusGeometry(37,9,10,64),envMat(0xb7c7b4,.35*dim));rim.scale.z=.75;g.add(rim);
}
poreDirs.forEach((d,i)=>npc(d,i<4?1:(i<6?.63:.58),i<6?1:.7));
// Nuclear lamina: thin filament loops hugging the inner membrane face.
const laminaMat=new T.LineBasicMaterial({color:0x7fa89b,transparent:true,opacity:.15,depthWrite:false});
for(let k=0;k<7;k++){const ax=new T.Vector3(Math.sin(k*1.7+.4),Math.cos(k*2.3),Math.sin(k*.9+2)).normalize();const u=new T.Vector3(1,0,0);if(Math.abs(ax.x)>.9)u.set(0,0,1);u.cross(ax).normalize();const v=new T.Vector3().crossVectors(ax,u);const pts=[];
 for(let i=0;i<=96;i++){const t=i/96*Math.PI*2,rr=600+Math.sin(t*5+k*2.1)*6;pts.push(new T.Vector3().addScaledVector(u,Math.cos(t)*rr).addScaledVector(v,Math.sin(t)*rr).add(nucleusCenter));}
 environment.add(new T.Line(new T.BufferGeometry().setFromPoints(pts),laminaMat));}
// Chromatin fibres at mixed depths give the rotating interior parallax.
const chromaCols=[0xa08fc0,0x8fa3c4,0xb0a08a];
[[120,430,-375],[330,520,-305],[420,160,-245],[60,180,-505],[450,430,5],[250,120,55],[460,270,-385]].forEach((c,i)=>{const pts=[];const ph=i*1.9;
 for(let j=0;j<=48;j++){const t=j/48*Math.PI*2;pts.push([c[0]+Math.sin(t*3+ph)*46+Math.sin(t*7+ph*2)*12,c[1]+Math.sin(t*2+ph)*38,c[2]+Math.cos(t*2.3+ph)*44]);}
 tube3(pts,5+i*.7,chromaCols[i%3],.13);});
for(const c of [[320,340,-415],[140,490,205],[430,40,-225]]){const pos=[];for(let j=0;j<46;j++){const th=Math.random()*Math.PI*2,ph=Math.acos(2*Math.random()-1),rr=34*Math.cbrt(Math.random());pos.push(c[0]+rr*Math.sin(ph)*Math.cos(th),c[1]+rr*Math.sin(ph)*Math.sin(th),c[2]+rr*Math.cos(ph));}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));environment.add(new T.Points(g,new T.PointsMaterial({color:0x9b8fb8,size:3.1,sizeAttenuation:false,transparent:true,opacity:.32})));}
// Nucleolus is an unbounded condensate, not a lipid-wrapped organelle.
const nucleolus=new T.Mesh(new T.SphereGeometry(125,48,32),envMat(0xb4c8ad,.10));nucleolus.scale.set(1.25,1,.62);nucleolus.position.set(255,416,-95);environment.add(nucleolus);
const dnaSites=[];
function makeDNA(x,y,length){const g=new T.Group();g.position.set(x,800-y,30);environment.add(g);const backbones=[],pairs=[];const helix=(u,sign)=>[u,Math.sin(u*(2*Math.PI/52.5))*11*sign,-Math.cos(u*(2*Math.PI/52.5))*11*sign];for(const s of [-1,1]){const pts=[];for(let i=0;i<=length;i+=1.5)pts.push(helix(i,s));const mesh=ribbon3(pts,3.6,s===1?0x657faf:0x99b2c5,1,g);backbones.push({mesh,sign:s,base:mesh.geometry.attributes.position.array.slice()});}
 for(let i=2;i<length;i+=5){const a=helix(i,1),z=helix(i,-1),mid=a.map((v,k)=>(v+z[k])/2);pairs.push({x:i,meshes:[tube3([a,mid],1.3,i%10<5?0xc5a469:0x90ac9b,1,g),tube3([mid,z],1.3,i%10<5?0x90ac9b:0xc5a469,1,g)]});}
 const bubble=new T.Mesh(new T.SphereGeometry(15,24,16),envMat(0xbcaa7f,.22));bubble.scale.set(1.05,.9,.9);g.add(bubble);dnaSites.push({g,bubble,length,backbones,pairs});}
makeDNA(164,324,151);makeDNA(210,230,122);makeDNA(322,481,133);
// Gentle multi-axis sway keeps the sphere turning without moving the working rim
// pores off the silhouette; dragging adds a shared rotation on top.
const envEuler=new T.Euler(),envSway=new T.Quaternion(),envRot=new T.Quaternion(),_qa=new T.Quaternion(),_pv=new T.Vector3(),_pv2=new T.Vector3();
const envAnchors={pore:{p40:[0,0],import:[0,0],p60:[0,0],rna:[0,0]},site:[]};
function nucleusDragRotate(dq){envRot.premultiply(dq);}
function nucleusReset(){envRot.identity();}
function dnaAnchor(i,u){const d=dnaSites[i];_qa.setFromEuler(d.g.rotation);
 _pv.set(u,0,0).applyQuaternion(_qa).add(d.g.position).applyQuaternion(environment.quaternion);
 _pv2.set(u+10,0,0).applyQuaternion(_qa).add(d.g.position).applyQuaternion(environment.quaternion);
 const x1=_pv.x,y1=800-_pv.y,x2=_pv2.x,y2=800-_pv2.y;return {x:x1,y:y1,ang:Math.atan2(y2-y1,x2-x1)};}
function updateEnvironment(){
 envEuler.set(Math.sin(time*.119)*.10,Math.sin(time*.083+1.7)*.16,Math.sin(time*.061+4.2)*.028);
 envSway.setFromEuler(envEuler);environment.quaternion.copy(envSway).multiply(envRot);
 for(const shell of shells)shell.material.uniforms.phase.value=time*.35;
 nucleolus.position.y=416+Math.sin(time*.35)*2;nucleolus.scale.y=1+Math.sin(time*.28)*.008;
 for(let i=0;i<dnaSites.length;i++){const d=dnaSites[i];d.g.rotation.x=Math.sin(time*.35+i)*.045;d.bubble.visible=stage===0;d.bubble.position.x=progress*d.length;
  for(const {mesh,sign,base} of d.backbones){const a=mesh.geometry.attributes.position;for(let j=0;j<a.count;j++){const x=base[j*3],opening=stage===0?Math.exp(-Math.pow((x-d.bubble.position.x)/15,2))*9:0;a.setXYZ(j,x,base[j*3+1]+sign*opening,base[j*3+2]);}a.needsUpdate=true;mesh.geometry.computeVertexNormals();}
  for(const pair of d.pairs)for(const m of pair.meshes)m.visible=stage!==0||Math.abs(pair.x-d.bubble.position.x)>12;
  const an=dnaAnchor(i,d.bubble.position.x);envAnchors.site[i]={x:an.x,y:an.y,ang:an.ang};}
 const poreKeys=['p40','import','p60','rna'];
 for(let i=0;i<4;i++){const dir=poreDirs[i];_pv.set(dir.x*624,100+dir.y*624,-85+dir.z*624).applyQuaternion(environment.quaternion);envAnchors.pore[poreKeys[i]]=[_pv.x,800-_pv.y];}}
