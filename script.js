
// HOOPS THROUGH IT! — A GAME BY TANIYA JAYLYN
// ENDLESS + TIME ATTACK + HIGH SCORES

const $ = id => document.getElementById(id);
const playBtn=$("playBtn"),howBtn=$("howBtn"),scoresBtn=$("scoresBtn"),menu=document.querySelector(".menu"),instructions=$("instructions"),backBtn=$("backBtn"),gameScreen=$("gameScreen"),gameBackBtn=$("gameBackBtn"),restartBtn=$("restartBtn"),modeScreen=$("modeScreen"),modeBackBtn=$("modeBackBtn"),modeCards=document.querySelectorAll(".mode-card"),canvas=$("gameCanvas"),ctx=canvas.getContext("2d");
const leaderboardScreen=$("leaderboardScreen"),leaderboardRows=$("leaderboardRows"),leaderboardBackBtn=$("leaderboardBackBtn"),nameScreen=$("nameScreen"),nameForm=$("nameForm"),playerName=$("playerName"),qualifyingScore=$("qualifyingScore"),skipNameBtn=$("skipNameBtn");

let selectedMode=null,gameRunning=false,gameOver=false,animationId=null;
let score=0,frame=0,obstacles=[],effects=[],particles=[],obstacleTimer=0;
let pendingScore=null,pendingMode="endless",leaderboardMode="endless";

let timeRemaining=60;
let lastFrameTime=0;
let collisionGraceUntil=0;
let swishStreak=0;
let fireCelebrationUntil=0;
let lastCountdownSecond=11;
let collisionFlashUntil=0;

const ball={x:100,y:250,radius:18,velocity:0,gravity:.28,jump:-5.7,rotation:0};
const obstacleWidth=54,obstacleGap=235,obstacleSpeed=2.,spacingFrames=145,SWISH_RANGE=27;

// SOUNDTRACK: MIDNIGHT HOUSE MIX

let audioContext=null,musicEnabled=true,sfxEnabled=true,musicPlaying=false;
let musicTimer=null,nextMusicTime=0,musicStep=0,musicBar=0;

function unlockAudio(){
  const A=window.AudioContext||window.webkitAudioContext;
  if(!A)return;
  try{
    if(!audioContext)audioContext=new A();
    if(audioContext.state==="suspended")audioContext.resume().catch(()=>{});
  }catch(e){console.warn("Audio unavailable",e)}
}

function playTone(frequency,duration,type="sine",volume=.1,delay=0,endingFrequency=null,isMusic=false){
  if(!audioContext||(isMusic?!musicEnabled:!sfxEnabled))return;
  const now=audioContext.currentTime+delay,osc=audioContext.createOscillator(),gain=audioContext.createGain();
  osc.type=type;
  osc.frequency.setValueAtTime(frequency,now);
  if(endingFrequency)osc.frequency.exponentialRampToValueAtTime(Math.max(1,endingFrequency),now+duration);
  gain.gain.setValueAtTime(.0001,now);
  gain.gain.exponentialRampToValueAtTime(Math.max(.0001,volume),now+.008);
  gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
  osc.connect(gain);gain.connect(audioContext.destination);
  osc.start(now);osc.stop(now+duration+.02);
}

function playNoise(duration,volume,delay=0,isMusic=false){
  if(!audioContext||(isMusic?!musicEnabled:!sfxEnabled))return;
  const length=Math.max(1,Math.floor(audioContext.sampleRate*duration));
  const buffer=audioContext.createBuffer(1,length,audioContext.sampleRate);
  const data=buffer.getChannelData(0);
  for(let i=0;i<length;i++)data[i]=Math.random()*2-1;
  const source=audioContext.createBufferSource(),filter=audioContext.createBiquadFilter(),gain=audioContext.createGain();
  const now=audioContext.currentTime+delay;
  source.buffer=buffer;filter.type="highpass";
  filter.frequency.value=isMusic?4500:1800;
  gain.gain.setValueAtTime(Math.max(.0001,volume),now);
  gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
  source.connect(filter);filter.connect(gain);gain.connect(audioContext.destination);
  source.start(now);source.stop(now+duration);
}

function soundBounce(){playTone(165,.11,"sine",.13,0,70);playTone(95,.08,"triangle",.06,0,55)}
function soundPoint(){playTone(660,.1,"sine",.09);playTone(880,.16,"sine",.08,.08)}
function soundSwish(){
  playNoise(.19,.085);
  playTone(659.25,.12,"triangle",.1);
  playTone(880,.13,"triangle",.1,.09);
  playTone(1174.66,.25,"sine",.12,.18);
  playTone(1567.98,.27,"sine",.065,.23);
}
function soundGameOver(){
  playTone(392,.17,"triangle",.1);
  playTone(311.13,.2,"triangle",.1,.14);
  playTone(196,.38,"sawtooth",.055,.3);
}

const BPM=112,musicStepDuration=60/BPM/4;
const bassPatterns=[
  [55,0,55,0,55,0,55,0,65.41,0,65.41,0,65.41,0,65.41,0],
  [73.42,0,73.42,0,73.42,0,73.42,0,65.41,0,65.41,0,65.41,0],
  [55,0,55,0,55,0,55,0,82.41,0,82.41,0,82.41,0,82.41,0],
  [73.42,0,73.42,0,73.42,0,73.42,0,65.41,0,65.41,0,55,0,55,0]
];
const melodyPatterns=[
  [0,0,440,0,0,0,523.25,0,0,0,392,0,0,0,0,0],
  [0,0,392,0,0,0,440,0,0,0,523.25,0,0,0,0,0],
  [0,0,0,0,440,0,0,0,0,0,523.25,0,0,0,392,0],
  [0,0,392,0,0,0,440,0,0,0,0,0,0,0,0,0]
];

function scheduleMusicStep(step,time){
  if(!audioContext||!musicEnabled)return;
  const delay=Math.max(0,time-audioContext.currentTime);
  if(step%4===0)playTone(120,.16,"sine",.095,delay,46,true);
  if(step===4||step===12)playNoise(.07,.018,delay,true);
  if(step%2===0)playNoise(.025,.005,delay,true);
  if(step%4===2)playNoise(.055,.006,delay,true);
  const bass=bassPatterns[musicBar][step];
  if(bass){
    playTone(bass,.19,"triangle",.046,delay,null,true);
    playTone(bass/2,.2,"sine",.055,delay,null,true);
  }
  const melody=melodyPatterns[musicBar][step];
  if(melody){
    playTone(melody,.18,"sine",.018,delay,null,true);
    playTone(melody/2,.21,"triangle",.012,delay,null,true);
  }
  if(step===0&&musicBar%2===0)playTone(220,.48,"sine",.012,delay,null,true);
}

function musicScheduler(){
  if(!musicPlaying||!musicEnabled||!audioContext)return;
  while(nextMusicTime<audioContext.currentTime+.15){
    scheduleMusicStep(musicStep,nextMusicTime);
    nextMusicTime+=musicStepDuration;
    musicStep++;
    if(musicStep>=16){musicStep=0;musicBar=(musicBar+1)%4}
  }
}

function startMusic(){
  if(!musicEnabled||!audioContext||musicPlaying)return;
  stopMusic();musicPlaying=true;musicStep=0;musicBar=0;
  nextMusicTime=audioContext.currentTime+.05;
  musicScheduler();musicTimer=setInterval(musicScheduler,60);
}
function stopMusic(){
  musicPlaying=false;
  if(musicTimer!==null){clearInterval(musicTimer);musicTimer=null}
}
function updateAudioButtons(){
  document.querySelectorAll('[data-audio="music"]').forEach(b=>{
    b.textContent=musicEnabled?"♫ MUSIC: ON":"♫ MUSIC: OFF";
    b.setAttribute("aria-pressed",String(musicEnabled));
  });
  document.querySelectorAll('[data-audio="sfx"]').forEach(b=>{
    b.textContent=sfxEnabled?"♪ SFX: ON":"♪ SFX: OFF";
    b.setAttribute("aria-pressed",String(sfxEnabled));
  });
}
document.querySelectorAll(".audio-toggle").forEach(b=>{
  b.addEventListener("click",()=>{
    unlockAudio();
    if(b.dataset.audio==="music"){
      musicEnabled=!musicEnabled;
      if(musicEnabled&&gameRunning)startMusic();
      else stopMusic();
    }else{
      sfxEnabled=!sfxEnabled;
      if(sfxEnabled)soundPoint();
    }
    updateAudioButtons();
  });
});
updateAudioButtons();

// TWO SEPARATE LEADERBOARDS

const LEADERBOARD_KEY="hoopsLeaderboardV1";
const TIMED_LEADERBOARD_KEY="hoopsTimedLeaderboardV1";

