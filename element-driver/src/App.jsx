import { useState, useRef, useEffect, useCallback } from "react";

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzC0-ZqO504mDQDWWay3dM05ShYXwecozfNDRLVCVvjhDM7_d0R8NfOx0ARcsGwGByAgA/exec";

const C = {
  orange:"#F6A623", orangeDark:"#c47e0d", orangeDim:"#2a1800",
  black:"#0a0a0a", dark:"#111", panel:"#161616",
  card:"#1c1c1c", card2:"#222", border:"#2a2a2a", border2:"#333",
  text:"#e4e4e4", muted:"#555", muted2:"#888",
  green:"#43a047", greenDim:"#0d1f0e", greenText:"#81c784",
  yellow:"#fbc02d", yellowDim:"#2a1f00", yellowText:"#ffe082",
  red:"#e53935", blue:"#42a5f5",
};

const DRIVERS = [
  { name:"Brandon Ingram",    initials:"BI" },
  { name:"Chase Kiklas",      initials:"CK" },
  { name:"David Salewski",    initials:"DS" },
  { name:"James Thompson",    initials:"JT" },
  { name:"Jennifer Willard",  initials:"JW" },
  { name:"Jeramy Miller",     initials:"JM" },
  { name:"Jordan Supernant",  initials:"JS" },
  { name:"Josh Gilmour",      initials:"JG" },
  { name:"Kevin MacLellan",   initials:"KM" },
  { name:"Patricia McDonald", initials:"PM" },
  { name:"Walter Hinks",      initials:"WH" },
];

const WASTE_TYPES = [
  "", "Garbage", "Wood", "C&D (Construction & Demolition)",
  "Metal / Scrap (Ferrous)", "Non-Ferrous Metal", "Gravel / Dirt",
  "Contaminated Soil", "Concrete", "Geotextile", "Access Matting",
  "Hazardous", "Mixed", "Other",
];

function genDRN() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  return `DRN-${yy}${mm}${dd}-${String(Math.floor(Math.random()*900)+100)}`;
}
function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}
function todayStr() {
  return new Date().toLocaleDateString("en-CA",{weekday:"short",month:"short",day:"numeric",year:"numeric"});
}
function todaySheetStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
// Normalise any date format from Sheets to yyyy-MM-dd for comparison
function normaliseDate(raw) {
  if (!raw) return "";
  // Handle ISO timestamp: 2026-05-07T07:00:00.000Z
  if (String(raw).includes("T")) return String(raw).split("T")[0];
  // Handle Date objects from Sheets
  if (raw instanceof Date) {
    const d = raw;
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }
  // Already yyyy-MM-dd
  return String(raw).slice(0,10);
}
function calcHours(start, end) {
  if (!start||!end) return null;
  const [sh,sm]=start.split(":").map(Number);
  const [eh,em]=end.split(":").map(Number);
  const diff=(eh*60+em)-(sh*60+sm);
  if (diff<=0) return null;
  const h=Math.floor(diff/60), m=diff%60;
  return h>0?`${h}h ${m}m`:`${m}m`;
}
function decimalHours(start, end) {
  if (!start||!end) return null;
  const [sh,sm]=start.split(":").map(Number);
  const [eh,em]=end.split(":").map(Number);
  const diff=(eh*60+em)-(sh*60+sm);
  if (diff<=0) return null;
  return (diff/60).toFixed(2);
}
function sanitizeForm(form) {
  return {
    ...form,
    sitePhotos: form.sitePhotos.map(p=>({name:p.name})),
    disposalTicketPhotos: form.disposalTicketPhotos.map(p=>({name:p.name})),
    damagePhotos: form.damagePhotos.map(p=>({name:p.name})),
    equipmentDropPin: form.equipmentDropPin ? {
      lat:form.equipmentDropPin.lat,
      lng:form.equipmentDropPin.lng,
      link:form.equipmentDropPin.link,
      method:form.equipmentDropPin.method,
    } : null,
  };
}
async function postToSheets(payload) {
  const res = await fetch(SCRIPT_URL, { method:"POST", body:JSON.stringify(payload) });
  return res.json();
}
async function fetchWOs() {
  const res = await fetch(`${SCRIPT_URL}?action=getWOs`);
  const data = await res.json();
  return data.data || [];
}

