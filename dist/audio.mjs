export class Soundscape{
 constructor(){this.enabled=true;this.ctx=null;this.beat=0;this.next=0;this.boss=false;this.paused=false;this.room=0;this.musicVolume=.6;this.effectsVolume=.8;}
 async start(){
  if(!this.ctx){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;const c=this.ctx=new AC();
   this.master=c.createGain();this.master.gain.value=.55;const limiter=c.createDynamicsCompressor();limiter.threshold.value=-14;limiter.ratio.value=5;this.master.connect(limiter);limiter.connect(c.destination);
   this.fx=c.createGain();this.music=c.createGain();this.fx.connect(this.master);this.music.connect(this.master);
   this.reverb=c.createConvolver();const len=c.sampleRate*1.8,imp=c.createBuffer(2,len,c.sampleRate);for(let ch=0;ch<2;ch++){const a=imp.getChannelData(ch);for(let i=0;i<len;i++)a[i]=(Math.random()*2-1)*Math.pow(1-i/len,3)*.25;}this.reverb.buffer=imp;const wet=c.createGain();wet.gain.value=.3;this.reverb.connect(wet);wet.connect(this.music);
   this.timer=setInterval(()=>this.schedule(),100);this.next=c.currentTime+.1;
  }
  if(this.ctx.state==='suspended'||this.ctx.state==='interrupted')await this.ctx.resume();this.setMix(this.musicVolume,this.effectsVolume);
 }
 setMix(music,effects){this.musicVolume=music;this.effectsVolume=effects;if(this.ctx){const t=this.ctx.currentTime;this.music.gain.setTargetAtTime(this.enabled?music:0,t,.08);this.fx.gain.setTargetAtTime(this.enabled?effects:0,t,.08);}}
 setEnabled(v){this.enabled=v;this.setMix(this.musicVolume,this.effectsVolume);}
 tone(freq,dur,gain=.1,type='sine',time=null,slide=null,bus='fx'){
  if(!this.ctx||!this.enabled)return;const c=this.ctx,t=time??c.currentTime,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(15,slide),t+dur);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,gain),t+.015);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g);g.connect(bus==='music'?this.music:this.fx);if(bus==='music')g.connect(this.reverb);o.start(t);o.stop(t+dur+.02);
 }
 noise(dur=.12,gain=.12,cutoff=2500){if(!this.ctx||!this.enabled)return;const c=this.ctx,n=c.createBufferSource(),b=c.createBuffer(1,Math.ceil(c.sampleRate*dur),c.sampleRate),a=b.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=(Math.random()*2-1)*Math.pow(1-i/a.length,3);n.buffer=b;const f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=cutoff;const g=c.createGain();g.gain.value=gain;n.connect(f);f.connect(g);g.connect(this.fx);n.start();n.stop(c.currentTime+dur+.01);}
 schedule(){
  const c=this.ctx;if(!c||c.state!=='running'||document.hidden)return;if(this.next<c.currentTime-.2)this.next=c.currentTime+.05;
  const dur=this.boss?.20:this.room===2?.29:.26;
  while(this.next<c.currentTime+.18){
   const roots=this.boss?[38,34,36,33]:this.room===2?[41,38,36,40]:[45,41,38,40],root=roots[Math.floor(this.beat/16)%4],notes=this.boss?[0,7,12,15,12,7,10,7]:[0,7,12,15,19,12,7,15];
   const midi=root+notes[this.beat%8]+12,freq=440*Math.pow(2,(midi-69)/12),vol=this.paused?.016:.04;
   this.tone(freq,1.4,vol,'sine',this.next,null,'music');
   if(this.beat%8===0){const bass=440*Math.pow(2,(root-69)/12);this.tone(bass,2.8,this.paused?.025:.065,'triangle',this.next,null,'music');this.tone(bass*3,2.3,.017,'sine',this.next,null,'music');}
   if(this.beat%16===0){for(const interval of [12,15,19])this.tone(440*Math.pow(2,(root+interval-69)/12),3.8,.018,'triangle',this.next,null,'music');}
   if(this.beat%4===2)this.tone(freq*2,.75,.012,'sine',this.next,null,'music');
   if(this.boss&&this.beat%4===0)this.tone(85,.25,.09,'sine',this.next,38,'music');this.next+=dur;this.beat++;
  }
 }
 play(name){if(!this.ctx||!this.enabled)return;switch(name){
  case'whip':this.noise(.12,.19,4600);this.tone(650,.13,.05,'triangle',null,110);break;
  case'whipHeavy':this.noise(.21,.26,3800);this.tone(280,.20,.11,'triangle',null,65);break;
  case'swing':this.noise(.18,.08,1800);break;
  case'hit':this.noise(.09,.28,2400);this.tone(125,.14,.16,'triangle',null,42);this.tone(1450,.08,.04);break;
  case'guard':this.tone(1250,.19,.09,'triangle',null,900);this.tone(2100,.13,.045);this.noise(.05,.10,7000);break;
  case'parry':this.tone(880,.4,.07);this.tone(1320,.5,.04);break;
  case'kill':this.tone(310,.48,.09,'triangle',null,100);this.noise(.3,.07,4000);break;
  case'jump':this.tone(200,.16,.045,'sine',null,500);break;
  case'land':this.noise(.06,.07,750);break;
  case'break':this.noise(.18,.15,5200);this.tone(940,.24,.05,'triangle',null,450);break;
  case'dash':this.noise(.22,.1,1000);this.tone(180,.2,.04,'sine',null,80);break;
  case'hurt':this.tone(170,.25,.14,'sawtooth',null,65);this.noise(.12,.10,600);break;
  case'magic':this.tone(540,.5,.1,'sine',null,180);this.tone(810,.45,.04);break;
  case'enemyMagic':this.tone(310,.5,.07,'triangle',null,110);this.tone(465,.4,.04);break;
  case'eruption':this.noise(.45,.16,700);this.tone(70,.5,.1,'triangle',null,38);break;
  case'heal':case'rest':{const now=this.ctx.currentTime;[0,3,7,12].forEach((n,i)=>this.tone(440*Math.pow(2,n/12),1.2,.06,'sine',now+i*.12));break;}
  case'page':this.noise(.12,.03,1400);this.tone(520,.3,.035);break;
  case'charge':this.tone(90,1,.08,'triangle',null,180);break;
  case'boss':this.tone(55,3,.13,'triangle');this.tone(82.4,3,.08,'sine');break;
 }}
}