function getLeaderboard(mode="endless"){
  try{
    const key=mode==="timed"?TIMED_LEADERBOARD_KEY:LEADERBOARD_KEY;
    const data=JSON.parse(localStorage.getItem(key)||"[]");
    if(!Array.isArray(data))return [];
    return data.filter(e=>e&&typeof e.name==="string"&&Number.isFinite(e.score)&&e.score>=0)
      .sort((a,b)=>b.score-a.score).slice(0,10);
  }catch{return []}
}
function saveLeaderboard(rows,mode="endless"){
  try{
    localStorage.setItem(mode==="timed"?TIMED_LEADERBOARD_KEY:LEADERBOARD_KEY,JSON.stringify(rows));
  }catch{}
}
function bestScore(mode="endless"){
  const list=getLeaderboard(mode);
  let legacy=0;
  if(mode==="endless"){
    try{legacy=Number(localStorage.getItem("hoopsBest")||0)||0}catch{}
  }
  return Math.max(legacy,list.length?list[0].score:0);
}
function saveBest(value){
  try{localStorage.setItem("hoopsBest",String(value))}catch{}
}
function qualifies(value,mode="endless"){
  const rows=getLeaderboard(mode);
  return value>0&&(rows.length<10||value>rows[rows.length-1].score);
}
function addLeaderboardScore(name,value,mode="endless"){
  const rows=getLeaderboard(mode);
  rows.push({name:name.trim().slice(0,14).toUpperCase(),score:value});
  rows.sort((a,b)=>b.score-a.score);
  saveLeaderboard(rows.slice(0,10),mode);
}

// LEADERBOARD MODE BUTTONS

const leaderboardPanel=leaderboardRows.parentElement;
const leaderboardTabs=document.createElement("div");
leaderboardTabs.style.cssText="display:flex;gap:10px;justify-content:center;margin:10px auto 18px";
const leaderboardSubtitle=leaderboardScreen.querySelector(".tagline");

for(const mode of ["endless","timed"]){
  const button=document.createElement("button");
  button.type="button";
  button.dataset.leaderboardMode=mode;
  button.textContent=mode==="endless"?"∞ ENDLESS":"⏱ TIME ATTACK";
  button.style.cssText="font-size:18px;padding:8px 12px;margin:0;flex:1;max-width:170px";
  button.addEventListener("click",()=>{
    leaderboardMode=mode;
    renderLeaderboard();
  });
  leaderboardTabs.append(button);
}
leaderboardPanel.parentElement.insertBefore(leaderboardTabs,leaderboardPanel);

function renderLeaderboard(){
  leaderboardRows.replaceChildren();
  leaderboardSubtitle.textContent=(leaderboardMode==="timed"?"TIME ATTACK":"ENDLESS MODE")+" • TOP 10";

  leaderboardTabs.querySelectorAll("button").forEach(b=>{
    const active=b.dataset.leaderboardMode===leaderboardMode;
    b.style.borderColor=active?"#ff4bc1":"#52e8ff";
    b.style.color=active?"#ffb2e8":"#52e8ff";
    b.setAttribute("aria-pressed",String(active));
  });

  const rows=getLeaderboard(leaderboardMode);

  if(!rows.length){
    const empty=document.createElement("p");
    empty.className="leaderboard-empty";
    empty.textContent="NO SCORES YET — BE THE FIRST!";
    leaderboardRows.append(empty);
    return;
  }

  rows.forEach((entry,i)=>{
    const line=document.createElement("div");
    line.className="leaderboard-entry";
    const rank=document.createElement("span");
    const name=document.createElement("span");
    const points=document.createElement("span");

    rank.textContent=i===0?"🥇 1":i===1?"🥈 2":i===2?"🥉 3":String(i+1);
    name.textContent=entry.name;
    points.textContent=String(entry.score);
    line.append(rank,name,points);
    leaderboardRows.append(line);
  });
}
function openLeaderboard(){
  renderLeaderboard();
  menu.classList.add("hidden");
  gameScreen.classList.add("hidden");
  nameScreen.classList.add("hidden");
  leaderboardScreen.classList.remove("hidden");
}
function finishNameEntry(save){
  if(save&&pendingScore!==null){
    const name=playerName.value.trim();
    if(!name){playerName.focus();return}
    addLeaderboardScore(name,pendingScore,pendingMode);
  }
  pendingScore=null;
  nameScreen.classList.add("hidden");
  leaderboardMode=pendingMode;
  openLeaderboard();
}
nameForm.addEventListener("submit",e=>{
  e.preventDefault();
  finishNameEntry(true);
});
skipNameBtn.addEventListener("click",()=>finishNameEntry(false));
leaderboardBackBtn.addEventListener("click",()=>{
  leaderboardScreen.classList.add("hidden");
  menu.classList.remove("hidden");
});
scoresBtn.addEventListener("click",()=>{
  leaderboardMode="endless";
  openLeaderboard();
});

// MENU NAVIGATION

howBtn.addEventListener("click",()=>{
  menu.classList.add("hidden");
  instructions.classList.remove("hidden");
});
backBtn.addEventListener("click",()=>{
  instructions.classList.add("hidden");
  menu.classList.remove("hidden");
});
playBtn.addEventListener("click",()=>{
  unlockAudio();
  menu.classList.add("menu-exit");
  setTimeout(()=>{
    menu.classList.add("hidden");
    menu.classList.remove("menu-exit");
    modeScreen.classList.remove("hidden");
  },350);
});
modeBackBtn.addEventListener("click",()=>{
  modeScreen.classList.add("hidden");
  menu.classList.remove("hidden");
});
modeCards.forEach(card=>card.addEventListener("click",()=>{
  unlockAudio();
  selectedMode=card.dataset.mode;
  modeScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");

  const title=gameScreen.querySelector("h2");

  if(selectedMode==="endless"){
    title.textContent="ENDLESS MODE";
    startEndlessMode();
  }else if(selectedMode==="timed"){
    title.textContent="TIME ATTACK";
    startTimedMode();
  }else{
    title.textContent="CHALLENGE MODE";
    gameRunning=false;
    stopMusic();
    if(animationId!==null)cancelAnimationFrame(animationId);
    animationId=null;
    restartBtn.classList.add("hidden");
    restartBtn.style.removeProperty("display");
    drawCourt();
    ctx.save();
    ctx.textAlign="center";
    ctx.fillStyle="#ff77d9";
    ctx.shadowColor="#ff4bc1";
    ctx.shadowBlur=14;
    ctx.font="42px Bangers";
    ctx.fillText("COMING SOON!",canvas.width/2,canvas.height/2);
    ctx.restore();
  }
}));
gameBackBtn.addEventListener("click",()=>{
  gameRunning=false;
  stopMusic();
  if(animationId!==null)cancelAnimationFrame(animationId);
  animationId=null;
  gameScreen.classList.add("hidden");
  menu.classList.remove("hidden");
  selectedMode=null;
});

// APPROVED NEON CITY BACKGROUND

