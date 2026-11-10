import { presets, qualityLevels, saveSettings, type GraphicsSettings } from '../game/settings';
type Actions={play:()=>void;pause:()=>void;restart:()=>void;changed:()=>void;attack:()=>void};
export class Interface {
  private menu:HTMLElement;private panel:HTMLElement;private hud:HTMLElement;
  private entered=false;private returnToGame=false;
  constructor(private settings:GraphicsSettings,private actions:Actions) {
    document.querySelector<HTMLDivElement>('#app')!.insertAdjacentHTML('beforeend',`
      <div class="frame" aria-hidden="true"></div>
      <header class="topbar"><a class="wordmark" href="#" aria-label="Fogarena of Time home"><span class="sigil">⌁</span> FOGARENA <span class="wordmark-sub">OF TIME</span></a><div class="chapter">AN ATMOSPHERIC EXPERIMENT <span class="dot"></span> VOL. 001</div><button id="open-settings" class="icon-button" aria-label="Open settings">☷</button></header>
      <main id="menu" class="menu"><div class="eyebrow"><span></span> STEP INTO THE UNKNOWN</div><h1>Fogarena<br><em>of Time</em><span class="title-period">.</span></h1><p class="intro">Where the world fades,<br>and the mist remembers.</p><div class="menu-actions"><button id="play" class="primary" aria-label="Play"><span>Play · Enter the mist</span><span>→</span></button><button id="resume" class="primary" hidden aria-label="Resume"><span>Resume journey</span><span>→</span></button><button id="settings" class="text-button">Settings <span>→</span></button><button id="restart" class="text-button" hidden>Restart <span>↻</span></button></div><div class="menu-note"><span class="tiny-mark">◇</span><span>A living world of light, wind &amp; volumetric fog.</span></div></main>
      <div class="location" id="location"><div class="location-line"></div><div><span class="eyebrow">THE HOLLOW</span><p>A place between moments</p></div><span class="coordinates">59° 18′ N<br>18° 04′ E</span></div>
      <div id="hud" class="hud" hidden aria-label="Adventure HUD">
        <section class="hero-status" aria-label="Explorer status">
          <div class="heart-row" role="img" aria-label="Three full hearts" title="Vitality">
            ${Array.from({length:3},()=>`<svg class="heart" viewBox="0 0 32 30" aria-hidden="true"><path class="heart-outline" d="M16 27 4 15C-4 6 8-3 16 6 24-3 36 6 28 15Z"/><path class="heart-shine" d="M5 10C5 6 10 5 13 8"/></svg>`).join('')}
          </div>
          <div class="hero-ornament" aria-hidden="true"><span></span>◇<span></span></div>
          <div class="realm-title">The Hollow</div>
          <div class="realm-subtitle">Beneath the pale moon</div>
          <div class="atmosphere-badge"><span class="dot"></span><span id="preset-hud">CINEMATIC</span></div>
        </section>
        <div class="adventure-actions">
          <button id="pause" class="adventure-pause" aria-label="Pause game"><span>Ⅱ</span><kbd>ESC</kbd></button>
          <button id="wind-blade" class="blade-action" aria-label="Swing Wind Blade" title="Swing sword · Space">
            <span class="blade-medallion">
              <svg class="charge-ring" viewBox="0 0 100 100" aria-hidden="true"><circle class="charge-track" cx="50" cy="50" r="45"/><circle id="blade-charge" cx="50" cy="50" r="45" pathLength="100"/></svg>
              <svg class="blade-glyph" viewBox="0 0 64 64" aria-hidden="true"><path d="m45 6 8-1-1 8-24 28-6-6Z" fill="currentColor"/><path d="m17 31 16 14M24 38 12 52m-3-3 6 6" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><path d="M10 19c11-7 24-2 24 4M33 53c12 2 21-6 20-14" fill="none" stroke="currentColor" stroke-width="1.4" opacity=".45"/></svg>
              <kbd>SPACE</kbd>
            </span>
            <span class="blade-label">Wind Blade</span><span id="blade-state" class="blade-state">Whirlwind ready</span>
          </button>
        </div>
        <div class="balloon-counter" title="Pop balloons with your sword to release the mist"><svg viewBox="0 0 22 30" aria-hidden="true"><ellipse cx="11" cy="10" rx="7" ry="9"/><path d="m11 19-2 3h4l-2-3m0 3c5 3-4 4 0 7"/></svg><span id="balloon-score" aria-live="polite">0 balloons popped</span></div>
        <div class="journey-hint"><span class="hint-diamond">✧</span><span><kbd>WASD</kbd> Explore</span><i></i><span>Drag to look</span></div>
        <section class="wayfinder" aria-label="Arena compass and map">
          <div class="map-heading"><span class="map-star">✧</span><span>THE HOLLOW</span><span class="map-star">✧</span></div>
          <div class="compass-face">
            <svg class="arena-map" viewBox="0 0 180 180" role="img" aria-label="North-up map showing your position and the ancient gateway">
              <defs><radialGradient id="map-bg"><stop stop-color="#34473a" stop-opacity=".84"/><stop offset="1" stop-color="#101f1c" stop-opacity=".92"/></radialGradient><clipPath id="map-clip"><circle cx="90" cy="90" r="72"/></clipPath></defs>
              <circle class="map-rim" cx="90" cy="90" r="86"/><circle class="map-inner-rim" cx="90" cy="90" r="79"/>
              <circle cx="90" cy="90" r="72" fill="url(#map-bg)"/>
              <g clip-path="url(#map-clip)" fill="none" stroke="#a1ac82" stroke-width=".8">
                <path d="M12 62q25-27 44-3t35-9 36-17 50 22M9 125q25-18 42-2t38-8 36 4 42-12M23 32q31 5 42 24t-6 44 4 45M143 25q-28 20-16 44t-2 54-9 38" opacity=".23"/>
                <circle cx="90" cy="90" r="55" stroke-dasharray="2 5" opacity=".2"/>
                <circle cx="90" cy="90" r="27.6" stroke="#c9bd8a" stroke-dasharray="5 3" opacity=".45"/>
                <path d="M76 59v-8h28v8m-24-8v8m20-8v8" stroke="#c8d7ab" stroke-width="2"/>
                <path d="m49 60 3-6 3 6m65 55 3-6 3 6M47 120l3-6 3 6m65-56 3-6 3 6m-32 66 3-6 3 6" opacity=".5"/>
              </g>
              <g id="map-player" transform="translate(90 102)"><circle r="8" fill="#bcd9ab" opacity=".12"/><path d="m0-7 4.5 12L0 3l-4.5 2Z" fill="#e1e9b9" stroke="#243b2d" stroke-width="1"/></g>
              <text x="90" y="15" class="map-north">N</text><path d="m90 20-2 4h4Z" fill="#c7a966"/>
              <text x="167" y="93">E</text><text x="90" y="172">S</text><text x="13" y="93">W</text>
            </svg>
          </div>
          <div class="map-caption"><span id="heading-label">N</span><span class="map-caption-line"></span><span id="vortex-count">MIST AT REST</span></div>
        </section>
      </div>
      <footer class="footer"><div class="control-hints"><span><kbd>W</kbd><span class="wasd"><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span></span><span>Move</span><span class="separator"></span><kbd class="space-key">SPACE</kbd><span>Swing sword</span><span class="separator"></span><span class="mouse-icon">↔</span><span>Drag to look</span></div><div class="render-status"><span class="dot"></span><span id="fps">VOLUMETRIC ATMOSPHERE</span><span class="status-separator">/</span> WEBGL 2</div></footer>
      <aside id="settings-panel" class="settings-panel" hidden aria-label="Graphics settings"><div class="panel-head"><div><div class="eyebrow">MAKE IT YOUR OWN</div><h2>Atmosphere</h2></div><button id="close-settings" class="icon-button" aria-label="Close settings">×</button></div><p class="panel-description">Shape the world around you.<br>Every change lives in the mist.</p><label class="field-label" for="preset">ATMOSPHERE PRESET</label><select id="preset">${Object.keys(presets).map(p=>`<option${p==='Cinematic'?' selected':''}>${p}</option>`).join('')}<option value="Custom">Custom</option></select><div class="sliders"></div><div class="quality-note"><span class="dot"></span> Changes apply in real time</div><button id="back" class="primary"><span>Return to the mist</span><span>→</span></button></aside>
      <div class="scene-caption"><span class="caption-cross">+</span><span>NOTHING HERE STANDS STILL.</span></div>
      <div id="loading" class="loading"><span class="loading-mark">⌁</span><p>Gathering the mist</p></div>
    `);
    this.menu=document.querySelector('#menu')!;this.panel=document.querySelector('#settings-panel')!;this.hud=document.querySelector('#hud')!;
    const on=(id:string,fn:()=>void)=>document.getElementById(id)!.addEventListener('click',fn);
    on('play',()=>this.start());on('resume',()=>this.start());on('restart',()=>{this.actions.restart();this.start();});
    on('settings',()=>this.showSettings());on('open-settings',()=>this.showSettings());on('close-settings',()=>this.closeSettings());on('back',()=>this.closeSettings());on('pause',()=>this.pause());on('wind-blade',()=>this.actions.attack());
    document.querySelector('.wordmark')!.addEventListener('click',e=>{e.preventDefault();this.pause();});
    const fields:{key:keyof GraphicsSettings;label:string;min:number;max:number;step:number}[]=[
      {key:'density',label:'Fog density',min:.1,max:2.5,step:.05},{key:'wind',label:'Wind speed',min:0,max:2,step:.05},
      {key:'turbulence',label:'Turbulence',min:0,max:2,step:.05},{key:'scattering',label:'Light scattering',min:0,max:2,step:.05},
      {key:'height',label:'Fog height',min:1,max:8,step:.1},{key:'detail',label:'Smoke detail',min:1,max:4,step:1},{key:'quality',label:'Render quality',min:0,max:3,step:1},
    ];
    const sliders=document.querySelector('.sliders')!;
    for(const f of fields) {
      sliders.insertAdjacentHTML('beforeend',`<div class="slider-field"><label for="${f.key}">${f.label}</label><output id="${f.key}-value"></output><input id="${f.key}" type="range" min="${f.min}" max="${f.max}" step="${f.step}" value="${settings[f.key]}"></div>`);
      document.getElementById(f.key)!.addEventListener('input',e=>{settings[f.key]=Number((e.target as HTMLInputElement).value);(document.querySelector('#preset') as HTMLSelectElement).value='Custom';this.changed('Custom');});
    }
    document.querySelector('#preset')!.addEventListener('change',e=>{const name=(e.target as HTMLSelectElement).value;if(presets[name]){Object.assign(settings,presets[name]);this.changed(name);}});
    const initialPreset=Object.keys(presets).find(name=>Object.entries(settings).every(([k,v])=>presets[name][k as keyof GraphicsSettings]===v)) || 'Custom';
    (document.getElementById('preset') as HTMLSelectElement).value=initialPreset;
    document.getElementById('preset-hud')!.textContent=initialPreset.toUpperCase();
    this.refresh();
  }
  private changed(name:string){document.querySelector('#preset-hud')!.textContent=name.toUpperCase();this.refresh();saveSettings(this.settings);this.actions.changed();}
  private refresh(){for(const [key,value]of Object.entries(this.settings)){
    const input=document.getElementById(key) as HTMLInputElement;input.value=String(value);input.style.setProperty('--fill',`${(value-Number(input.min))/(Number(input.max)-Number(input.min))*100}%`);
    document.getElementById(`${key}-value`)!.textContent=key==='quality'?qualityLevels[value].label:key==='detail'?['','Low','Medium','High','Ultra'][value]:key==='height'?`${value.toFixed(1)} m`:`${value.toFixed(2)}`;
  }}
  ready(){document.getElementById('loading')!.classList.add('loaded');setTimeout(()=>document.getElementById('loading')?.remove(),900);}
  start(){this.entered=true;this.menu.hidden=true;this.panel.hidden=true;this.hud.hidden=false;document.getElementById('location')!.hidden=true;document.body.classList.add('playing');document.body.classList.remove('settings-open');this.actions.play();}
  pause(){this.menu.hidden=false;this.panel.hidden=true;this.hud.hidden=true;document.getElementById('play')!.hidden=this.entered;document.getElementById('resume')!.hidden=!this.entered;document.getElementById('restart')!.hidden=!this.entered;document.getElementById('location')!.hidden=false;document.body.classList.remove('playing','settings-open');this.actions.pause();}
  showSettings(){this.returnToGame=document.body.classList.contains('playing');this.actions.pause();this.menu.hidden=true;this.panel.hidden=false;this.hud.hidden=true;document.body.classList.add('settings-open');}
  closeSettings(){document.body.classList.remove('settings-open');if(this.returnToGame)this.start();else this.pause();}
  escape(){if(!this.panel.hidden)this.closeSettings();else if(this.menu.hidden)this.pause();else if(this.entered)this.start();}
  updateAdventure(x:number,z:number,facing:number,cameraYaw:number,charge:number,whirlwinds:number,popped=0) {
    if(this.hud.hidden)return;
    const score=`${popped} ${popped===1?'balloon':'balloons'} popped`;
    const counter=document.getElementById('balloon-score')!;if(counter.textContent!==score)counter.textContent=score;
    document.getElementById('map-player')!.setAttribute('transform',`translate(${90+x*3} ${90+z*3}) rotate(${-facing*180/Math.PI})`);
    const degrees=((cameraYaw*180/Math.PI)%360+360)%360;
    document.getElementById('heading-label')!.textContent=['N','NW','W','SW','S','SE','E','NE'][Math.round(degrees/45)%8];
    document.getElementById('blade-charge')!.style.strokeDashoffset=String((1-charge)*100);
    const blade=document.getElementById('wind-blade') as HTMLButtonElement;
    blade.classList.toggle('swinging',charge<1);blade.setAttribute('aria-disabled',String(charge<1));
    document.getElementById('blade-state')!.textContent=charge<1?'Calling the wind':'Whirlwind ready';
    document.getElementById('vortex-count')!.textContent=whirlwinds>0?`${whirlwinds} WIND ${whirlwinds===1?'SPIRIT':'SPIRITS'}`:'MIST AT REST';
  }
  fps(value:number){document.getElementById('fps')!.textContent=`${value} FPS · ${qualityLevels[this.settings.quality].label.toUpperCase()}`;}
}