// ─── STYLES ─────────────────────────────────────────────────
const S = {
  root:{ background:C.black, color:C.text, fontFamily:"'Barlow','Helvetica Neue',Arial,sans-serif", minHeight:"100vh", paddingBottom:60, fontSize:15 },
  header:{ background:C.dark, borderBottom:`3px solid ${C.orange}`, padding:"11px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100 },
  logo:{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:900, fontSize:21, color:C.orange, letterSpacing:1 },
  screen:{ padding:"14px" },
  title:{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:800, fontSize:25, color:C.orange, textTransform:"uppercase", letterSpacing:1, marginBottom:4 },
  sub:{ fontSize:13, color:C.muted2, marginBottom:18 },
  card:{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:"13px 14px", marginBottom:11 },
  label:{ display:"block", fontSize:10, fontWeight:700, color:C.orange, textTransform:"uppercase", letterSpacing:0.8, marginBottom:5 },
  input:{ width:"100%", background:C.card2, border:`1px solid ${C.border2}`, borderRadius:8, color:C.text, fontFamily:"inherit", fontSize:15, padding:"10px 12px", outline:"none", boxSizing:"border-box", WebkitAppearance:"none" },
  select:{ width:"100%", background:C.card2, border:`1px solid ${C.border2}`, borderRadius:8, color:C.text, fontFamily:"inherit", fontSize:15, padding:"10px 12px", outline:"none", boxSizing:"border-box", WebkitAppearance:"none", appearance:"none" },
  textarea:{ width:"100%", background:C.card2, border:`1px solid ${C.border2}`, borderRadius:8, color:C.text, fontFamily:"inherit", fontSize:15, padding:"10px 12px", outline:"none", resize:"none", lineHeight:1.5, boxSizing:"border-box" },
  field:{ marginBottom:13 },
  row:{ display:"flex", gap:8, marginBottom:13 },
  btn:{ border:"none", borderRadius:9, fontFamily:"'Barlow Condensed',sans-serif", fontWeight:800, fontSize:17, letterSpacing:0.5, textTransform:"uppercase", cursor:"pointer", padding:"13px 16px", display:"block", width:"100%", marginBottom:9 },
  btnSm:{ border:"none", borderRadius:8, fontFamily:"'Barlow Condensed',sans-serif", fontWeight:800, fontSize:13, letterSpacing:0.5, textTransform:"uppercase", cursor:"pointer", padding:"8px 14px" },
  sectionHead:{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:800, fontSize:13, color:C.muted2, textTransform:"uppercase", letterSpacing:1, margin:"18px 0 10px", display:"flex", alignItems:"center", gap:8 },
  sectionBar:{ width:3, height:14, background:C.orange, borderRadius:2, flexShrink:0 },
  backBtn:{ background:"none", border:"none", color:C.muted2, fontSize:13, fontWeight:700, textTransform:"uppercase", letterSpacing:0.5, cursor:"pointer", marginBottom:14, display:"flex", alignItems:"center", gap:5, padding:0 },
  driverBtn:{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:"13px 14px", width:"100%", textAlign:"left", cursor:"pointer", marginBottom:9, display:"flex", alignItems:"center", gap:12 },
  avatar:{ width:42, height:42, borderRadius:"50%", background:C.orange, color:C.black, fontFamily:"'Barlow Condensed',sans-serif", fontWeight:900, fontSize:16, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  jobCard:{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:"12px 14px", marginBottom:9, cursor:"pointer", display:"flex", alignItems:"center", gap:12 },
  orderNum:{ width:36, height:36, borderRadius:8, background:C.orange, color:C.black, fontFamily:"'Barlow Condensed',sans-serif", fontWeight:900, fontSize:18, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  timeRow:{ display:"flex", gap:8 },
  nowBtn:{ background:C.card2, border:`1px solid ${C.border2}`, borderRadius:8, padding:"10px 12px", color:C.orange, fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:0.5, cursor:"pointer", whiteSpace:"nowrap", flexShrink:0 },
  woCard:{ background:C.card, border:`1px solid ${C.border}`, borderLeft:`4px solid ${C.orange}`, borderRadius:10, padding:"13px 14px", marginBottom:13 },
  divider:{ display:"flex", alignItems:"center", gap:10, margin:"14px 0", color:C.muted, fontSize:11, textTransform:"uppercase", letterSpacing:0.8 },
  pinBox:{ background:C.card2, border:`1px solid ${C.border2}`, borderRadius:8, padding:"12px", display:"flex", flexDirection:"column", gap:9 },
  photoGrid:{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginTop:8 },
  photoThumb:{ aspectRatio:"1", borderRadius:8, overflow:"hidden", position:"relative", background:C.card2, border:`1px solid ${C.border}` },
  addPhotoBtn:{ aspectRatio:"1", borderRadius:8, background:C.card2, border:`2px dashed ${C.border}`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:4, cursor:"pointer", color:C.muted2, fontSize:11, textTransform:"uppercase", letterSpacing:0.5 },
  stopRow:{ background:C.card2, borderRadius:8, padding:"10px 12px", marginBottom:7, display:"flex", justifyContent:"space-between", alignItems:"center" },
  summRow:{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:`1px solid ${C.border}`, fontSize:13 },
  spinner:{ display:"inline-block", width:18, height:18, border:`2px solid ${C.border2}`, borderTop:`2px solid ${C.orange}`, borderRadius:"50%", animation:"spin 0.8s linear infinite" },
};

// ─── COMPONENTS ──────────────────────────────────────────────
function Field({ label, required, children, half }) {
  return <div style={{...S.field,...(half?{flex:1,marginBottom:0}:{})}}>
    <label style={S.label}>{label}{required&&<span style={{color:C.red}}> *</span>}</label>
    {children}
  </div>;
}
function TimeField({ label, value, onChange, required }) {
  return <Field label={label} required={required}>
    <div style={S.timeRow}>
      <input type="time" value={value} onChange={e=>onChange(e.target.value)} style={{...S.input,flex:1}}/>
      <button style={S.nowBtn} onClick={()=>onChange(nowTime())}>Now</button>
    </div>
  </Field>;
}
function SectionHead({ children }) {
  return <div style={S.sectionHead}><div style={S.sectionBar}/>{children}</div>;
}
function Divider({ label }) {
  return <div style={S.divider}><div style={{flex:1,height:1,background:C.border}}/>{label}<div style={{flex:1,height:1,background:C.border}}/></div>;
}
function YesNo({ label, value, onChange }) {
  return <Field label={label}>
    <div style={{display:"flex",gap:8}}>
      {["Yes","No"].map(o=>(
        <button key={o} onClick={()=>onChange(o)} style={{flex:1,padding:"10px",borderRadius:8,border:`1px solid ${value===o?C.orange:C.border2}`,background:value===o?(o==="Yes"?C.orangeDim:C.card2):C.card2,color:value===o?C.orange:C.muted2,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:16,textTransform:"uppercase",cursor:"pointer"}}>
          {o}
        </button>
      ))}
    </div>
  </Field>;
}
function PhotoCapture({ label, photos, onChange, maxPhotos=5 }) {
  const ref = useRef();
  function handleFiles(e) {
    Array.from(e.target.files).forEach(file=>{
      const r=new FileReader();
      r.onload=ev=>onChange(prev=>[...prev,{src:ev.target.result,name:file.name}]);
      r.readAsDataURL(file);
    });
    e.target.value="";
  }
  return <Field label={label}>
    <div style={S.photoGrid}>
      {photos.map((ph,i)=>(
        <div key={i} style={S.photoThumb}>
          <img src={ph.src} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
          <button onClick={()=>onChange(photos.filter((_,j)=>j!==i))} style={{position:"absolute",top:3,right:3,width:20,height:20,borderRadius:"50%",background:"rgba(0,0,0,0.75)",color:"#fff",border:"none",fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>
      ))}
      {photos.length<maxPhotos&&<div style={S.addPhotoBtn} onClick={()=>ref.current.click()}>
        <span style={{fontSize:22}}>📷</span><span>Add</span>
      </div>}
    </div>
    <input ref={ref} type="file" accept="image/*" capture="environment" multiple style={{display:"none"}} onChange={handleFiles}/>
  </Field>;
}
function PinCapture({ pin, onChange }) {
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  function captureGPS(){
    setLoading(true); setError("");
    if (!navigator.geolocation){setError("GPS not available.");setLoading(false);return;}
    navigator.geolocation.getCurrentPosition(
      pos=>{
        const {latitude:lat,longitude:lng}=pos.coords;
        onChange({lat,lng,link:`https://maps.google.com/?q=${lat},${lng}`,method:"GPS"});
        setLoading(false);
      },
      ()=>{setError("GPS failed. Paste a Maps link below.");setLoading(false);},
      {enableHighAccuracy:true,timeout:10000}
    );
  }
  return <Field label="Equipment Drop PIN">
    <div style={S.pinBox}>
      {pin?(
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:C.green}}>📍 PIN Captured ({pin.method})</div>
            {pin.lat&&<div style={{fontSize:11,color:C.muted2,marginTop:2}}>{pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}</div>}
            <a href={pin.link} target="_blank" rel="noreferrer" style={{fontSize:12,color:C.blue,marginTop:3,display:"block"}}>Open in Maps →</a>
          </div>
          <button onClick={()=>onChange(null)} style={{background:"none",border:`1px solid ${C.border2}`,borderRadius:6,color:C.muted2,fontSize:12,padding:"5px 10px",cursor:"pointer"}}>Clear</button>
        </div>
      ):(
        <>
          <button onClick={captureGPS} disabled={loading} style={{...S.btn,background:loading?C.card2:C.orange,color:loading?C.muted2:C.black,fontSize:15,marginBottom:0,padding:"11px"}}>
            {loading?"Getting GPS…":"📍 Pin Current Location (GPS)"}
          </button>
          {error&&<div style={{fontSize:12,color:C.red}}>{error}</div>}
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{flex:1,height:1,background:C.border}}/>
            <span style={{fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:0.5}}>or paste link</span>
            <div style={{flex:1,height:1,background:C.border}}/>
          </div>
          <input type="url" placeholder="Paste Google Maps link…" onChange={e=>{if(e.target.value) onChange({lat:null,lng:null,link:e.target.value,method:"Manual"});}} style={S.input}/>
        </>
      )}
    </div>
  </Field>;
}
function StopTracker({ stops, onChange }) {
  const [loc,setLoc]=useState(""); const [arr,setArr]=useState(""); const [dep,setDep]=useState("");
  function add(){if(!loc.trim())return; onChange([...stops,{location:loc,arrival:arr,departure:dep}]); setLoc("");setArr("");setDep("");}
  return <div>
    {stops.map((s,i)=>(
      <div key={i} style={S.stopRow}>
        <div><div style={{fontWeight:600,fontSize:13}}>{s.location}</div><div style={{fontSize:11,color:C.muted2}}>In: {s.arrival||"—"} · Out: {s.departure||"—"}</div></div>
        <button onClick={()=>onChange(stops.filter((_,j)=>j!==i))} style={{background:"none",border:"none",color:C.red,fontSize:18,cursor:"pointer"}}>✕</button>
      </div>
    ))}
    <div style={{background:C.card2,border:`1px dashed ${C.border}`,borderRadius:8,padding:12}}>
      <Field label="Location / Reason"><input value={loc} onChange={e=>setLoc(e.target.value)} placeholder="e.g. Fuel stop, Scale" style={S.input}/></Field>
      <div style={{...S.row,marginBottom:8}}>
        <div style={{flex:1}}>
          <label style={{...S.label,marginBottom:4}}>Time In</label>
          <div style={S.timeRow}><input type="time" value={arr} onChange={e=>setArr(e.target.value)} style={{...S.input,flex:1}}/><button style={S.nowBtn} onClick={()=>setArr(nowTime())}>Now</button></div>
        </div>
        <div style={{flex:1}}>
          <label style={{...S.label,marginBottom:4}}>Time Out</label>
          <div style={S.timeRow}><input type="time" value={dep} onChange={e=>setDep(e.target.value)} style={{...S.input,flex:1}}/><button style={S.nowBtn} onClick={()=>setDep(nowTime())}>Now</button></div>
        </div>
      </div>
      <button onClick={add} style={{...S.btn,background:C.card,border:`1px solid ${C.border2}`,color:C.text,fontSize:14,marginBottom:0,padding:"9px"}}>+ Add Stop</button>
    </div>
  </div>;
}
function WOCard({ wo }) {
  const items=[
    ["Customer",wo.customer||wo["Customer"]],
    ["Site",wo.location||wo["Location"]],
    (wo.siteSpecific||wo["Site Specific"])&&["Site Specific",wo.siteSpecific||wo["Site Specific"]],
    ["Waste",wo.waste||wo["Waste Type"]],
    ["Equipment",wo.equipment||wo["Equipment"]],
    ["Truck",wo.truck||wo["Truck"]],
    (wo.lsd||wo["LSD"])&&["LSD",wo.lsd||wo["LSD"]],
    (wo.disposal||wo["Disposal Site"])&&["Disposal",wo.disposal||wo["Disposal Site"]],
    (wo.po||wo["PO / Reference"])&&["PO / Ref",wo.po||wo["PO / Reference"]],
    (wo.siteContact||wo["Site Contact"])&&["Contact",wo.siteContact||wo["Site Contact"]],
    (wo.siteContactPhone||wo["Site Contact Phone"])&&["Phone",wo.siteContactPhone||wo["Site Contact Phone"]],
    (wo.placement||wo["Placement"])&&["Placement",wo.placement||wo["Placement"]],
  ].filter(Boolean);
  const service = wo.service||wo["Service"]||"";
  const orderOfDay = wo.orderOfDay||wo["Order of Day"]||"";
  const id = wo.id||wo["WO #"]||"";
  const notes = wo.notes||wo["Dispatch Notes"]||"";
  const pin = wo.pin||wo["PIN Link"]||"";
  return <div style={S.woCard}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
      <div>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:19,color:C.orange}}>#{orderOfDay} — {service.toUpperCase()}</div>
        <div style={{fontSize:11,color:C.muted2,marginTop:1}}>{id}</div>
      </div>
      <span style={{fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:20,background:C.yellowDim,color:C.yellowText,border:"1px solid #6b4f00",textTransform:"uppercase"}}>Dispatched</span>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"5px 10px",fontSize:13}}>
      {items.map(([k,v])=>(
        <div key={k} style={{display:"flex",flexDirection:"column",gridColumn:["PO / Ref","Placement","Site Specific"].includes(k)?"1/-1":undefined}}>
          <span style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:0.4}}>{k}</span>
          {k==="Phone"?<a href={`tel:${v}`} style={{color:C.blue,fontWeight:500}}>{v}</a>:<span style={{fontWeight:500}}>{v}</span>}
        </div>
      ))}
    </div>
    {notes&&<div style={{marginTop:10,paddingTop:10,borderTop:`1px solid ${C.border}`,fontSize:13,color:"#bbb",lineHeight:1.5}}>
      <span style={{fontSize:10,color:C.orange,textTransform:"uppercase",display:"block",marginBottom:3}}>Dispatch Notes</span>
      {notes}
    </div>}
    {pin&&<a href={pin} target="_blank" rel="noreferrer" style={{display:"inline-flex",alignItems:"center",gap:5,color:C.blue,fontSize:13,marginTop:8,fontWeight:600,textDecoration:"none"}}>📍 Open Dispatch PIN</a>}
  </div>;
}
function BillableSummary({ form }) {
  const start=form.departFromBase||form.arrivalAtSite;
  const end=form.postTripFinish||form.returnToBase;
  const hours=calcHours(start,end);
  const decimal=decimalHours(start,end);
  const timeline=[
    {dot:"▶",label:"Job Start",time:form.departFromBase,note:"Departed base / prev. location"},
    {dot:"·",label:"Arrived Site",time:form.arrivalAtSite,note:""},
    {dot:"·",label:"Departed Site",time:form.departureFromSite,note:""},
    {dot:"·",label:"Arr. Disposal",time:form.disposalArrival,note:""},
    {dot:"·",label:"Dep. Disposal",time:form.disposalDeparture,note:""},
    {dot:"·",label:"Returned Base",time:form.returnToBase,note:""},
    {dot:"◀",label:"Job End",time:form.postTripFinish,note:"Post-trip & paperwork"},
  ].filter(r=>r.time);
  return <div style={{background:C.orangeDim,border:`2px solid ${C.orange}`,borderRadius:12,padding:"16px",marginBottom:14}}>
    <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:13,color:C.orange,textTransform:"uppercase",letterSpacing:1,marginBottom:12}}>⏱ Cradle-to-Grave Billable Hours</div>
    <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:14}}>
      {timeline.map((r,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:20,textAlign:"center",color:r.dot==="·"?C.muted:C.orange,fontWeight:900,fontSize:r.dot==="·"?20:14,lineHeight:1}}>{r.dot}</div>
          <div style={{flex:1}}><span style={{fontSize:12,fontWeight:600,color:r.dot==="·"?C.text:C.orange}}>{r.label}</span>{r.note&&<span style={{fontSize:11,color:C.muted2}}> — {r.note}</span>}</div>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:16,color:r.dot==="·"?C.text:C.orange}}>{r.time}</div>
        </div>
      ))}
    </div>
    <div style={{borderTop:`1px solid ${C.orange}`,paddingTop:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div>
        <div style={{fontSize:11,color:C.muted2,textTransform:"uppercase",letterSpacing:0.8}}>Total Billable</div>
        <div style={{fontSize:11,color:C.muted2,marginTop:1}}>{start&&end?`${start} → ${end}`:"Incomplete — missing start or end"}</div>
      </div>
      <div style={{textAlign:"right"}}>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:34,color:C.orange,lineHeight:1}}>{hours||"—"}</div>
        {decimal&&<div style={{fontSize:11,color:C.muted2,marginTop:2}}>{decimal} hrs</div>}
      </div>
    </div>
  </div>;
}