function drawCourt(){
  const w=canvas.width,h=canvas.height;
  ctx.save();

  const sky=ctx.createLinearGradient(0,0,0,h);
  sky.addColorStop(0,"#080c22");
  sky.addColorStop(.43,"#251044");
  sky.addColorStop(.78,"#451a59");
  sky.addColorStop(1,"#160d30");
  ctx.fillStyle=sky;
  ctx.fillRect(0,0,w,h);

  const cityGlow=ctx.createRadialGradient(220,295,20,220,295,260);
  cityGlow.addColorStop(0,"rgba(181,74,175,.22)");
  cityGlow.addColorStop(.55,"rgba(109,52,159,.09)");
  cityGlow.addColorStop(1,"rgba(109,52,159,0)");
  ctx.fillStyle=cityGlow;
  ctx.fillRect(0,40,w,350);

  const pinkGlow=ctx.createRadialGradient(312,86,4,312,86,145);
  pinkGlow.addColorStop(0,"rgba(255,130,219,.21)");
  pinkGlow.addColorStop(1,"rgba(255,130,219,0)");
  ctx.fillStyle=pinkGlow;
  ctx.fillRect(0,0,w,260);

  for(let i=0;i<35;i++){
    const x=(i*73+17)%w,y=(i*47+13)%225;
    ctx.fillStyle=i%3===0?"rgba(255,180,235,.65)":"rgba(190,214,255,.42)";
    const size=i%7===0?2:1;
    ctx.fillRect(x,y,size,size);
  }

  for(let i=0;i<20;i++){
    const x=i*24-10,height=42+((i*29+11)%65),top=319-height;
    ctx.fillStyle=i%2===0?"#211632":"#1b1530";
    ctx.fillRect(x,top,22,319-top);

    for(let wy=top+9;wy<316;wy+=13){
      for(let wx=x+5;wx<x+19;wx+=9){
        if((i+wx+wy)%4!==0){
          ctx.fillStyle="rgba(246,153,206,.13)";
          ctx.fillRect(wx,wy,2,3);
        }
      }
    }
  }

  for(let i=0;i<14;i++){
    const x=i*33-12,width=29+(i%3)*3;
    const height=65+((i*43+19)%103),top=333-height;
    const building=ctx.createLinearGradient(x,0,x+width,0);
    building.addColorStop(0,"#100e26");
    building.addColorStop(.65,"#1b1434");
    building.addColorStop(1,"#100d24");
    ctx.fillStyle=building;
    ctx.fillRect(x,top,width,height);
    ctx.fillStyle="rgba(6,7,23,.55)";
    ctx.fillRect(x+width-5,top,5,height);
    ctx.fillStyle="#29203f";
    ctx.fillRect(x-2,top-3,width+4,3);

    if(i%3===0){
      ctx.fillStyle="#171329";
      ctx.fillRect(x+8,top-9,11,6);
      ctx.strokeStyle="#4c365e";
      ctx.lineWidth=1;
      ctx.beginPath();
      ctx.moveTo(x+14,top-9);
      ctx.lineTo(x+14,top-17);
      ctx.stroke();
    }

    for(let wy=top+12;wy<324;wy+=15){
      for(let wx=x+6;wx<x+width-7;wx+=10){
        const pattern=(i*13+Math.floor(wy/15)*7+wx)%9;
        if(pattern<3)ctx.fillStyle="rgba(255,171,214,.48)";
        else if(pattern===4)ctx.fillStyle="rgba(255,209,142,.38)";
        else if(pattern===5)ctx.fillStyle="rgba(111,203,255,.27)";
        else ctx.fillStyle="rgba(48,39,81,.55)";
        ctx.fillRect(wx,wy,4,6);
        ctx.fillStyle="rgba(8,8,26,.5)";
        ctx.fillRect(wx+1.5,wy,1,6);
      }
    }
  }

  const haze=ctx.createLinearGradient(0,255,0,365);
  haze.addColorStop(0,"rgba(109,56,142,0)");
  haze.addColorStop(.7,"rgba(126,65,159,.1)");
  haze.addColorStop(1,"rgba(58,28,91,.16)");
  ctx.fillStyle=haze;
  ctx.fillRect(0,255,w,110);

  for(const [x,color] of [[20,"#3be7ff"],[380,"#ff4bc1"]]){
    const lamp=ctx.createRadialGradient(x,205,0,x,205,125);
    lamp.addColorStop(0,color==="#3be7ff"?"rgba(59,231,255,.24)":"rgba(255,75,193,.24)");
    lamp.addColorStop(1,"rgba(0,0,0,0)");
    ctx.fillStyle=lamp;
    ctx.fillRect(x-125,80,250,260);
    ctx.strokeStyle="rgba(170,160,210,.4)";
    ctx.lineWidth=3;
    ctx.beginPath();
    ctx.moveTo(x,210);
    ctx.lineTo(x,335);
    ctx.stroke();
    ctx.fillStyle=color;
    ctx.shadowColor=color;
    ctx.shadowBlur=16;
    ctx.fillRect(x-12,198,24,5);
    ctx.fillStyle="#fff";
    ctx.fillRect(x-8,199,16,2);
    ctx.shadowBlur=0;
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(0,286,w,92);
  ctx.clip();
  ctx.strokeStyle="rgba(144,148,208,.35)";
  ctx.lineWidth=.85;

  for(let x=-120;x<w+140;x+=17){
    ctx.beginPath();
    ctx.moveTo(x,286);
    ctx.lineTo(x+92,378);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x,378);
    ctx.lineTo(x+92,286);
    ctx.stroke();
  }

  ctx.strokeStyle="rgba(149,149,190,.5)";
  ctx.lineWidth=2.5;
  for(const x of [0,100,200,300,400]){
    ctx.beginPath();
    ctx.moveTo(x,285);
    ctx.lineTo(x,378);
    ctx.stroke();
  }
  ctx.restore();

  ctx.strokeStyle="rgba(255,90,206,.55)";
  ctx.lineWidth=2;
  ctx.beginPath();
  ctx.moveTo(0,287);
  ctx.lineTo(w,287);
  ctx.stroke();

  const floor=ctx.createLinearGradient(0,360,0,h);
  floor.addColorStop(0,"rgba(62,26,81,.8)");
  floor.addColorStop(1,"#160d2c");
  ctx.fillStyle=floor;
  ctx.fillRect(0,360,w,h-360);

  ctx.fillStyle="rgba(255,255,255,.025)";
  for(let i=0;i<110;i++){
    const x=(i*97+23)%w,y=365+((i*61+17)%185);
    ctx.fillRect(x,y,2,1);
  }

  ctx.strokeStyle="rgba(255,75,193,.68)";
  ctx.shadowColor="#ff4bc1";
  ctx.shadowBlur=9;
  ctx.lineWidth=2;
  ctx.beginPath();
  ctx.moveTo(0,380);
  ctx.lineTo(w,380);
  ctx.moveTo(0,510);
  ctx.lineTo(w,510);
  ctx.moveTo(200,360);
  ctx.lineTo(200,h);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(200,445,115,42,0,0,Math.PI*2);
  ctx.stroke();
  ctx.shadowBlur=0;

  const reflection=ctx.createRadialGradient(200,530,8,200,530,210);
  reflection.addColorStop(0,"rgba(255,75,193,.18)");
  reflection.addColorStop(1,"rgba(255,75,193,0)");
  ctx.fillStyle=reflection;
  ctx.fillRect(0,370,w,180);
  ctx.restore();
}

// HOOPS

function createObstacle(){
  const gapY=65+Math.random()*180;
  obstacles.push({x:canvas.width+10,gapY,passed:false,glow:0});
}

function drawGlossyRing(cx,cy,ry,glowAmount=0,frontOnly=false){
  ctx.save();
  const start=frontOnly?0:Math.PI;
  const end=frontOnly?Math.PI:Math.PI*2;
  function ring(){
    ctx.beginPath();
    ctx.ellipse(cx,cy,26,ry,0,start,end);
  }
  ctx.shadowColor="#ff4bc1";
  ctx.shadowBlur=glowAmount>0?23:12;
  ctx.lineWidth=9;
  ctx.strokeStyle="#612b89";
  ring();ctx.stroke();
  ctx.shadowBlur=0;
  ctx.lineWidth=6;
  ctx.strokeStyle=frontOnly?"#ff83d7":"#d448aa";
  ring();ctx.stroke();
  ctx.lineWidth=2;
  ctx.strokeStyle=frontOnly?"#ffe5f9":"#ffb2e8";
  ring();ctx.stroke();
  ctx.restore();
}

function drawObstacles(){
  for(const obstacle of obstacles){
    const x=obstacle.x,top=obstacle.gapY;
    const bottom=top+obstacleGap;
    const centerX=x+obstacleWidth/2;
    const centerY=top+obstacleGap/2;

    ctx.save();
    ctx.fillStyle="rgba(42,20,73,.7)";
    ctx.strokeStyle="#a95bfa";
    ctx.lineWidth=2;
    ctx.shadowColor="#a95bfa";
    ctx.shadowBlur=8;
    ctx.fillRect(x+12,0,obstacleWidth-24,top);
    ctx.strokeRect(x+12,0,obstacleWidth-24,top);
    ctx.fillRect(x+12,bottom,obstacleWidth-24,canvas.height-bottom);
    ctx.strokeRect(x+12,bottom,obstacleWidth-24,canvas.height-bottom);
    ctx.restore();

    drawGlossyRing(centerX,centerY,obstacleGap/2-9,obstacle.glow);

    ctx.save();
    const targetTop=centerY-SWISH_RANGE;
    const targetHeight=SWISH_RANGE*2;
    const gradient=ctx.createLinearGradient(centerX-24,centerY,centerX+24,centerY);
    gradient.addColorStop(0,"rgba(255,105,205,0)");
    gradient.addColorStop(.5,"rgba(255,105,205,.24)");
    gradient.addColorStop(1,"rgba(255,105,205,0)");
    ctx.fillStyle=gradient;
    ctx.beginPath();
    ctx.roundRect(centerX-24,targetTop,48,targetHeight,12);
    ctx.fill();

    ctx.strokeStyle="rgba(255,185,235,.75)";
    ctx.lineWidth=1.5;
    ctx.setLineDash([4,4]);
    ctx.beginPath();
    ctx.moveTo(centerX-20,targetTop);
    ctx.lineTo(centerX+20,targetTop);
    ctx.moveTo(centerX-20,targetTop+targetHeight);
    ctx.lineTo(centerX+20,targetTop+targetHeight);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle="#ffd2f1";
    ctx.lineWidth=2;
    ctx.shadowColor="#ff4bc1";
    ctx.shadowBlur=10;
    ctx.beginPath();
    ctx.moveTo(centerX-19,centerY);
    ctx.lineTo(centerX+19,centerY);
    ctx.stroke();
    ctx.restore();
  }
}

function drawRingFronts(){
  for(const obstacle of obstacles){
    drawGlossyRing(
      obstacle.x+obstacleWidth/2,
      obstacle.gapY+obstacleGap/2,
      obstacleGap/2-9,
      obstacle.glow,
      true
    );
  }
}

// BASKETBALL

