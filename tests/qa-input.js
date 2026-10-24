// Local QA only: visible timed controls exercise the game's real keyboard listeners.
const game=document.querySelector('iframe');
game.addEventListener('load',()=>{let doc;try{doc=game.contentDocument;if(!doc.querySelector('#app'))return;}catch{return;}
 const ui=doc.createElement('div');ui.id='qa-input';Object.assign(ui.style,{position:'fixed',left:'10px',top:'105px',zIndex:'1000',display:'flex',gap:'5px',background:'#111c',padding:'5px'});
 const win=game.contentWindow;const held=new Set();const send=(type,code)=>win.dispatchEvent(new win.KeyboardEvent(type,{code,bubbles:true,cancelable:true}));
 const release=()=>{for(const code of held)send('keyup',code);held.clear();};
 let generation=0;const hold=(codes,ms,jump=false)=>{release();const token=++generation;ui.dataset.busy='true';for(const code of codes){held.add(code);send('keydown',code);}let elapsed=0,last=win.performance.now(),phase=0;if(jump){held.add('Space');send('keydown','Space');}function tick(now){if(token!==generation)return;elapsed+=Math.min(.1,(now-last)/1000);last=now;if(jump){if(phase===0&&elapsed>=.18){send('keyup','Space');held.delete('Space');phase=1;}if(phase===1&&elapsed>=.24){send('keydown','Space');held.add('Space');phase=2;}if(phase===2&&elapsed>=.6){send('keyup','Space');held.delete('Space');phase=3;}}if(elapsed>=ms/1000){release();ui.dataset.busy='false';}else win.requestAnimationFrame(tick);}win.requestAnimationFrame(tick);};
 for(const [label,codes,ms]of [['→ 1s',['KeyD'],1000],['→ .3s',['KeyD'],300],['← 1s',['KeyA'],1000],['攻撃 2s',['KeyJ'],2000],['→+攻撃 2s',['KeyD','KeyJ'],2000],['→二段',['KeyD'],850],['空中攻撃',['KeyD','KeyJ'],850],['回避',['KeyK'],400]]){const b=doc.createElement('button');b.textContent=label;b.style.cssText='background:#213449;color:#fff;border:1px solid #8796a5;font:11px sans-serif;padding:5px';b.onclick=()=>{hold(codes,ms,label==='→二段'||label==='空中攻撃');};ui.append(b);}
 const stop=doc.createElement('button');stop.textContent='解除';stop.onclick=release;ui.append(stop);
 const hide=doc.createElement('button');hide.textContent='隠す';hide.onclick=()=>ui.remove();ui.append(hide);doc.body.append(ui);
});
