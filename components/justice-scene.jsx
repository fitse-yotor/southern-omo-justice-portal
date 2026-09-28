'use client';
import {useEffect,useRef,useState} from 'react';
import {Scale} from 'lucide-react';
export default function JusticeScene(){
 const host=useRef(null); const [ready,setReady]=useState(false); const [mission,setMission]=useState(false);
 useEffect(()=>{let disposed=false,renderer,frame,observer,cleanup=()=>{};
  import('three').then(T=>{
   if(disposed||!host.current)return;
   const container=host.current;
   try{renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});}catch{return;}
   renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.6));renderer.setClearColor(0x000000,0);container.appendChild(renderer.domElement);
   const scene=new T.Scene(),camera=new T.PerspectiveCamera(34,1,.1,100);camera.position.set(0,1,10.4);camera.lookAt(0,0,0);
   scene.add(new T.AmbientLight(0xc6d8ef,2.6));const light=new T.DirectionalLight(0xffefd0,5);light.position.set(-3,5,6);scene.add(light);
   const rim=new T.PointLight(0x3a96b2,95);rim.position.set(3,1,2);scene.add(rim);
   const gold=new T.MeshStandardMaterial({color:0xd4af37,metalness:.8,roughness:.28,emissive:0xd4af37,emissiveIntensity:.045});
   const navy=new T.MeshStandardMaterial({color:0x0a1e39,metalness:.72,roughness:.35});
   const cyan=new T.MeshStandardMaterial({color:0x3a96b2,metalness:.6,roughness:.3});
   const group=new T.Group();scene.add(group);group.rotation.y=-.23;
   function mesh(geo,mat,x=0,y=0,z=0,parent=group){const m=new T.Mesh(geo,mat);m.position.set(x,y,z);parent.add(m);return m;}
   mesh(new T.CylinderGeometry(1.05,1.25,.18,64),navy,0,-1.8);
   mesh(new T.CylinderGeometry(.91,1.05,.12,64),gold,0,-1.66);
   mesh(new T.CylinderGeometry(.66,.91,.19,64),navy,0,-1.5);
   mesh(new T.CylinderGeometry(.15,.26,2.67,24),navy,0,-.1);
   mesh(new T.CylinderGeometry(.2,.2,.09,32),gold,0,-1.29);
   mesh(new T.CylinderGeometry(.2,.2,.09,32),gold,0,1.16);
   mesh(new T.SphereGeometry(.22,24,24),gold,0,1.65);
   mesh(new T.OctahedronGeometry(.15),gold,0,2.05);
   const beam=new T.Group();beam.position.y=1.18;group.add(beam);
   mesh(new T.BoxGeometry(3.4,.12,.16),gold,0,0,0,beam);
   mesh(new T.SphereGeometry(.16,20,20),cyan,0,0,.12,beam);
   for(const x of [-1.55,1.55]){
    mesh(new T.SphereGeometry(.09,16,16),gold,x,0,0,beam);
    for(const z of [-.48,.48]){
     const a=new T.Vector3(x,-.04,0),b=new T.Vector3(x,-1.42,z),mid=a.clone().add(b).multiplyScalar(.5);
     const chain=mesh(new T.CylinderGeometry(.012,.012,a.distanceTo(b),8),gold,mid.x,mid.y,mid.z,beam);chain.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize());
    }
    mesh(new T.SphereGeometry(.64,40,20,0,Math.PI*2,Math.PI/2,Math.PI/2),navy,x,-1.42,0,beam).scale.y=.35;
    const edge=mesh(new T.TorusGeometry(.64,.022,8,64),gold,x,-1.42,0,beam);edge.rotation.x=Math.PI/2;
   }
   for(let i=0;i<3;i++){const r=mesh(new T.TorusGeometry(2.5+i*.27,.008,6,100),cyan,0,-1.84-i*.12);r.rotation.x=Math.PI/2;}
   let target=0;const move=e=>{const b=container.getBoundingClientRect();target=((e.clientX-b.left)/b.width-.5)*.55;};const leave=()=>target=0;container.addEventListener('pointermove',move);container.addEventListener('pointerleave',leave);
   const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
   const resize=()=>{const {width,height}=container.getBoundingClientRect();renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();};observer=new ResizeObserver(resize);observer.observe(container);resize();
   const start=performance.now();function render(){if(disposed)return;const t=(performance.now()-start)/1000;if(!reduced){group.rotation.y+=(target-.23-group.rotation.y)*.025;group.position.y=Math.sin(t*.7)*.065;beam.rotation.z=Math.sin(t*.55)*.022;}renderer.render(scene,camera);frame=requestAnimationFrame(render);}render();setReady(true);
   cleanup=()=>{container.removeEventListener('pointermove',move);container.removeEventListener('pointerleave',leave);scene.traverse(o=>{if(o.geometry)o.geometry.dispose();});[gold,navy,cyan].forEach(m=>m.dispose());renderer.domElement.remove();};
  }).catch(()=>{});
  return()=>{disposed=true;cancelAnimationFrame(frame);observer?.disconnect();cleanup();renderer?.dispose();};
 },[]);
 return <div className="justice-art"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div ref={host} className="scene" role="img" aria-label="Interactive three dimensional scales of justice in navy, gold and cyan"/>{!ready&&<Scale className="scene-fallback" strokeWidth={.7}/>}<div className="art-caption"><span className="gold-line"/>THE BALANCE OF JUSTICE</div><button className="scene-label" onClick={()=>setMission(!mission)} aria-expanded={mission}><span className="glow-dot"/>{mission?'Equal rights. Fair process. Justice for all.':'Rooted in fairness. Guided by law.'}</button><span className="coordinate">SOUTH OMO · ETHIOPIA</span></div>;
}