function drawBall(){
  ctx.save();
  ctx.translate(ball.x,ball.y);
  ctx.rotate(ball.rotation);
  const r=ball.radius;
  const gradient=ctx.createRadialGradient(-r*.35,-r*.4,2,0,0,r);
  gradient.addColorStop(0,"#ffe1a0");
  gradient.addColorStop(.32,"#ffb04c");
  gradient.addColorStop(.7,"#f87a20");
  gradient.addColorStop(1,"#a83d12");
  ctx.shadowColor="#ff912e";
  ctx.shadowBlur=12;
  ctx.beginPath();
  ctx.arc(0,0,r,0,Math.PI*2);
  ctx.fillStyle=gradient;
  ctx.fill();
  ctx.shadowBlur=0;
  ctx.clip();
  ctx.strokeStyle="#55240f";
  ctx.lineWidth=2.3;
  ctx.lineCap="round";
  ctx.beginPath();
  ctx.moveTo(-r,0);
  ctx.lineTo(r,0);
  ctx.moveTo(0,-r);
  ctx.lineTo(0,r);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-r*.7,-r);
  ctx.bezierCurveTo(r*.25,-r*.4,r*.25,r*.4,-r*.7,r);
  ctx.moveTo(r*.7,-r);
  ctx.bezierCurveTo(-r*.25,-r*.4,-r*.25,r*.4,r*.7,r);
  ctx.stroke();
  ctx.strokeStyle="rgba(255,236,187,.4)";
  ctx.lineWidth=1;
  ctx.beginPath();
  ctx.arc(-3,-4,r*.72,Math.PI*1.12,Math.PI*1.65);
  ctx.stroke();
  ctx.restore();
}

function updateBall(){
  ball.velocity+=ball.gravity;
  ball.y+=ball.velocity;
  ball.rotation+=.045;
}
function jumpBall(){
  if(gameRunning){
    ball.velocity=ball.jump;
    soundBounce();
  }
}

// SCORING

function spawnSwishParticles(x,y){
  for(let i=0;i<12;i++){
    const angle=Math.PI*2*i/12;
    const speed=1.2+(i%4)*.5;
    particles.push({
      x,y,
      vx:Math.cos(angle)*speed,
      vy:Math.sin(angle)*speed-.5,
      life:32,maxLife:32,
      r:1.5+i%3,
      color:i%2?"#ff8bdc":"#fff1ae"
    });
  }
}

function updateObstacles(){
  obstacleTimer++;

  if(obstacleTimer>=spacingFrames){
    createObstacle();
    obstacleTimer=0;
  }

  for(const obstacle of obstacles){
    obstacle.x-=obstacleSpeed;
    if(obstacle.glow>0)obstacle.glow--;

    if(!obstacle.passed&&obstacle.x+obstacleWidth<ball.x){
      obstacle.passed=true;

      const centerY=obstacle.gapY+obstacleGap/2;
      const perfect=Math.abs(ball.y-centerY)<SWISH_RANGE;

      score+=perfect?3:1;
      obstacle.glow=20;

      effects.push({
        x:ball.x+40,
        y:ball.y-30,
        text:perfect?"SWISH! +3":"+1",
        life:55,
        perfect
      });

      if(perfect){
        spawnSwishParticles(ball.x+20,ball.y);
        soundSwish();

        if(selectedMode==="timed"){
          swishStreak++;

          if(swishStreak>=3&&swishStreak%3===0){
            fireCelebrationUntil=performance.now()+1600;

            effects.push({
              x:200,
              y:190,
              text:"ON FIRE!",
              life:95,
              perfect:true
            });

            for(let i=0;i<3;i++){
              spawnSwishParticles(
                ball.x+20+i*10,
                ball.y
              );
            }
          }
        }
      }else{
        soundPoint();
        if(selectedMode==="timed")swishStreak=0;
      }
    }
  }

  obstacles=obstacles.filter(
    obstacle=>obstacle.x+obstacleWidth>0
  );
}

// TIME ATTACK COLLISION PENALTY
// KEEP THE CURRENT COURSE

function handleCollision(hitObstacle=null){
  if(selectedMode!=="timed"){
    endGame();
    return;
  }

  const now=performance.now();
  if(now<collisionGraceUntil)return;

  timeRemaining=Math.max(0,timeRemaining-5);
  swishStreak=0;
  fireCelebrationUntil=0;

  effects.push({
    x:200,
    y:150,
    text:"-5 SECONDS!",
    life:65,
    perfect:true
  });

  soundGameOver();

  if(timeRemaining<=0){
    endGame();
    return;
  }

  if(hitObstacle){
    // Continue through the same course.
    ball.y=hitObstacle.gapY+obstacleGap/2;

    // No free points for a collision.
    hitObstacle.passed=true;
  }else{
    // Recover from floor or ceiling.
    ball.y=Math.max(
      ball.radius+24,
      Math.min(
        canvas.height-ball.radius-24,
        ball.y
      )
    );
  }

  ball.velocity=0;

  // 1.5 seconds of temporary protection.
  collisionGraceUntil=now+1500;
  collisionFlashUntil=now+1500;
}

function checkCollisions(){
  if(ball.y-ball.radius<=0||ball.y+ball.radius>=canvas.height){
    handleCollision();
    return;
  }

  for(const o of obstacles){
    const touching=
      ball.x+ball.radius>o.x&&
      ball.x-ball.radius<o.x+obstacleWidth;

    const outsideGap=
      ball.y-ball.radius<o.gapY||
      ball.y+ball.radius>o.gapY+obstacleGap;

    if(touching&&outsideGap){
      handleCollision(o);
      return;
    }
  }
}

// VISUAL EFFECTS

function drawEffects(){
  ctx.save();
  ctx.textAlign="center";
  ctx.font="26px Bangers";

  for(const e of effects){
    ctx.globalAlpha=Math.min(1,e.life/18);
    ctx.fillStyle=e.perfect?"#ff91e0":"#fff";
    ctx.shadowColor=e.perfect?"#ff4bc1":"#52e8ff";
    ctx.shadowBlur=12;
    ctx.fillText(e.text,e.x,e.y);
    e.y-=.7;
    e.life--;
  }
  ctx.restore();
  effects=effects.filter(e=>e.life>0);

  ctx.save();
  for(const p of particles){
    ctx.globalAlpha=p.life/p.maxLife;
    ctx.fillStyle=p.color;
    ctx.shadowColor=p.color;
    ctx.shadowBlur=8;
    ctx.beginPath();
    ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
    ctx.fill();
    p.x+=p.vx;
    p.y+=p.vy;
    p.vy+=.025;
    p.life--;
  }
  ctx.restore();
  particles=particles.filter(p=>p.life>0);
}

function drawScore(){
  ctx.save();
  ctx.fillStyle="rgba(10,13,35,.62)";
  ctx.strokeStyle="rgba(82,232,255,.6)";
  ctx.lineWidth=1.5;
  ctx.beginPath();
  ctx.roundRect(canvas.width/2-44,13,88,49,12);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle="#fff";
  ctx.shadowColor="#ff4bc1";
  ctx.shadowBlur=9;
  ctx.font="32px Bangers";
  ctx.textAlign="center";
  ctx.fillText(String(score),canvas.width/2,47);
  ctx.restore();
}

// TIME ATTACK CLOCK

function drawTimer(){
  if(selectedMode!=="timed")return;

  ctx.save();
  ctx.fillStyle="rgba(10,13,35,.8)";
  ctx.strokeStyle=timeRemaining<=10?"#ff658e":"#52e8ff";
  ctx.lineWidth=1.5;
  ctx.beginPath();
  ctx.roundRect(286,15,100,46,10);
  ctx.fill();
  ctx.stroke();
  ctx.textAlign="center";
  ctx.fillStyle=timeRemaining<=10?"#ff658e":"#fff";
  ctx.font="27px Bangers";
  ctx.fillText(Math.ceil(timeRemaining)+"s",336,46);
  ctx.restore();
}

// TIME ATTACK POLISH

function drawTimeAttackPolish(){
  if(selectedMode!=="timed")return;

  const now=performance.now();

  // Pink protective shield after collision.
  if(now<collisionFlashUntil){
    ctx.save();
    const pulse=Math.sin(now/90);
    ctx.strokeStyle="#ff8cdd";
    ctx.lineWidth=3;
    ctx.shadowColor="#ff4bc1";
    ctx.shadowBlur=18+Math.abs(pulse)*8;
    ctx.globalAlpha=.6+Math.abs(pulse)*.35;
    ctx.beginPath();
    ctx.arc(
      ball.x,
      ball.y,
      ball.radius+13,
      0,
      Math.PI*2
    );
    ctx.stroke();
    ctx.restore();
  }

  // SWISH streak celebration.
  if(now<fireCelebrationUntil){
    ctx.save();
    ctx.textAlign="center";
    ctx.font="28px Bangers";
    ctx.fillStyle="#ff91e0";
    ctx.shadowColor="#ff4bc1";
    ctx.shadowBlur=22;
    ctx.fillText(
      "SWISH STREAK!",
      canvas.width/2,
      105
    );
    ctx.restore();
  }

  // Dramatic last ten seconds.
  if(timeRemaining<=10){
    const pulse=(Math.sin(now/135)+1)/2;
    ctx.save();
    ctx.strokeStyle="#ff4bc1";
    ctx.lineWidth=7;
    ctx.globalAlpha=.2+pulse*.6;
    ctx.shadowColor="#ff4bc1";
    ctx.shadowBlur=20;
    ctx.strokeRect(
      5,
      5,
      canvas.width-10,
      canvas.height-10
    );
    ctx.restore();
  }
}

