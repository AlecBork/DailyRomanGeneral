// DailyRomanGeneral shared rules. Used by the game (browser) and tools/validate.mjs (node).
// A battle file is pure data. All logic about how to read it lives here.
(function(root){
"use strict";

// ---- conditions -------------------------------------------------------------
// A condition is an object. Every key must pass (AND).
//   {"wide": true}            flag is set (truthy)
//   {"wide": false}           flag is not set
//   {"rear": 1}               flag equals 1
//   {"rear": {"gte": 1}}      also gt, lt, lte, eq
//   {"any": [cond, cond]}     at least one passes
//   {"not": cond}             cond fails
// The special flag "_step" is the 0-based decision number.
function cmp(v,spec){
 if(typeof spec==="boolean")return spec===!!v;
 if(typeof spec==="number")return (v||0)===spec;
 if(spec&&typeof spec==="object"){const x=v||0;
  return (spec.gte==null||x>=spec.gte)&&(spec.gt==null||x>spec.gt)&&(spec.lte==null||x<=spec.lte)&&(spec.lt==null||x<spec.lt)&&(spec.eq==null||x===spec.eq)}
 return false}
function test(cond,ctx){
 if(!cond)return true;
 for(const k in cond){
  if(k==="any"){if(!cond.any.some(c=>test(c,ctx)))return false}
  else if(k==="not"){if(test(cond.not,ctx))return false}
  else if(!cmp(ctx[k],cond[k]))return false}
 return true}
// First entry whose "if" passes (an entry with no "if" always passes).
function first(list,ctx){for(const v of list||[])if(test(v.if,ctx))return v;return null}

// ---- reading a battle -------------------------------------------------------
function outcome(choice,S){const v=first(choice.fx,S)||{};return{r:v.r||0,e:v.e||0,set:v.set||{},text:v.text||"",q:v.q}}
function text(list,S){const v=first(list,S);return v?v.text:""}
function potential(B,S,step){const v=first(B.potential,Object.assign({},S,{_step:step}));return v?v.v:5}

// Situation report rows: [label, text, tone]
function statusRows(B,picks,S){
 return (B.status||[]).map(row=>{
  const i=picks[row.decision];
  let o=i==null?row.default:row.options[i];
  if(Array.isArray(o))o=first(o,S)||{text:"",tone:"n"};
  o=o||{text:"",tone:"n"};
  return[row.label,o.text,o.tone||"n"]})}

// Unit moves for choice i of decision k. "moveRules" apply on every move, then the choice's own move.
function moveFor(B,k,i,S){
 const u={};
 for(const r of B.moveRules||[])if(test(r.if,S))Object.assign(u,r.u||{});
 const m=first(B.decisions[k].choices[i].move,S)||{};
 Object.assign(u,m.u||{});
 return{u,f:m.f||[]}}

// ---- playing a battle -------------------------------------------------------
// State: {S:{flags}, R, E, CP, step, picks:[], quals:[]}
function newState(B){return{S:{},R:100,E:100,CP:B.cpMax||10,step:0,picks:[],quals:[]}}
// Apply choice i of the current decision. The square colour is the choice's quality, one step worse if the enemy
// punished the same kind of move twice in a row, so the share grid matches what happened.
// Apply choice i of the current decision. nr/ne are the day's noise (the game passes seeded noise).
function step(B,st,i,nr,ne){
 const d=B.decisions[st.step],c=d.choices[i],x=outcome(c,st.S);
 Object.assign(st.S,x.set);
 let dr=x.r+(nr||0),de=x.e+(ne||0),pen="";
 const prev=st.step>0?B.decisions[st.step-1].choices[st.picks[st.step-1]].style:null;
 if(prev&&prev===c.style){
  if(c.style==="A"){dr-=8;pen="A"}else if(c.style==="C"){de+=8;pen="C"}else{de+=5;dr-=3;pen="M"}}
 st.R+=dr;st.E+=de;st.CP-=c.cost;st.picks[st.step]=i;{let q=x.q!==undefined?x.q:c.quality;if(pen)q=Math.max(0,q-1);st.quals.push(q)}st.step++;
 return{text:x.text,dr,de,pen}}
function won(B,st){return st.R>0&&st.E<=(B.winAt||45)}

// ---- unit model library -----------------------------------------------------
// A unit in a battle file names one of these in "model". A unit may also carry "look":
// {"tn":"#2f6f8a"} to recolour (tn tunic, sh shield, cr crest, hc horse colour).
// k: inf = foot soldiers, cav = horsemen, ele = war elephant.
const models={
 velites:{k:"inf",tn:0x8a7a5a,wp:4.5,light:1},
 hastati:{k:"inf",tn:0xb3261e,sh:0x8c1d17,cr:0xb3261e,wp:7},
 principes:{k:"inf",tn:0xc23b2e,sh:0x8c1d17,cr:0xc23b2e,wp:7},
 triarii:{k:"inf",tn:0x7d7d85,sh:0x6a1a14,cr:0xeeeeee,wp:9},
 legionary:{k:"inf",tn:0xb3261e,sh:0x8c1d17,cr:0xb3261e,wp:7},
 auxiliary:{k:"inf",tn:0xa88a5a,sh:0x6b4a2b,rd:1,wp:7},
 levy:{k:"inf",tn:0xd9a62e,sh:0x8a6a1e,rd:1,wp:7},
 veteran:{k:"inf",tn:0x6a3a7c,sh:0x4b2a5a,rd:1,cr:0xeeeeee,wp:8},
 gaul:{k:"inf",tn:0x2f6f8a,sh:0x1f4a5e,rd:1,wp:7},
 african:{k:"inf",tn:0xd8d0b8,sh:0x8a6a3a,rd:1,wp:8},
 barbarian:{k:"inf",tn:0x6b5a3a,sh:0x4a3a22,rd:1,wp:6},
 greek_phalanx:{k:"inf",tn:0x3a5f9a,sh:0xb8892b,rd:1,wp:11},
 archer:{k:"inf",tn:0x8a4a3a,wp:3,light:1},
 cav_roman:{k:"cav",hc:0x6b4423,tn:0xb3261e,hm:1},
 cav_numidian:{k:"cav",hc:0x9c7a4a,tn:0xe8e0d0,hm:0},
 cav_punic:{k:"cav",hc:0x2b2b30,tn:0xd9a62e,hm:1},
 cav_heavy:{k:"cav",hc:0x2b2b30,tn:0x2f5f8a,hm:1},
 cav_eastern:{k:"cav",hc:0x4a3a2a,tn:0x7a2f6a,hm:1},
 elephant:{k:"ele"},
 galley_roman:{k:"ship",hc:0x6b4a2b,tn:0xb3261e},
 galley_punic:{k:"ship",hc:0x2b2b30,tn:0xd9a62e},
 galley_greek:{k:"ship",hc:0x4a5a7a,tn:0xeeeeee}
};

// ---- camera presets --------------------------------------------------------
// A "cam" may be 6 numbers [camX,camY,camZ,lookX,lookY,lookZ] or one of these names.
// World units: field x - 200, field y - 125. Rome is at the +z (bottom) side, looking toward -z.
const cams={
 overview:[0,190,245,0,0,-10], high:[0,150,120,0,0,-10], wide:[0,110,190,0,0,20],
 clash:[0,35,45,0,6,-30], front:[0,40,92,0,6,40], lowfront:[0,60,170,0,5,-20],
 left:[-190,50,0,-120,5,-95], right:[190,50,0,120,5,-95],
 leftclose:[-110,48,40,0,6,45], rightclose:[110,48,40,0,6,45],
 leftflank:[-205,42,70,-135,5,-5], rightflank:[205,42,70,135,5,-5],
 rear:[0,60,20,0,6,-90], deep:[0,70,70,0,5,-40], push:[0,40,10,0,6,-50],
 enemyrear:[-70,38,-30,0,6,-85], enemyrear2:[60,26,-60,0,6,-85], romanrear:[80,40,175,0,6,100]
};

root.Rules={test,first,outcome,text,potential,statusRows,moveFor,newState,step,won,models,cams};
if(typeof module!=="undefined"&&module.exports)module.exports=root.Rules;
})(typeof window!=="undefined"?window:(typeof globalThis!=="undefined"?globalThis:this));
