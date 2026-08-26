(() => {
  const $ = (id) => document.getElementById(id);
  const out = $("output"), ctx = out.getContext("2d"), sample = document.createElement("canvas"), sctx = sample.getContext("2d", { willReadFrequently:true });
  const fileInput=$("file-input"), textFileInput=$("text-file-input"), drop=$("drop-zone"), canvasWrap=$("canvas-wrap"), liveText=$("live-text"), empty=$("empty-state"), status=$("source-status"), transport=$("transport-status");
  const ui = {
    mode:$("mode"), size:$("cell-size"), duration:$("duration"), charset:$("charset"), charsetPreset:$("charset-preset"), glyphSource:$("glyph-source"), customText:$("custom-text"), textLayout:$("text-layout"), textScale:$("text-scale"), textBlend:$("text-blend"), noTextRepeat:$("no-text-repeat"), lockSentence:$("lock-sentence"), lockedSentence:$("locked-sentence"), boldWords:$("bold-words"), findText:$("find-text"), replaceText:$("replace-text"),
    brightness:$("brightness"), contrast:$("contrast"), invert:$("invert"), edges:$("edges"), fps:$("fps"), direction:$("direction"), glitch:$("glitch"), scanlines:$("scanlines"),
    colorMode:$("color-mode"), palettePreset:$("palette-preset"), paletteSize:$("palette-size"), backgroundStyle:$("background-style"), foreground:$("foreground"), palette2:$("palette-2"), palette3:$("palette-3"), palette4:$("palette-4"), palette5:$("palette-5"), background:$("background"), background2:$("background-2"),
    effect:$("effect"), effectPower:$("effect-power"), outputScale:$("output-scale"), aspectRatio:$("aspect-ratio"), outputResolution:$("output-resolution"), customResolution:$("custom-resolution"), resolveSound:$("resolve-sound"), audioLevel:$("audio-level"), tickVoice:$("tick-voice"), previewEngine:$("preview-engine"), prompt:$("prompt"),
    pattern:$("pattern"), patternTarget:$("pattern-target"), patternTile:$("pattern-tile"), borderStyle:$("border-style"), borderMotion:$("border-motion"), divider:$("divider"), safeArea:$("safe-area"), posterMode:$("poster-mode"), posterTitle:$("poster-title"), posterFooter:$("poster-footer"), asciiColumns:$("ascii-columns"), asciiBorder:$("ascii-border"), muteFirstTick:$("mute-first-tick"), muteFinalTick:$("mute-final-tick")
  };
  // Do not let browser form restoration boot the tool into someone's previous
  // glitch carnival. New sessions start as a clean, direct baseline.
  ui.glitch.value="0"; ui.scanlines.value="0"; ui.effect.value="none"; ui.effectPower.value="0"; ui.contrast.value="100"; ui.direction.value="left"; ui.noTextRepeat.checked=false;
  const state = { media:null, fileURL:null, sourceKind:null, playing:false, completed:false, started:performance.now(), pausedElapsed:0, imageReady:false, recording:false, analyserW:0, analyserH:0, lastRender:0, lastSoundStep:-1, lastVisibleGlyphs:0, generationTicks:0, firstTick:true, finalTick:false, textMode:true, manualText:"", viewport:{x:0,y:0,zoom:1} };
  const outputNames={size:"cell-size-out",duration:"duration-out",textScale:"text-scale-out",textBlend:"text-blend-out",brightness:"brightness-out",contrast:"contrast-out",glitch:"glitch-out",scanlines:"scanlines-out",effectPower:"effect-power-out",outputScale:"output-scale-out",audioLevel:"audio-level-out",safeArea:"safe-area-out"};
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
  function setControlPage(page){
    document.querySelectorAll(".panel[data-page]").forEach(panel=>panel.hidden=panel.dataset.page!==page);
    document.querySelectorAll("[data-control-page]").forEach(button=>button.classList.toggle("is-active",button.dataset.controlPage===page));
  }
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
  const tickVoices={
    classic:{rate:1, tone:"triangle", frequency:720, filter:2100, noise:0},
    heap:{rate:.72, tone:"square", frequency:82, filter:480, noise:.025},
    cache:{rate:1.28, tone:"square", frequency:1750, filter:3600, noise:.012},
    leak:{rate:.91, tone:"sawtooth", frequency:180, filter:980, noise:.04},
    relay:{rate:.82, tone:"square", frequency:310, filter:1350, noise:.018},
    ceramic:{rate:1.12, tone:"triangle", frequency:1180, filter:3900, noise:.006},
    needle:{rate:1.34, tone:"sine", frequency:2450, filter:4800, noise:0},
    drive:{rate:.98, tone:"sawtooth", frequency:430, filter:1500, noise:.025},
    vending:{rate:1.06, tone:"square", frequency:640, filter:2400, noise:.016},
    concrete:{rate:.66, tone:"square", frequency:104, filter:630, noise:.045}
  };
  function playClassicTick(step,addedGlyphs,kind="scatter"){
    if(!algoContext || ui.resolveSound.value!=="classic") return;
    const start=algoContext.currentTime+.002, impact=Math.min(1,.35+Math.log2(Math.max(1,addedGlyphs))/10), level=Number(ui.audioLevel.value)/100*impact;
    const profile={row:[.88,.085,130],scatter:[1,.055,650],dark:[.78,.10,90],bright:[1.25,.04,1550],lock:[.72,.14,180],rain:[1.1,.045,980],sync:[.95,.065,410]}[kind]||[1,.06,650], voice=tickVoices[ui.tickVoice.value]||tickVoices.classic;
    if(classicTickBuffer){
      const source=algoContext.createBufferSource(), gain=algoContext.createGain();
      source.buffer=classicTickBuffer; source.playbackRate.value=profile[0]*voice.rate+((step%5)-2)*.025;
      gain.gain.setValueAtTime(0,start); gain.gain.linearRampToValueAtTime(level*.62,start+.002); gain.gain.exponentialRampToValueAtTime(.0001,start+profile[1]);
      source.connect(gain); gain.connect(algoMaster); source.start(start,0,Math.min(profile[1],classicTickBuffer.duration)); source.stop(start+profile[1]+.005); algoNodes.push(source,gain);
      if(kind!=="scatter"||voice!==tickVoices.classic) algoTone(voice.tone,voice.frequency+profile[2]*.18+(step%3)*16,start,Math.min(.045,profile[1]),level*.08,{filter:Math.max(400,voice.filter),q:4,release:.003});
      if(voice.noise) algoNoise(start,Math.min(.035,profile[1]),level*voice.noise,{filter:voice.filter,q:5,seed:step*31+addedGlyphs,release:.002});
      return;
    }
    algoTone(voice.tone,voice.frequency+profile[2]*.2+(step%4)*70,start,.018,level*.15,{filter:voice.filter,q:8,release:.002});
  }
  function tickBuild(addedGlyphs,active,info={}){
    if(!active || !isAnimated() || ui.resolveSound.value!=="classic" || addedGlyphs<=0) return;
    const final=info.progress>=.995; if(state.firstTick&&ui.muteFirstTick.checked){state.firstTick=false;return;} if(final&&ui.muteFinalTick.checked){state.finalTick=true;return;}
    state.firstTick=false; state.generationTicks++;
    const mode=ui.mode.value; let kind=info.darkMass?"dark":info.brightMass?"bright":final?"lock":"scatter";
    if(["line-printer","scanline"].includes(mode))kind="row"; if(["horizontal-sync","compression-decode"].includes(mode))kind="sync"; if(mode==="terminal-rain")kind="rain";
    playClassicTick(state.generationTicks,addedGlyphs,kind); if(final)state.finalTick=true;
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
    // Half-width Katakana fits one terminal cell; full-width Katakana breaks a
    // literal <pre> grid by consuming two visual columns.
    katakana:" ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜｦﾝ",
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
    if(["background","both"].includes(ui.patternTarget.value)) drawPattern(w,h,Math.max(5,Number(ui.size.value)),Math.max(6,Number(ui.size.value)*1.22),.18);
  }
  const proceduralPatterns={hatch:"////\\\\",wave:"~≈∿∼",cross:"×+╳+",maze:"┐└┘┌",checker:"░▒▓ "};
  function patternChars(){ return ui.pattern.value==="custom"?(ui.patternTile.value||"░▒▓█"):(proceduralPatterns[ui.pattern.value]||""); }
  function patternGlyph(x,y,bright){ const chars=patternChars(); if(!chars) return ""; return chars[Math.abs(Math.floor(x*1.7+y*2.3+bright*7))%chars.length]; }
  function drawPattern(w,h,cell,cellH,alpha=1){ const chars=patternChars(); if(!chars) return; ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=ui.foreground.value;ctx.font=`${Math.max(5,cell)}px monospace`;ctx.textBaseline="top"; for(let y=0;y<h;y+=cellH)for(let x=0;x<w;x+=cell)ctx.fillText(patternGlyph(x/cell,y/cellH,0),x,y);ctx.restore(); }
  function glyph(bright,x=0,y=0,textFlowIndex=null){
    const p=Math.max(0,Math.min(1,bright));
    if(ui.glyphSource.value==="text"){
      const ramp=ui.charset.value || characterLibraries.dense;
      let text=(ui.lockSentence.checked && ui.lockedSentence.value.trim()?ui.lockedSentence.value:ui.customText.value).replace(/\r/g,"") || ramp;
      const bold=ui.boldWords.value.split(",").map(word=>word.trim()).filter(Boolean); if(bold.length) text+=` ${bold.join(" ")} ${bold.join(" ")}`;
      if(p<.07) return " ";
      const repeat=Math.max(1,Number(ui.textScale.value));
      if(ui.textLayout.value==="lines"){
        const lines=text.split("\n").filter(line=>line.length), lineIndex=ui.noTextRepeat.checked?y:y%Math.max(1,lines.length), line=lines[lineIndex]||"";
        const characterIndex=Math.floor(x/repeat); return ui.noTextRepeat.checked&&characterIndex>=line.length?" ":line[characterIndex%Math.max(1,line.length)]||" ";
      }
      // Newlines from a pasted document must never become real line breaks in
      // the image grid. Flow turns all document whitespace into a normal,
      // visible word-space; only the renderer decides when a grid row ends.
      text=text.replace(/\s+/g," ").trim() || ramp;
      // Flow is deliberately counted through *visible* cells, not every cell
      // in the source rectangle. That makes the first written character land
      // at the first filled cell at the top of the subject, then read naturally
      // through its silhouette instead of consuming the quote in black space.
      let index=textFlowIndex===null?Math.floor((x+y*state.analyserW)/repeat):Math.floor(textFlowIndex/repeat);
      if(ui.noTextRepeat.checked&&index>=text.length) return " ";
      index%=text.length;
      if(ui.textLayout.value==="vertical") index=Math.floor((y+x*state.analyserH)/repeat)%text.length;
      if(ui.textLayout.value==="spiral") index=Math.floor((Math.hypot(x-state.analyserW/2,y-state.analyserH/2)*4+Math.atan2(y-state.analyserH/2,x-state.analyserW/2)*12)/repeat)%text.length;
      const textChar=ui.textLayout.value==="reverse"?text[text.length-1-index]:text[(index+text.length)%text.length] || " ";
      return seed(x+41,y+83)*100<=Number(ui.textBlend.value)?textChar:ramp[Math.min(ramp.length-1,Math.floor(p*(ramp.length-1)))];
    }
    const chars=ui.charset.value || characterLibraries.dense;
    return chars[Math.min(chars.length-1,Math.floor(p*(chars.length-1)))];
  }
  function renderGlyph(bright,x,y,time,mode,textFlowIndex=null){
    const progress=Math.max(0,Math.min(1,time/Number(ui.duration.value)));
    let char=glyph(bright,x,y,textFlowIndex);
    if(mode==="corruption-repair" && progress<.985){
      const corruption="@#%?01/\\|[]{}<>"; const repair=Math.max(0,Math.min(1,(progress-seed(x,y)*.16)/.84));
      if(seed(x+9,y+17)>repair) char=corruption[Math.floor(seed(y+31,x+3)*corruption.length)];
    }
    if(mode==="iterative-draft" && progress<.94){
      // Fixed grid, but an actual drafting process: big block marks establish
      // the mass, individual cells get erased/retried, then settle to truth.
      const block=" ░▒▓█", scratch=" .,:;/-=+*xX#@", begin=.17+seed(x+71,y+29)*.55, settle=begin+.12+seed(x+17,y+61)*.15;
      if(progress<.17 || progress<begin){ char=block[Math.min(block.length-1,Math.max(0,Math.floor(bright*(block.length-1))))]; }
      else if(progress<settle){
        const attempt=Math.floor((progress-begin)*48), revision=seed(x+attempt*37,y-attempt*19);
        // The blank is the deletion pass; the next pass types another plausible mark.
        if(attempt%4===1 && revision>.38) char=" ";
        else char=scratch[Math.min(scratch.length-1,Math.max(0,Math.floor((bright+(seed(x+attempt,y-attempt)-.5)*.7)*(scratch.length-1))))];
      }
    }
    if(["fill","both"].includes(ui.patternTarget.value) && ui.pattern.value!=="none" && char!==" ") char=patternGlyph(x,y,bright) || char;
    return char;
  }
  function adjusted(r,g,b){ let v=(.2126*r+.7152*g+.0722*b)/255; v=(v-.5)*(Number(ui.contrast.value)/100)+.5+Number(ui.brightness.value)/100; v=Math.max(0,Math.min(1,v)); return ui.invert.checked?1-v:v; }
  function revealFor(x,y,b,t,mode){ const p=Math.min(1,t/Number(ui.duration.value)); const random=seed(x,y); const dir=ui.direction.value;
    let sweep=dir==="left"?x/state.analyserW:dir==="right"?1-x/state.analyserW:dir==="top"?y/state.analyserH:dir==="bottom"?1-y/state.analyserH:Math.min(1,random*.62 + (1-b)*.38);
    if(mode==="pixel-sort") return p>=sweep;
    if(["scanline","line-printer"].includes(mode)) return p>=y/state.analyserH;
    if(mode==="threshold-flood") return p>=1-b;
    if(mode==="horizontal-sync") return p>=Math.max(0,Math.min(1,y/state.analyserH+(seed(x,3)-.5)*.14));
    if(mode==="terminal-rain") return p>=Math.min(1,y/state.analyserH*.72+seed(x,19)*.3);
    if(["edge","edge-skeleton"].includes(mode)) return p>=Math.min(1,random*.35+(1-b)*.1);
    if(mode==="word-reveal") return p>=seed(Math.floor(x/7),Math.floor(y/2));
    if(mode==="compression-decode"){const block=Math.max(1,8-Math.floor(p*7));return p>=seed(Math.floor(x/block),Math.floor(y/block));}
    return p>=random;
  }
  function effectiveGlyphSize(time){
    const target=Number(ui.size.value);
    if(ui.mode.value==="coarse-mosaic"){ const p=Math.max(0,Math.min(1,time/Number(ui.duration.value))), stage=Math.max(0,3-Math.floor(p*4)); return Math.max(target,Math.min(180,target*2**stage)); }
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
  function drawBorder(w,h,time){
    const style=ui.borderStyle.value; if(style==="none") return;
    const p=Math.max(0,Math.min(1,time/Number(ui.duration.value))), margin=Math.max(8,Math.round(Math.min(w,h)*Number(ui.safeArea.value)/100));
    let reveal=1, jitter=0; if(ui.borderMotion.value==="draw") reveal=isAnimated()?p:1; if(ui.borderMotion.value==="distort") jitter=(1-p)*Math.min(w,h)*.018;
    ctx.save(); ctx.globalAlpha=.8;ctx.strokeStyle=ui.foreground.value;ctx.fillStyle=ui.foreground.value;ctx.lineWidth=style==="double"?1.5:1;ctx.setLineDash(style==="wave"?[5,4]:[]);
    const bw=(w-margin*2)*reveal, bh=(h-margin*2)*reveal; ctx.strokeRect(margin+jitter,margin-jitter,bw,bh);
    if(style==="double")ctx.strokeRect(margin+5-jitter,margin+5+jitter,Math.max(0,bw-10),Math.max(0,bh-10));
    if(style==="corners"||style==="terminal"){const l=Math.min(28,Math.min(w,h)*.05);[[margin,margin,1,1],[margin+bw,margin,-1,1],[margin,margin+bh,1,-1],[margin+bw,margin+bh,-1,-1]].forEach(([x,y,sx,sy])=>{ctx.beginPath();ctx.moveTo(x+sx*l,y);ctx.lineTo(x,y);ctx.lineTo(x,y+sy*l);ctx.stroke();});}
    if(ui.divider.value!=="none"){const chars={dots:"············",cross:"×+×+×+×+×+",wave:"≈∿≈∿≈∿≈∿",maze:"┤┴├┬┤┴├┬"}[ui.divider.value];ctx.font=`${Math.max(8,Math.round(Math.min(w,h)*.016))}px monospace`;ctx.textAlign="center";ctx.fillText(chars,w/2,h-margin-8);}
    ctx.restore();
  }
  function drawPoster(w,h){ if(!ui.posterMode.checked) return; const margin=Math.max(14,Math.round(Math.min(w,h)*.055));ctx.save();ctx.fillStyle=ui.foreground.value;ctx.globalAlpha=.95;ctx.font=`700 ${Math.max(9,Math.round(Math.min(w,h)*.026))}px monospace`;ctx.textBaseline="top";ctx.fillText(ui.posterTitle.value||"GLYPHSHIFT",margin,margin+8);ctx.textBaseline="alphabetic";ctx.textAlign="right";ctx.fillText(ui.posterFooter.value||"// ASCII MOTION",w-margin,h-margin-9);ctx.restore(); }
  const readTextCanvas=()=>liveText.innerText.replace(/\r/g,"");
  function renderTextCanvas(){
    canvasWrap.classList.add("is-live-text","is-manual-text");
    liveText.contentEditable="true";
    liveText.setAttribute("aria-label","Editable monospaced text canvas");
    empty.hidden=true;
  }
  function enterTextCanvas(text=state.manualText,focus=false){
    state.textMode=true; state.manualText=(text||"").replace(/\r/g,""); state.playing=false; state.completed=false; stopResolveAudio();
    ui.previewEngine.value="manual"; liveText.textContent=state.manualText; fitViewport(false); renderTextCanvas();
    transport.textContent="TEXT CANVAS — TYPE DIRECTLY INTO THE GRID";
    if(focus) requestAnimationFrame(()=>liveText.focus());
  }
  function leaveTextCanvas(){
    if(!state.textMode) return;
    state.manualText=readTextCanvas(); state.textMode=false; liveText.contentEditable="false"; liveText.setAttribute("aria-label","Literal ASCII text preview"); canvasWrap.classList.remove("is-manual-text");
  }
  function updateLiveText(lines,w,h,cell,cellH){
    if(state.textMode) return;
    const useText=ui.previewEngine.value==="text"; canvasWrap.classList.toggle("is-live-text",useText);
    if(!useText){ canvasWrap.style.width="";canvasWrap.style.height="";liveText.textContent="";return; }
    const displayScale=Math.min(1,Math.max(.01,(drop.clientWidth-4)/w),Math.max(.01,(drop.clientHeight-4)/h));
    const fontSize=Math.max(4,cellH*displayScale), glyphAdvance=ctx.measureText("M").width*displayScale, letterSpacing=Math.max(-fontSize*.32,cell*displayScale-glyphAdvance);
    canvasWrap.style.width=`${Math.max(1,w*displayScale)}px`; canvasWrap.style.height=`${Math.max(1,h*displayScale)}px`;
    liveText.style.fontSize=`${fontSize}px`; liveText.style.lineHeight=`${Math.max(4,cellH*displayScale)}px`; liveText.style.letterSpacing=`${letterSpacing}px`; liveText.textContent=lines.join("\n");
  }
  function draftCursor(time){
    if(ui.mode.value!=="iterative-draft") return null; const p=Math.max(0,Math.min(1,time/Number(ui.duration.value))); if(p<.17||p>.94||!state.analyserW||!state.analyserH) return null;
    const step=Math.floor((p-.17)*42), x=Math.min(state.analyserW-1,Math.floor(seed(step,809)*state.analyserW)), y=Math.min(state.analyserH-1,Math.floor(seed(step,911)*state.analyserH));
    return {x,y,visible:step%2===0};
  }
  function drawDraftCursor(time,cell,cellH){ const cursor=draftCursor(time); if(!cursor||!cursor.visible) return; ctx.save();ctx.globalAlpha=.9;ctx.fillStyle=ui.foreground.value;ctx.fillRect(cursor.x*cell,cursor.y*cellH+Math.max(1,cellH*.86),Math.max(2,cell*.72),Math.max(1,cellH*.08));ctx.restore(); }
  function render(now=performance.now()){
    requestAnimationFrame(render);
    if(state.textMode) return;
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
    let visibleGlyphs=0, darkAdded=0, brightAdded=0, textFlowIndex=0; const liveLines=ui.previewEngine.value==="text"?[]:null;
    for(let y=0;y<state.analyserH;y++) { let liveLine=""; for(let x=0;x<state.analyserW;x++){
      const i=(y*state.analyserW+x)*4, r=data[i],g=data[i+1],b=data[i+2]; let v=adjusted(r,g,b);
      if(ui.edges.checked || ["edge","edge-skeleton"].includes(mode)) { const right=x+1<state.analyserW?i+4:i, down=y+1<state.analyserH?i+state.analyserW*4:i; const edge=(Math.abs(data[i]-data[right])+Math.abs(data[i+1]-data[right+1])+Math.abs(data[i+2]-data[right+2])+Math.abs(data[i]-data[down])+Math.abs(data[i+1]-data[down+1])+Math.abs(data[i+2]-data[down+2]))/500; v=Math.max(v*.28,Math.min(1,edge*1.8)); }
      let shown=mode==="direct" || mode==="glyph-build" || mode==="coarse-mosaic" || mode==="iterative-draft" || revealFor(x,y,v,t,mode); if(!shown){if(liveLines)liveLine+=" ";continue;}
      const useTextFlow=ui.glyphSource.value==="text"&&ui.textLayout.value==="flow"&&v>=.07;
      let char=renderGlyph(v,x,y,t,mode,useTextFlow?textFlowIndex:null); if(useTextFlow)textFlowIndex++; if(mode==="terminal" && ui.glyphSource.value==="ramp" && t/Number(ui.duration.value)<seed(x,y)*.9) char=("01/\\|[]{}<>+-")[Math.floor(seed(y,x+12)*12)];
      const jitter=glitch>0&&seed(x,Math.floor(t*ui.fps.value))<glitch*.14 ? Math.round((seed(y,x)*2-1)*cell*2) : 0;
      if(liveLines)liveLine+=char; if(char!==" "){ visibleGlyphs++; if(v<.28)darkAdded++; if(v>.72)brightAdded++; }
      ctx.globalAlpha=ui.glyphSource.value==="text"?Math.max(.08,Math.pow(v,.72)):1; ctx.fillStyle=glyphColor(v,r,g,b); ctx.fillText(char,x*cell+jitter,y*cellH);
    } if(liveLines)liveLines.push(liveLine); }
    const cursor=draftCursor(t); if(liveLines&&cursor&&cursor.visible&&liveLines[cursor.y]){const chars=liveLines[cursor.y].split("");chars[cursor.x]="▌";liveLines[cursor.y]=chars.join("");}
    if(liveLines)updateLiveText(liveLines,w,h,cell,cellH); else updateLiveText([],w,h,cell,cellH);
    const addedGlyphs=Math.max(0,visibleGlyphs-state.lastVisibleGlyphs); tickBuild(addedGlyphs,wasPlaying,{progress:Math.min(1,t/Number(ui.duration.value)),darkMass:darkAdded>brightAdded*1.6,brightMass:brightAdded>darkAdded*1.6}); state.lastVisibleGlyphs=visibleGlyphs;
    ctx.globalAlpha=1;
    const scan=Number(ui.scanlines.value)/100; if(scan){ ctx.fillStyle=`rgba(0,0,0,${scan*.42})`; for(let y=0;y<h;y+=4)ctx.fillRect(0,y,w,1); }
    overlay(t,w,h,cell,cellH);
    drawDraftCursor(t,cell,cellH);
    drawBorder(w,h,t); drawPoster(w,h);
  }
  function load(file){
    if(!file) return; if(state.fileURL) URL.revokeObjectURL(state.fileURL); state.fileURL=URL.createObjectURL(file); state.imageReady=false;
    // Every new source begins as an inspectable still, regardless of any form
    // values the browser restored from a previous session.
    leaveTextCanvas(); ui.previewEngine.value="text";
    ui.mode.value="direct"; ui.effect.value="none"; ui.outputScale.value="100"; ui.aspectRatio.value="source"; ui.outputResolution.value="native"; fitViewport(false); updateReadouts(); state.playing=false; state.completed=false; state.pausedElapsed=0; state.lastRender=0; state.lastSoundStep=-1; state.lastVisibleGlyphs=0; state.generationTicks=0; state.firstTick=true; state.finalTick=false; $("play").textContent="PLAY"; stopResolveAudio();
    const isVideo=file.type.startsWith("video/") || /\.(mp4|webm|mov|mkv)$/i.test(file.name); const el=isVideo?document.createElement("video"):new Image();
    state.media=el; state.sourceKind=isVideo?"video":"image"; el.src=state.fileURL; status.textContent=`LOADING // ${file.name.toUpperCase()}`;
    const ready=()=>{ state.imageReady=true; empty.hidden=true; state.playing=false; state.completed=false; state.pausedElapsed=0; state.lastRender=0; state.lastSoundStep=-1; state.lastVisibleGlyphs=0; state.generationTicks=0; state.firstTick=true; state.finalTick=false; $("play").textContent="PLAY"; state.started=performance.now(); resetHistory(); status.textContent=`${isVideo?"VIDEO":"IMAGE"} // ${file.name.toUpperCase()}`; transport.textContent="STATIC PREVIEW — PICK A STYLE TO ANIMATE"; if(isVideo){el.loop=true;el.muted=true;el.pause();el.currentTime=0;} };
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
    set("effect","none"); set("glitch","0"); set("scanlines","0"); set("fps","30");
    const presets={
      direct:()=>set("mode","direct"),
      build:()=>set("mode","decode"),
      glyph:()=>{set("mode","glyph-build");set("fps","12");},
      sort:()=>{set("mode","pixel-sort");set("direction","random");set("glitch","14");},
      scan:()=>{set("mode","scanline");set("scanlines","38");},
      terminal:()=>{set("mode","terminal");set("scanlines","45");set("glitch","22");},
      rain:()=>{set("mode","terminal");set("colorMode","mono");set("foreground","#ef4035");markPaletteCustom();set("effect","rain");set("effectPower","65");set("glitch","35");set("scanlines","45");}
    };
    presets[name]?.(); state.started=performance.now(); state.playing=name!=="direct"; state.completed=false; state.pausedElapsed=0; state.lastRender=0; state.lastSoundStep=-1; state.lastVisibleGlyphs=0; state.generationTicks=0; state.firstTick=true; state.finalTick=false; $("play").textContent=state.playing?"PAUSE":"PLAY"; if(state.sourceKind==="video"){ if(state.playing)state.media.play().catch(()=>{}); else state.media.pause(); } syncResolveAudio(); updateReadouts(); transport.textContent=name==="direct"?"STATIC PREVIEW":"BUILDING — WILL HOLD ON FINAL FRAME"; commitHistory();
  }
  function restart(){ state.started=performance.now(); state.completed=false; state.pausedElapsed=0; state.lastRender=0; state.lastSoundStep=-1; state.lastVisibleGlyphs=0; state.generationTicks=0; state.firstTick=true; state.finalTick=false; $("play").textContent=state.playing?"PAUSE":"PLAY"; if(state.sourceKind==="video"&&state.media){state.media.currentTime=0;if(state.playing)state.media.play().catch(()=>{});} syncResolveAudio(); transport.textContent=state.playing?"RESTARTED — BUILDING":"RESTARTED — PRESS PLAY"; }
  function drawTextCanvasFrame(){
    const text=readTextCanvas(), lines=text.split("\n"), longest=Math.max(1,...lines.map(line=>line.length));
    const [w,h]=outputDimensions(), padding=Math.round(Math.min(w,h)*.055), maxLine=Math.max(1,w-padding*2), maxHeight=Math.max(1,h-padding*2);
    const fontSize=Math.max(4,Math.min(maxLine/(longest*.6),maxHeight/(Math.max(1,lines.length)*1.28)));
    if(out.width!==w||out.height!==h){out.width=w;out.height=h;$("dimension-readout").textContent=`${w} × ${h}`;}
    fillBackground(w,h); ctx.save();ctx.fillStyle=ui.foreground.value;ctx.font=`${fontSize}px "Courier New", Courier, monospace`;ctx.textBaseline="top";ctx.fontKerning="none";lines.forEach((line,index)=>ctx.fillText(line,padding,padding+index*fontSize*1.28));ctx.restore();
  }
  function snapshot(){ if(state.textMode) drawTextCanvasFrame(); const a=document.createElement("a");a.download="ascii-motion-frame.png";a.href=out.toDataURL("image/png");a.click(); }
  function currentAsciiText(){
    if(state.textMode) return readTextCanvas();
    if(!state.imageReady) return "";
    const t=state.completed?Number(ui.duration.value):state.playing?getTime():state.pausedElapsed, frame=sourceFrame(t); if(!frame) return "";
    const data=frame.data, mode=ui.mode.value, lines=[], requested=ui.asciiColumns.value==="source"?state.analyserW:Number(ui.asciiColumns.value), exportW=Math.max(1,requested), exportH=Math.max(1,Math.round(state.analyserH*exportW/state.analyserW)); let textFlowIndex=0;
    for(let y=0;y<exportH;y++){
      let line="";
      for(let x=0;x<exportW;x++){
        const sx=Math.min(state.analyserW-1,Math.floor(x/exportW*state.analyserW)), sy=Math.min(state.analyserH-1,Math.floor(y/exportH*state.analyserH)), i=(sy*state.analyserW+sx)*4, r=data[i],g=data[i+1],b=data[i+2]; let v=adjusted(r,g,b);
        if(ui.edges.checked || ["edge","edge-skeleton"].includes(mode)) { const right=sx+1<state.analyserW?i+4:i, down=sy+1<state.analyserH?i+state.analyserW*4:i; const edge=(Math.abs(data[i]-data[right])+Math.abs(data[i+1]-data[right+1])+Math.abs(data[i+2]-data[right+2])+Math.abs(data[i]-data[down])+Math.abs(data[i+1]-data[down+1])+Math.abs(data[i+2]-data[down+2]))/500; v=Math.max(v*.28,Math.min(1,edge*1.8)); }
        const shown=mode==="direct" || ["glyph-build","coarse-mosaic","iterative-draft"].includes(mode) || revealFor(sx,sy,v,t,mode); if(!shown){ line+=" "; continue; }
        const useTextFlow=ui.glyphSource.value==="text"&&ui.textLayout.value==="flow"&&v>=.07;
        line+=mode==="terminal"&&ui.glyphSource.value==="ramp"&&t/Number(ui.duration.value)<seed(sx,sy)*.9?("01/\\|[]{}<>+-")[Math.floor(seed(sy,sx+12)*12)]:renderGlyph(v,sx,sy,t,mode,useTextFlow?textFlowIndex:null); if(useTextFlow)textFlowIndex++;
      }
      lines.push(line.replace(/\s+$/,""));
    }
    if(!ui.asciiBorder.checked) return lines.join("\n");
    const width=Math.max(1,...lines.map(line=>line.length)), top=`+${"-".repeat(width)}+`, middle=lines.map(line=>`|${line.padEnd(width)}|`); return [top,...middle,top].join("\n");
  }
  function generateAscii(){ const text=currentAsciiText(); if(!text){ transport.textContent="ATTACH A SOURCE FIRST"; return; } $("ascii-export").value=text; transport.textContent=`TEXT FRAME GENERATED — ${text.length.toLocaleString()} CHARACTERS`; }
  async function copyAscii(){ const text=$("ascii-export").value||currentAsciiText(); if(!text){ transport.textContent="ATTACH A SOURCE FIRST"; return; } $("ascii-export").value=text; try{ await navigator.clipboard.writeText(text); transport.textContent="COPYABLE TEXT ART COPIED"; }catch{ const field=$("ascii-export"); field.focus(); field.select(); document.execCommand("copy"); transport.textContent="TEXT SELECTED / COPIED"; } }
  function downloadText(name,text,type="text/plain"){ if(!text){transport.textContent="GENERATE OR ATTACH A SOURCE FIRST";return;} const a=document.createElement("a");a.download=name;a.href=URL.createObjectURL(new Blob([text],{type}));a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000); }
  function downloadAscii(){ const text=$("ascii-export").value||currentAsciiText(); $("ascii-export").value=text; downloadText("glyphshift-frame.txt",text); }
  function downloadHTML(){ const text=$("ascii-export").value||currentAsciiText(); $("ascii-export").value=text; const escaped=text.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); downloadText("glyphshift-frame.html",`<!doctype html><meta charset="utf-8"><title>GLYPHSHIFT</title><style>body{margin:0;padding:2rem;background:${ui.background.value};color:${ui.foreground.value};font:12px/1 "Courier New",Courier,monospace;white-space:pre;font-kerning:none;font-variant-ligatures:none}</style><pre>${escaped}</pre>`,"text/html"); }
  function downloadMarkdown(){ const text=$("ascii-export").value||currentAsciiText(); $("ascii-export").value=text; downloadText("glyphshift-frame.md",`\`\`\`text\n${text}\n\`\`\``); }
  function downloadANSI(){ const text=$("ascii-export").value||currentAsciiText(); $("ascii-export").value=text; downloadText("glyphshift-frame-ansi.txt",`\u001b[38;2;245;245;245m${text}\u001b[0m`); }
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
    if(!state.imageReady || e.button!==0 || e.target.closest("button, select, input, textarea, label, [contenteditable='true']")) return;
    panStart={pointerX:e.clientX,pointerY:e.clientY,viewX:state.viewport.x,viewY:state.viewport.y}; drop.setPointerCapture?.(e.pointerId); drop.classList.add("panning"); e.preventDefault();
  });
  drop.addEventListener("pointermove",e=>{
    if(!panStart) return; state.viewport.x=panStart.viewX+(e.clientX-panStart.pointerX); state.viewport.y=panStart.viewY+(e.clientY-panStart.pointerY); applyViewport();
  });
  const finishPan=()=>{ if(!panStart) return; panStart=null; drop.classList.remove("panning"); commitHistory(); };
  drop.addEventListener("pointerup",finishPan); drop.addEventListener("pointercancel",finishPan);
  drop.addEventListener("wheel",e=>{
    if(!state.imageReady || e.target.closest("button, select, input, textarea, label, [contenteditable='true']")) return; e.preventDefault(); const before=state.viewport.zoom, factor=e.deltaY<0?1.12:1/1.12; state.viewport.zoom=Math.max(.25,Math.min(8,before*factor)); if(before===state.viewport.zoom) return; applyViewport(); clearTimeout(viewportCommitTimer); viewportCommitTimer=setTimeout(commitHistory,220);
  },{passive:false});
  $("apply-prompt").onclick=applyPrompt; $("restart").onclick=restart; $("snapshot").onclick=snapshot; $("record").onclick=record;
  $("generate-ascii").onclick=generateAscii; $("copy-ascii").onclick=copyAscii; $("download-ascii").onclick=downloadAscii; $("download-html").onclick=downloadHTML; $("download-md").onclick=downloadMarkdown; $("download-ansi").onclick=downloadANSI;
  document.querySelectorAll("[data-control-page]").forEach(button=>button.onclick=()=>setControlPage(button.dataset.controlPage));
  document.querySelectorAll("[data-preset]").forEach(button=>button.onclick=()=>applyPreset(button.dataset.preset));
  document.querySelectorAll("[data-prompt]").forEach(button=>button.onclick=()=>{ui.prompt.value=button.dataset.prompt;applyPrompt();});
  ui.charsetPreset.onchange=()=>applyCharacterLibrary(ui.charsetPreset.value);
  ui.charset.oninput=()=>{ui.charsetPreset.value="custom";};
  ui.palettePreset.onchange=()=>applyPalettePreset(ui.palettePreset.value);
  [ui.colorMode,ui.paletteSize,ui.backgroundStyle,ui.foreground,ui.palette2,ui.palette3,ui.palette4,ui.palette5,ui.background,ui.background2].forEach(control=>control.addEventListener("input",markPaletteCustom));
  [ui.size,ui.aspectRatio,ui.outputResolution,ui.customResolution,ui.outputScale].forEach(control=>control.addEventListener("input",()=>{ state.lastRender=0; }));
  ui.mode.onchange=()=>{ state.completed=false; state.pausedElapsed=0; state.lastRender=0; state.lastSoundStep=-1; state.lastVisibleGlyphs=0; state.generationTicks=0; state.firstTick=true; state.finalTick=false; if(ui.mode.value==="direct"){ state.playing=false; stopResolveAudio(); $("play").textContent="PLAY"; transport.textContent="STATIC PREVIEW"; } else transport.textContent="STYLE SET — PRESS PLAY"; };
  $("play").onclick=()=>{
    if(!isAnimated()){ state.playing=false; state.completed=false; state.pausedElapsed=0; $("play").textContent="PLAY"; stopResolveAudio(); transport.textContent="STATIC PREVIEW — CHOOSE A BUILD STYLE TO ANIMATE"; return; }
    if(state.completed){ state.completed=false; state.pausedElapsed=0; state.started=performance.now(); state.playing=true; state.lastRender=0; state.lastSoundStep=-1; state.lastVisibleGlyphs=0; state.generationTicks=0; state.firstTick=true; state.finalTick=false; }
    else if(state.playing){ state.pausedElapsed+=(performance.now()-state.started)/1000; state.playing=false; }
    else { state.started=performance.now(); state.playing=true; }
    $("play").textContent=state.playing?"PAUSE":"PLAY"; transport.textContent=state.playing?"BUILDING":"PAUSED";
    if(state.sourceKind==="video") state.playing?state.media.play():state.media.pause(); syncResolveAudio();
  };
  ui.resolveSound.onchange=()=>syncResolveAudio();
  ui.previewEngine.onchange=()=>{
    if(ui.previewEngine.value==="manual"){
      const rendered=state.imageReady?currentAsciiText():state.manualText;
      enterTextCanvas(rendered,true); return;
    }
    if(!state.imageReady){ ui.previewEngine.value="manual"; enterTextCanvas(state.manualText,true); return; }
    leaveTextCanvas(); state.lastRender=0;
  };
  liveText.addEventListener("input",()=>{
    if(!state.textMode) return;
    state.manualText=readTextCanvas(); $("ascii-export").value=""; transport.textContent=`TEXT CANVAS — ${state.manualText.length.toLocaleString()} CHARACTERS`;
  });
  ui.audioLevel.oninput=()=>{ if(state.playing&&ui.resolveSound.value==="algorithmic") syncResolveAudio(); };
  ui.duration.onchange=()=>{ if(state.playing)syncResolveAudio(); };
  const updateTextCount=()=>$("text-count").textContent=`${ui.customText.value.length.toLocaleString()} CHARACTERS`;
  ui.customText.oninput=()=>{
    updateTextCount(); state.lastRender=0;
    if(ui.customText.value.trim()){
      ui.glyphSource.value="text";
      transport.textContent="TEXT FOUNDATION ACTIVE — PASTED TEXT IS NOW THE GLYPH MATERIAL";
    }
  };
  $("import-text").onclick=()=>textFileInput.click();
  textFileInput.onchange=async e=>{ const files=[...e.target.files]; e.target.value=""; if(!files.length) return; try{ const docs=await Promise.all(files.map(file=>file.text())); ui.customText.value=docs.join("\n\n"); ui.glyphSource.value="text"; updateTextCount(); state.lastRender=0; commitHistory(); transport.textContent=`${files.length} TEXT ${files.length===1?"DOCUMENT":"DOCUMENTS"} IMPORTED — TEXT FOUNDATION ACTIVE`; }catch{ transport.textContent="TEXT IMPORT FAILED"; } };
  $("clear-text").onclick=()=>{ ui.customText.value=""; updateTextCount(); state.lastRender=0; commitHistory(); transport.textContent="TEXT CLEARED"; };
  $("clean-text").onclick=()=>{ const find=ui.findText.value; if(!find){transport.textContent="TYPE SOMETHING TO FIND";return;} ui.customText.value=ui.customText.value.split(find).join(ui.replaceText.value);updateTextCount();state.lastRender=0;commitHistory();transport.textContent="TEXT CLEANED"; };
  $("save-text-preset").onclick=()=>{ const preset={text:ui.customText.value,layout:ui.textLayout.value,blend:ui.textBlend.value,repeat:ui.textScale.value,once:ui.noTextRepeat.checked,locked:ui.lockSentence.checked,sentence:ui.lockedSentence.value,bold:ui.boldWords.value};try{localStorage.setItem("glyphshift-text-preset",JSON.stringify(preset));transport.textContent="TEXT PRESET SAVED IN THIS BROWSER";}catch{transport.textContent="TEXT PRESET COULD NOT SAVE";} };
  $("load-text-preset").onclick=()=>{ try{const preset=JSON.parse(localStorage.getItem("glyphshift-text-preset")||"null");if(!preset){transport.textContent="NO SAVED TEXT PRESET";return;}ui.customText.value=preset.text||"";if(ui.customText.value.trim())ui.glyphSource.value="text";ui.textLayout.value=preset.layout||"flow";ui.textBlend.value=preset.blend||"100";ui.textScale.value=preset.repeat||"1";ui.noTextRepeat.checked=!!preset.once;ui.lockSentence.checked=!!preset.locked;ui.lockedSentence.value=preset.sentence||"";ui.boldWords.value=preset.bold||"";updateTextCount();updateReadouts();state.lastRender=0;commitHistory();transport.textContent="TEXT PRESET LOADED — TEXT FOUNDATION ACTIVE";}catch{transport.textContent="TEXT PRESET COULD NOT LOAD";} };
  document.querySelectorAll("#controls input, #controls select, #controls textarea").forEach(control=>{ if(control.type!=="file") control.addEventListener("change",commitHistory); });
  window.addEventListener("keydown",e=>{
    if(e.target.matches("input, textarea, select, [contenteditable='true']")) return;
    if(e.code==="Space" && !e.target.matches("button")){ e.preventDefault(); $("play").click(); return; }
    if((e.ctrlKey||e.metaKey)&&!e.altKey&&e.key.toLowerCase()==="z"){ e.preventDefault(); e.shiftKey?redo():undo(); }
    if(e.altKey&&e.key==="ArrowLeft"){ e.preventDefault(); undo(); }
    if(e.altKey&&e.key==="ArrowRight"){ e.preventDefault(); redo(); }
  });
  $("toggle-ui").onclick=()=>{document.body.classList.toggle("ui-hidden");$("toggle-ui").textContent=document.body.classList.contains("ui-hidden")?"SHOW UI":"HIDE UI";};
  setControlPage("start"); updateTextCount(); enterTextCanvas("",false); resetHistory(); applyViewport(); render();
})();