const BLANK = {
  departFromBase:"", stopsEnRoute:[],
  arrivalAtSite:"", orientationRequired:"", equipmentIn:"", equipmentOut:"",
  equipmentDropPin:null, sitePhotos:[], departureFromSite:"",
  disposalArrival:"", disposalDeparture:"",
  disposalTicket:"", disposalWeight:"", disposalWasteType:"", disposalRate:"60",
  disposalTicketPhotos:[],
  damageToEquipment:"", damagePhotos:[],
  equipNeedsCleaning:"", truckNeedsCleaning:"", cleaningTime:"",
  stopsReturn:[], returnToBase:"", postTripFinish:"",
  changeOrderContact:"", jobStatus:"Complete", driverNotes:"",
};

// ─── LOCALSTORAGE HELPERS ────────────────────────────────────
const LS_DRAFT = "ed_draft";
const LS_WO    = "ed_current_wo";
const LS_DRN   = "ed_drn";
const LS_DRIVER= "ed_driver";
const LS_SCREEN= "ed_screen";

function saveDraft(form, wo, drn, driver, screen) {
  try {
    // Don't save base64 photos to localStorage — too large, causes crashes
    const safe = {
      ...form,
      sitePhotos: [],
      disposalTicketPhotos: [],
      damagePhotos: [],
    };
    localStorage.setItem(LS_DRAFT,  JSON.stringify(safe));
    localStorage.setItem(LS_WO,     JSON.stringify(wo));
    localStorage.setItem(LS_DRN,    drn||"");
    localStorage.setItem(LS_DRIVER, driver||"");
    localStorage.setItem(LS_SCREEN, screen||"driver");
  } catch(e) {}
}