function updateCountdownSound(){
  if(selectedMode!=="timed")return;

  const seconds=Math.ceil(timeRemaining);

  if(
    seconds>0&&
    seconds<=10&&
    seconds!==lastCountdownSecond
  ){
    lastCountdownSecond=seconds;

    playTone(
      seconds<=3?880:620,
      seconds<=3?.16:.09,
      seconds<=3?"square":"sine",
      .045
    );
  }
}

// GAME LOOP

function gameLoop(timestamp){
  if(!gameRunning)return;

  if(selectedMode==="timed"){
    const now=typeof timestamp==="number"
      ?timestamp
      :performance.now();

    if(lastFrameTime){
      timeRemaining=Math.max(
        0,
        timeRemaining-
          Math.min((now-lastFrameTime)/1000,.25)
      );
    }

    lastFrameTime=now;
    updateCountdownSound();

    if(timeRemaining<=0){
      endGame();
      return;
    }
  }

  frame++;

  ctx.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  drawCourt();
  updateBall();
  updateObstacles();
  drawObstacles();
  drawBall();
  drawRingFronts();
  checkCollisions();

  if(!gameRunning)return;

  drawEffects();
  drawScore();
  drawTimer();
  drawTimeAttackPolish();

  animationId=requestAnimationFrame(gameLoop);
}

function startTimedMode(){
  if(animationId!==null)cancelAnimationFrame(animationId);
  animationId=null;
  restartBtn.style.removeProperty("display");
  restartBtn.classList.add("hidden");

  score=0;
  frame=0;
  obstacles=[];
  effects=[];
  particles=[];
  obstacleTimer=0;

  ball.x=100;
  ball.y=250;
  ball.velocity=0;
  ball.rotation=0;

  timeRemaining=60;
  lastFrameTime=0;
  collisionGraceUntil=0;
  collisionFlashUntil=0;
  swishStreak=0;
  fireCelebrationUntil=0;
  lastCountdownSecond=11;

  gameOver=false;
  gameRunning=true;

  unlockAudio();
  startMusic();
  gameLoop();
}

function startEndlessMode(){
  if(animationId!==null)cancelAnimationFrame(animationId);
  animationId=null;
  restartBtn.style.removeProperty("display");
  restartBtn.classList.add("hidden");

  score=0;
  frame=0;
  obstacles=[];
  effects=[];
  particles=[];
  obstacleTimer=0;

  ball.x=100;
  ball.y=250;
  ball.velocity=0;
  ball.rotation=0;

  gameOver=false;
  gameRunning=true;

  unlockAudio();
  startMusic();
  gameLoop();
}

// CONTROLS

document.addEventListener("keydown",event=>{
  if(event.code==="Space"&&gameRunning){
    event.preventDefault();
    if(!event.repeat){
      unlockAudio();
      jumpBall();
    }
  }
});

canvas.addEventListener("pointerdown",()=>{
  unlockAudio();
  jumpBall();
});

// GAME OVER

function endGame(){
  if(gameOver)return;

  gameOver=true;
  gameRunning=false;
  stopMusic();
  soundGameOver();

  const mode=selectedMode==="timed"?"timed":"endless";
  const newBest=score>bestScore(mode);

  if(newBest&&mode==="endless")saveBest(score);

  restartBtn.style.setProperty(
    "display",
    "block",
    "important"
  );
  restartBtn.classList.remove("hidden");

  ctx.save();

  ctx.fillStyle="rgba(8,9,30,.87)";
  ctx.fillRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  ctx.textAlign="center";
  ctx.shadowColor="#ff4bc1";
  ctx.shadowBlur=15;
  ctx.fillStyle="#ff69cc";
  ctx.font="52px Bangers";

  ctx.fillText(
    mode==="timed"?"TIME UP!":"GAME OVER!",
    canvas.width/2,
    208
  );

  ctx.shadowBlur=0;
  ctx.fillStyle="#fff";
  ctx.font="30px Bangers";

  ctx.fillText(
    `SCORE: ${score}`,
    canvas.width/2,
    260
  );

  ctx.fillStyle="#52e8ff";
  ctx.font="22px Bangers";

  ctx.fillText(
    newBest
      ?"NEW PERSONAL BEST!"
      :`PERSONAL BEST: ${bestScore(mode)}`,
    canvas.width/2,
    301
  );

  ctx.fillStyle="#ddd7f1";
  ctx.font="19px Rajdhani";

  ctx.fillText(
    "PRESS PLAY AGAIN TO RETRY",
    canvas.width/2,
    340
  );

  ctx.restore();

  if(qualifies(score,mode)){
    pendingMode=mode;
    pendingScore=score;
    qualifyingScore.textContent=`SCORE: ${score}`;
    playerName.value="";

    gameScreen.classList.add("hidden");
    nameScreen.classList.remove("hidden");
    playerName.focus();
  }
}

restartBtn.addEventListener("click",()=>{
  unlockAudio();

  if(selectedMode==="endless"){
    startEndlessMode();
  }else if(selectedMode==="timed"){
    startTimedMode();
  }
});

document.addEventListener("visibilitychange",()=>{
  if(document.hidden){
    stopMusic();
  }else if(
    gameRunning&&
    musicEnabled&&
    audioContext&&
    audioContext.state==="running"
  ){
    startMusic();
  }
});

/* ============================================
   HOOPS THROUGH IT! — TIME ATTACK 2.0
   Difficulty selection + progressive speed
   Shared leaderboard + SPEED UP animation
   ============================================ */

let attackDifficulty = "normal";
let attackSpeedStage = 0;
let attackSpeedBannerUntil = 0;


const attackSpeeds = {
  easy: 2.8,
  normal: 4.3,
  hard: 6.5,
  expert: 8.5
};

const attackDifficultyNames = {
  easy: "EASY",
  normal: "NORMAL",
  hard: "HARD",
  expert: "EXPERT"
};

// The speed increases as the timer runs down.
function getAttackSpeedStage() {
  if (timeRemaining > 40) return 0;
  if (timeRemaining > 20) return 1;
  if (timeRemaining > 10) return 2;
  return 3;
}

function getAttackSpeed() {
  if (selectedMode !== "timed") {
    return obstacleSpeed;
  }

  return (
    attackSpeeds[attackDifficulty] +
    getAttackSpeedStage() * 0.2
  );
}

// Create the difficulty selection screen.
const attackSelection = document.createElement("section");
attackSelection.className = "screen hidden";
attackSelection.id = "attackDifficultyScreen";

attackSelection.innerHTML = `
  <div class="screen-content">
    <h2>TIME ATTACK</h2>
    <p class="tagline">CHOOSE YOUR DIFFICULTY</p>

    <div id="attackDifficultyChoices"
         style="
           display:grid;
           grid-template-columns:repeat(2,minmax(0,1fr));
           gap:12px;
           max-width:460px;
           margin:24px auto;
         ">
    </div>

    <p class="tagline">
      60 SECONDS. SPEED INCREASES AS YOU PLAY!
    </p>

    <button id="attackDifficultyBack"
            type="button">
      BACK TO MODES
    </button>
  </div>
`;

document.body.appendChild(attackSelection);

const attackChoices = document.getElementById(
  "attackDifficultyChoices"
);

const attackDescriptions = {
  easy: "WARM UP",
  normal: "CLASSIC",
  hard: "FAST PACED",
  expert: "FULL SPEED"
};

Object.keys(attackSpeeds).forEach(difficulty => {
  const button = document.createElement("button");
  button.type = "button";

  button.style.cssText = `
    padding:18px 8px;
    margin:0;
    min-width:0;
    border:2px solid #ff4bc1;
    box-shadow:0 0 12px rgba(255,75,193,.35);
    cursor:pointer;
  `;

  button.innerHTML = `
    <span style="display:block;font-size:23px">
      ${attackDifficultyNames[difficulty]}
    </span>
    <span style="display:block;font-size:13px">
      ${attackDescriptions[difficulty]}
    </span>
  `;

  button.addEventListener("click", () => {
    attackDifficulty = difficulty;
    selectedMode = "timed";

    attackSelection.classList.add("hidden");
    modeScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");

    gameScreen.querySelector("h2").textContent =
      "TIME ATTACK — " +
      attackDifficultyNames[difficulty];

    unlockAudio();
    startTimedMode();
  });

  attackChoices.appendChild(button);
});

document.getElementById("attackDifficultyBack")
  .addEventListener("click", () => {
    attackSelection.classList.add("hidden");
    modeScreen.classList.remove("hidden");
  });

// Open difficulty selection BEFORE the old
// Time Attack click handler can start the game.
modeCards.forEach(card => {
  if (card.dataset.mode !== "timed") return;

  card.addEventListener("click", event => {
    event.stopImmediatePropagation();

    unlockAudio();
    modeScreen.classList.add("hidden");
    attackSelection.classList.remove("hidden");
  }, true);
});

// Keep the original obstacle logic, including
// scoring, SWISH bonuses, and particles.
// Adjust only the horizontal movement.
const originalAttackUpdateObstacles = updateObstacles;

updateObstacles = function() {
  originalAttackUpdateObstacles();

  if (selectedMode !== "timed") return;

  const additionalMovement =
    getAttackSpeed() - obstacleSpeed;

  for (const obstacle of obstacles) {
    obstacle.x -= additionalMovement;
  }
};

