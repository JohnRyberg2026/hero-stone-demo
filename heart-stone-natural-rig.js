/* Continuous local mesh motion for one unchanged illustration. No pose swapping. */
(function(root,factory){
 'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.HeartStoneNaturalRig=api;
})(typeof window==='object'?window:globalThis,function(){
 'use strict';
 const duration=2600;
 const clamp=t=>Math.max(0,Math.min(1,t));
 const smooth=t=>{t=clamp(t);return t*t*t*(10+t*(-15+6*t));};
 function pulse(t,begin,peak,end){return t<peak?smooth((t-begin)/(peak-begin)):1-smooth((t-peak)/(end-peak));}
 function rotate(x,y,cx,cy,angle,weight){
  const a=angle*weight,c=Math.cos(a),s=Math.sin(a),dx=x-cx,dy=(y-cy)*4/3;
  return [cx+dx*c-dy*s,cy+(dx*s+dy*c)*3/4];
 }
 function point(x,y,time){
  const t=clamp(time/duration);
  // The pelvis, legs and feet are fixed. A short ease at both ends avoids snapping.
  if(y>=.57||t===0||t===1)return [x,y];
  const gesture=pulse(t,.06,.43,.93),settle=pulse(t,.11,.52,.99);
  const nod=pulse(t,.16,.45,.83),torso=1-smooth((y-.40)/.17);
  const ox=x,oy=y;
  // Small shoulder/upper arm rotation, followed by elbow and wrist articulation.
  const arm=smooth((ox-.62)/.075)*smooth((oy-.19)/.075)*(1-smooth((oy-.42)/.035));
  [x,y]=rotate(x,y,.645,.285,-.025*gesture,arm);
  const forearm=arm*smooth((ox-.71)/.075);
  [x,y]=rotate(x,y,.735,.382,-.055*gesture,forearm);
  [x,y]=rotate(x,y,.875,.305,.038*settle,forearm*smooth((ox-.87)/.07));
  // Head inclination tapers through the neck; the torso settles less than a pixel.
  const head=1-smooth((oy-.19)/.10);
  [x,y]=rotate(x,y,.555,.265,-.012*nod,head);
  x+=.0012*settle*torso;y-=.0008*settle*torso;
  return [x,y];
 }
 function renderer(canvas,image){
  const surface=document.createElement('canvas');surface.width=canvas.width;surface.height=canvas.height;
  const gl=surface.getContext('webgl',{alpha:true,premultipliedAlpha:true,preserveDrawingBuffer:true});
  if(!gl)return null;
  function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error('Animation shader unavailable');return s;}
  const program=gl.createProgram();
  gl.attachShader(program,shader(gl.VERTEX_SHADER,'attribute vec2 position; attribute vec2 uv; varying vec2 tex; void main(){ tex=uv; gl_Position=vec4(position.x*2.0-1.0,1.0-position.y*2.0,0.0,1.0); }'));
  gl.attachShader(program,shader(gl.FRAGMENT_SHADER,'precision mediump float; uniform sampler2D art; varying vec2 tex; void main(){gl_FragColor=texture2D(art,tex);}'));
  gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))return null;gl.useProgram(program);
  const source=[],uv=[],columns=40,rows=56;
  for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){
   for(const [dx,dy] of [[0,0],[1,0],[0,1],[1,0],[1,1],[0,1]]){
    const x=(col+dx)/columns,y=(row+dy)/rows;source.push(x,y);uv.push(x/4,y/2);
   }
  }
  function buffer(name,data,usage){const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,data,usage);const a=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);return b;}
  buffer('uv',new Float32Array(uv),gl.STATIC_DRAW);
  const vertices=new Float32Array(source.length),positions=buffer('position',vertices,gl.DYNAMIC_DRAW);
  const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  const ctx=canvas.getContext('2d');let lost=false;
  surface.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;canvas.dispatchEvent(new Event('heartstone:renderlost'));});
  return function draw(time){
   if(lost)return false;
   for(let i=0;i<source.length;i+=2){const p=point(source[i],source[i+1],time);vertices[i]=p[0];vertices[i+1]=p[1];}
   gl.bindBuffer(gl.ARRAY_BUFFER,positions);gl.bufferSubData(gl.ARRAY_BUFFER,0,vertices);gl.viewport(0,0,surface.width,surface.height);
   gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,source.length/2);
   ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(surface,0,0);
   // Copy the anchored region directly, independent of moving mesh sampling.
   const lockY=Math.ceil(canvas.height*.57),height=canvas.height-lockY;
   ctx.clearRect(0,lockY,canvas.width,height);
   ctx.drawImage(image,0,lockY,canvas.width,height,0,lockY,canvas.width,height);return true;
  };
 }
 return {duration,point,renderer};
});
