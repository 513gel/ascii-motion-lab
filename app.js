(() => {
  const $ = (id) => document.getElementById(id);
  const out = $("output"), ctx = out.getContext("2d"), sample = document.createElement("canvas"), sctx = sample.getContext("2d", { willReadFrequently:true });
  const fileInput=$("file-input"), drop=$("drop-zone"), empty=$("empty-state"), status=$("source-status"), transport=$("transport-status");
  const ui = {
    mode:$("mode"), size:$("cell-size"), duration:$("duration"), charset:$("charset"), charsetPreset:$("charset-preset"), glyphSource:$("glyph-source"), customText:$("custom-text"), textScale:$("text-scale"),
    brightness:$("brightness"), contrast:$("contrast"), invert:$("invert"), edges:$("edges"), fps:$("fps"), direction:$("direction"), glitch:$("glitch"), scanlines:$("scanlines"),
    colorMode:$("color-mode"), palettePreset:$("palette-preset"), paletteSize:$("palette-size"), backgroundStyle:$("background-style"), foreground:$("foreground"), palette2:$("palette-2"), palette3:$("palette-3"), palette4:$("palette-4"), palette5:$("palette-5"), background:$("background"), background2:$("background-2"),
    effect:$("effect"), effectPower:$("effect-power"), resolveAudio:$("resolve-audio"), audioLevel:$("audio-level"), prompt:$("prompt")
  };
  const state = { media:null, fileURL:null, sourceKind:null, playing:false, started:performance.now(), imageReady:false, recording:false, analyserW:0, analyserH:0 };
  const outputNames={size:"cell-size-out",duration:"duration-out",textScale:"text-scale-out",brightness:"brightness-out",contrast:"contrast-out",glitch:"glitch-out",scanlines:"scanlines-out",effectPower:"effect-power-out",audioLevel:"audio-level-out"};
  const updateReadouts=()=>Object.entries(outputNames).forEach(([key,id])=>$(id).textContent=key==="duration"?`${ui[key].value}s`:ui[key].value);
  document.querySelectorAll("input,select").forEach(el=>el.addEventListener("input",updateReadouts)); updateReadouts();
  const resolveAudio = new Audio("assets/ascii-resolve-click-loop.mp3");
  resolveAudio.preload="auto"; resolveAudio.loop=true;
  const isAnimated=()=>ui.mode.value!=="direct";
  function stopResolveAudio(){ resolveAudio.pause(); resolveAudio.currentTime=0; }
  function syncResolveAudio(){
    if(!state.playing || !isAnimated() || !ui.resolveAudio.checked){ stopResolveAudio(); return; }
    resolveAudio.volume=Number(ui.audioLevel.value)/100;
    if(Number.isFinite(resolveAudio.duration) && resolveAudio.duration>0) resolveAudio.playbackRate=Math.max(.3,Math.min(3,resolveAudio.duration/Number(ui.duration.value)));
    resolveAudio.currentTime=0; resolveAudio.play().catch(()=>{ transport.textContent="TAP PLAY TO ENABLE SOUND"; });
  }

  function seed(x,y){ let n=(x*374761393+y*668265263)>>>0; n=(n^(n>>>13))*1274126177; return ((n^(n>>>16))>>>0)/4294967296; }
  function mediaDimensions(){ if(!state.media) return [960,540]; return state.sourceKind==="video"?[state.media.videoWidth||960,state.media.videoHeight||540]:[state.media.naturalWidth||960,state.media.naturalHeight||540]; }
  function fit(w,h,maxW,maxH){ const r=Math.min(maxW/w,maxH/h); return [Math.max(1,Math.floor(w*r)),Math.max(1,Math.floor(h*r))]; }
  function getTime(){ const seconds=Number(ui.duration.value); return state.playing ? ((performance.now()-state.started)/1000)%seconds : 0; }
  const characterLibraries={
    dense:" .,:;irsXA253hMHGS#9B&@",
    english:" ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
    binary:" 01/\\|[]{}<>+-",
    blocks:" ░▒▓█",
    katakana:" アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン",
    symbols:" ·:+*#@%&$?<>[]{}()/\\"
  };
  const palettePresets={
    mono:{mode:"mono",size:"5",background:"#050505",background2:"#111111",style:"solid",colors:["#f5f5f5","#c8c8c8","#8a8a8a","#4d4d4d","#1e1e1e"]},
    oni:{mode:"palette",size:"5",background:"#080000",background2:"#400506",style:"radial",colors:["#fff0e8","#ffad99","#e64334","#8f1714","#260000"]},
    cobalt:{mode:"palette",size:"5",background:"#02050d",background2:"#102a65",style:"radial",colors:["#eaf4ff","#9ec9ff","#4c8eff","#1d4cbd","#061638"]},
    phosphor:{mode:"palette",size:"4",background:"#010603",background2:"#123b1e",style:"vertical",colors:["#eaffdf","#adff83","#50c85a","#125526","#06210f"]},
    amber:{mode:"palette",size:"4",background:"#080500",background2:"#3d2104",style:"radial",colors:["#fff5ce","#ffc757","#e8821a","#83410a","#2b1602"]},
    gameboy:{mode:"palette",size:"4",background:"#0f180e",background2:"#314c2a",style:"solid",colors:["#d9f0a3","#98bf60","#587c39","#1e3b22","#0f180e"]},
    thermal:{mode:"palette",size:"5",background:"#08000e",background2:"#2c0055",style:"vertical",colors:["#fff5b0","#ff8c37","#ef2456","#8c147a","#1d0b43"]},
    source:{mode:"source",size:"5",background:"#050505",background2:"#111111",style:"solid"}
  };
  const paletteFields=[ui.foreground,ui.palette2,ui.palette3,ui.palette4,ui.palette5];
  function activePalette(){ return paletteFields.map(field=>field.value).slice(0,Number(ui.paletteSize.value)); }
  function glyphColor(bright,r,g,b){
    if(ui.colorMode.value==="source") return `rgb(${r},${g},${b})`;
    if(ui.colorMode.value==="palette"){ const colors=activePalette(); return colors[Math.min(colors.length-1,Math.floor((1-Math.max(0,Math.min(1,bright)))*colors.length))]; }
    return ui.foreground.value;
  }
  function fillBackground(w,h){
    const first=ui.background.value, second=ui.background2.value; let fill=first;
    if(ui.backgroundStyle.value==="vertical"){ fill=ctx.createLinearGradient(0,0,0,h); fill.addColorStop(0,first); fill.addColorStop(1,second); }
    if(ui.backgroundStyle.value==="radial"){ fill=ctx.createRadialGradient(w*.5,h*.42,0,w*.5,h*.42,Math.max(w,h)*.72); fill.addColorStop(0,second); fill.addColorStop(1,first); }
    ctx.fillStyle=fill; ctx.fillRect(0,0,w,h);
  }
  function glyph(bright,x=0,y=0){
    const p=Math.max(0,Math.min(1,bright));
    if(ui.glyphSource.value==="text"){
      const text=ui.customText.value.replace(/\s+/g," ").trim() || ui.charset.value || characterLibraries.dense;
      if(p<.035) return " ";
      const repeat=Math.max(1,Number(ui.textScale.value));
      return text[Math.floor((x+y*state.analyserW)/repeat)%text.length] || " ";
    }
    const chars=ui.charset.value || characterLibraries.dense;
    return chars[Math.min(chars.length-1,Math.floor(p*(chars.length-1)))];
  }
  function adjusted(r,g,b){ let v=(.2126*r+.7152*g+.0722*b)/255; v=(v-.5)*(Number(ui.contrast.value)/100)+.5+Number(ui.brightness.value)/100; v=Math.max(0,Math.min(1,v)); return ui.invert.checked?1-v:v; }
  function revealFor(x,y,b,t,mode){ const p=Math.min(1,t/Number(ui.duration.value)); const random=seed(x,y); const dir=ui.direction.value;
    let sweep=dir==="left"?x/state.analyserW:dir==="right"?1-x/state.analyserW:dir==="top"?y/state.analyserH:dir==="bottom"?1-y/state.analyserH:Math.min(1,random*.62 + (1-b)*.38);
    if(mode==="pixel-sort") return p>=sweep;
    if(mode==="scanline") return p>=y/state.analyserH;
    if(mode==="edge") return p>=Math.min(1,random*.35+(1-b)*.1);
    return p>=random;
  }
  function sourceFrame(){
    if(!state.media) return null;
    const [mw,mh]=mediaDimensions(), cell=Number(ui.size.value), maxW=150, maxH=120;
    const [aw,ah]=fit(mw,mh,maxW,maxH); state.analyserW=aw; state.analyserH=ah; sample.width=aw; sample.height=ah;
    sctx.fillStyle="#000"; sctx.fillRect(0,0,aw,ah); sctx.drawImage(state.media,0,0,mw,mh,0,0,aw,ah);
    try { return sctx.getImageData(0,0,aw,ah); } catch { return null; }
  }
  function overlay(time,w,h,cell,cellH){
    const effect=ui.effect.value, power=Number(ui.effectPower.value)/100;
    if(effect==="none") return;
    ctx.save(); ctx.globalAlpha=.16+power*.55; ctx.fillStyle=ui.foreground.value; ctx.strokeStyle=ui.foreground.value; ctx.font=`${Math.max(6,cell-1)}px monospace`; ctx.textBaseline="top";
    if(effect==="rain"){
      const columns=Math.max(5,Math.floor(w/(cell*2))); for(let i=0;i<columns;i++){ const x=(i+.5)*w/columns; const speed=28+seed(i,10)*130; const y=((time*speed+i*cellH*5)%(h+cellH*12))-cellH*12; const length=3+Math.floor(seed(i,11)*10*power); for(let j=0;j<length;j++){ctx.globalAlpha=(.05+power*.5)*(1-j/(length+1));ctx.fillText("01/\\|[]{}<>"[Math.floor(seed(i,j+Math.floor(time*10))*11)],x,y+j*cellH*.7);} }
    } else if(effect==="particles"){
      const count=Math.floor(25+power*160); for(let i=0;i<count;i++){const px=(seed(i,1)*w+time*(12+seed(i,2)*50))%w,py=(seed(i,3)*h+Math.sin(time+seed(i,4)*8)*12)%h;ctx.globalAlpha=.12+seed(i,5)*power*.7;ctx.fillText("·+*"[Math.floor(seed(i,6)*3)],px,py);}
    } else if(effect==="waveform"){
      ctx.lineWidth=1;ctx.beginPath(); for(let x=0;x<w;x+=cell){const y=h*.5+Math.sin(x*.025+time*4)*h*.09*power+Math.sin(x*.11-time*7)*h*.025*power; x?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();
    } else if(effect==="orb"){
      const radius=Math.min(w,h)*(.11+power*.15),cx=w*.83,cy=h*.18; for(let y=-radius;y<=radius;y+=cellH*.8) for(let x=-radius;x<=radius;x+=cell*.75){const d=Math.hypot(x,y)/radius;if(d<1){const z=Math.sqrt(1-d*d),shine=Math.max(0,Math.sin(time*.8)*x/radius+z*.9);ctx.globalAlpha=.12+shine*.7;ctx.fillText(glyph(shine,Math.floor(x/cell),Math.floor(y/cellH)),cx+x,cy+y);}}
    }
    ctx.restore();
  }
  function render(){
    requestAnimationFrame(render);
    if(!state.imageReady) return;
    const frame=sourceFrame(); if(!frame) return;
    const cell=Number(ui.size.value), cellH=Math.round(cell*1.68), w=state.analyserW*cell, h=state.analyserH*cellH;
    if(out.width!==w||out.height!==h){ out.width=w;out.height=h; $("dimension-readout").textContent=`${w} × ${h}`; }
    $("fps-readout").textContent=`${ui.fps.value} FPS`;
    fillBackground(w,h); ctx.font=`${cell}px monospace`; ctx.textBaseline="top";
    const t=getTime(), mode=ui.mode.value, data=frame.data, glitch=Number(ui.glitch.value)/100;
    for(let y=0;y<state.analyserH;y++) for(let x=0;x<state.analyserW;x++){
      const i=(y*state.analyserW+x)*4, r=data[i],g=data[i+1],b=data[i+2]; let v=adjusted(r,g,b);
      if(ui.edges.checked || mode==="edge") { const right=x+1<state.analyserW?i+4:i, down=y+1<state.analyserH?i+state.analyserW*4:i; const edge=(Math.abs(data[i]-data[right])+Math.abs(data[i+1]-data[right+1])+Math.abs(data[i+2]-data[right+2])+Math.abs(data[i]-data[down])+Math.abs(data[i+1]-data[down+1])+Math.abs(data[i+2]-data[down+2]))/500; v=Math.max(v*.28,Math.min(1,edge*1.8)); }
      let shown=mode==="direct" || revealFor(x,y,v,t,mode); if(!shown) continue;
      let char=glyph(v,x,y); if(mode==="terminal" && ui.glyphSource.value==="ramp" && t/Number(ui.duration.value)<seed(x,y)*.9) char=("01/\\|[]{}<>+-")[Math.floor(seed(y,x+12)*12)];
      const jitter=glitch>0&&seed(x,Math.floor(t*ui.fps.value))<glitch*.14 ? Math.round((seed(y,x)*2-1)*cell*2) : 0;
      ctx.fillStyle=glyphColor(v,r,g,b); ctx.fillText(char,x*cell+jitter,y*cellH);
    }
    const scan=Number(ui.scanlines.value)/100; if(scan){ ctx.fillStyle=`rgba(0,0,0,${scan*.42})`; for(let y=0;y<h;y+=4)ctx.fillRect(0,y,w,1); }
    overlay(t,w,h,cell,cellH);
  }
  function load(file){
    if(!file) return; if(state.fileURL) URL.revokeObjectURL(state.fileURL); state.fileURL=URL.createObjectURL(file); state.imageReady=false;
    // Every new source begins as an inspectable still, regardless of any form
    // values the browser restored from a previous session.
    ui.mode.value="direct"; ui.effect.value="none"; state.playing=false; $("play").textContent="PLAY"; stopResolveAudio();
    const isVideo=file.type.startsWith("video/") || /\.(mp4|webm|mov|mkv)$/i.test(file.name); const el=isVideo?document.createElement("video"):new Image();
    state.media=el; state.sourceKind=isVideo?"video":"image"; el.src=state.fileURL; status.textContent=`LOADING // ${file.name.toUpperCase()}`;
    const ready=()=>{ state.imageReady=true; empty.hidden=true; state.playing=false; $("play").textContent="PLAY"; state.started=performance.now(); status.textContent=`${isVideo?"VIDEO":"IMAGE"} // ${file.name.toUpperCase()}`; transport.textContent="STATIC PREVIEW — PICK A STYLE TO ANIMATE"; if(isVideo){el.loop=true;el.muted=true;el.pause();el.currentTime=0;} };
    if(isVideo){ el.addEventListener("loadeddata",ready,{once:true}); el.addEventListener("error",()=>status.textContent="UNSUPPORTED VIDEO CODEC",{once:true}); } else { el.onload=ready; el.onerror=()=>status.textContent="UNSUPPORTED IMAGE"; }
  }
  function applyCharacterLibrary(name){
    if(name!=="custom" && characterLibraries[name]) ui.charset.value=characterLibraries[name];
    transport.textContent=name==="custom"?"CUSTOM CHARACTER SET":"CHARACTER LIBRARY LOADED";
  }
  function applyPalettePreset(name){
    if(name==="custom") return;
    const preset=palettePresets[name]; if(!preset) return;
    ui.colorMode.value=preset.mode; ui.paletteSize.value=preset.size; ui.background.value=preset.background; ui.background2.value=preset.background2; ui.backgroundStyle.value=preset.style;
    preset.colors?.forEach((color,index)=>paletteFields[index].value=color);
    transport.textContent=name==="source"?"AUTO SOURCE COLOR ENABLED":"PALETTE LOADED";
  }
  function markPaletteCustom(){ if(ui.palettePreset.value!=="source") ui.palettePreset.value="custom"; }
  function applyPrompt(){ const p=ui.prompt.value.toLowerCase(); const set=(key,val)=>{ ui[key].value=val; };
    if(/pixel.?sort|sort sweep/.test(p))set("mode","pixel-sort"); if(/scan(line)?|develop/.test(p))set("mode","scanline"); if(/edge/.test(p))set("mode","edge"); if(/terminal|decode|resolve|build/.test(p))set("mode",/terminal/.test(p)?"terminal":"decode");
    if(/rain/.test(p))set("effect","rain"); if(/particle|dust|stars?/.test(p))set("effect","particles"); if(/waveform|audio wave|signal wave/.test(p))set("effect","waveform"); if(/orb|sphere|3d ascii/.test(p))set("effect","orb");
    if(/auto.?color|source.?color/.test(p))set("colorMode","source");
    if(/red|vermilion/.test(p)){set("colorMode","mono");set("foreground","#ef4035");markPaletteCustom();} if(/blue|cobalt/.test(p)){set("colorMode","mono");set("foreground","#4169e1");markPaletteCustom();} if(/green|phosphor/.test(p)){set("colorMode","mono");set("foreground","#9dff68");markPaletteCustom();} if(/white|mono(chrome)?/.test(p)){set("colorMode","mono");set("foreground","#f5f5f5");markPaletteCustom();}
    if(/slow/.test(p))set("duration","7"); if(/fast|rapid/.test(p))set("duration","1.5"); if(/low fps|choppy|psx/.test(p))set("fps","12"); if(/crt|scanline/.test(p))set("scanlines","55"); if(/glitch|corrupt/.test(p))set("glitch","50"); if(/clean|minimal/.test(p)){set("glitch","0");set("scanlines","0");}
    updateReadouts(); transport.textContent="PROMPT APPLIED";
  }
  function applyPreset(name){
    const set=(key,val)=>{ui[key].value=val;};
    set("effect","none"); set("glitch","8"); set("scanlines","18"); set("fps","30");
    const presets={
      direct:()=>set("mode","direct"),
      build:()=>set("mode","decode"),
      sort:()=>{set("mode","pixel-sort");set("direction","random");set("glitch","14");},
      scan:()=>{set("mode","scanline");set("scanlines","38");},
      terminal:()=>{set("mode","terminal");set("scanlines","45");set("glitch","22");},
      rain:()=>{set("mode","terminal");set("colorMode","mono");set("foreground","#ef4035");markPaletteCustom();set("effect","rain");set("effectPower","65");set("glitch","35");set("scanlines","45");}
    };
    presets[name]?.(); state.started=performance.now(); state.playing=name!=="direct"; $("play").textContent=state.playing?"PAUSE":"PLAY"; if(state.sourceKind==="video"){ if(state.playing)state.media.play().catch(()=>{}); else state.media.pause(); } syncResolveAudio(); updateReadouts(); transport.textContent=name==="direct"?"STATIC PREVIEW":"ANIMATION PRESET";
  }
  function restart(){ state.started=performance.now(); if(state.sourceKind==="video"&&state.media){state.media.currentTime=0;if(state.playing)state.media.play().catch(()=>{});} syncResolveAudio(); transport.textContent="RESTARTED"; }
  function snapshot(){ const a=document.createElement("a");a.download="ascii-motion-frame.png";a.href=out.toDataURL("image/png");a.click(); }
  async function record(){ if(!state.imageReady||state.recording)return; if(!window.MediaRecorder){transport.textContent="MEDIARECORDER NOT AVAILABLE";return;} state.recording=true; $("record").classList.add("recording"); $("record").textContent="● RECORDING…"; restart();
    const stream=out.captureStream(Number(ui.fps.value)); const audioStream=ui.resolveAudio.checked && resolveAudio.captureStream ? resolveAudio.captureStream() : null; audioStream?.getAudioTracks().forEach(track=>stream.addTrack(track)); const type=MediaRecorder.isTypeSupported("video/webm;codecs=vp9")?"video/webm;codecs=vp9":"video/webm"; const rec=new MediaRecorder(stream,{mimeType:type,videoBitsPerSecond:8_000_000}); const chunks=[];
    rec.ondataavailable=e=>e.data.size&&chunks.push(e.data); rec.onstop=()=>{ const blob=new Blob(chunks,{type});const a=document.createElement("a");a.download="ascii-motion-loop.webm";a.href=URL.createObjectURL(blob);a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);state.recording=false;$("record").classList.remove("recording");$("record").textContent="● EXPORT LOOP (WEBM + SOUND)";transport.textContent="WEBM EXPORTED"; };
    rec.start(); setTimeout(()=>rec.stop(),Number(ui.duration.value)*1000);
  }
  fileInput.onchange=e=>{ load(e.target.files[0]); e.target.value=""; };
  ["dragenter","dragover"].forEach(type=>drop.addEventListener(type,e=>{e.preventDefault();drop.classList.add("dragging");})); ["dragleave","drop"].forEach(type=>drop.addEventListener(type,e=>{e.preventDefault();drop.classList.remove("dragging");})); drop.addEventListener("drop",e=>load(e.dataTransfer.files[0]));
  $("apply-prompt").onclick=applyPrompt; $("restart").onclick=restart; $("snapshot").onclick=snapshot; $("record").onclick=record;
  document.querySelectorAll("[data-preset]").forEach(button=>button.onclick=()=>applyPreset(button.dataset.preset));
  document.querySelectorAll("[data-prompt]").forEach(button=>button.onclick=()=>{ui.prompt.value=button.dataset.prompt;applyPrompt();});
  ui.charsetPreset.onchange=()=>applyCharacterLibrary(ui.charsetPreset.value);
  ui.charset.oninput=()=>{ui.charsetPreset.value="custom";};
  ui.palettePreset.onchange=()=>applyPalettePreset(ui.palettePreset.value);
  [ui.colorMode,ui.paletteSize,ui.backgroundStyle,ui.foreground,ui.palette2,ui.palette3,ui.palette4,ui.palette5,ui.background,ui.background2].forEach(control=>control.addEventListener("input",markPaletteCustom));
  $("play").onclick=()=>{state.playing=!state.playing;$("play").textContent=state.playing?"PAUSE":"PLAY";transport.textContent=state.playing?"PLAYING":"PAUSED"; if(state.sourceKind==="video")state.playing?state.media.play():state.media.pause(); syncResolveAudio();};
  ui.resolveAudio.onchange=()=>{ if(ui.resolveAudio.checked)syncResolveAudio(); else stopResolveAudio(); };
  ui.duration.onchange=()=>{ if(state.playing)syncResolveAudio(); };
  $("toggle-ui").onclick=()=>{document.body.classList.toggle("ui-hidden");$("toggle-ui").textContent=document.body.classList.contains("ui-hidden")?"SHOW UI":"HIDE UI";};
  render();
})();