// Reset the speed stages for every new round.
const originalAttackStartTimedMode = startTimedMode;

startTimedMode = function() {
  attackSpeedStage = 0;
  attackSpeedBannerUntil = 0;

  originalAttackStartTimedMode();
};

// Keep the original collision shield,
// SWISH STREAK and final countdown effects.
const originalAttackPolish = drawTimeAttackPolish;

drawTimeAttackPolish = function() {
  originalAttackPolish();

  if (selectedMode !== "timed") return;

  const stage = getAttackSpeedStage();

  if (stage > attackSpeedStage) {
    attackSpeedStage = stage;
    attackSpeedBannerUntil = performance.now() + 1500;

    playTone(784, .12, "triangle", .07);
    playTone(1046, .2, "triangle", .07, .12);
  }

  if (performance.now() < attackSpeedBannerUntil) {
    ctx.save();

    ctx.textAlign = "center";
    ctx.font = "40px Bangers";
    ctx.fillStyle = "#ffb2e8";
    ctx.shadowColor = "#ff4bc1";
    ctx.shadowBlur = 25;

    ctx.fillText(
      "SPEED UP!",
      canvas.width / 2,
      canvas.height / 2 - 65
    );

    ctx.restore();
  }

  // Show the chosen difficulty during the round.
  ctx.save();

  ctx.textAlign = "left";
  ctx.font = "17px Bangers";
  ctx.fillStyle = "#ffb2e8";
  ctx.shadowColor = "#ff4bc1";
  ctx.shadowBlur = 8;

  ctx.fillText(
    attackDifficultyNames[attackDifficulty],
    14,
    35
  );

  ctx.restore();
};

// Save the difficulty alongside each new
// Time Attack score, using the SAME storage key.
const originalAttackAddScore = addLeaderboardScore;

addLeaderboardScore = function(
  name,
  value,
  mode = "endless"
) {
  if (mode !== "timed") {
    originalAttackAddScore(name, value, mode);
    return;
  }

  const rows = getLeaderboard("timed");

  rows.push({
    name: name.trim().slice(0, 14).toUpperCase(),
    score: value,
    difficulty: attackDifficulty
  });

  rows.sort((a, b) => b.score - a.score);

  saveLeaderboard(rows.slice(0, 10), "timed");
};

// Display difficulty labels without replacing
// the original leaderboard layout.
const originalAttackRenderLeaderboard =
  renderLeaderboard;

renderLeaderboard = function() {
  originalAttackRenderLeaderboard();

  if (leaderboardMode !== "timed") return;

  const scores = getLeaderboard("timed");
  const lines = leaderboardRows.querySelectorAll(
    ".leaderboard-entry"
  );

  lines.forEach((line, index) => {
    const entry = scores[index];
    if (!entry) return;

    const nameElement = line.children[1];
    if (!nameElement) return;

    const difficulty =
      attackDifficultyNames[entry.difficulty] ||
      "NORMAL";

    nameElement.textContent =
      entry.name + " • " + difficulty;
  });
};


/* ============================================
  
/* ==========================================
   HOOPS THROUGH IT! — CHALLENGE MODE 2.2
   50 LEVELS • TWO BOMBS • MOVING BOSS HOOPS
   A GAME BY TANIYA JAYLYN
   ========================================== */

const CHALLENGE_KEY = "hoopsChallengeProgressV2";

const challengeLevels = Array.from({ length: 50 }, (_, i) => {
  const number = i + 1;
  const world = Math.floor(i / 10);
  const boss = number % 10 === 0;

  return {
    number,
    boss,
    name: boss ? "BOSS BATTLE" :
      ["ROOKIE", "RISING STAR", "ALL-STAR",
       "SUPERSTAR", "LEGEND"][world],
    scoreTarget: 5 + i * 2,
    starTarget: 1 + Math.floor(i / 5),
    speed: 4 + i * 0.12 + (boss ? 1 : 0),
    moving: number >= 3,
    movementAmount: boss ? 65 :
      Math.min(42, 8 + world * 7),
    movementSpeed: boss ? 0.065 : 0.025
  };
});

let challengeUnlocked = 1;

try {
  const saved = Number(localStorage.getItem(CHALLENGE_KEY));
  if (Number.isInteger(saved)) {
    challengeUnlocked = Math.max(1, Math.min(51, saved));
  }

  const old = Number(
    localStorage.getItem("hoopsChallengeProgressV1")
  );

  if (Number.isInteger(old)) {
    challengeUnlocked = Math.max(
      challengeUnlocked,
      Math.min(11, Math.max(1, old))
    );
  }
} catch (error) {
  console.warn("Progress unavailable", error);
}

let challengeLevelIndex = 0;
let challengeStars = 0;
let challengeFrame = 0;
let challengeCompleted = false;
let challengeBombs = [];
let challengeBombTimer = 0;

// ==========================================
// LEVEL SELECTION
// ==========================================

const challengeSelectScreen = document.createElement("section");
challengeSelectScreen.id = "challengeSelectScreen";
challengeSelectScreen.className = "screen hidden";

challengeSelectScreen.innerHTML = `
  <div class="screen-content">
    <h2>CHALLENGE MODE</h2>
    <p class="tagline">50 LEVELS. 5 WORLDS. ONE LEGEND.</p>
    <p id="challengeProgressLabel" class="tagline"></p>

    <div id="challengeLevelGrid" style="
      display:grid;
      grid-template-columns:repeat(5,minmax(0,1fr));
      gap:8px;
      max-width:540px;
      max-height:340px;
      overflow-y:auto;
      padding:12px;
      margin:18px auto;
    "></div>

    <button id="challengeSelectBack" type="button">
      BACK TO MODES
    </button>
  </div>
`;

document.body.appendChild(challengeSelectScreen);

const challengeLevelGrid =
  document.getElementById("challengeLevelGrid");

function renderChallengeLevels() {
  challengeLevelGrid.replaceChildren();

  document.getElementById("challengeProgressLabel")
    .textContent =
    `${Math.min(50, challengeUnlocked - 1)} / 50 COMPLETED`;

  challengeLevels.forEach((level, index) => {
    const unlocked = level.number <= challengeUnlocked;
    const completed = level.number < challengeUnlocked;

    const button = document.createElement("button");
    button.type = "button";
    button.disabled = !unlocked;

    button.textContent = level.boss
      ? `👑 ${level.number}`
      : completed
        ? `★ ${level.number}`
        : unlocked
          ? `${level.number}`
          : `🔒 ${level.number}`;

    button.style.cssText = `
      margin:0;
      min-width:0;
      padding:12px 2px;
      font-size:18px;
      border:2px solid ${level.boss ? "#ffd166" : "#ff4bc1"};
      opacity:${unlocked ? 1 : 0.45};
      cursor:${unlocked ? "pointer" : "not-allowed"};
      box-shadow:${level.boss
        ? "0 0 12px rgba(255,209,102,.45)"
        : "0 0 8px rgba(255,75,193,.25)"};
    `;

    button.addEventListener("click", () => {
      startChallenge(index);
    });

    challengeLevelGrid.appendChild(button);
  });
}

function openChallengeSelect() {
  gameRunning = false;
  stopMusic();

  if (animationId !== null) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }

  gameScreen.classList.add("hidden");
  modeScreen.classList.add("hidden");
  challengeResults.classList.add("hidden");

  renderChallengeLevels();
  challengeSelectScreen.classList.remove("hidden");
}

document.getElementById("challengeSelectBack")
  .addEventListener("click", () => {
    challengeSelectScreen.classList.add("hidden");
    modeScreen.classList.remove("hidden");
    selectedMode = null;
  });

// Replace the original Challenge placeholder.
modeCards.forEach(card => {
  if (card.dataset.mode !== "challenge") return;

  card.addEventListener("click", event => {
    event.stopImmediatePropagation();
    unlockAudio();
    openChallengeSelect();
  }, true);
});

// ==========================================
// RESULTS SCREEN
// ==========================================

const challengeResults = document.createElement("section");
challengeResults.id = "challengeResults";
challengeResults.className = "screen hidden";

challengeResults.innerHTML = `
  <div class="screen-content">
    <h2 id="challengeResultTitle">LEVEL COMPLETE!</h2>
    <p id="challengeResultSubtitle" class="tagline"></p>

    <div style="
      border:2px solid #ff4bc1;
      border-radius:18px;
      padding:20px;
      margin:24px auto;
      max-width:340px;
      box-shadow:0 0 20px rgba(255,75,193,.3);
    ">
      <h3 id="challengeResultScore"></h3>
      <p id="challengeResultStars"></p>
    </div>

    <button id="challengeContinue">NEXT LEVEL</button>
    <button id="challengeRetry">RETRY</button>
    <button id="challengeChooseLevel">LEVEL SELECT</button>
  </div>
`;

document.body.appendChild(challengeResults);

// ==========================================
// START LEVEL
// ==========================================

