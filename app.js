(() => {
  const $ = (id) => document.getElementById(id);
  const out = $("output"), ctx = out.getContext("2d"), sample = document.createElement("canvas"), sctx = sample.getContext("2d", { willReadFrequently:true });
  const fileInput=$("file-input"), textFileInput=$("text-file-input"), drop=$("drop-zone"), canvasWrap=$("canvas-wrap"), empty=$("empty-state"), status=$("source-status"), transport=$("transport-status");
  const ui = {
    mode:$("mode"), size:$("cell-size"), duration:$("duration"), charset:$("charset"), charsetPreset:$("charset-preset"), glyphSource:$("glyph-source"), customText:$("custom-text"), textLayout:$("text-layout"), textScale:$("text-scale"),
    brightness:$("brightness"), contrast:$("contrast"), invert:$("invert"), edges:$("edges"), fps:$("fps"), direction:$("direction"), glitch:$("glitch"), scanlines:$("scanlines"),
    colorMode:$("color-mode"), palettePreset:$("palette-preset"), paletteSize:$("palette-size"), backgroundStyle:$("background-style"), foreground:$("foreground"), palette2:$("palette-2"), palette3:$("palette-3"), palette4:$("palette-4"), palette5:$("palette-5"), background:$("background"), background2:$("background-2"),
    effect:$("effect"), effectPower:$("effect-power"), outputScale:$("output-scale"), aspectRatio:$("aspect-ratio"), outputResolution:$("output-resolution"), customResolution:$("custom-resolution"), resolveSound:$("resolve-sound"), audioLevel:$("audio-level"), prompt:$("prompt")
  };
  const state = { media:null, fileURL:null, sourceKind:null, playing:false, completed:false, started:performance.now(), pausedElapsed:0, imageReady:false, recording:false, analyserW:0, analyserH:0, lastRender:0, lastSoundStep:-1, lastVisibleGlyphs:0, generationTicks:0, viewport:{x:0,y:0,zoom:1} };
  const outputNames={size:"cell-size-out",duration:"duration-out",textScale:"text-scale-out",brightness:"brightness-out",contrast:"contrast-out",glitch:"glitch-out",scanlines:"scanlines-out",effectPower:"effect-power-out",outputScale:"output-scale-out",audioLevel:"audio-level-out"};
  const updateReadouts=()=>Object.entries(outputNames).forEach(([key,id])=>$(id).textContent=key==="duration"?`${ui[key].value}s`:key==="outputScale"?`${ui[key].value}%`:ui[key].value);
  document.querySelectorAll("input,select").forEach(el=>el.addEventListener("input",updateReadouts)); updateReadouts();
  const history={past:[],future:[],current:null,restoring:false}; let viewportCommitTimer=0;
  function applyViewport(){ const {x,y,zoom}=state.viewport; canvasWrap.style.transform=`translate(${x}px, ${y}px) scale(${zoom})`; }
  function snapshotEditor(){
    const controls={}; document.querySelectorAll("#controls input, #controls select, #controls textarea").forEach(el=>{ if(el.type!=="file") controls[el.id]=el.type==="checkbox"?el.checked:el.value; });
    return {controls,viewport:{...state.viewport}};
  }
  function updateHistoryButtons(){ $("undo").disabled=!history.past.length; $("redo").disabled=!history.future.length; }
  function resetHistory(){ history.past=[]; history.future=[]; history.current=snapshotEditor(); updateHistoryButtons(); }
  function commitHistory(){
    if(history.restoring) return; const next=snapshotEditor(); if(JSON.stringify(next)===JSON.stringify(history.current)) return;
    if(history.current) history.past.push(history.current); if(history.past.length>80) history.past.shift(); history.current=next; history.future=[]; updateHistoryButtons();
  }
  function restoreHistory(snapshot,label){
    history.restoring=true; Object.entries(snapshot.controls).forEach(([id,value])=>{ const control=$(id); if(control) control.type==="checkbox"?control.checked=value:control.value=value; });
    state.viewport={...snapshot.viewport}; applyViewport(); $("text-count").textContent=`${ui.customText.value.length.toLocaleString()} CHARACTERS`; updateReadouts(); state.lastRender=0; state.playing=false; state.completed=false; state.pausedElapsed=0; stopResolveAudio(); history.restoring=false; transport.textContent=`${label} APPLIED`;
  }
  function undo(){ if(!history.past.length) return; history.future.push(history.current); history.current=history.past.pop(); restoreHistory(history.current,"UNDO"); updateHistoryButtons(); }
  function redo(){ if(!history.future.length) return; history.past.push(history.current); history.current=history.future.pop(); restoreHistory(history.current,"REDO"); updateHistoryButtons(); }
  function fitViewport(record=true){ state.viewport={x:0,y:0,zoom:1}; applyViewport(); if(record) commitHistory(); }
  let algoContext=null, algoMaster=null, algoCapture=null, algoTimer=0, algoNodes=[], classicTickBuffer=null, classicTickLoading=null;
  const isAnimated=()=>ui.mode.value!=="direct";
  function stopAlgorithmicAudio(){ clearTimeout(algoTimer); algoTimer=0; algoNodes.forEach(node=>{ try{node.stop?.();node.disconnect?.();}catch{} }); algoNodes=[]; }
  function stopResolveAudio(){ stopAlgorithmicAudio(); }
  function algorithmicEngine(){
    if(!algoContext){ algoContext=new (window.AudioContext||window.webkitAudioContext)(); algoMaster=algoContext.createGain(); algoCapture=algoContext.createMediaStreamDestination(); algoMaster.connect(algoContext.destination); algoMaster.connect(algoCapture); }
    return algoContext.resume();
  }
  function algoGate(output,start,duration,level,attack=.003,release=.008){ const gain=algoContext.createGain(), end=start+duration; gain.gain.setValueAtTime(0,start); gain.gain.linearRampToValueAtTime(level,start+attack); gain.gain.setValueAtTime(level,Math.max(start+attack,end-release)); gain.gain.linearRampToValueAtTime(0,end); output.connect(gain); gain.connect(algoMaster); algoNodes.push(gain); }
  function algoTone(type,freq,start,duration,level,opts={}){ const osc=algoContext.createOscillator(), filter=algoContext.createBiquadFilter(); osc.type=type; osc.frequency.value=freq; filter.type=opts.type||"lowpass"; filter.frequency.value=opts.filter||1800; filter.Q.value=opts.q||2; osc.connect(filter); algoGate(filter,start,duration,level,opts.attack||.003,opts.release||.007); osc.start(start); osc.stop(start+duration+.02); algoNodes.push(osc,filter); }
  function algoNoise(start,duration,level,opts={}){ const buffer=algoContext.createBuffer(1,Math.max(1,Math.ceil(algoContext.sampleRate*duration)),algoContext.sampleRate), data=buffer.getChannelData(0); let seed=opts.seed||17; for(let i=0;i<data.length;i++){seed=(seed*1664525+1013904223)>>>0;data[i]=(seed/4294967296)*2-1;} const src=algoContext.createBufferSource(), filter=algoContext.createBiquadFilter(); src.buffer=buffer; filter.type=opts.type||"bandpass"; filter.frequency.value=opts.filter||1600; filter.Q.value=opts.q||3; src.connect(filter); algoGate(filter,start,duration,level,opts.attack||.002,opts.release||.006); src.start(start);src.stop(start+duration+.02);algoNodes.push(src,filter); }
  function algorithmicCycle(){
    if(!state.playing || !isAnimated() || ui.resolveSound.value!=="algorithmic") return;
    stopAlgorithmicAudio(); const seconds=Math.max(.8,Number(ui.duration.value)), start=algoContext.currentTime+.03, scale=Math.max(.5,seconds/3.5), level=Number(ui.audioLevel.value)/100; algoMaster.gain.setValueAtTime(level,start);
    // Memory Leak: a low dirty bed that never falls in pitch, avoiding the old ball-bounce tail.
    [0,.14,.28,.42].forEach((p,i)=>{ const at=start+p*scale; algoTone("sawtooth",[72,75,78,82][i],at,.09*scale,.095,{filter:420,q:3,release:.006}); algoNoise(at,.06*scale,.032,{filter:520+i*90,q:3,seed:91+i,release:.004}); });
    // Cache Miss: scattered comparisons plus a missing-data burst during the build.
    [[.74,230],[.80,740],[.86,320]].forEach(([p,f],i)=>{ const at=start+p*scale; algoTone("square",f,at,.018*scale,.075,{filter:1900,q:7,release:.001}); algoNoise(at,.014*scale,.025,{filter:2700,q:8,seed:101+i,release:.001}); });
    algoNoise(start+1.02*scale,.07*scale,.085,{filter:3100,q:3,seed:109,release:.002});
    // Heap Clack: the strong lock-in beats arrive near the end.
    [[1.48,86],[1.68,132],[1.88,86],[2.08,168],[2.28,112]].forEach(([p,f],i)=>{ const at=start+p*scale; algoTone("square",f,at,.04*scale,.12,{filter:520,q:5,release:.001}); algoNoise(at,.018*scale,.038,{filter:860,q:7,seed:121+i,release:.001}); });
    algoTimer=window.setTimeout(algorithmicCycle,seconds*1000);
  }
  function loadClassicTick(){
    if(classicTickBuffer) return Promise.resolve(classicTickBuffer);
    if(classicTickLoading) return classicTickLoading;
    classicTickLoading=algorithmicEngine().then(()=>fetch("assets/ascii-resolve-click-loop.mp3")).then(response=>response.arrayBuffer()).then(data=>algoContext.decodeAudioData(data)).then(buffer=>(classicTickBuffer=buffer)).catch(()=>null);
    return classicTickLoading;
  }
  function playClassicTick(step,addedGlyphs){
    if(!algoContext || ui.resolveSound.value!=="classic") return;
    const start=algoContext.currentTime+.002, impact=Math.min(1,.35+Math.log2(Math.max(1,addedGlyphs))/10), level=Number(ui.audioLevel.value)/100*impact;
    if(classicTickBuffer){
      const source=algoContext.createBufferSource(), gain=algoContext.createGain();
      source.buffer=classicTickBuffer; source.playbackRate.value=1+((step%5)-2)*.025;
      gain.gain.setValueAtTime(0,start); gain.gain.linearRampToValueAtTime(level*.62,start+.002); gain.gain.exponentialRampToValueAtTime(.0001,start+.075);
      source.connect(gain); gain.connect(algoMaster); source.start(start,0,Math.min(.08,classicTickBuffer.duration)); source.stop(start+.085); algoNodes.push(source,gain);
      return;
    }
    algoTone("square",850+(step%4)*90,start,.018,level*.15,{filter:2800,q:8,release:.002});
  }
  function tickBuild(addedGlyphs,active){
    if(!active || !isAnimated() || ui.resolveSound.value!=="classic" || addedGlyphs<=0) return;
    state.generationTicks++; playClassicTick(state.generationTicks,addedGlyphs);
  }
  function syncResolveAudio(){
    stopResolveAudio();
    if(!state.playing || !isAnimated() || ui.resolveSound.value==="none") return;
    algorithmicEngine().then(()=>{
      if(ui.resolveSound.value==="classic"){ algoMaster.gain.setValueAtTime(1,algoContext.currentTime); loadClassicTick(); }
      if(ui.resolveSound.value==="algorithmic") algorithmicCycle();
    }).catch(()=>{ transport.textContent="TAP PLAY TO ENABLE SOUND"; });
  }

  function seed(x,y){ let n=(x*374761393+y*668265263)>>>0; n=(n^(n>>>13))*1274126177; return ((n^(n>>>16))>>>0)/4294967296; }
  function mediaDimensions(){ if(!state.media) return [960,540]; return state.sourceKind==="video"?[state.media.videoWidth||960,state.media.videoHeight||540]:[state.media.naturalWidth||960,state.media.naturalHeight||540]; }
  function aspectDimensions(){
    if(ui.aspectRatio.value==="source"){ const [w,h]=mediaDimensions(); return [w,h]; }
    return ui.aspectRatio.value.split(":").map(Number);
  }
  function outputDimensions(){
    const [sourceW,sourceH]=mediaDimensions(), [ratioW,ratioH]=aspectDimensions(), aspect=ratioW/ratioH;
    let longEdge=ui.outputResolution.value==="native"?Math.max(sourceW,sourceH):ui.outputResolution.value==="custom"?Math.max(64,Number(ui.customResolution.value)||1080):Number(ui.outputResolution.value);
    longEdge*=Number(ui.outputScale.value)/100;
    return aspect>=1?[Math.max(1,Math.round(longEdge)),Math.max(1,Math.round(longEdge/aspect))]:[Math.max(1,Math.round(longEdge*aspect)),Math.max(1,Math.round(longEdge))];
  }
  function fit(w,h,maxW,maxH){ const r=Math.min(1,maxW/w,maxH/h); return [Math.max(1,Math.floor(w*r)),Math.max(1,Math.floor(h*r))]; }
  function drawCover(target,source,sourceW,sourceH,targetW,targetH){
    const sourceRatio=sourceW/sourceH, targetRatio=targetW/targetH;
    let sx=0,sy=0,sw=sourceW,sh=sourceH;
    if(sourceRatio>targetRatio){ sw=sourceH*targetRatio; sx=(sourceW-sw)/2; }
    else if(sourceRatio<targetRatio){ sh=sourceW/targetRatio; sy=(sourceH-sh)/2; }
    target.drawImage(source,sx,sy,sw,sh,0,0,targetW,targetH);
  }
  function finishAnimation(){
    if(state.completed) return; state.playing=false; state.completed=true; $("play").textContent="REPLAY";
    state.pausedElapsed=Number(ui.duration.value);
    if(state.sourceKind==="video") state.media.pause(); stopResolveAudio(); transport.textContent="BUILD COMPLETE — FINAL FRAME HELD";
  }
  function getTime(){
    const seconds=Number(ui.duration.value); if(!state.playing) return state.completed?seconds:state.pausedElapsed;
    const elapsed=state.pausedElapsed+(performance.now()-state.started)/1000; if(isAnimated()&&elapsed>=seconds){ finishAnimation(); return seconds; }
    return elapsed;
  }
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
      const text=ui.customText.value.replace(/\r/g,"") || ui.charset.value || characterLibraries.dense;
      if(p<.07) return " ";
      const repeat=Math.max(1,Number(ui.textScale.value));
      if(ui.textLayout.value==="lines"){
        const lines=text.split("\n").filter(line=>line.length); const line=(lines.length?lines[y%lines.length]:text) || text;
        return line[Math.floor(x/repeat)%line.length] || " ";
      }
      const index=Math.floor((x+y*state.analyserW)/repeat)%text.length;
      return ui.textLayout.value==="reverse"?text[text.length-1-index]:text[index] || " ";
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
  function effectiveGlyphSize(time){
    const target=Number(ui.size.value);
    if(ui.mode.value!=="glyph-build") return target;
    const p=Math.max(0,Math.min(1,time/Number(ui.duration.value))), smooth=p*p*(3-2*p);
    return Math.max(target,Math.round(180+(target-180)*smooth));
  }
  function sourceFrame(time=0){
    if(!state.media) return null;
    const [mw,mh]=mediaDimensions(), [outputW,outputH]=outputDimensions(), requestedCell=effectiveGlyphSize(time), maxW=220, maxH=260;
    // Clamp only the *maximum* analysis grid. Never enlarge it again: larger
    // Glyph Size must produce genuinely fewer, bigger characters.
    const [aw,ah]=fit(Math.ceil(outputW/requestedCell),Math.ceil(outputH/requestedCell),maxW,maxH); state.analyserW=aw; state.analyserH=ah; sample.width=aw; sample.height=ah;
    sctx.fillStyle="#000"; sctx.fillRect(0,0,aw,ah); drawCover(sctx,state.media,mw,mh,aw,ah);
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
  function render(now=performance.now()){
    requestAnimationFrame(render);
    if(!state.imageReady) return;
    const frameInterval=1000/Number(ui.fps.value);
    if(state.lastRender && now-state.lastRender<frameInterval) return;
    state.lastRender=now;
    const wasPlaying=state.playing, t=getTime(), frame=sourceFrame(t); if(!frame) return;
    const [w,h]=outputDimensions(), cell=w/state.analyserW, cellH=h/state.analyserH;
    if(out.width!==w||out.height!==h){ out.width=w;out.height=h; $("dimension-readout").textContent=`${w} × ${h}`; }
    $("fps-readout").textContent=`${ui.fps.value} FPS`;
    fillBackground(w,h); ctx.font=`${Math.max(1,cellH)}px monospace`; ctx.textBaseline="top";
    const mode=ui.mode.value, data=frame.data, glitch=Number(ui.glitch.value)/100;
    let visibleGlyphs=0;
    for(let y=0;y<state.analyserH;y++) for(let x=0;x<state.analyserW;x++){
      const i=(y*state.analyserW+x)*4, r=data[i],g=data[i+1],b=data[i+2]; let v=adjusted(r,g,b);
      if(ui.edges.checked || mode==="edge") { const right=x+1<state.analyserW?i+4:i, down=y+1<state.analyserH?i+state.analyserW*4:i; const edge=(Math.abs(data[i]-data[right])+Math.abs(data[i+1]-data[right+1])+Math.abs(data[i+2]-data[right+2])+Math.abs(data[i]-data[down])+Math.abs(data[i+1]-data[down+1])+Math.abs(data[i+2]-data[down+2]))/500; v=Math.max(v*.28,Math.min(1,edge*1.8)); }
      let shown=mode==="direct" || mode==="glyph-build" || revealFor(x,y,v,t,mode); if(!shown) continue;
      let char=glyph(v,x,y); if(mode==="terminal" && ui.glyphSource.value==="ramp" && t/Number(ui.duration.value)<seed(x,y)*.9) char=("01/\\|[]{}<>+-")[Math.floor(seed(y,x+12)*12)];
      const jitter=glitch>0&&seed(x,Math.floor(t*ui.fps.value))<glitch*.14 ? Math.round((seed(y,x)*2-1)*cell*2) : 0;
      if(char!==" ") visibleGlyphs++;
      ctx.globalAlpha=ui.glyphSource.value==="text"?Math.max(.08,Math.pow(v,.72)):1; ctx.fillStyle=glyphColor(v,r,g,b); ctx.fillText(char,x*cell+jitter,y*cellH);
    }
    const addedGlyphs=Math.max(0,visibleGlyphs-state.lastVisibleGlyphs); tickBuild(addedGlyphs,wasPlaying); state.lastVisibleGlyphs=visibleGlyphs;
    ctx.globalAlpha=1;
    const scan=Number(ui.scanlines.value)/100; if(scan){ ctx.fillStyle=`rgba(0,0,0,${scan*.42})`; for(let y=0;y<h;y+=4)ctx.fillRect(0,y,w,1); }
    overlay(t,w,h,cell,cellH);
  }
  function load(file){
    if(!file) return; if(state.fileURL) URL.revokeObjectURL(state.fileURL); state.fileURL=URL.createObjectURL(file); state.imageReady=false;
    // Every new source begins as an inspectable still, regardless of any form
    // values the browser restored from a previous session.
    ui.mode.value="direct"; ui.effect.value="none"; ui.outputScale.value="100"; ui.aspectRatio.value="source"; ui.outputResolution.value="native"; fitViewport(false); updateReadouts(); state.playing=false; state.completed=false; state.pausedElapsed=0; state.lastRender=0; state.lastSoundStep=-1; state.lastVisibleGlyphs=0; state.generationTicks=0; $("play").textContent="PLAY"; stopResolveAudio();
    const isVideo=file.type.startsWith("video/") || /\.(mp4|webm|mov|mkv)$/i.test(file.name); const el=isVideo?document.createElement("video"):new Image();
    state.media=el; state.sourceKind=isVideo?"video":"image"; el.src=state.fileURL; status.textContent=`LOADING // ${file.name.toUpperCase()}`;
    const ready=()=>{ state.imageReady=true; empty.hidden=true; state.playing=false; state.completed=false; state.pausedElapsed=0; state.lastRender=0; state.lastSoundStep=-1; state.lastVisibleGlyphs=0; state.generationTicks=0; $("play").textContent="PLAY"; state.started=performance.now(); resetHistory(); status.textContent=`${isVideo?"VIDEO":"IMAGE"} // ${file.name.toUpperCase()}`; transport.textContent="STATIC PREVIEW — PICK A STYLE TO ANIMATE"; if(isVideo){el.loop=true;el.muted=true;el.pause();el.currentTime=0;} };
    if(isVideo){ el.addEventListener("loadeddata",ready,{once:true}); el.addEventListener("error",()=>status.textContent="UNSUPPORTED VIDEO CODEC",{once:true}); } else { el.onload=ready; el.onerror=()=>status.textContent="UNSUPPORTED IMAGE"; }
  }
  function applyCharacterLibrary(name){
    if(name!=="custom" && characterLibraries[name]) ui.charset.value=characterLibraries[name];
    transport.textContent=name==="custom"?"CUSTOM CHARACTER SET":"CHARACTER LIBRARY LOADED"; commitHistory();
  }
  function applyPalettePreset(name){
    if(name==="custom") return;
    const preset=palettePresets[name]; if(!preset) return;
    ui.colorMode.value=preset.mode; ui.paletteSize.value=preset.size; ui.background.value=preset.background; ui.background2.value=preset.background2; ui.backgroundStyle.value=preset.style;
    preset.colors?.forEach((color,index)=>paletteFields[index].value=color);
    transport.textContent=name==="source"?"AUTO SOURCE COLOR ENABLED":"PALETTE LOADED"; commitHistory();
  }
  function markPaletteCustom(){ if(ui.palettePreset.value!=="source") ui.palettePreset.value="custom"; }
  function applyPrompt(){ const p=ui.prompt.value.toLowerCase(); const set=(key,val)=>{ ui[key].value=val; };
    if(/glyph.?collapse|large.?glyph|glyph.?build|coarse.?to.?fine/.test(p))set("mode","glyph-build"); else if(/pixel.?sort|sort sweep/.test(p))set("mode","pixel-sort"); else if(/scan(line)?|develop/.test(p))set("mode","scanline"); else if(/edge/.test(p))set("mode","edge"); else if(/terminal|decode|resolve|build/.test(p))set("mode",/terminal/.test(p)?"terminal":"decode");
    if(/rain/.test(p))set("effect","rain"); if(/particle|dust|stars?/.test(p))set("effect","particles"); if(/waveform|audio wave|signal wave/.test(p))set("effect","waveform"); if(/orb|sphere|3d ascii/.test(p))set("effect","orb");
    if(/auto.?color|source.?color/.test(p))set("colorMode","source");
    if(/red|vermilion/.test(p)){set("colorMode","mono");set("foreground","#ef4035");markPaletteCustom();} if(/blue|cobalt/.test(p)){set("colorMode","mono");set("foreground","#4169e1");markPaletteCustom();} if(/green|phosphor/.test(p)){set("colorMode","mono");set("foreground","#9dff68");markPaletteCustom();} if(/white|mono(chrome)?/.test(p)){set("colorMode","mono");set("foreground","#f5f5f5");markPaletteCustom();}
    if(/slow/.test(p))set("duration","7"); if(/fast|rapid/.test(p))set("duration","1.5"); if(/low fps|choppy|psx/.test(p))set("fps","12"); if(/crt|scanline/.test(p))set("scanlines","55"); if(/glitch|corrupt/.test(p))set("glitch","50"); if(/clean|minimal/.test(p)){set("glitch","0");set("scanlines","0");}
    updateReadouts(); transport.textContent="PROMPT APPLIED"; commitHistory();
  }
  function applyPreset(name){
    const set=(key,val)=>{ui[key].value=val;};
    set("effect","none"); set("glitch","8"); set("scanlines","18"); set("fps","30");
    const presets={
      direct:()=>set("mode","direct"),
      build:()=>set("mode","decode"),
      glyph:()=>{set("mode","glyph-build");set("fps","12");},
      sort:()=>{set("mode","pixel-sort");set("direction","random");set("glitch","14");},
      scan:()=>{set("mode","scanline");set("scanlines","38");},
      terminal:()=>{set("mode","terminal");set("scanlines","45");set("glitch","22");},
      rain:()=>{set("mode","terminal");set("colorMode","mono");set("foreground","#ef4035");markPaletteCustom();set("effect","rain");set("effectPower","65");set("glitch","35");set("scanlines","45");}
    };
    presets[name]?.(); state.started=performance.now(); state.playing=name!=="direct"; state.completed=false; state.pausedElapsed=0; state.lastRender=0; state.lastSoundStep=-1; state.lastVisibleGlyphs=0; state.generationTicks=0; $("play").textContent=state.playing?"PAUSE":"PLAY"; if(state.sourceKind==="video"){ if(state.playing)state.media.play().catch(()=>{}); else state.media.pause(); } syncResolveAudio(); updateReadouts(); transport.textContent=name==="direct"?"STATIC PREVIEW":"BUILDING — WILL HOLD ON FINAL FRAME"; commitHistory();
  }
  function restart(){ state.started=performance.now(); state.completed=false; state.pausedElapsed=0; state.lastRender=0; state.lastSoundStep=-1; state.lastVisibleGlyphs=0; state.generationTicks=0; $("play").textContent=state.playing?"PAUSE":"PLAY"; if(state.sourceKind==="video"&&state.media){state.media.currentTime=0;if(state.playing)state.media.play().catch(()=>{});} syncResolveAudio(); transport.textContent=state.playing?"RESTARTED — BUILDING":"RESTARTED — PRESS PLAY"; }
  function snapshot(){ const a=document.createElement("a");a.download="ascii-motion-frame.png";a.href=out.toDataURL("image/png");a.click(); }
  function currentAsciiText(){
    if(!state.imageReady) return "";
    const t=state.completed?Number(ui.duration.value):state.playing?getTime():state.pausedElapsed, frame=sourceFrame(t); if(!frame) return "";
    const data=frame.data, mode=ui.mode.value, lines=[];
    for(let y=0;y<state.analyserH;y++){
      let line="";
      for(let x=0;x<state.analyserW;x++){
        const i=(y*state.analyserW+x)*4, r=data[i],g=data[i+1],b=data[i+2]; let v=adjusted(r,g,b);
        if(ui.edges.checked || mode==="edge") { const right=x+1<state.analyserW?i+4:i, down=y+1<state.analyserH?i+state.analyserW*4:i; const edge=(Math.abs(data[i]-data[right])+Math.abs(data[i+1]-data[right+1])+Math.abs(data[i+2]-data[right+2])+Math.abs(data[i]-data[down])+Math.abs(data[i+1]-data[down+1])+Math.abs(data[i+2]-data[down+2]))/500; v=Math.max(v*.28,Math.min(1,edge*1.8)); }
        const shown=mode==="direct" || mode==="glyph-build" || revealFor(x,y,v,t,mode); if(!shown){ line+=" "; continue; }
        line+=mode==="terminal"&&ui.glyphSource.value==="ramp"&&t/Number(ui.duration.value)<seed(x,y)*.9?("01/\\|[]{}<>+-")[Math.floor(seed(y,x+12)*12)]:glyph(v,x,y);
      }
      lines.push(line.replace(/\s+$/,""));
    }
    return lines.join("\n");
  }
  function generateAscii(){ const text=currentAsciiText(); if(!text){ transport.textContent="ATTACH A SOURCE FIRST"; return; } $("ascii-export").value=text; transport.textContent=`TEXT FRAME GENERATED — ${text.length.toLocaleString()} CHARACTERS`; }
  async function copyAscii(){ const text=$("ascii-export").value||currentAsciiText(); if(!text){ transport.textContent="ATTACH A SOURCE FIRST"; return; } $("ascii-export").value=text; try{ await navigator.clipboard.writeText(text); transport.textContent="COPYABLE TEXT ART COPIED"; }catch{ const field=$("ascii-export"); field.focus(); field.select(); document.execCommand("copy"); transport.textContent="TEXT SELECTED / COPIED"; } }
  async function record(){ if(!state.imageReady||state.recording)return; if(!isAnimated()){ transport.textContent="CHOOSE A BUILD STYLE BEFORE EXPORTING VIDEO"; return; } if(!window.MediaRecorder){transport.textContent="MEDIARECORDER NOT AVAILABLE";return;} state.recording=true; state.playing=true; state.completed=false; $("record").classList.add("recording"); $("record").textContent="● RECORDING…"; restart();
    const stream=out.captureStream(Number(ui.fps.value)); let audioStream=null; if(ui.resolveSound.value!=="none"){ await algorithmicEngine(); audioStream=algoCapture?.stream; } audioStream?.getAudioTracks().forEach(track=>stream.addTrack(track)); const type=MediaRecorder.isTypeSupported("video/webm;codecs=vp9")?"video/webm;codecs=vp9":"video/webm"; const rec=new MediaRecorder(stream,{mimeType:type,videoBitsPerSecond:8_000_000}); const chunks=[];
    rec.ondataavailable=e=>e.data.size&&chunks.push(e.data); rec.onstop=()=>{ const blob=new Blob(chunks,{type});const a=document.createElement("a");a.download="ascii-motion-build.webm";a.href=URL.createObjectURL(blob);a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);state.recording=false;$("record").classList.remove("recording");$("record").textContent="● EXPORT BUILD (WEBM)";transport.textContent="WEBM EXPORTED"; };
    rec.start(); setTimeout(()=>rec.stop(),Number(ui.duration.value)*1000);
  }
  fileInput.onchange=e=>{ load(e.target.files[0]); e.target.value=""; };
  $("choose-file").onclick=()=>fileInput.click();
  $("fit-view").onclick=()=>{ fitViewport(); transport.textContent="VIEW FIT"; };
  $("undo").onclick=undo; $("redo").onclick=redo;
  ["dragenter","dragover"].forEach(type=>drop.addEventListener(type,e=>{e.preventDefault();drop.classList.add("dragging");})); ["dragleave","drop"].forEach(type=>drop.addEventListener(type,e=>{e.preventDefault();drop.classList.remove("dragging");})); drop.addEventListener("drop",e=>load(e.dataTransfer.files[0]));
  let panStart=null;
  drop.addEventListener("pointerdown",e=>{
    if(!state.imageReady || e.button!==0 || e.target.closest("button")) return;
    panStart={pointerX:e.clientX,pointerY:e.clientY,viewX:state.viewport.x,viewY:state.viewport.y}; drop.setPointerCapture?.(e.pointerId); drop.classList.add("panning"); e.preventDefault();
  });
  drop.addEventListener("pointermove",e=>{
    if(!panStart) return; state.viewport.x=panStart.viewX+(e.clientX-panStart.pointerX); state.viewport.y=panStart.viewY+(e.clientY-panStart.pointerY); applyViewport();
  });
  const finishPan=()=>{ if(!panStart) return; panStart=null; drop.classList.remove("panning"); commitHistory(); };
  drop.addEventListener("pointerup",finishPan); drop.addEventListener("pointercancel",finishPan);
  drop.addEventListener("wheel",e=>{
    if(!state.imageReady || e.target.closest("button")) return; e.preventDefault(); const before=state.viewport.zoom, factor=e.deltaY<0?1.12:1/1.12; state.viewport.zoom=Math.max(.25,Math.min(8,before*factor)); if(before===state.viewport.zoom) return; applyViewport(); clearTimeout(viewportCommitTimer); viewportCommitTimer=setTimeout(commitHistory,220);
  },{passive:false});
  $("apply-prompt").onclick=applyPrompt; $("restart").onclick=restart; $("snapshot").onclick=snapshot; $("record").onclick=record;
  $("generate-ascii").onclick=generateAscii; $("copy-ascii").onclick=copyAscii;
  document.querySelectorAll("[data-preset]").forEach(button=>button.onclick=()=>applyPreset(button.dataset.preset));
  document.querySelectorAll("[data-prompt]").forEach(button=>button.onclick=()=>{ui.prompt.value=button.dataset.prompt;applyPrompt();});
  ui.charsetPreset.onchange=()=>applyCharacterLibrary(ui.charsetPreset.value);
  ui.charset.oninput=()=>{ui.charsetPreset.value="custom";};
  ui.palettePreset.onchange=()=>applyPalettePreset(ui.palettePreset.value);
  [ui.colorMode,ui.paletteSize,ui.backgroundStyle,ui.foreground,ui.palette2,ui.palette3,ui.palette4,ui.palette5,ui.background,ui.background2].forEach(control=>control.addEventListener("input",markPaletteCustom));
  [ui.size,ui.aspectRatio,ui.outputResolution,ui.customResolution,ui.outputScale].forEach(control=>control.addEventListener("input",()=>{ state.lastRender=0; }));
  ui.mode.onchange=()=>{ state.completed=false; state.pausedElapsed=0; state.lastRender=0; state.lastSoundStep=-1; state.lastVisibleGlyphs=0; state.generationTicks=0; if(ui.mode.value==="direct"){ state.playing=false; stopResolveAudio(); $("play").textContent="PLAY"; transport.textContent="STATIC PREVIEW"; } else transport.textContent="STYLE SET — PRESS PLAY"; };
  $("play").onclick=()=>{
    if(!isAnimated()){ state.playing=false; state.completed=false; state.pausedElapsed=0; $("play").textContent="PLAY"; stopResolveAudio(); transport.textContent="STATIC PREVIEW — CHOOSE A BUILD STYLE TO ANIMATE"; return; }
    if(state.completed){ state.completed=false; state.pausedElapsed=0; state.started=performance.now(); state.playing=true; state.lastRender=0; state.lastSoundStep=-1; state.lastVisibleGlyphs=0; state.generationTicks=0; }
    else if(state.playing){ state.pausedElapsed+=(performance.now()-state.started)/1000; state.playing=false; }
    else { state.started=performance.now(); state.playing=true; }
    $("play").textContent=state.playing?"PAUSE":"PLAY"; transport.textContent=state.playing?"BUILDING":"PAUSED";
    if(state.sourceKind==="video") state.playing?state.media.play():state.media.pause(); syncResolveAudio();
  };
  ui.resolveSound.onchange=()=>syncResolveAudio();
  ui.audioLevel.oninput=()=>{ if(state.playing&&ui.resolveSound.value==="algorithmic") syncResolveAudio(); };
  ui.duration.onchange=()=>{ if(state.playing)syncResolveAudio(); };
  const updateTextCount=()=>$("text-count").textContent=`${ui.customText.value.length.toLocaleString()} CHARACTERS`;
  ui.customText.oninput=()=>{ updateTextCount(); state.lastRender=0; };
  $("import-text").onclick=()=>textFileInput.click();
  textFileInput.onchange=async e=>{ const file=e.target.files[0]; e.target.value=""; if(!file) return; try{ ui.customText.value=await file.text(); updateTextCount(); state.lastRender=0; commitHistory(); transport.textContent=`TEXT IMPORTED — ${ui.customText.value.length.toLocaleString()} CHARACTERS`; }catch{ transport.textContent="TEXT IMPORT FAILED"; } };
  $("clear-text").onclick=()=>{ ui.customText.value=""; updateTextCount(); state.lastRender=0; commitHistory(); transport.textContent="TEXT CLEARED"; };
  document.querySelectorAll("#controls input, #controls select, #controls textarea").forEach(control=>{ if(control.type!=="file") control.addEventListener("change",commitHistory); });
  window.addEventListener("keydown",e=>{
    if(e.target.matches("input, textarea, select")) return;
    if((e.ctrlKey||e.metaKey)&&!e.altKey&&e.key.toLowerCase()==="z"){ e.preventDefault(); e.shiftKey?redo():undo(); }
    if(e.altKey&&e.key==="ArrowLeft"){ e.preventDefault(); undo(); }
    if(e.altKey&&e.key==="ArrowRight"){ e.preventDefault(); redo(); }
  });
  $("toggle-ui").onclick=()=>{document.body.classList.toggle("ui-hidden");$("toggle-ui").textContent=document.body.classList.contains("ui-hidden")?"SHOW UI":"HIDE UI";};
  updateTextCount(); resetHistory(); applyViewport(); render();
})();