function clearDraft() {
  try {
    [LS_DRAFT,LS_WO,LS_DRN,LS_DRIVER,LS_SCREEN].forEach(k=>localStorage.removeItem(k));
  } catch(e) {}
}

function loadDraft() {
  try {
    const form   = JSON.parse(localStorage.getItem(LS_DRAFT)||"null");
    const wo     = JSON.parse(localStorage.getItem(LS_WO)||"null");
    const drn    = localStorage.getItem(LS_DRN)||"";
    const driver = localStorage.getItem(LS_DRIVER)||"";
    const screen = localStorage.getItem(LS_SCREEN)||"driver";
    return { form, wo, drn, driver, screen };
  } catch(e) { return null; }
}

// ─── APP ─────────────────────────────────────────────────────
export default function App() {
  // Restore from localStorage on startup (handles camera crash/reload)
  const saved = loadDraft();
  const [screen,setScreen]   = useState(saved?.screen==="form"&&saved?.wo ? "form" : saved?.screen==="jobs"&&saved?.driver ? "jobs" : "driver");
  const [driver,setDriver]   = useState(saved?.driver||null);
  const [allWOs,setAllWOs]   = useState([]);
  const [loading,setLoading] = useState(false);
  const [lastSync,setLastSync]= useState(null);
  const [fetchError,setFetchError]= useState("");
  const [currentWO,setWO]    = useState(saved?.wo||null);
  const [completed,setDone]  = useState({});
  const [drn,setDrn]         = useState(saved?.drn||"");
  const [form,setForm]       = useState(saved?.form ? {...BLANK,...saved.form} : {...BLANK});
  const [submitted,setSub]   = useState(null);
  const [toast,setToast]     = useState(null);
  const [posting,setPosting] = useState(false);

  // Auto-save draft whenever form/screen/wo changes
  useEffect(() => {
    if (screen === "form" && currentWO) {
      saveDraft(form, currentWO, drn, driver, screen);
    } else if (screen === "jobs" && driver) {
      saveDraft(form, currentWO, drn, driver, screen);
    }
  }, [form, screen, currentWO, drn, driver]);

  // Show restore toast if we recovered a draft
  useEffect(() => {
    if (saved?.screen==="form" && saved?.wo) {
      showToast("📋 Draft restored — carry on where you left off");
    }
  }, []);

  function f(key){ return val=>setForm(p=>({...p,[key]:val})); }
  function fi(key){ return e=>f(key)(e.target.value); }
  function showToast(msg,ok=true){ setToast({msg,ok}); setTimeout(()=>setToast(null),4000); }

  // ── FETCH JOBS FROM SHEET ──────────────────────────────────
  const loadJobs = useCallback(async () => {
    setLoading(true);
    setFetchError("");
    try {
      const rows = await fetchWOs();
      setAllWOs(rows);
      setLastSync(new Date());
    } catch(e) {
      setFetchError("Couldn't reach server. Check connection.");
    }
    setLoading(false);
  }, []);

  // Auto-load when driver selected
  useEffect(() => {
    if (screen === "jobs") loadJobs();
  }, [screen, loadJobs]);

  // Filter today's jobs for this driver that aren't complete
  const today = todaySheetStr();
  const myJobs = allWOs.filter(wo => {
    const woDriver  = wo["Driver"]  || wo.driver  || "";
    const woDate    = normaliseDate(wo["Date Created"] || wo.date || "");
    const woStatus  = wo["Status"] || wo.status || "";
    return woDriver === driver &&
           woDate === today &&
           woStatus !== "Cancelled";
  }).sort((a,b)=>{
    const oa = Number(a["Order of Day"]||a.orderOfDay||0);
    const ob = Number(b["Order of Day"]||b.orderOfDay||0);
    return oa - ob;
  });

  const pendingJobs   = myJobs.filter(wo=>{
    const id = wo["WO #"]||wo.id;
    const status = wo["Status"]||wo.status;
    return !completed[id] && status !== "Complete";
  });
  const completedJobs = myJobs.filter(wo=>{
    const id = wo["WO #"]||wo.id;
    const status = wo["Status"]||wo.status;
    return completed[id] || status === "Complete";
  });

  function openJob(wo){
    setWO(wo);
    setDrn(genDRN());
    const equip = wo.equipment||wo["Equipment"]||"";
    const waste = wo.waste||wo["Waste Type"]||"";
    setForm({...BLANK, equipmentOut:equip, disposalWasteType:waste, disposalRate:"60"});
    setScreen("form");
    window.scrollTo(0,0);
  }

  async function submitJob(){
    if (!form.arrivalAtSite){ showToast("⚠ Enter arrival at site",false); return; }
    setPosting(true);
    const woNorm = {
      id: currentWO["WO #"]||currentWO.id,
      orderOfDay: currentWO["Order of Day"]||currentWO.orderOfDay,
      customer: currentWO["Customer"]||currentWO.customer,
      location: currentWO["Location"]||currentWO.location,
      siteSpecific: currentWO["Site Specific"]||currentWO.siteSpecific||"",
      service: currentWO["Service"]||currentWO.service,
      equipment: currentWO["Equipment"]||currentWO.equipment||"",
      truck: currentWO["Truck"]||currentWO.truck||"",
      waste: currentWO["Waste Type"]||currentWO.waste||"",
    };
    const rec = { drn, wo:woNorm, driver, form:sanitizeForm(form), submittedAt:new Date().toISOString() };
    try {
      await postToSheets({ type:"driverrecord", ...rec });
      setDone(p=>({...p,[woNorm.id]:rec}));
      setSub({...rec, form});
      setScreen("done");
      window.scrollTo(0,0);
      clearDraft();
      showToast("✅ Submitted — sheet & email sent");
    } catch(e) {
      showToast("⚠ Saved locally — check connection",false);
      setDone(p=>({...p,[woNorm.id]:rec}));
      setSub({...rec, form});
      setScreen("done");
    }
    setPosting(false);
  }

  return <div style={S.root}>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800;900&family=Barlow:wght@400;500;600&display=swap"/>

    {/* HEADER */}
    <div style={S.header}>
      <div style={S.logo}>ELEMENT<span style={{color:C.text,fontWeight:400}}> DISPOSAL</span></div>
      <div style={{fontSize:11,color:C.muted2,textAlign:"right",lineHeight:1.5}}>{todayStr()}<br/><span style={{color:C.orange}}>Driver Portal</span></div>
    </div>

    {/* ── DRIVER SELECT ── */}
    {screen==="driver"&&<div style={S.screen} ref={el=>{ if(el) clearDraft(); }}>
      <div style={{height:14}}/>
      <div style={S.title}>Who's driving?</div>
      <div style={S.sub}>Tap your name to see today's jobs</div>
      {DRIVERS.map(d=>(
        <button key={d.name} onClick={()=>{setDriver(d.name);setScreen("jobs");}} style={S.driverBtn}>
          <div style={S.avatar}>{d.initials}</div>
          <div style={{flex:1}}><div style={{fontWeight:600,fontSize:16,color:C.text}}>{d.name}</div></div>
          <span style={{color:C.orange,fontSize:22}}>›</span>
        </button>
      ))}
    </div>}

    {/* ── JOB LIST ── */}
    {screen==="jobs"&&<div style={S.screen}>
      <button style={S.backBtn} onClick={()=>setScreen("driver")}>← Back</button>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
        <div style={S.title}>{driver?.split(" ")[0]}'s Jobs</div>
        <button
          onClick={loadJobs}
          disabled={loading}
          style={{...S.btnSm, background:loading?C.card2:C.card, color:loading?C.muted:C.orange, border:`1px solid ${C.border2}`, marginTop:4}}>
          {loading ? <span style={S.spinner}/> : "↻ Refresh"}
        </button>
      </div>

      {/* Sync status */}
      <div style={{...S.sub, marginBottom:14}}>
        {loading ? "Loading jobs from dispatch…" :
         fetchError ? <span style={{color:C.red}}>{fetchError}</span> :
         lastSync ? `${pendingJobs.length} pending · ${completedJobs.length} complete · synced ${lastSync.toLocaleTimeString("en-CA",{hour:"2-digit",minute:"2-digit"})}` :
         ""}
      </div>

      {/* Loading skeleton */}
      {loading&&[1,2,3].map(i=>(
        <div key={i} style={{...S.jobCard,opacity:0.4}}>
          <div style={{...S.orderNum,background:C.border}}/>
          <div style={{flex:1}}>
            <div style={{height:14,background:C.border,borderRadius:4,width:"60%",marginBottom:6}}/>
            <div style={{height:11,background:C.border2,borderRadius:4,width:"40%"}}/>
          </div>
        </div>
      ))}

      {/* No jobs */}
      {!loading&&pendingJobs.length===0&&completedJobs.length===0&&(
        <div style={{...S.card,textAlign:"center",padding:"32px 16px",color:C.muted2}}>
          <div style={{fontSize:32,marginBottom:12}}>📋</div>
          <div style={{fontWeight:600,marginBottom:6}}>No jobs dispatched yet</div>
          <div style={{fontSize:13}}>Check back after dispatch sends your work orders.</div>
        </div>
      )}

      {/* Pending jobs */}
      {!loading&&pendingJobs.map(wo=>{
        const id=wo["WO #"]||wo.id;
        const orderNum=wo["Order of Day"]||wo.orderOfDay;
        const customer=wo["Customer"]||wo.customer;
        const service=wo["Service"]||wo.service;
        const location=wo["Location"]||wo.location;
        const siteSpecific=wo["Site Specific"]||wo.siteSpecific;
        return <div key={id} style={S.jobCard} onClick={()=>openJob(wo)}>
          <div style={S.orderNum}>{orderNum}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:600,fontSize:15,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{customer}</div>
            <div style={{fontSize:12,color:C.muted2,marginTop:2}}>{service} · {location}{siteSpecific?` – ${siteSpecific}`:""}</div>
          </div>
          <span style={{color:C.orange,fontSize:20}}>›</span>
        </div>;
      })}

      {/* Completed */}
      {!loading&&completedJobs.length>0&&<>
        <Divider label="Completed"/>
        {completedJobs.map(wo=>{
          const id=wo["WO #"]||wo.id;
          const orderNum=wo["Order of Day"]||wo.orderOfDay;
          const customer=wo["Customer"]||wo.customer;
          const service=wo["Service"]||wo.service;
          const location=wo["Location"]||wo.location;
          return <div key={id} style={{...S.jobCard,opacity:0.55}}>
            <div style={{...S.orderNum,background:C.green}}>{orderNum}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:600,fontSize:15}}>{customer}</div>
              <div style={{fontSize:12,color:C.muted2}}>{service} · {location}</div>
            </div>
            <span style={{color:C.green}}>✓</span>
          </div>;
        })}
      </>}
    </div>}

    {/* ── FORM ── */}
    {screen==="form"&&currentWO&&<div style={S.screen}>
      <button style={S.backBtn} onClick={()=>setScreen("jobs")}>← Back to jobs</button>
      <div style={{...S.card,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",marginBottom:12}}>
        <div>
          <div style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:0.8,marginBottom:2}}>Driver Record #</div>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:14,color:C.orange,letterSpacing:1}}>{drn}</div>
        </div>
        <div style={{fontSize:11,color:C.muted2,textAlign:"right"}}>{driver}<br/>{todayStr()}</div>
      </div>
      <WOCard wo={currentWO}/>

      <SectionHead>1 — Job Start</SectionHead>
      <div style={S.card}>
        <TimeField label="Time departed base / previous location ▶ Clock starts" value={form.departFromBase} onChange={f("departFromBase")} required/>
      </div>

      <SectionHead>2 — En Route Stops</SectionHead>
      <div style={S.card}><StopTracker stops={form.stopsEnRoute} onChange={f("stopsEnRoute")}/></div>

      <SectionHead>3 — On Site</SectionHead>
      <div style={S.card}>
        <TimeField label="Arrival at site" value={form.arrivalAtSite} onChange={f("arrivalAtSite")} required/>
        <YesNo label="Orientation required?" value={form.orientationRequired} onChange={f("orientationRequired")}/>
        <div style={S.row}>
          <Field label="Equipment # IN" half><input value={form.equipmentIn} onChange={fi("equipmentIn")} placeholder="e.g. 30B-Y" style={S.input}/></Field>
          <Field label="Equipment # OUT" half><input value={form.equipmentOut} onChange={fi("equipmentOut")} placeholder="e.g. 30B-X" style={S.input}/></Field>
        </div>
        <PinCapture pin={form.equipmentDropPin} onChange={f("equipmentDropPin")}/>
        <PhotoCapture label="Site / Bin Photos" photos={form.sitePhotos} onChange={f("sitePhotos")}/>
        <TimeField label="Departure from site" value={form.departureFromSite} onChange={f("departureFromSite")}/>
      </div>

      <SectionHead>4 — Disposal</SectionHead>
      <div style={S.card}>
        <TimeField label="Arrival at disposal" value={form.disposalArrival} onChange={f("disposalArrival")}/>
        <TimeField label="Departure from disposal" value={form.disposalDeparture} onChange={f("disposalDeparture")}/>
        <div style={S.row}>
          <Field label="Disposal ticket #" half><input value={form.disposalTicket} onChange={fi("disposalTicket")} placeholder="e.g. DT-4821" style={S.input}/></Field>
          <Field label="Net weight (tonnes)" half><input type="number" value={form.disposalWeight} onChange={fi("disposalWeight")} placeholder="0.00" step="0.01" style={S.input}/></Field>
        </div>
        <div style={S.row}>
          <Field label="Waste type" half>
            <select value={form.disposalWasteType} onChange={fi("disposalWasteType")} style={S.select}>
              {WASTE_TYPES.map(w=><option key={w} value={w}>{w||"Select…"}</option>)}
            </select>
          </Field>
          <Field label="Disposal rate ($/t)" half><input value={form.disposalRate} onChange={fi("disposalRate")} placeholder="$60" style={S.input}/></Field>
        </div>
        <PhotoCapture label="🧾 Landfill Ticket Photo" photos={form.disposalTicketPhotos} onChange={f("disposalTicketPhotos")} maxPhotos={3}/>
      </div>

      <SectionHead>5 — Equipment & Truck Condition</SectionHead>
      <div style={S.card}>
        <YesNo label="Damage to equipment?" value={form.damageToEquipment} onChange={f("damageToEquipment")}/>
        {form.damageToEquipment==="Yes"&&<PhotoCapture label="📸 Damage Photos" photos={form.damagePhotos} onChange={f("damagePhotos")} maxPhotos={6}/>}
        <YesNo label="Equipment requiring cleaning?" value={form.equipNeedsCleaning} onChange={f("equipNeedsCleaning")}/>
        <YesNo label="Truck requiring cleaning?" value={form.truckNeedsCleaning} onChange={f("truckNeedsCleaning")}/>
        {form.truckNeedsCleaning==="Yes"&&<Field label="Cleaning time (mins)"><input type="number" value={form.cleaningTime} onChange={fi("cleaningTime")} placeholder="e.g. 30" style={S.input}/></Field>}
      </div>

      <SectionHead>6 — Return Trip Stops</SectionHead>
      <div style={S.card}><StopTracker stops={form.stopsReturn} onChange={f("stopsReturn")}/></div>

      <SectionHead>7 — Wrap-Up ◀ Clock ends</SectionHead>
      <div style={S.card}>
        <TimeField label="Time returned to base / next location" value={form.returnToBase} onChange={f("returnToBase")}/>
        <TimeField label="Post-trip & paperwork complete ◀ Final end time" value={form.postTripFinish} onChange={f("postTripFinish")}/>
        <Field label="Site contact who authorized change order / special request">
          <input value={form.changeOrderContact} onChange={fi("changeOrderContact")} placeholder="Name and title" style={S.input}/>
        </Field>
        <Field label="Job status">
          <select value={form.jobStatus} onChange={fi("jobStatus")} style={S.select}>
            {["Complete","Partially Completed","Unable to Complete — Site Refused","Unable to Complete — Access Issue","Unable to Complete — Other"].map(o=><option key={o}>{o}</option>)}
          </select>
        </Field>
        <Field label="Driver notes / issues">
          <textarea value={form.driverNotes} onChange={fi("driverNotes")} rows={4} placeholder="Placement notes, site issues, damage, anything the office needs to know…" style={S.textarea}/>
        </Field>
      </div>

      <button style={{...S.btn,background:posting?C.card2:C.green,color:posting?C.muted2:"#fff"}} onClick={submitJob} disabled={posting}>
        {posting?"Submitting…":"Submit Job Record"}
      </button>
      <button style={{...S.btn,background:C.card2,color:C.text,border:`1px solid ${C.border2}`}} onClick={()=>setScreen("jobs")} disabled={posting}>
        Save & Return to Jobs
      </button>
    </div>}

    {/* ── DONE ── */}
    {screen==="done"&&submitted&&<div style={S.screen}>
      <div style={{textAlign:"center",padding:"22px 0 10px"}}>
        <div style={{fontSize:50}}>✅</div>
        <div style={{...S.title,textAlign:"center",marginTop:8}}>Submitted</div>
        <div style={{...S.sub,textAlign:"center"}}>Record saved to Google Sheets · Email sent to office</div>
      </div>
      <div style={{...S.card,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:16,color:C.orange,textAlign:"center",padding:12,letterSpacing:1,marginBottom:12}}>{submitted.drn}</div>
      <BillableSummary form={submitted.form}/>
      <div style={S.card}>
        {[
          ["Customer",submitted.wo.customer],
          ["Work Order",submitted.wo.id],
          ["Service",submitted.wo.service],
          ["Site",`${submitted.wo.location}${submitted.wo.siteSpecific?` – ${submitted.wo.siteSpecific}`:""}`],
          ["Equip Out",submitted.form.equipmentOut||"—"],
          ["Equip In",submitted.form.equipmentIn||"—"],
          ["Drop PIN",submitted.form.equipmentDropPin?"✓ Captured":"Not recorded"],
          ["Site Photos",submitted.form.sitePhotos.length?`${submitted.form.sitePhotos.length} photo(s)`:"None"],
          ["Disposal Ticket",submitted.form.disposalTicket||"—"],
          ["Net Weight",submitted.form.disposalWeight?`${submitted.form.disposalWeight} t`:"—"],
          ["Waste Type",submitted.form.disposalWasteType||"—"],
          ["Disposal Rate",submitted.form.disposalRate?`$${submitted.form.disposalRate}/t`:"—"],
          ["Ticket Photos",submitted.form.disposalTicketPhotos.length?`${submitted.form.disposalTicketPhotos.length} photo(s)`:"None"],
          ["Damage",submitted.form.damageToEquipment||"—"],
          ["Status",submitted.form.jobStatus],
        ].map(([k,v],i,arr)=>(
          <div key={k} style={{...S.summRow,...(i===arr.length-1?{borderBottom:"none"}:{})}}>
            <span style={{color:C.muted2}}>{k}</span>
            <span style={{fontWeight:500,textAlign:"right",maxWidth:"60%"}}>{v}</span>
          </div>
        ))}
        {submitted.form.driverNotes&&<div style={{paddingTop:10,borderTop:`1px solid ${C.border}`,fontSize:13,color:"#bbb",lineHeight:1.5}}>
          <span style={{fontSize:10,color:C.orange,textTransform:"uppercase",display:"block",marginBottom:3}}>Driver Notes</span>
          {submitted.form.driverNotes}
        </div>}
      </div>
      <button style={{...S.btn,background:C.orange,color:C.black}} onClick={()=>{setScreen("jobs");loadJobs();}}>Back to Jobs</button>
    </div>}

    {/* TOAST */}
    {toast&&<div style={{position:"fixed",bottom:20,left:"50%",transform:"translateX(-50%)",background:toast.ok?C.green:C.red,color:"#fff",padding:"11px 24px",borderRadius:30,zIndex:999,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:15,whiteSpace:"nowrap",boxShadow:"0 4px 20px rgba(0,0,0,0.5)"}}>
      {toast.msg}
    </div>}
  </div>;
}