function startChallenge(index) {
  if (index < 0 || index >= 50) return;
  if (index + 1 > challengeUnlocked) return;

  if (animationId !== null) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }

  selectedMode = "challenge";
  challengeLevelIndex = index;
  challengeStars = 0;
  challengeFrame = 0;
  challengeCompleted = false;
  challengeBombs = [];
  challengeBombTimer = 0;

  score = 0;
  frame = 0;
  obstacleTimer = 0;
  obstacles = [];
  effects = [];
  particles = [];

  ball.x = 100;
  ball.y = 250;
  ball.velocity = 0;
  ball.rotation = 0;

  gameOver = false;
  gameRunning = true;

  restartBtn.classList.add("hidden");
  restartBtn.style.removeProperty("display");

  challengeSelectScreen.classList.add("hidden");
  challengeResults.classList.add("hidden");
  gameScreen.classList.remove("hidden");

  const level = challengeLevels[index];

  gameScreen.querySelector("h2").textContent =
    level.boss
      ? `👑 BOSS LEVEL ${level.number}`
      : `CHALLENGE — LEVEL ${level.number}`;

  unlockAudio();
  startMusic();
  gameLoop();
}

// ==========================================
// MOVING HOOPS
// ==========================================

const challengeOriginalCreateObstacle = createObstacle;

createObstacle = function() {
  challengeOriginalCreateObstacle();

  if (selectedMode !== "challenge") return;

  const obstacle = obstacles[obstacles.length - 1];
  const level = challengeLevels[challengeLevelIndex];

  obstacle.challengeBaseY = obstacle.gapY;
  obstacle.challengePhase = Math.random() * Math.PI * 2;

  // EVERY boss hoop moves.
  obstacle.challengeMoving = level.moving &&
    (level.boss || Math.random() < 0.65);

  obstacle.challengeStar = Math.random() <
    (level.boss ? 0.85 : 0.7);

  obstacle.challengeStarCollected = false;
};

// ==========================================
// BOMBS
// ==========================================

function spawnChallengeBomb(xOffset = 0, avoidY = null) {
  const level = challengeLevels[challengeLevelIndex];
  const radius = level.boss ? 17 : 14;

  let y = 80 + Math.random() * (canvas.height - 160);

  // Keep the pair at different heights.
  if (avoidY !== null && Math.abs(y - avoidY) < 110) {
    y = avoidY < canvas.height / 2
      ? Math.min(canvas.height - 50, avoidY + 140)
      : Math.max(50, avoidY - 140);
  }

  const bomb = {
    x: canvas.width + 35 + xOffset,
    y,
    radius,
    phase: Math.random() * Math.PI * 2
  };

  challengeBombs.push(bomb);
  return bomb;
}

