const heroFiles={'🐰':'bunny','🐼':'panda','🦊':'fox','🦖':'dino','🐱':'cat','🐶':'puppy','🐻':'bear','🐨':'koala','🐸':'frog','🐯':'tiger','🦁':'lion','🐵':'monkey','🐧':'penguin','🐘':'elephant','🦄':'unicorn','🐮':'cow','🐷':'pig','🐙':'octopus','🐢':'turtle','🐝':'bee'};function heroImg(emoji,cls=''){const name=heroFiles[emoji]||'bunny';return `<img class="hero-art ${cls}" src="/hero-${name}.png" alt="${name}" draggable="false">`;}
import './style.css';
import {initializeApp} from 'firebase/app';
import {getDatabase,ref,set,onValue,runTransaction,get} from 'firebase/database';
import {getAuth,signInAnonymously} from 'firebase/auth';
const slides={99:80,95:66,92:73,89:70,83:58,74:53,64:44,62:41,49:31,46:25,39:19,35:24,27:5,17:4};
const ladders={2:20,8:30,16:37,21:42,28:48,33:52,45:56,59:81,68:87,76:97};
const colors=['#f87171','#60a5fa','#fbbf24','#34d399'];let adventure={goal:100,variant:'classic',avatars:['🐰','🐼','🦊','🦖'],stars:[0,0,0,0],shields:[0,0,0,0],bonusSquares:new Set([7,14,23,32,41,50,61,72,84,93]),lastEvent:'',history:[],used:Array.from({length:4},()=>({shield:0,rocket:0})),cards:Array.from({length:4},()=>({shield:0,rocket:0})),cardSquares:new Set([7,14,23,32,41,50,61,72,84,93]),claimed:Array.from({length:4},()=>new Set())};let state={mode:'local',players:[],turn:0,rolling:false,finished:false,muted:false,room:null,uid:crypto.randomUUID(),db:null,unsubscribe:null};
const WORLDS={
 rainbow:{name:'Rainbow Land',icon:'🌈',description:'🌈 အရောင်စုံကမ္ဘာမှာ ပျော်ပျော်ကစားမယ်!',palette:['#fff5dc','#eaf4fa','#eaf6e8','#fff0ed','#f3effb'],decor:['✨','🌈','⭐','☁️'],rope:['#e879a5','#8b78d6','#27a6b2','#e5a04b','#5aaf80','#dc7c71','#638bd4'],ladder:'#a46a39'},
 candy:{name:'Candy World',icon:'🍭',description:'🍬 သကြားလုံးကမ္ဘာထဲမှာ ရတနာတွေ ရှာကြမယ်!',palette:['#ffe8f3','#fff2ce','#e7f9f5','#f0e9ff','#ffecdf'],decor:['🍬','🍭','🧁','🍩'],rope:['#f18fb4','#b58be8','#f5aa67','#6ecab8'],ladder:'#bd789a'},
 jungle:{name:'Jungle Adventure',icon:'🌿',description:'🦋 တောအုပ်စိမ်းစိမ်းထဲမှာ စွန့်စားကြမယ်!',palette:['#e4f5d9','#f3f8df','#e0f3eb','#f9f0d8','#e7f5e6'],decor:['🌺','🦋','🍃','🌼'],rope:['#48a88a','#e6a35b','#73b3a3','#bb8fc9'],ladder:'#8e784b'},
 space:{name:'Space World',icon:'🚀',description:'🪐 ကြယ်တွေကြားမှာ အာကာသခရီးထွက်ကြမယ်!',palette:['#e5eaff','#e8e2ff','#e2f2ff','#f1e8ff','#e7efff'],decor:['⭐','🪐','✨','🌙'],rope:['#7b9cef','#bd8be9','#6ac6d6','#f0a6d6'],ladder:'#7d83bc'}
};
let currentWorld='rainbow';
function setWorld(key){if(!WORLDS[key])return;currentWorld=key;document.documentElement.dataset.world=key;$('world').value=key;$('worldDescription').textContent=WORLDS[key].description;try{localStorage.setItem('rainbow-world',key)}catch{}board();sound('reward');showToast(`🌍 ${WORLDS[key].name} သို့ ပြောင်းလိုက်ပါပြီ!`);}
function renderWorldDecor(){const el=$('worldDecor');if(!el)return;const symbols=WORLDS[currentWorld].decor;el.innerHTML=Array.from({length:9},(_,i)=>`<span style="--x:${(i*37+13)%91+4}%;--y:${(i*23+17)%83+8}%;--delay:${(i%5)*-.6}s">${symbols[i%symbols.length]}</span>`).join('')}
const $=id=>document.getElementById(id);const sleep=t=>new Promise(r=>setTimeout(r,t));
let audio;function sound(kind){if(state.muted)return;try{audio??=new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();const seq={reward:[[659,.12],[880,.13],[1175,.24]],tick:[[520,.045]],roll:[[260,.045],[370,.045],[290,.055]],up:[[392,.12],[494,.12],[587,.12],[784,.22]],down:[[740,.12],[554,.14],[415,.17],[294,.22]],win:[[523,.13],[659,.13],[784,.13],[1046,.25],[1318,.38]]}[kind]||[];let offset=0;for(const [freq,dur] of seq){const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.setValueAtTime(freq,audio.currentTime+offset);g.gain.setValueAtTime(.0001,audio.currentTime+offset);g.gain.exponentialRampToValueAtTime(.18,audio.currentTime+offset+.012);g.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+offset+dur);o.connect(g).connect(audio.destination);o.start(audio.currentTime+offset);o.stop(audio.currentTime+offset+dur+.01);offset+=dur*.78}}catch{}}
function square(n){const row=Math.floor((n-1)/10),col=(n-1)%10;const rows=adventure.goal===50&&state.mode!=='remote'?5:10;return {x:(row%2===0?col:9-col)*10+5,y:(rows-1-row)*10+5}}
// V4: open-spaced wooden ladders and playful, fine wiggly ropes.
function ladderSVG(a,b){
 const p=square(a),q=square(b),dx=q.x-p.x,dy=q.y-p.y,len=Math.hypot(dx,dy),nx=-dy/len,ny=dx/len;
 const halfWidth=1.12;
 const point=(t,side)=>`${(p.x+dx*t+nx*halfWidth*side).toFixed(2)} ${(p.y+dy*t+ny*halfWidth*side).toFixed(2)}`;
 const steps=Math.max(4,Math.round(len/3.2));
 let rungs='';
 for(let j=1;j<steps;j++){
  const t=j/steps;
  rungs+=`<path d="M ${point(t,-1)} L ${point(t,1)}" fill="none" stroke="#b37b47" stroke-width=".32" stroke-linecap="round"/>`;
 }
 return `<g class="ladder-art"><path d="M ${point(0,-1)} L ${point(1,-1)} M ${point(0,1)} L ${point(1,1)}" fill="none" stroke="${WORLDS[currentWorld].ladder}" stroke-width=".43" stroke-linecap="round"/>${rungs}</g>`;
}
function ropeSVG(a,b,i){
 const p=square(a),q=square(b),dx=q.x-p.x,dy=q.y-p.y,len=Math.hypot(dx,dy),nx=-dy/len,ny=dx/len;
 const ropeColors=WORLDS[currentWorld].rope;
 const color=ropeColors[i%ropeColors.length];
 // The wave tapers at both ends; multiple alternating bends create a worm-like silhouette.
 const waves=len<22?1.4:len<38?2:2.65;
 const amplitude=Math.min(2.65,Math.max(1.15,len*.065));
 const samples=32,pts=[];
 for(let j=0;j<=samples;j++){
  const t=j/samples;
  const taper=Math.pow(Math.sin(Math.PI*t),.72);
  const offset=Math.sin(2*Math.PI*waves*t+i*1.17)*amplitude*taper;
  pts.push({x:p.x+dx*t+nx*offset,y:p.y+dy*t+ny*offset});
 }
 let d=`M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
 for(let j=1;j<pts.length;j++){
  const mid={x:(pts[j-1].x+pts[j].x)/2,y:(pts[j-1].y+pts[j].y)/2};
  d+=` Q ${pts[j-1].x.toFixed(2)} ${pts[j-1].y.toFixed(2)} ${mid.x.toFixed(2)} ${mid.y.toFixed(2)}`;
 }
 const last=pts[pts.length-1];d+=` L ${last.x.toFixed(2)} ${last.y.toFixed(2)}`;
 return `<g class="rope-art"><path d="${d}" fill="none" stroke="${color}" stroke-width=".55" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="#fffaf4" stroke-width=".11" stroke-dasharray=".65 1.25" stroke-linecap="round" opacity=".85"/></g>`;
}
function board(){
 const quick=adventure.goal===50&&state.mode!=='remote',palette=WORLDS[currentWorld].palette,cells=[];
 for(let r=(quick?4:9);r>=0;r--){const nums=Array.from({length:10},(_,c)=>r*10+(r%2===0?c+1:10-c));for(const n of nums)cells.push(`<div class="cell ${n===adventure.goal?'goal':''}" style="background:${palette[(n+Math.floor(n/10)*2)%5]}"><span>${n}</span>${adventure.cardSquares.has(n)&&adventure.variant!=='classic'?'<i class="treasure-mark">🎁</i>':''}${n===adventure.goal?'<i class="goal-mark">🏆</i>':''}</div>`)}
 $('cells').innerHTML=cells.join('');$('cells').style.gridTemplateRows=`repeat(${quick?5:10},1fr)`;
 $('board').classList.toggle('quick-board',quick);$('paths').setAttribute('viewBox',quick?'0 0 100 50':'0 0 100 100');
 $('paths').innerHTML=`${Object.entries(slides).filter(([a,b])=>+a<=adventure.goal&&b<=adventure.goal).map(([a,b],i)=>ropeSVG(+a,b,i)).join('')}${Object.entries(ladders).filter(([a,b])=>+a<=adventure.goal&&b<=adventure.goal).map(([a,b])=>ladderSVG(+a,b)).join('')}`;
 renderTokens();renderWorldDecor();
}
function renderTokens(){const b=$('tokens');b.innerHTML=state.players.map((p,i)=>{if(!p.pos)return '';const pt=square(p.pos);const offset=(i-(state.players.length-1)/2)*2.35;return `<div class="token" style="left:${pt.x+offset}%;top:${(pt.y+offset)*(adventure.goal===50&&state.mode!=='remote'?2:1)}%;background:${colors[i]};z-index:${i+3}" title="${p.name}">${heroImg(adventure.avatars[i])}</div>`}).join('')}
const HERO_OPTIONS=[['🐰', 'bunny', 'Bunny'], ['🐼', 'panda', 'Panda'], ['🦊', 'fox', 'Fox'], ['🦖', 'dino', 'Dino'], ['🐱', 'cat', 'Kitty'], ['🐶', 'puppy', 'Puppy'], ['🐻', 'bear', 'Bear'], ['🐨', 'koala', 'Koala'], ['🐸', 'frog', 'Froggy'], ['🐯', 'tiger', 'Tiger'], ['🦁', 'lion', 'Lion'], ['🐵', 'monkey', 'Monkey'], ['🐧', 'penguin', 'Penguin'], ['🐘', 'elephant', 'Elephant'], ['🦄', 'unicorn', 'Unicorn'], ['🐮', 'cow', 'Cow'], ['🐷', 'pig', 'Piggy'], ['🐙', 'octopus', 'Octo'], ['🐢', 'turtle', 'Turtle'], ['🐝', 'bee', 'Buzzy']];
let heroEditing=0;let heroLocked=false;
function renderHeroPicker(){
 const tabs=$('heroPlayerTabs'), gallery=$('avatars'),status=$('heroSelectionStatus');if(!tabs||!gallery)return;
 const count=state.mode==='cpu'?1:state.mode==='remote'?1:Math.max(2,state.players.length);
 if(heroEditing>=count)heroEditing=0;
 tabs.innerHTML=Array.from({length:count},(_,i)=>`<button type="button" data-player="${i}" class="${i===heroEditing?'active':''}" ${heroLocked?'disabled':''}>${heroImg(adventure.avatars[i])}<span>${state.mode==='remote'?'My Hero':`Player ${i+1}`}</span></button>`).join('');
 gallery.innerHTML=HERO_OPTIONS.map(([emoji,name,label])=>`<button type="button" data-avatar="${emoji}" title="${label}" aria-label="${label}" aria-pressed="${adventure.avatars[heroEditing]===emoji}" class="${adventure.avatars[heroEditing]===emoji?'chosen':''}" ${heroLocked?'disabled':''}>${heroImg(emoji)}<span>${label}</span></button>`).join('');
 status.textContent=heroLocked?'🔒 ပွဲစနေပါပြီ။ ကစားရုပ်ပြန်ရွေးဖို့ Local / Computer နဲ့ New Game စပါ။':`🎨 Player ${heroEditing+1} အတွက် ကစားရုပ် ၂၀ မျိုးထဲက ရွေးပါ။`;
}
function chooseHero(emoji){if(heroLocked||!heroFiles[emoji])return;const i=state.mode==='remote'?state.players.findIndex(p=>p.uid===state.uid):heroEditing;if(i<0)return;adventure.avatars[i]=emoji;
 if(state.mode==='remote'&&state.room){runTransaction(roomRef(state.room),room=>{if(!room||room.roll!=null)return;const idx=room.players?.findIndex(p=>p.uid===state.uid);if(idx<0)return;room.players[idx].avatar=emoji;return room}).catch(console.warn)}
 renderHeroPicker();update();}
function update(){renderTokens();$('players').innerHTML=state.players.map((p,i)=>`<div class="player ${state.turn===i?'active':''}"><span class="dot" style="background:${colors[i]}"></span><b>${heroImg(adventure.avatars[i])} ${escapeHtml(p.name)}</b><small class="player-prizes"><span title="Stars">⭐ <strong>${adventure.stars[i]||0}</strong></span><span title="Shield available">🛡️ <strong>+${adventure.cards[i]?.shield||0}</strong></span><span title="Rocket available">🚀 <strong>+${adventure.cards[i]?.rocket||0}</strong></span><span title="Position">📍 ${p.pos||'0'}</span></small></div>`).join('');$('turn').textContent=state.finished?'🏆 '+state.players[state.turn]?.name+' wins!':`${state.players[state.turn]?.name||'Player'} ရဲ့အလှည့်`;$('roll').disabled=state.rolling||state.finished||!state.players.length||(state.mode==='remote'&&state.players[state.turn]?.uid!==state.uid);$('quickRoll').disabled=$('roll').disabled;$('roll').textContent=state.rolling?'🎲 Rolling…':'🎲 အံစာတုံးခေါက်မယ်';$('quickRoll').textContent=$('roll').textContent;$('quickTurn').textContent=$('turn').textContent;$('roomLabel').textContent=state.room?'Room: '+state.room:'';renderPowerCards();renderRewards();$('treasurePanel').hidden=adventure.variant!=='treasure'||state.mode==='remote';$('adventureInfo').textContent=state.mode==='remote'?'🌐 Remote Classic':(adventure.variant==='treasure'?'🎁 Treasure Adventure':adventure.goal===50?'⚡ Quick Race':'🌈 Classic Race')+' · Goal '+(state.mode==='remote'?100:adventure.goal)}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function setup(mode='local',count=2){heroLocked=false;heroEditing=0;adventure.stars=[0,0,0,0];adventure.history=[];adventure.used=Array.from({length:4},()=>({shield:0,rocket:0}));$('victory').classList.remove('show');adventure.shields=[0,0,0,0];adventure.cards=Array.from({length:4},()=>({shield:0,rocket:0}));adventure.claimed=Array.from({length:4},()=>new Set());state.mode=mode;state.room=null;state.players=Array.from({length:count},(_,i)=>({name:mode==='cpu'&&i===1?'🤖 Computer':`Player ${i+1}`,pos:0,uid:i===0?state.uid:null}));if(mode==='cpu')adventure.avatars[1]='🐼';state.turn=0;state.finished=false;state.rolling=false;board();update();renderHeroPicker();$('status').textContent='ကစားဖို့ အသင့်ဖြစ်ပါပြီ!';if(state.mode==='cpu')state.players[1].name='🤖 Computer'}
function renderPowerCards(){
 const panel=$('powerCards');if(!panel)return;
 const remote=state.mode==='remote', i=state.turn, cards=adventure.cards[i]||{shield:0,rocket:0};
 panel.hidden=remote;
 $('shieldCount').textContent=cards.shield;
 $('rocketCount').textContent=cards.rocket;
 $('useRocket').disabled=remote||state.rolling||state.finished||!state.players.length||cards.rocket<1; $('useRocket').textContent=cards.rocket?`🚀 Rocket သုံးမယ် (+3) · ${cards.rocket} ကျန်`:'🚀 Rocket မရှိသေးပါ';
 $('powerHelp').textContent=remote?'':`🚀 Rocket ကို ကိုယ့်အလှည့်မှာ အံစာတုံးမခေါက်ခင် သုံးနိုင်ပါတယ်။ ရတာနဲ့ ချက်ချင်းမသုံးလည်းရပြီး နောက်အလှည့်တွေအတွက် သိမ်းထားနိုင်ပါတယ်။ 🛡️ Shield က ကြိုးဆင်းရချိန် အလိုအလျောက် သုံးပါတယ်။`; 
}
function awardCard(i){
 if(state.mode==='remote'||adventure.variant==='classic')return;
 const p=state.players[i];if(!adventure.cardSquares.has(p.pos)||adventure.claimed[i].has(p.pos))return;
 adventure.claimed[i].add(p.pos);
 const kind=secureDie()<=3?'shield':'rocket';
 adventure.cards[i][kind]=Math.min(3,adventure.cards[i][kind]+1);
 recordReward(i,kind==='shield'?'🛡️ Shield Card ရရှိ':'🚀 Rocket Card ရရှိ');sound('reward');showToast(kind==='shield'?`🎁 ${p.name} 🛡️ Shield ရပါပြီ!`:`🎁 ${p.name} 🚀 Rocket ရပါပြီ!`);
}
async function animateMove(i,to){
 const p=state.players[i];
 while(p.pos<to){p.pos++;renderTokens();sound('tick');await sleep(135)}
 const dest=p.pos===adventure.goal?null:(ladders[p.pos]||slides[p.pos]);
 if(dest&&dest<=adventure.goal){
  if(dest<p.pos&&adventure.cards[i].shield>0){
   adventure.cards[i].shield--;adventure.used[i].shield++;recordReward(i,'🛡️ Shield အသုံးပြုပြီး');sound('up');showToast(`🛡️ ${p.name} Shield က ကြိုးဆင်းခြင်းကို ကာကွယ်ပေးလိုက်ပြီ!`);await sleep(380);
  }else{
   $('status').textContent=dest>p.pos?'🪜 လှေကားတက်မယ်!':'🪢 ကြိုးဆင်းမယ်!';sound(dest>p.pos?'up':'down');await sleep(300);p.pos=dest;renderTokens();await sleep(240);
  }
 }
 if(adventure.variant==='treasure'&&adventure.bonusSquares.has(p.pos)&&p.pos<adventure.goal){
  const reward=secureDie();adventure.stars[i]+=reward<=4?reward:5;
  recordReward(i,`⭐ ${reward<=4?reward:5} Stars ရရှိ`);sound('reward');showToast(`🌟 ${p.name} +${reward<=4?reward:5} ⭐ Stars!`);
 }
 awardCard(i);
}
async function useRocket(){
 if(state.mode==='remote'||state.rolling||state.finished||!state.players.length)return;
 const i=state.turn,p=state.players[i];if(!adventure.cards[i]?.rocket)return;
 adventure.cards[i].rocket--;adventure.used[i].rocket++;recordReward(i,'🚀 Rocket အသုံးပြုပြီး (+3)');state.rolling=true;update();
 sound('up');showToast(`🚀 ${p.name} Rocket! ရှေ့ကို ၃ ကွက်!`);
 try{await animateMove(i,Math.min(adventure.goal,p.pos+3));
 if(p.pos===adventure.goal){state.finished=true;sound('win');celebrate();showVictory(i);$('status').textContent=`🎉 ${p.name} အနိုင်ရပါပြီ!`}
 else $('status').textContent=`🚀 ${p.name} Rocket သုံးပြီးပါပြီ။ အံစာတုံး ဆက်ခေါက်နိုင်ပါတယ်။`;
 }catch(error){console.error('Rocket failed:',error);$('status').textContent='⚠️ Rocket အမှားဖြစ်ခဲ့ပါတယ်'}finally{state.rolling=false;update()}
 if(state.mode==='cpu'&&!state.finished&&state.turn===1){await sleep(350);toss()}
}
async function toss(){heroLocked=true;renderHeroPicker();if(state.rolling||state.finished)return;if(state.mode==='remote')return remoteToss();state.rolling=true;update();try{const n=secureDie();await diceAnimation(n);const p=state.players[state.turn];$('status').textContent=`${p.name}: ${n} ရပါတယ်`;await animateMove(state.turn,Math.min(adventure.goal,p.pos+n));if(p.pos===adventure.goal){state.finished=true;sound('win');celebrate();showVictory(state.turn);$('status').textContent=`🎉 ${p.name} အနိုင်ရပါပြီ!`}else state.turn=(state.turn+1)%state.players.length;}catch(error){console.error('Dice turn failed:',error);$('status').textContent='⚠️ အမှားတစ်ခုဖြစ်သွားပါတယ်။ ထပ်ခေါက်ကြည့်ပါ။';showToast('⚠️ ပြန်ကြိုးစားနိုင်ပါတယ်')}finally{state.rolling=false;update()}if(state.mode==='cpu'&&!state.finished&&state.turn===1){await sleep(620);if(adventure.cards[1].rocket>0&&secureDie()<=3)await useRocket();else toss()}}
const faces=['','⚀','⚁','⚂','⚃','⚄','⚅'];
// All six outcomes are equally likely; no restriction on rolling a six.
function secureDie(){const a=new Uint32Array(1);const limit=0x100000000-(0x100000000%6);do{crypto.getRandomValues(a)}while(a[0]>=limit);return a[0]%6+1}
async function diceAnimation(n){sound('roll');const d=$('die'),big=$('bigDie'),overlay=$('diceOverlay');overlay.classList.add('visible');overlay.setAttribute('aria-hidden','false');d.classList.add('rolling');big.classList.add('spinning');for(let k=0;k<16;k++){const face=faces[secureDie()];d.textContent=face;big.textContent=face;await sleep(45+k*10)}d.textContent=faces[n];big.textContent=faces[n];d.classList.remove('rolling');big.classList.remove('spinning');big.classList.add('landed');await sleep(560);overlay.classList.remove('visible');overlay.setAttribute('aria-hidden','true');big.classList.remove('landed')}

function recordReward(i,msg){adventure.history.unshift({player:i,msg});adventure.history=adventure.history.slice(0,12);renderRewards()}
function renderRewards(){const el=$('rewardHistory');if(!el)return;el.innerHTML=adventure.history.length?adventure.history.map(e=>`<div class="reward-line"><span>${heroImg(adventure.avatars[e.player])} ${escapeHtml(state.players[e.player]?.name||'Player')}</span><b>${escapeHtml(e.msg)}</b></div>`).join(''):'<p class="muted">🎁 ဆုရရှိမှုနဲ့ အသုံးပြုမှုတွေ ဒီနေရာမှာ ပေါ်လာပါမယ်။</p>';
 $('cardLedger').innerHTML=state.players.map((p,i)=>`<div class="ledger-row"><b>${heroImg(adventure.avatars[i])} ${escapeHtml(p.name)}</b><span>🛡️ ${adventure.cards[i]?.shield||0} ကျန် / ${adventure.used[i]?.shield||0} သုံး</span><span>🚀 ${adventure.cards[i]?.rocket||0} ကျန် / ${adventure.used[i]?.rocket||0} သုံး</span></div>`).join('');
}
function showVictory(i){const p=state.players[i],el=$('victory');$('winnerHero').innerHTML=heroImg(adventure.avatars[i]);$('winnerName').textContent=`🏆 ${p.name} အနိုင်ရပါပြီ!`;$('winnerDetails').textContent=adventure.variant==='treasure'?`⭐ ${adventure.stars[i]} Stars စုဆောင်းနိုင်ခဲ့ပါတယ်!`:'🎉 အရမ်းတော်ပါတယ်! နောက်တစ်ပွဲ ကစားကြမယ်!';el.classList.add('show');}
function showToast(msg){const el=$('eventToast');el.textContent=msg;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2400)}function celebrate(){const layer=$('confetti');layer.innerHTML=Array.from({length:65},(_,i)=>`<span style="left:${Math.random()*100}%;animation-delay:${Math.random()*.8}s;background:${['#f87171','#facc15','#34d399','#60a5fa','#c084fc'][i%5]}"></span>`).join('');layer.classList.add('active');setTimeout(()=>{layer.classList.remove('active');layer.innerHTML=''},3600)}
function config(){return {apiKey:"AIzaSyBoC4cj8LtN0q4-gs-5z5srrv95Ul69cms",authDomain:"rainbow-ledder.firebaseapp.com",databaseURL:"https://rainbow-ledder-default-rtdb.firebaseio.com",projectId:"rainbow-ledder",storageBucket:"rainbow-ledder.firebasestorage.app",messagingSenderId:"1050222450850",appId:"1:1050222450850:web:4db5433831a77eabd9dffb",measurementId:"G-CNVV681QBL"}}
function ensureDb(){if(state.db)return state.db;const c=config();if(!c?.apiKey||!c?.databaseURL)throw Error('Firebase configuration မထည့်ရသေးပါ။ README ကိုကြည့်ပါ။');const app=initializeApp(c);state.auth=getAuth(app);state.db=getDatabase(app);return state.db}
function roomRef(code){return ref(ensureDb(),`rooms/${code}`)}
async function ensureSignedIn(){ensureDb();if(!state.auth.currentUser)await signInAnonymously(state.auth);state.uid=state.auth.currentUser.uid}
async function createRoom(){try{await ensureSignedIn();const code=Math.random().toString(36).slice(2,8).toUpperCase();const name=prompt('သင့်နာမည်', 'Player 1')?.trim();if(!name)return;await set(roomRef(code),{players:[{uid:state.uid,name,pos:0,avatar:adventure.avatars[0]}],turn:0,finished:false,roll:null,created:Date.now()});watchRoom(code);$('status').textContent='Room Code ကို သူငယ်ချင်းဆီ ပို့ပါ။'}catch(e){alert(e.message)}}
async function joinRoom(){try{await ensureSignedIn();const code=prompt('Room Code ထည့်ပါ')?.trim().toUpperCase();if(!code)return;const name=prompt('သင့်နာမည်','Player')?.trim();if(!name)return;const rr=roomRef(code);const result=await runTransaction(rr,room=>{if(!room||room.finished||room.players?.length>=4)return;room.players.push({uid:state.uid,name,pos:0,avatar:adventure.avatars[0]});return room});if(!result.committed)throw Error('Room မရှိပါ၊ ပြည့်နေပါပြီ၊ သို့မဟုတ် ပွဲပြီးသွားပါပြီ။');watchRoom(code)}catch(e){alert(e.message)}}
function watchRoom(code){adventure.goal=100;adventure.variant='classic';$('variant').value='classic';state.unsubscribe?.();state.mode='remote';state.room=code;state.rolling=false;heroEditing=0;state.unsubscribe=onValue(roomRef(code),snap=>{const room=snap.val();if(!room){$('status').textContent='Room မရှိတော့ပါ';return;}state.players=room.players||[];state.players.forEach((p,i)=>{if(p.avatar&&heroFiles[p.avatar])adventure.avatars[i]=p.avatar});heroLocked=room.roll!=null;renderHeroPicker();state.turn=room.turn||0;const newlyFinished=!!room.finished&&!state.finished;state.finished=!!room.finished;board();update();if(newlyFinished){const winner=state.players.findIndex(p=>p.pos===100);if(winner>=0){showVictory(winner);sound('win');celebrate()}}if(room.roll)$('die').textContent=faces[room.roll];$('status').textContent=state.finished?'🎉 ပွဲပြီးပါပြီ':`Room ${code} • ${state.players.length}/4 players`})}
async function remoteToss(){heroLocked=true;renderHeroPicker();if(state.rolling||state.players[state.turn]?.uid!==state.uid)return;state.rolling=true;update();const n=secureDie();await diceAnimation(n);try{const result=await runTransaction(roomRef(state.room),room=>{if(!room||room.finished||room.players[room.turn]?.uid!==state.uid)return;const p=room.players[room.turn];p.pos=Math.min(adventure.goal,p.pos+n);if(p.pos<100)p.pos=ladders[p.pos]||slides[p.pos]||p.pos;room.roll=n;if(p.pos===100)room.finished=true;else room.turn=(room.turn+1)%room.players.length;return room});if(!result.committed)$('status').textContent='အလှည့်ပြောင်းသွားပါပြီ။';}catch(e){alert(e.message)}finally{state.rolling=false;update()}}
$('world').onchange=()=>setWorld($('world').value);$('useRocket').onclick=useRocket;$('victoryClose').onclick=()=>{$('victory').classList.remove('show')};$('victoryAgain').onclick=()=>{setup(state.mode==='remote'?'local':state.mode,state.mode==='cpu'?2:+$('count').value)};$('variant').onchange=()=>{adventure.variant=$('variant').value;adventure.goal=adventure.variant==='quick'?50:100;if(state.mode!=='remote')setup(state.mode,state.mode==='cpu'?2:+$('count').value)};$('heroPlayerTabs').onclick=e=>{const btn=e.target.closest('[data-player]');if(!btn||heroLocked)return;heroEditing=+btn.dataset.player;renderHeroPicker()};$('avatars').onclick=e=>{const btn=e.target.closest('[data-avatar]');if(btn)chooseHero(btn.dataset.avatar)};$('count').onchange=()=>{if(state.mode==='local')setup('local',+$('count').value)};$('roll').onclick=toss;$('quickRoll').onclick=toss;$('local').onclick=()=>{state.unsubscribe?.();state.unsubscribe=null;setup('local',+$('count').value)};$('cpu').onclick=()=>{state.unsubscribe?.();state.unsubscribe=null;setup('cpu',2)};$('create').onclick=createRoom;$('join').onclick=joinRoom;$('mute').onclick=()=>{state.muted=!state.muted;$('mute').textContent=state.muted?'🔇 Sound Off':'🔊 Sound On'};$('copy').onclick=async()=>{if(!state.room)return;await navigator.clipboard.writeText(state.room);$('status').textContent='Room Code copied!'};if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(console.warn));setup();try{setWorld(localStorage.getItem('rainbow-world')||'rainbow')}catch{setWorld('rainbow')}

// V20: one-screen dice control delegates to the existing roll handler.
const sideRollV20 = document.getElementById('sideRoll');
const quickRollV20 = document.getElementById('quickRoll');
if (sideRollV20 && quickRollV20) {
  sideRollV20.addEventListener('click', () => {
    if (!quickRollV20.disabled) quickRollV20.click();
  });
  const syncSideDiceV20 = () => {
    sideRollV20.disabled = quickRollV20.disabled;
    sideRollV20.textContent = '🎲';
    sideRollV20.setAttribute('aria-label', quickRollV20.disabled ? 'Dice unavailable' : 'Roll dice');
  };
  new MutationObserver(syncSideDiceV20).observe(quickRollV20, {attributes:true,childList:true,subtree:true,characterData:true});
  const turn = document.getElementById('quickTurn');
  if (turn) new MutationObserver(syncSideDiceV20).observe(turn,{childList:true,subtree:true,characterData:true});
  syncSideDiceV20();
}


// V21: Close settings reliably without changing the board dimensions or scroll position.
const v21Settings = document.querySelector('.settings-drawer');
const v21Close = document.getElementById('settingsClose');
function closeSettingsV21(){ if(v21Settings) v21Settings.open=false; }
if(v21Close) v21Close.addEventListener('click', closeSettingsV21);
if(v21Settings){
 v21Settings.addEventListener('click', e=>{if(e.target===v21Settings)closeSettingsV21();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&v21Settings.open)closeSettingsV21();});
}

// V24: single-screen dice, new game and fullscreen controls.
const boardRollV24=document.getElementById('boardRoll');
const baseRollV24=document.getElementById('roll');
const syncBoardRollV24=()=>{if(!boardRollV24||!baseRollV24)return;boardRollV24.disabled=baseRollV24.disabled;boardRollV24.classList.toggle('rolling',state.rolling);boardRollV24.textContent=state.rolling?'🎲':'🎲';boardRollV24.setAttribute('aria-label',state.rolling?'Rolling dice':'Roll dice');};
boardRollV24?.addEventListener('click',()=>{if(!baseRollV24.disabled)baseRollV24.click();});
if(baseRollV24)new MutationObserver(syncBoardRollV24).observe(baseRollV24,{attributes:true,childList:true,subtree:true});
syncBoardRollV24();
document.getElementById('newGame')?.addEventListener('click',()=>{if(state.rolling)return;if(state.mode==='remote'){alert('Remote room: start a new local game or create a new room.');return;}setup(state.mode,state.mode==='cpu'?2:+document.getElementById('count').value);});
document.getElementById('fullView')?.addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch(e){console.warn('Fullscreen unavailable',e);}});
