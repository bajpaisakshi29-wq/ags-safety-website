import * as THREE from './three.module.min.js';

const section=document.getElementById('engineering');
if(section){
 const stage=document.getElementById('glassStage'),canvas=document.getElementById('glassCanvas'),pause=document.getElementById('glassPause');
 let lastTime=0,initialized=false;
 let renderer,scene,camera,group,material,edgeLines,seamLines,texture,environment,ready=false,held=false,frame=0,current=0,meshData,glassUniform={value:0};
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
 const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
 const load=document.getElementById('glassLoading');
 const progress=document.getElementById('glassProgress');
 function fail(){ready=false;stage.classList.add('failed');load.textContent='The 3D study could not load here. Your original shoe photograph is shown instead.';}
 function request(){if(!frame)frame=requestAnimationFrame(render);}
 function envMap(){
  const env=document.createElement('canvas');env.width=2048;env.height=1024;const c=env.getContext('2d');c.scale(2,2);c.fillStyle='#171c22';c.fillRect(0,0,1024,512);
  function softRect(x,y,w,h,color){const g=c.createLinearGradient(x,0,x+w,0);g.addColorStop(0,'#00000000');g.addColorStop(.25,color);g.addColorStop(.75,color);g.addColorStop(1,'#00000000');c.fillStyle=g;c.fillRect(x,y,w,h);}
  softRect(70,40,120,390,'#fff6df');softRect(360,80,65,270,'#f9d88b');softRect(600,130,100,190,'#7a9cab');softRect(810,70,95,340,'#e7e5de');softRect(480,230,60,70,'#7567a4');
  const tex=new THREE.CanvasTexture(env);tex.mapping=THREE.EquirectangularReflectionMapping;tex.colorSpace=THREE.SRGBColorSpace;const pmrem=new THREE.PMREMGenerator(renderer);const result=pmrem.fromEquirectangular(tex).texture;tex.dispose();pmrem.dispose();return result;
 }
 function trace(points){
  const source=meshData.source,ray=new THREE.Raycaster();const pts=[];
  for(const [u,v]of points){const x=(u*source.width-source.cx)*source.scale,y=(source.cy-v*source.height)*source.scale;ray.set(new THREE.Vector3(x,y,3),new THREE.Vector3(0,0,-1));const hits=ray.intersectObject(group.children[0],false);pts.push(new THREE.Vector3(x,y,hits.length?hits[0].point.z+.013:.45));}
  const curve=new THREE.CatmullRomCurve3(pts);const geo=new THREE.TubeGeometry(curve,96,.0035,6,false);return new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:'#e7c995',transparent:true,opacity:0,depthWrite:false}));
 }
 async function init(){
  try{
   renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,precision:'highp',powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(Math.max(devicePixelRatio||1,1.25),2));renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;renderer.outputColorSpace=THREE.SRGBColorSpace;
   scene=new THREE.Scene();environment=envMap();scene.environment=environment;
   camera=new THREE.OrthographicCamera(-3,3,1.8,-1.8,.1,40);camera.position.set(0,.1,8);camera.lookAt(0,0,0);
   scene.add(new THREE.HemisphereLight('#e9e8e1','#12170f',2.2));const key=new THREE.DirectionalLight('#fff2d9',3);key.position.set(-3,4,5);scene.add(key);const rim=new THREE.DirectionalLight('#bed0e2',2.1);rim.position.set(3,1,-2);scene.add(rim);
   const [data,photo]=await Promise.all([window.SICURA_SHOE_MESH?Promise.resolve(window.SICURA_SHOE_MESH):fetch('assets/study3d/shoe-study.json').then(r=>{if(!r.ok)throw Error('mesh');return r.json();}),new THREE.TextureLoader().loadAsync(document.getElementById('glassPoster').src)]);
   meshData=data;texture=photo;texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),16);
   const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(data.positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(data.normals,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(data.uv,2));geometry.setIndex(data.indices);geometry.computeBoundingSphere();
   material=new THREE.MeshPhysicalMaterial({map:texture,bumpMap:texture,bumpScale:.006,color:'#ffffff',roughness:.76,metalness:0,envMapIntensity:.65,clearcoat:.1,clearcoatRoughness:.12,transmission:.0001,thickness:.38,ior:1.46,iridescence:.0001,iridescenceIOR:1.3,iridescenceThicknessRange:[200,450],attenuationColor:'#e9dab9',attenuationDistance:2.7,side:THREE.FrontSide});
   material.onBeforeCompile=shader=>{shader.uniforms.uGlass=glassUniform;shader.fragmentShader='uniform float uGlass;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#ifdef USE_MAP\nvec4 sampledDiffuseColor=texture2D(map,vMapUv);\ndiffuseColor*=mix(sampledDiffuseColor,vec4(1.0),uGlass);\n#endif`);};
   group=new THREE.Group();const shoe=new THREE.Mesh(geometry,material);group.add(shoe);scene.add(group);group.updateMatrixWorld(true);
   edgeLines=new THREE.LineSegments(new THREE.EdgesGeometry(geometry,38),new THREE.LineBasicMaterial({color:'#eed6a8',transparent:true,opacity:0,depthWrite:false}));group.add(edgeLines);
   seamLines=new THREE.Group();for(const points of [[[.231,.459],[.265,.48],[.285,.54],[.296,.605],[.294,.663]],[[.243,.438],[.29,.463],[.344,.429],[.389,.383]],[[.389,.381],[.437,.455],[.488,.526],[.55,.584],[.61,.567]],[[.294,.664],[.35,.68],[.401,.698],[.438,.71]]])seamLines.add(trace(points));group.add(seamLines);
   // A soft grounding shadow is stationary while the study turns.
   const shadowCanvas=document.createElement('canvas');shadowCanvas.width=256;shadowCanvas.height=128;const sc=shadowCanvas.getContext('2d'),grad=sc.createRadialGradient(128,64,4,128,64,122);grad.addColorStop(0,'#000000cc');grad.addColorStop(1,'#00000000');sc.fillStyle=grad;sc.fillRect(0,0,256,128);const shadow=new THREE.Mesh(new THREE.PlaneGeometry(5.6,1.2),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,opacity:.6,depthWrite:false}));shadow.position.set(0,-1.53,-.5);shadow.rotation.x=-.55;scene.add(shadow);
   ready=true;stage.classList.add('ready');resize();
  }catch(error){fail();}
 }
 function resize(){if(!renderer||!camera||!ready)return;const {width,height}=stage.getBoundingClientRect();renderer.setPixelRatio(Math.min(Math.max(devicePixelRatio||1,1.25),2,Math.sqrt(3000000/Math.max(1,width*height))));renderer.setSize(width,height,false);const aspect=width/height,vertical=Math.max(3.35,4.5/aspect/.89);camera.left=-vertical*aspect/2;camera.right=vertical*aspect/2;camera.top=vertical/2;camera.bottom=-vertical/2;camera.updateProjectionMatrix();request();}
 function render(now){frame=0;if(!ready||document.hidden){lastTime=0;return;}
  const rect=section.getBoundingClientRect();if(rect.bottom<=0||rect.top>=innerHeight){lastTime=0;return;}const distance=Math.max(1,section.offsetHeight-innerHeight),target=held?current:clamp(-rect.top/distance);
  const dt=lastTime?Math.min((now-lastTime)/1000,.05):1/60;lastTime=now;
  if(!initialized||reduced.matches){current=target;initialized=true;}else current+=(target-current)*(1-Math.exp(-dt/.065));
  if(Math.abs(target-current)<.00015)current=target;
  const glass=smooth(.14,.39,current)*(1-smooth(.65,.91,current));glassUniform.value=glass;
  // Scroll-controlled, with a brief ease-out rather than autonomous rotation.
  group.rotation.y=reduced.matches?.045:THREE.MathUtils.lerp(.045,-.34,current);group.rotation.x=reduced.matches?0:THREE.MathUtils.lerp(-.025,.015,current);group.rotation.z=reduced.matches?0:THREE.MathUtils.lerp(-.014,.012,current);group.position.y=reduced.matches?0:.025*Math.sin(current*Math.PI);
  material.roughness=THREE.MathUtils.lerp(.76,.055,glass);material.bumpScale=.006*(1-glass);material.transmission=Math.max(.0001,.98*glass);material.metalness=.03*glass;material.iridescence=Math.max(.0001,.32*glass);material.clearcoat=THREE.MathUtils.lerp(.1,1,glass);material.envMapIntensity=THREE.MathUtils.lerp(.65,1.55,glass);edgeLines.material.opacity=glass*.25;seamLines.children.forEach(line=>line.material.opacity=glass*.45);
  const phase=current<.27?0:current<.78?1:2;
  document.getElementById('glassCalloutTitle').textContent=['Considered construction','In another light','Protection, in every detail'][phase];
  document.getElementById('glassCalloutText').textContent=['Texture. Stitching. Character.','Warm gold. A trace of colour.','The original article, revealed again.'][phase];
  progress.style.transform='scaleX('+current+')';renderer.render(scene,camera);
  if(current!==target)request();else lastTime=0;

 }
 pause.addEventListener('click',()=>{held=!held;pause.textContent=held?'Release view':'Hold view';pause.setAttribute('aria-pressed',String(held));request();});
 addEventListener('scroll',request,{passive:true});addEventListener('resize',resize);document.addEventListener('visibilitychange',request);canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();fail();});
 new ResizeObserver(resize).observe(stage);init();
}