function drawChallengeBomb(bomb) {
  const pulse = Math.sin(challengeFrame * 0.12) * 4;

  ctx.save();
  ctx.translate(bomb.x, bomb.y);

  ctx.shadowColor = "#ff2d8d";
  ctx.shadowBlur = 20 + pulse;

  const gradient = ctx.createRadialGradient(
    -5, -6, 2, 0, 0, bomb.radius
  );

  gradient.addColorStop(0, "#ff91cf");
  gradient.addColorStop(0.35, "#ff337e");
  gradient.addColorStop(1, "#4a103c");

  ctx.fillStyle = gradient;
  ctx.strokeStyle = "#ffb4e2";
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.arc(0, 0, bomb.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Fuse
  ctx.strokeStyle = "#ffe58f";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -bomb.radius);
  ctx.quadraticCurveTo(
    7, -bomb.radius - 10,
    12, -bomb.radius - 6
  );
  ctx.stroke();

  // Spark
  ctx.fillStyle = "#fff4b5";
  ctx.shadowColor = "#ffd166";
  ctx.shadowBlur = 15;

  ctx.beginPath();
  ctx.arc(12, -bomb.radius - 6, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = "#fff";
  ctx.font = "bold 17px Rajdhani";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("!", 0, 1);

  ctx.restore();
}

function explodeChallengeBomb(bomb) {
  for (let i = 0; i < 5; i++) {
    spawnSwishParticles(
      bomb.x + Math.random() * 12 - 6,
      bomb.y + Math.random() * 12 - 6
    );
  }

  playNoise(0.25, 0.12);
  playTone(100, 0.35, "sawtooth", 0.12, 0, 45);
}

function updateChallengeBombs() {
  if (selectedMode !== "challenge" || !gameRunning) return;

  const level = challengeLevels[challengeLevelIndex];

  challengeBombTimer++;

  const spawnInterval = Math.max(
    65,
    180 - challengeLevelIndex * 2
  );

  if (challengeBombTimer >= spawnInterval) {
    challengeBombTimer = 0;

    // Two bombs per wave, staggered horizontally.
    const first = spawnChallengeBomb();
    spawnChallengeBomb(85, first.y);
  }

  for (const bomb of challengeBombs) {
    bomb.x -= level.speed * 0.9;

    bomb.y += Math.sin(
      challengeFrame * 0.045 + bomb.phase
    ) * 0.65;

    const distance = Math.hypot(
      ball.x - bomb.x,
      ball.y - bomb.y
    );

    if (distance < ball.radius + bomb.radius - 4) {
      explodeChallengeBomb(bomb);
      finishChallenge(false);
      return;
    }
  }

  challengeBombs = challengeBombs.filter(
    bomb => bomb.x + bomb.radius > -20
  );
}

// ==========================================
// CHALLENGE UPDATE
// ==========================================

const challengeOriginalUpdate = updateObstacles;

updateObstacles = function() {
  if (selectedMode !== "challenge") {
    challengeOriginalUpdate();
    return;
  }

  const level = challengeLevels[challengeLevelIndex];
  challengeFrame++;

  // Faster, wider movement during boss levels.
  for (const obstacle of obstacles) {
    if (!obstacle.challengeMoving) continue;

    const offset = Math.sin(
      challengeFrame * level.movementSpeed +
      obstacle.challengePhase
    ) * level.movementAmount;

    obstacle.gapY = Math.max(
      25,
      Math.min(
        canvas.height - obstacleGap - 25,
        obstacle.challengeBaseY + offset
      )
    );
  }

  // Keep original SWISH and scoring mechanics.
  challengeOriginalUpdate();

  if (!gameRunning) return;

  const extraSpeed = level.speed - obstacleSpeed;

  for (const obstacle of obstacles) {
    obstacle.x -= extraSpeed;

    if (
      obstacle.challengeStar &&
      !obstacle.challengeStarCollected
    ) {
      const starX = obstacle.x + obstacleWidth / 2;
      const starY = obstacle.gapY + obstacleGap / 2;

      if (
        Math.hypot(ball.x - starX, ball.y - starY) <
        ball.radius + 16
      ) {
        obstacle.challengeStarCollected = true;
        challengeStars++;
        score += 2;

        soundPoint();
        spawnSwishParticles(starX, starY);

        effects.push({
          x: ball.x + 30,
          y: ball.y - 35,
          text: "STAR! +2",
          life: 55,
          perfect: true
        });
      }
    }
  }

  // Spawn, move, and check both bombs.
  updateChallengeBombs();

  if (!gameRunning) return;

  if (
    score >= level.scoreTarget &&
    challengeStars >= level.starTarget
  ) {
    finishChallenge(true);
  }
};

// ==========================================
// DRAW STARS AND BOMBS
// ==========================================

const challengeOriginalDrawObstacles = drawObstacles;

drawObstacles = function() {
  challengeOriginalDrawObstacles();

  if (selectedMode !== "challenge") return;

  for (const obstacle of obstacles) {
    if (
      !obstacle.challengeStar ||
      obstacle.challengeStarCollected
    ) continue;

    const x = obstacle.x + obstacleWidth / 2;
    const y = obstacle.gapY + obstacleGap / 2;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(challengeFrame * 0.025);

    ctx.shadowColor = "#ffd166";
    ctx.shadowBlur = 22;
    ctx.fillStyle = "#ffe58f";
    ctx.strokeStyle = "#fff6cb";
    ctx.lineWidth = 2;

    ctx.beginPath();

    for (let i = 0; i < 10; i++) {
      const angle = -Math.PI / 2 + i * Math.PI / 5;
      const radius = i % 2 === 0 ? 14 : 6;

      const sx = Math.cos(angle) * radius;
      const sy = Math.sin(angle) * radius;

      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }

    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  for (const bomb of challengeBombs) {
    drawChallengeBomb(bomb);
  }
};

// ==========================================
// ONE-HIT GAME OVER
// ==========================================

const challengeOriginalCollision = handleCollision;

handleCollision = function(hitObstacle = null) {
  if (selectedMode === "challenge") {
    if (gameRunning && !challengeCompleted) {
      finishChallenge(false);
    }
    return;
  }

  // Preserve Endless and Time Attack collisions.
  challengeOriginalCollision(hitObstacle);
};

// ==========================================
// CHALLENGE HUD
// ==========================================

const challengeOriginalDrawScore = drawScore;

drawScore = function() {
  challengeOriginalDrawScore();

  if (selectedMode !== "challenge") return;

  const level = challengeLevels[challengeLevelIndex];

  ctx.save();
  ctx.textAlign = "left";
  ctx.font = "17px Bangers";
  ctx.shadowBlur = 9;

  ctx.fillStyle = "#ffb2e8";
  ctx.shadowColor = "#ff4bc1";

  ctx.fillText(`LEVEL ${level.number}`, 12, 28);
  ctx.fillText(
    `GOAL: ${score}/${level.scoreTarget}`,
    12, 51
  );

  ctx.fillStyle = "#ffe58f";
  ctx.shadowColor = "#ffd166";

  ctx.fillText(
    `★ ${challengeStars}/${level.starTarget}`,
    12, 74
  );

  if (level.boss) {
    ctx.textAlign = "center";
    ctx.font = "23px Bangers";
    ctx.fillStyle = "#ffd166";
    ctx.shadowBlur = 16;

    ctx.fillText(
      "BOSS BATTLE!",
      canvas.width / 2,
      98
    );
  }

  ctx.restore();
};

// ==========================================
// LEVEL COMPLETION AND SAVED PROGRESS
// ==========================================

function finishChallenge(won) {
  if (challengeCompleted) return;

  challengeCompleted = true;
  gameRunning = false;
  gameOver = true;

  stopMusic();

  if (animationId !== null) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }

  const level = challengeLevels[challengeLevelIndex];

  if (won) {
    challengeUnlocked = Math.max(
      challengeUnlocked,
      Math.min(51, level.number + 1)
    );

    try {
      localStorage.setItem(
        CHALLENGE_KEY,
        String(challengeUnlocked)
      );
    } catch (error) {
      console.warn("Could not save progress", error);
    }

    soundSwish();
  } else {
    soundGameOver();
  }

  const title =
    document.getElementById("challengeResultTitle");

  const subtitle =
    document.getElementById("challengeResultSubtitle");

  title.textContent = won
    ? level.number === 50
      ? "YOU ARE A LEGEND!"
      : level.boss
        ? "BOSS DEFEATED!"
        : "LEVEL COMPLETE!"
    : "TRY AGAIN!";

  subtitle.textContent = won
    ? level.number === 50
      ? "ALL 50 LEVELS COMPLETE!"
      : level.boss
        ? "A NEW WORLD AWAITS!"
        : "NEXT LEVEL UNLOCKED!"
    : "YOU'VE GOT THIS!";

  document.getElementById("challengeResultScore")
    .textContent =
    `SCORE: ${score} / ${level.scoreTarget}`;

  document.getElementById("challengeResultStars")
    .textContent =
    `STARS: ${challengeStars} / ${level.starTarget}`;

  const continueButton =
    document.getElementById("challengeContinue");

  continueButton.style.display =
    won && level.number < 50 ? "" : "none";

  continueButton.onclick = () => {
    startChallenge(challengeLevelIndex + 1);
  };

  gameScreen.classList.add("hidden");
  challengeResults.classList.remove("hidden");
}

document.getElementById("challengeRetry")
  .addEventListener("click", () => {
    startChallenge(challengeLevelIndex);
  });

document.getElementById("challengeChooseLevel")
  .addEventListener("click", openChallengeSelect);

restartBtn.addEventListener("click", () => {
  if (selectedMode === "challenge") {
    startChallenge(challengeLevelIndex);
  }
});

/* END OF CHALLENGE MODE 2.2 */

/* =====================================================
   GLOBAL LEADERBOARD (Supabase)
   ===================================================== */

const HOOPS_SUPABASE_URL =
  "https://wioxbnlevrxlqrhvtcog.supabase.co";

const HOOPS_SUPABASE_KEY =
  "sb_publishable_Q0mGD-JaXmcNsjjI2-pEbw_CRclfmoG";

let hoopsLeaderboardScope = "local";
let hoopsGlobalRequest = 0;

async function hoopsSupabaseRequest(path, options = {}) {
  const response = await fetch(
    HOOPS_SUPABASE_URL + "/rest/v1/" + path,
    {
      ...options,
      headers: {
        apikey: HOOPS_SUPABASE_KEY,
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    }
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      "Supabase " + response.status + ": " +
      detail.slice(0, 200)
    );
  }

  return response.status === 204
    ? null
    : response.json();
}

async function hoopsUploadScore(name, value, mode) {
  const cleanName = String(name)
    .trim()
    .slice(0, 14)
    .toUpperCase();

  const cleanScore = Number(value);

  if (
    !cleanName ||
    !["endless", "timed"].includes(mode) ||
    !Number.isSafeInteger(cleanScore) ||
    cleanScore < 1 ||
    cleanScore > 1000000
  ) {
    return;
  }

  await hoopsSupabaseRequest("leaderboard_scores", {
    method: "POST",
    headers: {
      Prefer: "return=minimal"
    },
    body: JSON.stringify({
      player_name: cleanName,
      game_mode: mode,
      score: cleanScore
    })
  });
}

/* Keep the original local leaderboard */

const hoopsLocalAddScore = addLeaderboardScore;

addLeaderboardScore = function (
  name,
  value,
  mode = "endless"
) {
  hoopsLocalAddScore(name, value, mode);

  hoopsUploadScore(name, value, mode).catch(error => {
    console.warn(
      "Global score not uploaded; local score is safe:",
      error
    );

    if (hoopsLeaderboardScope === "global") {
      hoopsShowGlobalError(
        "Score saved locally, but global upload failed."
      );
    }
  });
};

/* Create LOCAL and GLOBAL buttons */

const hoopsScopeButtons =
  document.createElement("div");

hoopsScopeButtons.style.cssText =
  "display:flex;justify-content:center;gap:10px;margin:8px auto 12px";

const hoopsScopeLocal =
  document.createElement("button");

const hoopsScopeGlobal =
  document.createElement("button");

for (const [button, scope, label] of [
  [hoopsScopeLocal, "local", "📱 LOCAL"],
  [hoopsScopeGlobal, "global", "🌎 GLOBAL"]
]) {
  button.type = "button";
  button.textContent = label;

  button.style.cssText =
    "font-size:16px;padding:8px 12px;margin:0;flex:1;max-width:170px";

  button.addEventListener("click", () => {
    hoopsLeaderboardScope = scope;
    renderLeaderboard();
  });

  hoopsScopeButtons.append(button);
}

leaderboardTabs.insertAdjacentElement(
  "afterend",
  hoopsScopeButtons
);

/* Show leaderboard messages */

function hoopsShowGlobalError(message) {
  leaderboardRows.replaceChildren();

  const status = document.createElement("p");
  status.className = "leaderboard-empty";
  status.textContent = message;

  leaderboardRows.append(status);
}

/* Retrieve worldwide rankings */

async function hoopsRenderGlobalLeaderboard(
  requestId,
  mode
) {
  try {
    const query =
      "leaderboard_scores?select=player_name,score" +
      "&game_mode=eq." + encodeURIComponent(mode) +
      "&order=score.desc,created_at.asc&limit=10";

    const rows = await hoopsSupabaseRequest(query);

    if (
      requestId !== hoopsGlobalRequest ||
      hoopsLeaderboardScope !== "global" ||
      leaderboardMode !== mode
    ) {
      return;
    }

    leaderboardRows.replaceChildren();

    if (!rows.length) {
      hoopsShowGlobalError(
        "NO GLOBAL SCORES YET — BE THE FIRST!"
      );
      return;
    }

    rows.forEach((entry, i) => {
      const line = document.createElement("div");
      line.className = "leaderboard-entry";

      const rank = document.createElement("span");
      const name = document.createElement("span");
      const points = document.createElement("span");

      rank.textContent =
        i === 0 ? "🥇 1" :
        i === 1 ? "🥈 2" :
        i === 2 ? "🥉 3" :
        String(i + 1);

      name.textContent = entry.player_name;
      points.textContent = String(entry.score);

      line.append(rank, name, points);
      leaderboardRows.append(line);
    });

  } catch (error) {
    console.warn(
      "Global leaderboard unavailable:",
      error
    );

    if (
      requestId === hoopsGlobalRequest &&
      hoopsLeaderboardScope === "global"
    ) {
      hoopsShowGlobalError(
        "GLOBAL RANKINGS UNAVAILABLE — TRY AGAIN LATER"
      );
    }
  }
}

/* Switch between local and global rankings */

const hoopsLocalRenderLeaderboard =
  renderLeaderboard;

renderLeaderboard = function () {
  const requestId = ++hoopsGlobalRequest;

  hoopsScopeLocal.style.borderColor =
    hoopsLeaderboardScope === "local"
      ? "#ff4bc1"
      : "#52e8ff";

  hoopsScopeGlobal.style.borderColor =
    hoopsLeaderboardScope === "global"
      ? "#ff4bc1"
      : "#52e8ff";

  hoopsLocalRenderLeaderboard();

  if (hoopsLeaderboardScope !== "global") {
    return;
  }

  leaderboardSubtitle.textContent =
    (leaderboardMode === "timed"
      ? "TIME ATTACK"
      : "ENDLESS MODE") +
    " • GLOBAL TOP 10";

  hoopsShowGlobalError(
    "LOADING GLOBAL RANKINGS..."
  );

  hoopsRenderGlobalLeaderboard(
    requestId,
    leaderboardMode
  );
};
