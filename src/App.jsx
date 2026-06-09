import { useState, useEffect, useRef } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const STORAGE_KEY = "projectpulse_v4";
const defaultData = {
  members: [
    { id:"m0", name:"Admin User", initials:"AU", color:"#F04D5A", role:"admin",  email:"admin@demo.com",  password:"admin123"  },
    { id:"m1", name:"Neel K.",    initials:"NK", color:"#4F8EF7", role:"member", email:"neel@demo.com",   password:"member123" },
    { id:"m2", name:"Priya R.",   initials:"PR", color:"#A78BFA", role:"member", email:"priya@demo.com",  password:"member123" },
    { id:"m3", name:"Arjun S.",   initials:"AS", color:"#22C97A", role:"member", email:"arjun@demo.com",  password:"member123" },
    { id:"m4", name:"Riya M.",    initials:"RM", color:"#F59E0B", role:"member", email:"riya@demo.com",   password:"member123" },
  ],
  projects: [
    { id:"p1", name:"Brand Revamp",  color:"#4F8EF7", description:"Full brand identity refresh for Q3", createdAt:Date.now()-864e5*5, memberIds:["m0","m1","m2"] },
    { id:"p2", name:"Mobile App v2", color:"#22C97A", description:"PWA upgrade with offline support",   createdAt:Date.now()-864e5*2, memberIds:["m0","m1","m3","m4"] },
  ],
  tasks: [
    { id:"t1", projectId:"p1", title:"Design logo variations",    assigneeId:"m1", status:"done",        priority:"high",   due:"2026-06-01", createdAt:Date.now()-864e5*4, asanaLink:"", remarks:"Completed 3 variants", attachments:[], comments:[], followers:[] },
    { id:"t2", projectId:"p1", title:"Color palette finalization", assigneeId:"m2", status:"in_progress", priority:"high",   due:"2026-06-15", createdAt:Date.now()-864e5*3, asanaLink:"", remarks:"", attachments:[], comments:[{id:"c1",authorId:"m2",text:"Shortlisted to 2 options, checking with client",createdAt:Date.now()-36e5}], followers:["m0","m1"] },
    { id:"t3", projectId:"p1", title:"Typography guidelines",      assigneeId:"m3", status:"todo",        priority:"medium", due:"2026-06-20", createdAt:Date.now()-864e5*2, asanaLink:"", remarks:"", attachments:[], comments:[], followers:[] },
    { id:"t4", projectId:"p2", title:"Service worker setup",       assigneeId:"m1", status:"in_progress", priority:"high",   due:"2026-06-18", createdAt:Date.now()-864e5,   asanaLink:"https://app.asana.com/0/123/456", remarks:"Refer Asana for full spec", attachments:[], comments:[], followers:["m0"] },
    { id:"t5", projectId:"p2", title:"Offline data sync logic",    assigneeId:"m4", status:"todo",        priority:"medium", due:"2026-06-25", createdAt:Date.now(),          asanaLink:"", remarks:"", attachments:[], comments:[], followers:[] },
    { id:"t6", projectId:"p2", title:"Push notification flow",     assigneeId:"m2", status:"blocked",     priority:"low",    due:"2026-06-28", createdAt:Date.now(),          asanaLink:"", remarks:"Blocked pending Firebase keys", attachments:[], comments:[], followers:["m1","m3"] },
  ],
};

function loadData() { try { const r=localStorage.getItem(STORAGE_KEY); return r?JSON.parse(r):defaultData; } catch { return defaultData; } }
function saveData(d) { try { localStorage.setItem(STORAGE_KEY,JSON.stringify(d)); } catch {} }

const uid = () => Math.random().toString(36).slice(2,9);
const today = () => new Date().toISOString().slice(0,10);
const fmtDate = ts => new Date(ts).toLocaleString("en-IN",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});

const STATUS = {
  todo:        { label:"To Do",       color:"#6B7A99", bg:"rgba(107,122,153,0.13)" },
  in_progress: { label:"In Progress", color:"#4F8EF7", bg:"rgba(79,142,247,0.13)"  },
  blocked:     { label:"Blocked",     color:"#F04D5A", bg:"rgba(240,77,90,0.13)"   },
  done:        { label:"Done",        color:"#22C97A", bg:"rgba(34,201,122,0.13)"  },
};
const PRIORITY = {
  high:   { label:"High",   color:"#F04D5A", bg:"rgba(240,77,90,0.12)"   },
  medium: { label:"Medium", color:"#F59E0B", bg:"rgba(245,158,11,0.12)"  },
  low:    { label:"Low",    color:"#6B7A99", bg:"rgba(107,122,153,0.10)" },
};
const PROJECT_COLORS = ["#4F8EF7","#22C97A","#A78BFA","#F59E0B","#F04D5A","#38BDF8","#FB923C","#34D399"];
const C = { bg:"#080B12",surface:"#0E1320",card:"#131929",cardHov:"#172035",border:"#1C2640",border2:"#242E4A",accent:"#4F8EF7",text:"#E2E8F8",muted:"#5A6A8A",muted2:"#8896B0" };
const F = "'Syne',sans-serif";

// ── SHARE HELPERS ─────────────────────────────────────────────────────────────
function makeShareURL(task,members,projects){
  const asgn=members.find(m=>m.id===task.assigneeId);
  const proj=projects.find(p=>p.id===task.projectId);
  const followerNames=(task.followers||[]).map(id=>members.find(m=>m.id===id)?.name).filter(Boolean).join(", ");
  const d={
    title:task.title,
    project:proj?.name||"",
    assignee:asgn?.name||"Unassigned",
    status:STATUS[task.status]?.label||"",
    priority:PRIORITY[task.priority]?.label||"",
    due:task.due||"",
    remarks:task.remarks||"",
    asanaLink:task.asanaLink||"",
    followers:followerNames,
  };
  const encoded=btoa(unescape(encodeURIComponent(JSON.stringify(d))));
  return `${window.location.origin}${window.location.pathname}#task=${encoded}`;
}

function SharedTaskView({data,onClose}){
  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center",padding:16,backdropFilter:"blur(8px)",fontFamily:F}} onClick={onClose}>
    <div style={{background:C.card,border:`1px solid ${C.border2}`,borderRadius:18,width:"100%",maxWidth:460,maxHeight:"90vh",overflow:"auto",boxShadow:"0 32px 80px rgba(0,0,0,.7)",animation:"slideUp .22s ease"}} onClick={e=>e.stopPropagation()}>
      <div style={{background:`linear-gradient(135deg,${C.accent},#7B5CF0)`,borderRadius:"18px 18px 0 0",padding:"18px 22px",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <div style={{fontSize:10,color:"rgba(255,255,255,.7)",marginBottom:4,letterSpacing:.8}}>SHARED VIA PROJECTPULSE</div>
          <div style={{fontSize:16,fontWeight:800,color:"#fff",lineHeight:1.3}}>{data.title}</div>
        </div>
        <button onClick={onClose} style={{background:"rgba(255,255,255,.15)",border:"none",borderRadius:8,width:28,height:28,cursor:"pointer",color:"#fff",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>×</button>
      </div>
      <div style={{padding:"18px 22px 22px"}}>
        {[["Project",data.project],["Assignee",data.assignee],["Due Date",data.due],["Status",data.status],["Priority",data.priority],["Followers",data.followers]].filter(([,v])=>v).map(([k,v])=>(
          <div key={k} style={{display:"flex",gap:12,padding:"9px 0",borderBottom:`1px solid ${C.border}`}}>
            <span style={{fontSize:10,fontWeight:700,color:C.muted2,width:76,flexShrink:0,letterSpacing:.8,paddingTop:2}}>{k.toUpperCase()}</span>
            <span style={{fontSize:13,color:C.text}}>{v}</span>
          </div>
        ))}
        {data.remarks&&<div style={{marginTop:14}}>
          <div style={{fontSize:10,fontWeight:700,color:C.muted2,marginBottom:6,letterSpacing:.8}}>REMARKS</div>
          <div style={{fontSize:13,color:C.text,lineHeight:1.5,background:C.surface,borderRadius:10,padding:"10px 14px"}}>{data.remarks}</div>
        </div>}
        {data.asanaLink&&<div style={{marginTop:14}}>
          <a href={data.asanaLink} target="_blank" rel="noreferrer" style={{fontSize:12,color:C.accent,display:"inline-flex",alignItems:"center",gap:4}}>Open in Asana ↗</a>
        </div>}
        <div style={{marginTop:16,paddingTop:14,borderTop:`1px solid ${C.border}`,fontSize:11,color:C.muted,textAlign:"center"}}>Open ProjectPulse to manage this task</div>
      </div>
    </div>
  </div>;
}

// ── ATOMS ─────────────────────────────────────────────────────────────────────
function Pill({label,color,bg,small}){
  return <span style={{display:"inline-flex",alignItems:"center",padding:small?"2px 7px":"3px 10px",borderRadius:20,fontSize:small?10:11,fontWeight:700,color,background:bg,whiteSpace:"nowrap",fontFamily:F,letterSpacing:.3}}>{label}</span>;
}
function Avatar({member,size=28,overlap}){
  if(!member)return null;
  return <div title={member.name} style={{width:size,height:size,borderRadius:"50%",background:member.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*.36,fontWeight:800,color:"#fff",fontFamily:F,flexShrink:0,border:`2px solid ${C.card}`,marginLeft:overlap?-8:0,zIndex:overlap}}>{member.initials[0]}</div>;
}
function Ring({pct,size=44,stroke=4,color}){
  const r=(size-stroke)/2,circ=2*Math.PI*r,dash=(pct/100)*circ;
  return <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.border2} strokeWidth={stroke}/><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{transition:"stroke-dasharray .6s ease"}}/></svg>;
}
function Btn({children,onClick,variant="primary",small,full,disabled,style:sx={}}){
  const S={primary:{background:C.accent,color:"#fff",border:"none"},ghost:{background:"transparent",color:C.muted2,border:`1px solid ${C.border2}`},danger:{background:"rgba(240,77,90,.12)",color:"#F04D5A",border:"1px solid rgba(240,77,90,.25)"},success:{background:"rgba(34,201,122,.12)",color:"#22C97A",border:"1px solid rgba(34,201,122,.25)"}};
  return <button onClick={onClick} disabled={disabled} style={{...S[variant],borderRadius:10,padding:small?"6px 14px":"9px 18px",fontSize:small?12:13,fontWeight:700,fontFamily:F,cursor:disabled?"not-allowed":"pointer",opacity:disabled?.5:1,width:full?"100%":"auto",transition:"all .18s",display:"inline-flex",alignItems:"center",justifyContent:"center",gap:6,whiteSpace:"nowrap",...sx}}>{children}</button>;
}
function Inp({label,value,onChange,placeholder,type="text",options,required}){
  const base={width:"100%",background:C.surface,border:`1px solid ${C.border2}`,borderRadius:10,padding:"9px 13px",color:C.text,fontSize:13,fontFamily:F,outline:"none",boxSizing:"border-box"};
  return <div style={{marginBottom:14}}>
    {label&&<div style={{fontSize:11,fontWeight:700,color:C.muted2,marginBottom:6,letterSpacing:.8,fontFamily:F}}>{label}{required&&" *"}</div>}
    {options?<select value={value} onChange={e=>onChange(e.target.value)} style={base}>{options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>
    :type==="textarea"?<textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={3} style={{...base,resize:"vertical"}}/>
    :<input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={base}/>}
  </div>;
}
function Modal({title,onClose,children,width=440}){
  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16,backdropFilter:"blur(8px)"}} onClick={onClose}>
    <div style={{background:C.card,border:`1px solid ${C.border2}`,borderRadius:18,width:"100%",maxWidth:width,maxHeight:"90vh",overflow:"auto",boxShadow:"0 32px 80px rgba(0,0,0,.6)",animation:"slideUp .22s ease"}} onClick={e=>e.stopPropagation()}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"18px 22px 0",marginBottom:18}}>
        <div style={{fontSize:16,fontWeight:800,color:C.text,fontFamily:F}}>{title}</div>
        <button onClick={onClose} style={{background:C.border,border:"none",borderRadius:8,width:28,height:28,cursor:"pointer",color:C.muted2,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>x</button>
      </div>
      <div style={{padding:"0 22px 22px"}}>{children}</div>
    </div>
  </div>;
}

// ── LOGIN ─────────────────────────────────────────────────────────────────────
function LoginScreen({members,onLogin}){
  const [email,setEmail]=useState("");
  const [pass,setPass]=useState("");
  const [err,setErr]=useState("");

  const handleLogin=()=>{
    const m=members.find(x=>x.email?.toLowerCase()===email.trim().toLowerCase());
    if(!m||m.password!==pass){setErr("Invalid email or password");return;}
    onLogin(m);
  };

  return <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:F,padding:20}}>
    <div style={{width:"100%",maxWidth:400}}>
      <div style={{textAlign:"center",marginBottom:36}}>
        <div style={{width:52,height:52,borderRadius:14,background:`linear-gradient(135deg,${C.accent},#7B5CF0)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,fontWeight:800,margin:"0 auto 14px",color:"#fff"}}>P</div>
        <div style={{fontSize:24,fontWeight:800,color:C.text}}>ProjectPulse</div>
        <div style={{fontSize:13,color:C.muted2,marginTop:4}}>Sign in to your workspace</div>
      </div>
      <div style={{background:C.card,border:`1px solid ${C.border2}`,borderRadius:18,padding:24}}>
        <Inp label="Email" value={email} onChange={v=>{setEmail(v);setErr("");}} placeholder="you@example.com" type="email"/>
        <Inp label="Password" value={pass} onChange={v=>{setPass(v);setErr("");}} placeholder="••••••••" type="password"/>
        {err&&<div style={{color:"#F04D5A",fontSize:12,marginBottom:12,marginTop:-6}}>{err}</div>}
        <Btn full onClick={handleLogin} disabled={!email.trim()||!pass}>Sign In</Btn>
      </div>
      <div style={{textAlign:"center",marginTop:16,fontSize:11,color:C.muted}}>Demo · admin@demo.com / admin123</div>
    </div>
  </div>;
}

// ── TASK DRAWER ───────────────────────────────────────────────────────────────
function TaskDrawer({task,members,projects,currentUser,onClose,onUpdate,isMobile}){
  const [tab,setTab]         = useState("details");
  const [asana,setAsana]     = useState(task.asanaLink||"");
  const [remarks,setRem]     = useState(task.remarks||"");
  const [assigneeId,setAsgn]   = useState(task.assigneeId||"");
  const [due,setDue]           = useState(task.due||"");
  const [followers,setFollow]  = useState(task.followers||[]);
  const [comment,setCmt]       = useState("");
  const [busy,setBusy]       = useState(false);
  const fileRef              = useRef();

  const member  = members.find(m=>m.id===task.assigneeId);
  const project = projects.find(p=>p.id===task.projectId);
  const st=STATUS[task.status], pr=PRIORITY[task.priority];
  const overdue = task.due&&task.due<today()&&task.status!=="done";

  const patch = (obj) => onUpdate({...task,...obj});

  const panelRef = useRef();

  const shareWhatsApp = () => {
    const url=makeShareURL(task,members,projects);
    const text=`📋 *${task.title}*\nView task on ProjectPulse:\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`,"_blank");
  };

  const downloadPDF = async () => {
    if(!panelRef.current)return;
    const canvas=await html2canvas(panelRef.current,{backgroundColor:C.surface,scale:2,useCORS:true,logging:false});
    const imgData=canvas.toDataURL("image/png");
    const doc=new jsPDF({orientation:"portrait",unit:"px",format:[canvas.width/2,canvas.height/2]});
    doc.addImage(imgData,"PNG",0,0,canvas.width/2,canvas.height/2);
    doc.save(`${task.title.replace(/\s+/g,"-").toLowerCase()}.pdf`);
  };

  const addComment = () => {
    if(!comment.trim())return;
    patch({comments:[...(task.comments||[]),{id:uid(),authorId:currentUser.id,text:comment.trim(),createdAt:Date.now()}]});
    setCmt("");
  };

  const delComment = id => patch({comments:task.comments.filter(c=>c.id!==id)});

  const handleFiles = e => {
    const files=Array.from(e.target.files); if(!files.length)return; setBusy(true);
    Promise.all(files.map(f=>new Promise(res=>{
      if(f.size>2*1024*1024){res({id:uid(),name:f.name,size:f.size,type:f.type,data:null,tooLarge:true});return;}
      const r=new FileReader(); r.onload=()=>res({id:uid(),name:f.name,size:f.size,type:f.type,data:r.result}); r.readAsDataURL(f);
    }))).then(nf=>{patch({attachments:[...(task.attachments||[]),...nf]});setBusy(false);});
  };

  const rmFile = id => patch({attachments:task.attachments.filter(f=>f.id!==id)});
  const fmtSz  = b => b>1048576?`${(b/1048576).toFixed(1)}MB`:`${(b/1024).toFixed(0)}KB`;

  return <div style={{position:"fixed",inset:0,zIndex:500,display:"flex",justifyContent:"flex-end"}} onClick={onClose}>
    <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.5)",backdropFilter:"blur(4px)"}}/>
    <div ref={panelRef} style={{position:"relative",width:isMobile?"100%":490,background:C.surface,borderLeft:`1px solid ${C.border}`,height:"100%",display:"flex",flexDirection:"column",animation:"slideRight .25s ease",overflowY:"hidden"}} onClick={e=>e.stopPropagation()}>

      {/* Header */}
      <div style={{padding:"18px 20px 14px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
          <div style={{flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
              {project&&<><span style={{width:8,height:8,borderRadius:"50%",background:project.color,display:"inline-block"}}/><span style={{fontSize:11,color:C.muted2}}>{project.name}</span></>}
            </div>
            <div style={{fontSize:15,fontWeight:800,color:C.text,lineHeight:1.4}}>{task.title}</div>
          </div>
          <button onClick={onClose} style={{background:C.border,border:"none",borderRadius:8,width:30,height:30,cursor:"pointer",color:C.muted2,fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>x</button>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:10,alignItems:"center"}}>
          <Pill label={st.label} color={st.color} bg={st.bg} small/>
          <Pill label={pr.label} color={pr.color} bg={pr.bg} small/>
          {overdue&&<Pill label="Overdue" color="#F04D5A" bg="rgba(240,77,90,.12)" small/>}
          <div style={{marginLeft:"auto",display:"flex",gap:6}}>
            <button onClick={shareWhatsApp} title="Share on WhatsApp" style={{background:"rgba(37,211,102,.12)",border:"1px solid rgba(37,211,102,.35)",borderRadius:8,padding:"4px 10px",cursor:"pointer",color:"#25D366",fontSize:11,fontWeight:700,fontFamily:F,display:"flex",alignItems:"center",gap:4}}>📱 WhatsApp</button>
            <button onClick={downloadPDF} title="Download PDF" style={{background:"rgba(240,77,90,.12)",border:"1px solid rgba(240,77,90,.3)",borderRadius:8,padding:"4px 10px",cursor:"pointer",color:"#F04D5A",fontSize:11,fontWeight:700,fontFamily:F,display:"flex",alignItems:"center",gap:4}}>📄 PDF</button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
        {[["details","Details"],["files","Files"+(task.attachments?.length?` (${task.attachments.length})`:"")],["comments","Comments"+(task.comments?.length?` (${task.comments.length})`:"")]].map(([id,lbl])=>(
          <button key={id} onClick={()=>setTab(id)} style={{flex:1,padding:"11px 6px",border:"none",background:"transparent",cursor:"pointer",color:tab===id?C.accent:C.muted2,fontWeight:tab===id?700:500,fontSize:isMobile?11:12,fontFamily:F,borderBottom:tab===id?`2px solid ${C.accent}`:"2px solid transparent",transition:"all .15s"}}>{lbl}</button>
        ))}
      </div>

      {/* Body */}
      <div style={{flex:1,overflowY:"auto",padding:"18px 20px"}}>

        {/* DETAILS */}
        {tab==="details"&&<div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:18}}>
            <div style={{background:C.card,borderRadius:10,padding:"12px 14px"}}>
              <div style={{fontSize:10,color:C.muted,marginBottom:8,letterSpacing:.8}}>ASSIGNEE</div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                {members.find(m=>m.id===assigneeId)&&<Avatar member={members.find(m=>m.id===assigneeId)} size={22}/>}
                <select value={assigneeId} onChange={e=>setAsgn(e.target.value)}
                  style={{flex:1,background:C.surface,border:`1px solid ${C.border2}`,borderRadius:8,padding:"5px 8px",color:C.text,fontSize:12,fontFamily:F,outline:"none",cursor:"pointer"}}>
                  <option value="">Unassigned</option>
                  {members.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            </div>
            <div style={{background:C.card,borderRadius:10,padding:"12px 14px"}}>
              <div style={{fontSize:10,color:C.muted,marginBottom:8,letterSpacing:.8}}>DUE DATE</div>
              <input type="date" value={due} onChange={e=>setDue(e.target.value)}
                style={{width:"100%",background:C.surface,border:`1px solid ${C.border2}`,borderRadius:8,padding:"5px 8px",color:due&&due<today()&&task.status!=="done"?"#F04D5A":C.text,fontSize:12,fontFamily:F,outline:"none",cursor:"pointer"}}/>
            </div>
          </div>

          <div style={{marginBottom:16}}>
            <div style={{fontSize:11,fontWeight:700,color:C.muted2,marginBottom:8,letterSpacing:.8}}>ASANA LINK</div>
            <div style={{display:"flex",gap:8}}>
              <input value={asana} onChange={e=>setAsana(e.target.value)} placeholder="https://app.asana.com/0/..." style={{flex:1,background:C.card,border:`1px solid ${C.border2}`,borderRadius:10,padding:"9px 13px",color:C.text,fontSize:13,fontFamily:F,outline:"none"}}/>
              {asana&&<a href={asana} target="_blank" rel="noreferrer" style={{display:"flex",alignItems:"center",justifyContent:"center",width:38,background:"rgba(79,142,247,.12)",border:`1px solid rgba(79,142,247,.3)`,borderRadius:10,color:C.accent,textDecoration:"none",fontSize:16}}>↗</a>}
            </div>
          </div>

          <div style={{marginBottom:18}}>
            <div style={{fontSize:11,fontWeight:700,color:C.muted2,marginBottom:8,letterSpacing:.8}}>REMARKS / NOTES</div>
            <textarea value={remarks} onChange={e=>setRem(e.target.value)} placeholder="Add internal notes or context for this task..." rows={5} style={{width:"100%",background:C.card,border:`1px solid ${C.border2}`,borderRadius:10,padding:"10px 13px",color:C.text,fontSize:13,fontFamily:F,outline:"none",resize:"vertical",boxSizing:"border-box"}}/>
          </div>

          <Btn full onClick={()=>patch({asanaLink:asana,remarks,assigneeId,due,followers})}>Save Details</Btn>

          <div style={{marginTop:20,paddingTop:16,borderTop:`1px solid ${C.border}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.muted2,marginBottom:10,letterSpacing:.8}}>QUICK STATUS</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {Object.entries(STATUS).map(([k,v])=>(
                <button key={k} onClick={()=>patch({status:k})} style={{padding:"6px 12px",borderRadius:8,border:`1px solid ${task.status===k?v.color+"66":C.border}`,background:task.status===k?v.bg:"transparent",color:task.status===k?v.color:C.muted2,fontSize:12,fontWeight:task.status===k?700:400,cursor:"pointer",fontFamily:F,transition:"all .15s"}}>{v.label}</button>
              ))}
            </div>
          </div>

          <div style={{marginTop:20,paddingTop:16,borderTop:`1px solid ${C.border}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.muted2,marginBottom:10,letterSpacing:.8}}>FOLLOWERS</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
              {followers.length===0&&<span style={{fontSize:12,color:C.muted}}>No followers yet</span>}
              {followers.map(fid=>{const fm=members.find(m=>m.id===fid);if(!fm)return null;return(
                <div key={fid} style={{display:"flex",alignItems:"center",gap:5,background:C.surface,border:`1px solid ${C.border2}`,borderRadius:8,padding:"3px 8px 3px 5px"}}>
                  <Avatar member={fm} size={18}/>
                  <span style={{fontSize:11,color:C.text}}>{fm.name}</span>
                  <button onClick={()=>setFollow(f=>f.filter(id=>id!==fid))} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:13,lineHeight:1,padding:0,marginLeft:2}}>×</button>
                </div>
              );})}
            </div>
            <select value="" onChange={e=>{if(e.target.value&&!followers.includes(e.target.value))setFollow(f=>[...f,e.target.value]);}}
              style={{width:"100%",background:C.surface,border:`1px solid ${C.border2}`,borderRadius:8,padding:"6px 10px",color:C.muted2,fontSize:12,fontFamily:F,outline:"none",cursor:"pointer"}}>
              <option value="">+ Add follower</option>
              {members.filter(m=>!followers.includes(m.id)).map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        </div>}

        {/* FILES */}
        {tab==="files"&&<div>
          <div onClick={()=>!busy&&fileRef.current.click()} style={{border:`2px dashed ${C.border2}`,borderRadius:12,padding:"28px 20px",textAlign:"center",cursor:"pointer",marginBottom:16}}
            onMouseEnter={e=>e.currentTarget.style.borderColor=C.accent}
            onMouseLeave={e=>e.currentTarget.style.borderColor=C.border2}>
            <div style={{fontSize:28,marginBottom:8}}>📎</div>
            <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:4}}>{busy?"Uploading...":"Attach Files"}</div>
            <div style={{fontSize:11,color:C.muted}}>Click to browse · Max 2MB per file</div>
            <input ref={fileRef} type="file" multiple onChange={handleFiles} style={{display:"none"}} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"/>
          </div>
          {(!task.attachments||task.attachments.length===0)
            ?<div style={{textAlign:"center",padding:"20px",color:C.muted,fontSize:13}}>No files attached yet</div>
            :<div style={{display:"flex",flexDirection:"column",gap:8}}>
              {task.attachments.map(f=>{
                const isImg=f.type?.startsWith("image/");
                return <div key={f.id} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 14px",display:"flex",alignItems:"center",gap:10}}>
                  <div style={{fontSize:20,flexShrink:0}}>{isImg?"🖼️":f.type?.includes("pdf")?"📄":f.name?.endsWith(".xlsx")||f.name?.endsWith(".xls")?"📊":"📁"}</div>
                  {isImg&&f.data&&<img src={f.data} alt={f.name} style={{width:36,height:36,objectFit:"cover",borderRadius:6,flexShrink:0}}/>}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:600,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.name}</div>
                    <div style={{fontSize:11,color:C.muted}}>{f.tooLarge?<span style={{color:"#F04D5A"}}>Too large</span>:fmtSz(f.size)}</div>
                  </div>
                  <div style={{display:"flex",gap:6}}>
                    {f.data&&!f.tooLarge&&<a href={f.data} download={f.name} style={{display:"flex",alignItems:"center",justifyContent:"center",width:28,height:28,background:"rgba(79,142,247,.12)",border:`1px solid rgba(79,142,247,.25)`,borderRadius:8,color:C.accent,textDecoration:"none",fontSize:13}}>⬇</a>}
                    <button onClick={()=>rmFile(f.id)} style={{width:28,height:28,background:"rgba(240,77,90,.1)",border:`1px solid rgba(240,77,90,.2)`,borderRadius:8,color:"#F04D5A",cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>x</button>
                  </div>
                </div>;
              })}
            </div>
          }
        </div>}

        {/* COMMENTS */}
        {tab==="comments"&&<div style={{display:"flex",flexDirection:"column",gap:12}}>
          {(!task.comments||task.comments.length===0)
            ?<div style={{textAlign:"center",padding:"30px 20px",color:C.muted,fontSize:13}}>No comments yet. Start the conversation!</div>
            :task.comments.map(c=>{
              const author=members.find(m=>m.id===c.authorId);
              const isMe=c.authorId===currentUser.id;
              return <div key={c.id} style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                <Avatar member={author||{initials:"?",color:C.muted}} size={30}/>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",marginBottom:5}}>
                    <span style={{fontSize:12,fontWeight:700,color:C.text}}>{author?.name||"Unknown"}</span>
                    <span style={{fontSize:10,color:C.muted}}>{fmtDate(c.createdAt)}</span>
                  </div>
                  <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"4px 12px 12px 12px",padding:"10px 13px",fontSize:13,color:C.text,lineHeight:1.5}}>{c.text}</div>
                  {isMe&&<button onClick={()=>delComment(c.id)} style={{background:"none",border:"none",color:C.muted,fontSize:11,cursor:"pointer",marginTop:4,fontFamily:F}}>Delete</button>}
                </div>
              </div>;
            })
          }
        </div>}
      </div>

      {/* Comment composer */}
      {tab==="comments"&&<div style={{padding:"14px 20px",borderTop:`1px solid ${C.border}`,flexShrink:0,background:C.surface}}>
        <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
          <Avatar member={currentUser} size={30}/>
          <textarea value={comment} onChange={e=>setCmt(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();addComment();}}}
            placeholder="Add a comment... (Enter to send)" rows={2}
            style={{flex:1,background:C.card,border:`1px solid ${C.border2}`,borderRadius:10,padding:"9px 13px",color:C.text,fontSize:13,fontFamily:F,outline:"none",resize:"none",boxSizing:"border-box"}}/>
          <Btn onClick={addComment} disabled={!comment.trim()} style={{padding:"9px 14px"}}>↑</Btn>
        </div>
      </div>}
    </div>
  </div>;
}

// ── TASK CARD ─────────────────────────────────────────────────────────────────
function TaskCard({task,members,projects,onOpen,onStatusChange,onDelete,isMobile}){
  const [hover,setHover]=useState(false);
  const member=members.find(m=>m.id===task.assigneeId);
  const project=projects.find(p=>p.id===task.projectId);
  const st=STATUS[task.status],pr=PRIORITY[task.priority];
  const overdue=task.due&&task.due<today()&&task.status!=="done";
  const extras=(task.attachments?.length>0)||(task.comments?.length>0)||task.asanaLink;

  return <div onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)} onClick={()=>onOpen(task)}
    style={{background:hover?C.cardHov:C.card,border:`1px solid ${overdue?"rgba(240,77,90,.3)":C.border}`,borderRadius:12,padding:isMobile?"12px 14px":"14px 16px",cursor:"pointer",transition:"all .2s",borderLeft:`3px solid ${st.color}`}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:13,fontWeight:600,color:task.status==="done"?C.muted:C.text,textDecoration:task.status==="done"?"line-through":"none",fontFamily:F,lineHeight:1.4,marginBottom:8,wordBreak:"break-word"}}>{task.title}</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,alignItems:"center"}}>
          <Pill label={st.label} color={st.color} bg={st.bg} small/>
          <Pill label={pr.label} color={pr.color} bg={pr.bg} small/>
          {overdue&&<Pill label="Overdue" color="#F04D5A" bg="rgba(240,77,90,.12)" small/>}
          {project&&!isMobile&&<span style={{display:"inline-flex",alignItems:"center",gap:4}}><span style={{width:6,height:6,borderRadius:"50%",background:project.color,display:"inline-block"}}/><span style={{fontSize:10,color:C.muted2,fontFamily:F}}>{project.name}</span></span>}
          {extras&&<span style={{fontSize:10,color:C.muted,display:"inline-flex",gap:4}}>
            {task.asanaLink&&<span title="Asana linked">⬡</span>}
            {task.attachments?.length>0&&<span>📎{task.attachments.length}</span>}
            {task.comments?.length>0&&<span>💬{task.comments.length}</span>}
          </span>}
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6,flexShrink:0}}>
        {member&&<Avatar member={member} size={26}/>}
        {task.due&&<span style={{fontSize:10,color:overdue?"#F04D5A":C.muted,fontFamily:F}}>{task.due}</span>}
      </div>
    </div>
    {hover&&<div style={{display:"flex",gap:6,marginTop:10,paddingTop:10,borderTop:`1px solid ${C.border}`}} onClick={e=>e.stopPropagation()}>
      <Btn small variant="ghost" onClick={()=>onOpen(task)}>📋 Open</Btn>
      {task.status!=="done"&&<Btn small variant="success" onClick={()=>onStatusChange(task.id,"done")}>✓ Done</Btn>}
      {task.status==="todo"&&<Btn small variant="ghost" onClick={()=>onStatusChange(task.id,"in_progress")}>▶ Start</Btn>}
      <Btn small variant="danger" onClick={()=>onDelete(task.id)}>✕</Btn>
    </div>}
  </div>;
}

// ── PROJECT CARD ──────────────────────────────────────────────────────────────
function ProjectCard({project,tasks,members,onClick,onEdit,onDelete,isAdmin}){
  const [hover,setHover]=useState(false);
  const pt=tasks.filter(t=>t.projectId===project.id);
  const done=pt.filter(t=>t.status==="done").length,overdue=pt.filter(t=>t.due&&t.due<today()&&t.status!=="done").length;
  const pct=pt.length?Math.round((done/pt.length)*100):0;
  const assignees=[...new Set(pt.map(t=>t.assigneeId).filter(Boolean))].map(id=>members.find(m=>m.id===id)).filter(Boolean);

  return <div onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)} onClick={()=>onClick(project)}
    style={{background:hover?C.cardHov:C.card,border:`1px solid ${hover?C.border2:C.border}`,borderRadius:16,padding:20,cursor:"pointer",transition:"all .22s",boxShadow:hover?"0 8px 32px rgba(0,0,0,.3)":"none",position:"relative",overflow:"hidden"}}>
    <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:project.color,borderRadius:"16px 16px 0 0"}}/>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
      <div>
        <div style={{fontSize:15,fontWeight:800,color:C.text,fontFamily:F,marginBottom:4}}>{project.name}</div>
        {project.description&&<div style={{fontSize:12,color:C.muted2,fontFamily:F,lineHeight:1.4}}>{project.description}</div>}
      </div>
      <div style={{position:"relative",flexShrink:0}}>
        <Ring pct={pct} color={project.color} size={42} stroke={4}/>
        <span style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:project.color,fontFamily:F}}>{pct}%</span>
      </div>
    </div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div style={{display:"flex",gap:14}}>
        {[{v:pt.length,l:"Tasks",c:C.text},{v:done,l:"Done",c:"#22C97A"},overdue>0&&{v:overdue,l:"Overdue",c:"#F04D5A"}].filter(Boolean).map(s=>(
          <div key={s.l} style={{textAlign:"center"}}><div style={{fontSize:18,fontWeight:800,color:s.c,fontFamily:F}}>{s.v}</div><div style={{fontSize:10,color:C.muted,fontFamily:F}}>{s.l}</div></div>
        ))}
      </div>
      <div style={{display:"flex"}}>{assignees.slice(0,4).map((m,i)=><Avatar key={m.id} member={m} size={24} overlap={assignees.length-i}/>)}</div>
    </div>
    {hover&&isAdmin&&<div style={{display:"flex",gap:6,marginTop:14,paddingTop:12,borderTop:`1px solid ${C.border}`}} onClick={e=>e.stopPropagation()}>
      <Btn small variant="ghost" onClick={()=>onEdit(project)}>✎ Edit</Btn>
      <Btn small variant="danger" onClick={()=>onDelete(project.id)}>✕ Delete</Btn>
    </div>}
  </div>;
}

// ── FORMS ─────────────────────────────────────────────────────────────────────
function TaskForm({task,projects,members,onSave,onClose}){
  const [f,setF]=useState({title:task?.title||"",projectId:task?.projectId||projects[0]?.id||"",assigneeId:task?.assigneeId||"",status:task?.status||"todo",priority:task?.priority||"medium",due:task?.due||""});
  const s=(k,v)=>setF(x=>({...x,[k]:v}));
  return <>
    <Inp label="Task Title" value={f.title} onChange={v=>s("title",v)} placeholder="What needs to be done?" required/>
    <Inp label="Project" value={f.projectId} onChange={v=>s("projectId",v)} options={projects.map(p=>({value:p.id,label:p.name}))}/>
    <Inp label="Assignee" value={f.assigneeId} onChange={v=>s("assigneeId",v)} options={[{value:"",label:"Unassigned"},...members.map(m=>({value:m.id,label:m.name}))]}/>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <Inp label="Status" value={f.status} onChange={v=>s("status",v)} options={Object.entries(STATUS).map(([k,v])=>({value:k,label:v.label}))}/>
      <Inp label="Priority" value={f.priority} onChange={v=>s("priority",v)} options={Object.entries(PRIORITY).map(([k,v])=>({value:k,label:v.label}))}/>
    </div>
    <Inp label="Due Date" value={f.due} onChange={v=>s("due",v)} type="date"/>
    <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:4}}>
      <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
      <Btn disabled={!f.title.trim()||!f.projectId} onClick={()=>onSave(f)}>{task?"Save Changes":"Create Task"}</Btn>
    </div>
  </>;
}

function ProjectForm({project,allMembers,onSave,onClose}){
  const adminIds=allMembers.filter(m=>m.role==="admin").map(m=>m.id);
  const [f,setF]=useState({name:project?.name||"",description:project?.description||"",color:project?.color||PROJECT_COLORS[0],memberIds:project?.memberIds||[...adminIds]});
  const s=(k,v)=>setF(x=>({...x,[k]:v}));
  const toggle=id=>s("memberIds",f.memberIds.includes(id)?f.memberIds.filter(x=>x!==id):[...f.memberIds,id]);
  return <>
    <Inp label="Project Name" value={f.name} onChange={v=>s("name",v)} placeholder="e.g. Website Redesign" required/>
    <Inp label="Description" value={f.description} onChange={v=>s("description",v)} placeholder="Brief description..." type="textarea"/>
    <div style={{marginBottom:16}}>
      <div style={{fontSize:11,fontWeight:700,color:C.muted2,marginBottom:8,letterSpacing:.8,fontFamily:F}}>PROJECT COLOR</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{PROJECT_COLORS.map(c=><div key={c} onClick={()=>s("color",c)} style={{width:28,height:28,borderRadius:"50%",background:c,cursor:"pointer",border:f.color===c?"3px solid #fff":"3px solid transparent",boxShadow:f.color===c?`0 0 0 2px ${c}`:"none",transition:"all .15s"}}/>)}</div>
    </div>
    <div style={{marginBottom:18}}>
      <div style={{fontSize:11,fontWeight:700,color:C.muted2,marginBottom:8,letterSpacing:.8,fontFamily:F}}>WHO CAN SEE THIS PROJECT</div>
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {allMembers.map(m=>{
          const checked=f.memberIds.includes(m.id), isAdmin=m.role==="admin";
          return <div key={m.id} onClick={()=>!isAdmin&&toggle(m.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",background:checked?"rgba(79,142,247,.08)":C.surface,border:`1px solid ${checked?C.accent+"44":C.border}`,borderRadius:10,cursor:isAdmin?"default":"pointer",transition:"all .15s"}}>
            <div style={{width:18,height:18,borderRadius:5,border:`2px solid ${checked?C.accent:C.border2}`,background:checked?C.accent:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              {checked&&<span style={{color:"#fff",fontSize:11}}>✓</span>}
            </div>
            <Avatar member={m} size={26}/>
            <span style={{fontSize:13,color:C.text,fontFamily:F}}>{m.name}</span>
            {isAdmin&&<span style={{marginLeft:"auto",fontSize:10,color:"#F59E0B",fontFamily:F}}>Always ✓</span>}
          </div>;
        })}
      </div>
    </div>
    <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
      <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
      <Btn disabled={!f.name.trim()} onClick={()=>onSave(f)}>{project?"Save Changes":"Create Project"}</Btn>
    </div>
  </>;
}

function MemberForm({onSave,onClose}){
  const [f,setF]=useState({name:"",email:"",password:"",color:PROJECT_COLORS[2],role:"member"});
  const initials=f.name.trim().split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
  const s=(k,v)=>setF(x=>({...x,[k]:v}));
  const valid=f.name.trim()&&f.email.trim()&&f.password.trim();
  return <>
    <Inp label="Full Name" value={f.name} onChange={v=>s("name",v)} placeholder="e.g. Rohan Verma" required/>
    <Inp label="Email" value={f.email} onChange={v=>s("email",v)} placeholder="rohan@company.com" type="email" required/>
    <Inp label="Password" value={f.password} onChange={v=>s("password",v)} placeholder="Set a password" type="password" required/>
    <Inp label="Role" value={f.role} onChange={v=>s("role",v)} options={[{value:"member",label:"Team Member"},{value:"admin",label:"Admin"}]}/>
    <div style={{marginBottom:18}}>
      <div style={{fontSize:11,fontWeight:700,color:C.muted2,marginBottom:8,letterSpacing:.8,fontFamily:F}}>AVATAR COLOR</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{PROJECT_COLORS.map(c=><div key={c} onClick={()=>s("color",c)} style={{width:28,height:28,borderRadius:"50%",background:c,cursor:"pointer",border:f.color===c?"3px solid #fff":"3px solid transparent",boxShadow:f.color===c?`0 0 0 2px ${c}`:"none"}}/>)}</div>
    </div>
    {f.name&&<div style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:C.surface,borderRadius:10,marginBottom:14}}><Avatar member={{initials,color:f.color}} size={36}/><span style={{fontSize:13,color:C.text,fontFamily:F}}>{f.name}</span></div>}
    <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
      <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
      <Btn disabled={!valid} onClick={()=>onSave({name:f.name,initials,color:f.color,role:f.role,email:f.email,password:f.password})}>Add Member</Btn>
    </div>
  </>;
}

// ── KANBAN VIEW ───────────────────────────────────────────────────────────────
function KanbanView({tasks,projects,members,onOpen,onStatusChange,onDelete,mobile}){
  const [selProj,setSelProj]=useState("all");
  const [dragId,setDragId]=useState(null);
  const [dragOver,setDragOver]=useState(null);
  const filtered=(selProj==="all"?tasks:tasks.filter(t=>t.projectId===selProj));
  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24,flexWrap:"wrap",gap:12}}>
      <div><h1 style={{fontSize:mobile?20:24,fontWeight:800,marginBottom:4}}>Kanban Board</h1><p style={{color:C.muted2,fontSize:13}}>{filtered.length} task{filtered.length!==1?"s":""}</p></div>
      <select value={selProj} onChange={e=>setSelProj(e.target.value)} style={{background:C.card,border:`1px solid ${C.border2}`,borderRadius:8,color:C.text,padding:"8px 12px",fontSize:12,fontFamily:F,cursor:"pointer"}}>
        <option value="all">All Projects</option>
        {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
    </div>
    <div style={{display:"grid",gridTemplateColumns:mobile?"1fr 1fr":"repeat(4,1fr)",gap:12}}>
      {Object.entries(STATUS).map(([sk,si])=>{
        const col=filtered.filter(t=>t.status===sk);
        return <div key={sk}
          onDragOver={e=>{e.preventDefault();setDragOver(sk);}}
          onDragLeave={()=>setDragOver(null)}
          onDrop={e=>{e.preventDefault();if(dragId)onStatusChange(dragId,sk);setDragId(null);setDragOver(null);}}
          style={{background:dragOver===sk?si.color+"11":C.surface,border:`1px solid ${dragOver===sk?si.color+"66":C.border}`,borderRadius:12,padding:12,minHeight:160,transition:"all .15s"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{width:8,height:8,borderRadius:"50%",background:si.color,display:"inline-block"}}/><span style={{fontSize:12,fontWeight:700,color:si.color}}>{si.label}</span></div>
            <span style={{fontSize:11,color:C.muted,background:C.border,borderRadius:10,padding:"1px 7px"}}>{col.length}</span>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {col.map(t=><div key={t.id} draggable onDragStart={()=>setDragId(t.id)} onDragEnd={()=>setDragId(null)} style={{cursor:"grab",opacity:dragId===t.id?.4:1,transition:"opacity .15s"}}>
              <TaskCard task={t} members={members} projects={projects} onOpen={onOpen} onStatusChange={onStatusChange} onDelete={onDelete} isMobile={mobile}/>
            </div>)}
            {col.length===0&&<div style={{padding:"24px 12px",textAlign:"center",border:`1px dashed ${C.border}`,borderRadius:10,color:C.muted,fontSize:12}}>Drop here</div>}
          </div>
        </div>;
      })}
    </div>
  </div>;
}

// ── GANTT VIEW ────────────────────────────────────────────────────────────────
function GanttView({tasks,projects,members,mobile}){
  const [selProj,setSelProj]=useState("all");
  const visTasks=(selProj==="all"?tasks:tasks.filter(t=>t.projectId===selProj)).filter(t=>t.due);
  const toMs=d=>new Date(d).getTime();
  const todayStr=today();

  if(!visTasks.length)return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24,flexWrap:"wrap",gap:12}}>
      <h1 style={{fontSize:mobile?20:24,fontWeight:800}}>Gantt Chart</h1>
      <select value={selProj} onChange={e=>setSelProj(e.target.value)} style={{background:C.card,border:`1px solid ${C.border2}`,borderRadius:8,color:C.text,padding:"8px 12px",fontSize:12,fontFamily:F,cursor:"pointer"}}>
        <option value="all">All Projects</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
    </div>
    <div style={{textAlign:"center",padding:"60px 20px",background:C.card,borderRadius:16,border:`1px dashed ${C.border2}`,color:C.muted2,fontSize:13}}>No tasks with due dates</div>
  </div>;

  const allMs=[...visTasks.map(t=>toMs(new Date(t.createdAt).toISOString().slice(0,10))),...visTasks.map(t=>toMs(t.due))];
  const minMs=Math.min(...allMs)-864e5*3;
  const maxMs=Math.max(...allMs)+864e5*6;
  const range=maxMs-minMs;
  const pct=ms=>Math.max(0,Math.min(100,((ms-minMs)/range)*100));
  const todayPct=pct(toMs(todayStr));

  const ticks=[];
  const td=new Date(minMs); td.setDate(td.getDate()-td.getDay());
  while(td.getTime()<maxMs){ticks.push({ms:td.getTime(),label:td.toLocaleDateString("en-IN",{day:"numeric",month:"short"})});td.setDate(td.getDate()+7);}

  const grouped=projects.map(p=>({project:p,tasks:visTasks.filter(t=>t.projectId===p.id)})).filter(g=>g.tasks.length>0);

  const rowH=44, hdrH=36, projH=32;
  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24,flexWrap:"wrap",gap:12}}>
      <div><h1 style={{fontSize:mobile?20:24,fontWeight:800,marginBottom:4}}>Gantt Chart</h1><p style={{color:C.muted2,fontSize:13}}>{visTasks.length} task{visTasks.length!==1?"s":""} with due dates</p></div>
      <select value={selProj} onChange={e=>setSelProj(e.target.value)} style={{background:C.card,border:`1px solid ${C.border2}`,borderRadius:8,color:C.text,padding:"8px 12px",fontSize:12,fontFamily:F,cursor:"pointer"}}>
        <option value="all">All Projects</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
    </div>
    <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,overflow:"hidden"}}>
      <div style={{overflowX:"auto"}}>
        <div style={{minWidth:640}}>
          {/* Header */}
          <div style={{display:"flex",height:hdrH,background:C.surface,borderBottom:`1px solid ${C.border}`}}>
            <div style={{width:180,flexShrink:0,borderRight:`1px solid ${C.border}`,display:"flex",alignItems:"center",padding:"0 14px"}}><span style={{fontSize:11,fontWeight:700,color:C.muted2,letterSpacing:.8}}>TASK</span></div>
            <div style={{flex:1,position:"relative",overflow:"hidden"}}>
              {ticks.map((tk,i)=><div key={i} style={{position:"absolute",left:`${pct(tk.ms)}%`,top:0,bottom:0,borderLeft:`1px solid ${C.border}`,paddingLeft:4,display:"flex",alignItems:"center"}}><span style={{fontSize:9,color:C.muted,whiteSpace:"nowrap"}}>{tk.label}</span></div>)}
              {todayPct>=0&&todayPct<=100&&<div style={{position:"absolute",left:`${todayPct}%`,top:0,bottom:0,borderLeft:`2px solid ${C.accent}`,zIndex:2}}><span style={{position:"absolute",top:2,left:3,fontSize:9,color:C.accent,fontWeight:700,whiteSpace:"nowrap"}}>Today</span></div>}
            </div>
          </div>
          {/* Rows */}
          {grouped.map(g=><div key={g.project.id}>
            <div style={{display:"flex",height:projH,background:C.surface,borderBottom:`1px solid ${C.border}`,alignItems:"center"}}>
              <div style={{width:180,flexShrink:0,borderRight:`1px solid ${C.border}`,padding:"0 14px",display:"flex",alignItems:"center",gap:6}}>
                <span style={{width:8,height:8,borderRadius:"50%",background:g.project.color,flexShrink:0,display:"inline-block"}}/>
                <span style={{fontSize:11,fontWeight:700,color:g.project.color,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{g.project.name}</span>
              </div>
              <div style={{flex:1,position:"relative",height:"100%"}}>
                {ticks.map((tk,i)=><div key={i} style={{position:"absolute",left:`${pct(tk.ms)}%`,top:0,bottom:0,borderLeft:`1px solid ${C.border}`}}/>)}
                {todayPct>=0&&todayPct<=100&&<div style={{position:"absolute",left:`${todayPct}%`,top:0,bottom:0,borderLeft:`2px solid ${C.accent}`,zIndex:2}}/>}
              </div>
            </div>
            {g.tasks.map(t=>{
              const assignee=members.find(m=>m.id===t.assigneeId);
              const startMs=toMs(new Date(t.createdAt).toISOString().slice(0,10));
              const endMs=toMs(t.due);
              const left=pct(startMs), width=Math.max(1,pct(endMs)-left);
              const overdue=t.due<todayStr&&t.status!=="done";
              const barColor=overdue?"#F04D5A":t.status==="done"?"#22C97A":g.project.color;
              return <div key={t.id} style={{display:"flex",height:rowH,borderBottom:`1px solid ${C.border}`,alignItems:"center"}}>
                <div style={{width:180,flexShrink:0,borderRight:`1px solid ${C.border}`,padding:"0 14px",display:"flex",alignItems:"center",gap:6}}>
                  {assignee&&<Avatar member={assignee} size={20}/>}
                  <span style={{fontSize:11,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{t.title}</span>
                </div>
                <div style={{flex:1,position:"relative",height:"100%"}}>
                  {ticks.map((tk,i)=><div key={i} style={{position:"absolute",left:`${pct(tk.ms)}%`,top:0,bottom:0,borderLeft:`1px solid ${C.border}`}}/>)}
                  {todayPct>=0&&todayPct<=100&&<div style={{position:"absolute",left:`${todayPct}%`,top:0,bottom:0,borderLeft:`2px solid ${C.accent}`,zIndex:2}}/>}
                  <div title={`${t.title} · ${new Date(startMs).toLocaleDateString()} → ${t.due}`}
                    style={{position:"absolute",left:`${left}%`,width:`${width}%`,top:"22%",height:"56%",background:barColor+"cc",borderRadius:6,display:"flex",alignItems:"center",padding:"0 6px",minWidth:6,overflow:"hidden",cursor:"default"}}>
                    {width>8&&<span style={{fontSize:10,color:"#fff",fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{t.title}</span>}
                  </div>
                </div>
              </div>;
            })}
          </div>)}
        </div>
      </div>
    </div>
  </div>;
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App(){
  const [data,setData]       = useState(loadData);
  const [user,setUser]       = useState(null);
  const [view,setView]       = useState("dashboard");
  const [selProj,setSelProj] = useState(null);
  const [modal,setModal]     = useState(null);
  const [openTask,setOpen]   = useState(null);
  const [tf,setTF]           = useState({status:"all",priority:"all",assignee:"all"});
  const [mobile,setMobile]   = useState(window.innerWidth<768);
  const [toast,setToast]     = useState(null);
  const [sharedTask,setSharedTask] = useState(()=>{
    try{
      const h=window.location.hash;
      if(h.startsWith("#task=")){const d=JSON.parse(decodeURIComponent(escape(atob(h.slice(6)))));return d;}
    }catch{}
    return null;
  });

  useEffect(()=>{const r=()=>setMobile(window.innerWidth<768);window.addEventListener("resize",r);return()=>window.removeEventListener("resize",r);},[]);
  useEffect(()=>{saveData(data);},[data]);
  useEffect(()=>{if(openTask){const t=data.tasks.find(t=>t.id===openTask.id);if(t)setOpen(t);}},[data.tasks]);

  const toast$=(msg,type="success")=>{setToast({msg,type});setTimeout(()=>setToast(null),2800);};

  const {projects,tasks,members}=data;
  const isAdmin=user?.role==="admin";
  const visProjs=user?isAdmin?projects:projects.filter(p=>p.memberIds?.includes(user.id)):[];
  const visTasks=tasks.filter(t=>visProjs.some(p=>p.id===t.projectId));

  const allOverdue=visTasks.filter(t=>t.due&&t.due<today()&&t.status!=="done").length;
  const allDone=visTasks.filter(t=>t.status==="done").length;
  const inProg=visTasks.filter(t=>t.status==="in_progress").length;

  const filtered=(()=>{
    let t=selProj?visTasks.filter(t=>t.projectId===selProj.id):visTasks;
    if(tf.status!=="all")t=t.filter(x=>x.status===tf.status);
    if(tf.priority!=="all")t=t.filter(x=>x.priority===tf.priority);
    if(tf.assignee!=="all")t=t.filter(x=>x.assigneeId===tf.assignee);
    return t;
  })();

  const upsertTask=(form,eid)=>{
    setData(d=>{
      const base=eid?d.tasks.find(t=>t.id===eid):{id:uid(),asanaLink:"",remarks:"",attachments:[],comments:[],createdAt:Date.now()};
      const tasks=eid?d.tasks.map(t=>t.id===eid?{...base,...form}:t):[...d.tasks,{...base,...form}];
      return {...d,tasks};
    });
    toast$(eid?"Task updated":"Task created"); setModal(null);
  };

  const updateTask=updated=>{setData(d=>({...d,tasks:d.tasks.map(t=>t.id===updated.id?updated:t)}));toast$("Saved");};
  const delTask=id=>{setData(d=>({...d,tasks:d.tasks.filter(t=>t.id!==id)}));if(openTask?.id===id)setOpen(null);toast$("Deleted","info");};
  const chgStatus=(id,status)=>{setData(d=>({...d,tasks:d.tasks.map(t=>t.id===id?{...t,status}:t)}));toast$(status==="done"?"Done! ✓":"Updated");};

  const upsertProj=(form,eid)=>{
    const admins=members.filter(m=>m.role==="admin").map(m=>m.id);
    const memberIds=[...new Set([...admins,...(form.memberIds||[])])];
    setData(d=>{
      const ps=eid?d.projects.map(p=>p.id===eid?{...p,...form,memberIds}:p):[...d.projects,{id:uid(),...form,memberIds,createdAt:Date.now()}];
      return {...d,projects:ps};
    });
    toast$(eid?"Project updated":"Project created"); setModal(null);
  };

  const delProj=id=>{
    setData(d=>({...d,projects:d.projects.filter(p=>p.id!==id),tasks:d.tasks.filter(t=>t.projectId!==id)}));
    if(selProj?.id===id)setSelProj(null); toast$("Deleted","info");
  };

  const addMember=form=>{setData(d=>({...d,members:[...d.members,{id:uid(),...form}]}));toast$("Member added");setModal(null);};
  const delMember=id=>{
    const admins=members.filter(m=>m.role==="admin");
    if(admins.length===1&&admins[0].id===id){toast$("Cannot delete the last admin","info");return;}
    setData(d=>({...d,members:d.members.filter(m=>m.id!==id)}));
    toast$("Member removed","info");
  };
  const nav=v=>{setView(v);setSelProj(null);};

  const navItems=[{id:"dashboard",icon:"⬡",label:"Dashboard"},{id:"projects",icon:"◈",label:"Projects"},{id:"tasks",icon:"✓",label:"Tasks"},{id:"kanban",icon:"⋮",label:"Kanban"},{id:"gantt",icon:"━",label:"Gantt"},{id:"team",icon:"◎",label:"Team"}];

  if(!user)return <LoginScreen members={members} onLogin={setUser}/>;

  return <div style={{background:C.bg,minHeight:"100vh",color:C.text,fontFamily:F}}>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap');
      *{box-sizing:border-box;margin:0;padding:0}
      ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#1C2640;border-radius:4px}
      select,input,textarea{color-scheme:dark}
      @keyframes slideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
      @keyframes slideRight{from{transform:translateX(40px);opacity:0}to{transform:translateX(0);opacity:1}}
      @keyframes fadeIn{from{opacity:0}to{opacity:1}}
      @keyframes toastIn{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}
    `}</style>

    {/* SIDEBAR */}
    {!mobile&&<div style={{position:"fixed",left:0,top:0,bottom:0,width:220,background:C.surface,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",zIndex:50,padding:"20px 14px"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:28,padding:"0 6px"}}>
        <div style={{width:34,height:34,borderRadius:10,background:`linear-gradient(135deg,${C.accent},#7B5CF0)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:800,color:"#fff"}}>P</div>
        <div><div style={{fontSize:14,fontWeight:800}}>ProjectPulse</div><div style={{fontSize:10,color:C.muted}}>Workspace</div></div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:4,flex:1}}>
        {navItems.map(n=><button key={n.id} onClick={()=>nav(n.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:10,border:"none",cursor:"pointer",background:view===n.id?"rgba(79,142,247,.12)":"transparent",color:view===n.id?C.accent:C.muted2,fontSize:13,fontWeight:view===n.id?700:500,transition:"all .18s",textAlign:"left",borderLeft:view===n.id?`3px solid ${C.accent}`:"3px solid transparent",fontFamily:F}}>
          <span style={{fontSize:16}}>{n.icon}</span>{n.label}
        </button>)}
      </div>
      <div style={{paddingTop:14,borderTop:`1px solid ${C.border}`}}>
        <div style={{fontSize:10,color:C.muted,marginBottom:8,padding:"0 6px",letterSpacing:.8}}>QUICK STATS</div>
        {[{l:"Tasks",v:visTasks.length,c:C.accent},{l:"In Progress",v:inProg,c:"#F59E0B"},{l:"Overdue",v:allOverdue,c:"#F04D5A"}].map(s=>(
          <div key={s.l} style={{display:"flex",justifyContent:"space-between",padding:"4px 6px",fontSize:12}}><span style={{color:C.muted2}}>{s.l}</span><span style={{color:s.c,fontWeight:700}}>{s.v}</span></div>
        ))}
        <div style={{marginTop:12,padding:"10px 6px",borderTop:`1px solid ${C.border}`}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}><Avatar member={user} size={26}/><div><div style={{fontSize:12,fontWeight:700}}>{user.name}</div><div style={{fontSize:10,color:isAdmin?"#F59E0B":C.muted}}>{isAdmin?"Admin":"Member"}</div></div></div>
          <Btn small variant="ghost" full onClick={()=>setUser(null)}>Switch User</Btn>
        </div>
      </div>
    </div>}

    {/* MOBILE TOP */}
    {mobile&&<div style={{position:"fixed",top:0,left:0,right:0,height:56,background:C.surface,borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 16px",zIndex:100}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <div style={{width:28,height:28,borderRadius:8,background:`linear-gradient(135deg,${C.accent},#7B5CF0)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:"#fff"}}>P</div>
        <span style={{fontSize:14,fontWeight:800}}>ProjectPulse</span>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:8}}><Avatar member={user} size={30}/><button onClick={()=>setUser(null)} style={{background:"none",border:"none",color:C.muted2,fontSize:11,cursor:"pointer",fontFamily:F}}>Switch</button></div>
    </div>}

    {/* MOBILE BOTTOM NAV */}
    {mobile&&<div style={{position:"fixed",bottom:0,left:0,right:0,background:C.surface,borderTop:`1px solid ${C.border}`,display:"flex",zIndex:100,padding:"6px 0 8px"}}>
      {navItems.map(n=><button key={n.id} onClick={()=>nav(n.id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2,border:"none",background:"transparent",cursor:"pointer",color:view===n.id?C.accent:C.muted,padding:"4px 0"}}>
        <span style={{fontSize:20}}>{n.icon}</span><span style={{fontSize:9,fontWeight:view===n.id?700:400,fontFamily:F}}>{n.label}</span>
      </button>)}
    </div>}

    {/* CONTENT */}
    <div style={{marginLeft:mobile?0:220,marginTop:mobile?56:0,marginBottom:mobile?64:0,padding:mobile?16:"28px 32px",animation:"fadeIn .3s ease"}}>

      {/* DASHBOARD */}
      {view==="dashboard"&&<div>
        <div style={{marginBottom:24}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div><h1 style={{fontSize:mobile?20:24,fontWeight:800,marginBottom:4}}>Good day, {user.name.split(" ")[0]} 👋</h1><p style={{color:C.muted2,fontSize:13}}>{new Date().toLocaleDateString("en-IN",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}</p></div>
            {!isAdmin&&<div style={{padding:"6px 12px",background:"rgba(79,142,247,.1)",border:`1px solid rgba(79,142,247,.25)`,borderRadius:10,fontSize:11,color:C.accent}}>{visProjs.length} project{visProjs.length!==1?"s":""}</div>}
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:mobile?"1fr 1fr":"repeat(4,1fr)",gap:12,marginBottom:28}}>
          {[{l:"Projects",v:visProjs.length,c:C.accent,i:"◈"},{l:"Active Tasks",v:visTasks.filter(t=>t.status!=="done").length,c:"#F59E0B",i:"✓"},{l:"Completed",v:allDone,c:"#22C97A",i:"◉"},{l:"Overdue",v:allOverdue,c:"#F04D5A",i:"⚠"}].map(k=>(
            <div key={k.l} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"16px 18px",position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",top:-10,right:-10,fontSize:48,opacity:.06,color:k.c}}>{k.i}</div>
              <div style={{fontSize:mobile?24:30,fontWeight:800,color:k.c,lineHeight:1}}>{k.v}</div>
              <div style={{fontSize:11,color:C.muted2,marginTop:5}}>{k.l}</div>
            </div>
          ))}
        </div>
        <div style={{marginBottom:28}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <h2 style={{fontSize:15,fontWeight:800}}>Projects</h2>
            {isAdmin&&<Btn small onClick={()=>setModal({type:"new-project"})}>+ New</Btn>}
          </div>
          {visProjs.length===0
            ?<div style={{textAlign:"center",padding:"40px 20px",background:C.card,borderRadius:14,border:`1px dashed ${C.border2}`}}>
              <div style={{fontSize:32,marginBottom:8}}>◈</div>
              <div style={{color:C.muted2,fontSize:13}}>{isAdmin?"No projects yet":"You have no assigned projects"}</div>
              {isAdmin&&<div style={{marginTop:14}}><Btn onClick={()=>setModal({type:"new-project"})}>+ Create Project</Btn></div>}
            </div>
            :<div style={{display:"grid",gridTemplateColumns:mobile?"1fr":"repeat(auto-fill,minmax(280px,1fr))",gap:14}}>
              {visProjs.map(p=><ProjectCard key={p.id} project={p} tasks={tasks} members={members} onClick={p=>{setSelProj(p);setView("tasks");}} onEdit={p=>setModal({type:"edit-project",payload:p})} onDelete={delProj} isAdmin={isAdmin}/>)}
            </div>
          }
        </div>
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <h2 style={{fontSize:15,fontWeight:800}}>Recent Tasks</h2>
            {isAdmin&&<Btn small onClick={()=>setModal({type:"new-task"})}>+ New</Btn>}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {visTasks.slice(-5).reverse().map(t=><TaskCard key={t.id} task={t} members={members} projects={visProjs} onOpen={setOpen} onStatusChange={chgStatus} onDelete={delTask} isMobile={mobile}/>)}
            {visTasks.length===0&&<div style={{textAlign:"center",padding:"30px",background:C.card,borderRadius:14,border:`1px dashed ${C.border2}`,color:C.muted2,fontSize:13}}>No tasks yet</div>}
          </div>
        </div>
      </div>}

      {/* PROJECTS */}
      {view==="projects"&&<div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
          <div><h1 style={{fontSize:mobile?20:24,fontWeight:800,marginBottom:4}}>Projects</h1><p style={{color:C.muted2,fontSize:13}}>{visProjs.length} project{visProjs.length!==1?"s":""}</p></div>
          {isAdmin&&<Btn onClick={()=>setModal({type:"new-project"})}>+ New Project</Btn>}
        </div>
        {visProjs.length===0
          ?<div style={{textAlign:"center",padding:"60px 20px",background:C.card,borderRadius:16,border:`1px dashed ${C.border2}`}}>
            <div style={{fontSize:40,marginBottom:12}}>◈</div>
            <div style={{color:C.text,fontSize:15,fontWeight:700,marginBottom:6}}>{isAdmin?"No projects yet":"No projects assigned"}</div>
            <div style={{color:C.muted2,fontSize:13,marginBottom:20}}>{isAdmin?"Create one to get started":"Ask your admin to add you"}</div>
            {isAdmin&&<Btn onClick={()=>setModal({type:"new-project"})}>+ Create Project</Btn>}
          </div>
          :<div style={{display:"grid",gridTemplateColumns:mobile?"1fr":"repeat(auto-fill,minmax(280px,1fr))",gap:16}}>
            {visProjs.map(p=><ProjectCard key={p.id} project={p} tasks={tasks} members={members} onClick={p=>{setSelProj(p);setView("tasks");}} onEdit={p=>setModal({type:"edit-project",payload:p})} onDelete={delProj} isAdmin={isAdmin}/>)}
          </div>
        }
      </div>}

      {/* TASKS */}
      {view==="tasks"&&<div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:mobile?"flex-start":"center",marginBottom:20,gap:12,flexDirection:mobile?"column":"row"}}>
          <div>
            {selProj?<div>
              <button onClick={()=>setSelProj(null)} style={{background:"none",border:"none",color:C.muted2,cursor:"pointer",fontSize:12,marginBottom:4,padding:0,fontFamily:F}}>← All Tasks</button>
              <h1 style={{fontSize:mobile?20:24,fontWeight:800,display:"flex",alignItems:"center",gap:8}}><span style={{width:10,height:10,borderRadius:"50%",background:selProj.color,display:"inline-block"}}/>{selProj.name}</h1>
            </div>:<h1 style={{fontSize:mobile?20:24,fontWeight:800}}>All Tasks</h1>}
            <p style={{color:C.muted2,fontSize:13,marginTop:4}}>{filtered.length} task{filtered.length!==1?"s":""}</p>
          </div>
          {isAdmin&&<Btn onClick={()=>setModal({type:"new-task",payload:selProj?{projectId:selProj.id}:null})}>+ New Task</Btn>}
        </div>
        <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
          {[{key:"status",opts:[["all","All Status"],...Object.entries(STATUS).map(([k,v])=>[k,v.label])]},{key:"priority",opts:[["all","All Priority"],...Object.entries(PRIORITY).map(([k,v])=>[k,v.label])]},{key:"assignee",opts:[["all","All Members"],...members.map(m=>[m.id,m.name])]}].map(fi=>(
            <select key={fi.key} value={tf[fi.key]} onChange={e=>setTF(x=>({...x,[fi.key]:e.target.value}))} style={{background:C.card,border:`1px solid ${C.border2}`,borderRadius:8,color:tf[fi.key]!=="all"?C.accent:C.muted2,padding:"6px 10px",fontSize:12,fontFamily:F,cursor:"pointer"}}>
              {fi.opts.map(([v,l])=><option key={v} value={v}>{l}</option>)}
            </select>
          ))}
        </div>
        {!mobile?(
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14}}>
            {Object.entries(STATUS).map(([sk,si])=>{
              const col=filtered.filter(t=>t.status===sk);
              return <div key={sk}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{width:8,height:8,borderRadius:"50%",background:si.color,display:"inline-block"}}/><span style={{fontSize:12,fontWeight:700,color:si.color}}>{si.label}</span></div>
                  <span style={{fontSize:11,color:C.muted,background:C.border,borderRadius:10,padding:"1px 7px"}}>{col.length}</span>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {col.map(t=><TaskCard key={t.id} task={t} members={members} projects={visProjs} onOpen={setOpen} onStatusChange={chgStatus} onDelete={delTask} isMobile={false}/>)}
                  {col.length===0&&<div style={{padding:"20px 12px",textAlign:"center",border:`1px dashed ${C.border}`,borderRadius:10,color:C.muted,fontSize:12}}>Empty</div>}
                </div>
              </div>;
            })}
          </div>
        ):(
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {filtered.length===0?<div style={{textAlign:"center",padding:"40px 20px",background:C.card,borderRadius:14,border:`1px dashed ${C.border2}`,color:C.muted2,fontSize:13}}>No tasks match</div>:filtered.map(t=><TaskCard key={t.id} task={t} members={members} projects={visProjs} onOpen={setOpen} onStatusChange={chgStatus} onDelete={delTask} isMobile={true}/>)}
          </div>
        )}
      </div>}

      {/* KANBAN */}
      {view==="kanban"&&<KanbanView tasks={visTasks} projects={visProjs} members={members} onOpen={setOpen} onStatusChange={chgStatus} onDelete={delTask} mobile={mobile}/>}

      {/* GANTT */}
      {view==="gantt"&&<GanttView tasks={visTasks} projects={visProjs} members={members} mobile={mobile}/>}

      {/* TEAM */}
      {view==="team"&&<div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
          <div><h1 style={{fontSize:mobile?20:24,fontWeight:800,marginBottom:4}}>Team</h1><p style={{color:C.muted2,fontSize:13}}>{members.length} members</p></div>
          {isAdmin&&<Btn onClick={()=>setModal({type:"new-member"})}>+ Add Member</Btn>}
        </div>
        <div style={{display:"grid",gridTemplateColumns:mobile?"1fr 1fr":"repeat(auto-fill,minmax(200px,1fr))",gap:14}}>
          {members.map(m=>{
            const mt=tasks.filter(t=>t.assigneeId===m.id),mdone=mt.filter(t=>t.status==="done").length;
            const mprojs=[...new Set(mt.map(t=>t.projectId))].map(id=>projects.find(p=>p.id===id)).filter(Boolean);
            return <div key={m.id} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:18,textAlign:"center",position:"relative"}}>
              {isAdmin&&m.id!==user.id&&<button onClick={()=>delMember(m.id)} title="Remove member" style={{position:"absolute",top:10,right:10,background:"rgba(240,77,90,.1)",border:"1px solid rgba(240,77,90,.2)",borderRadius:6,width:24,height:24,cursor:"pointer",color:"#F04D5A",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>×</button>}
              <Avatar member={m} size={48}/>
              <div style={{marginTop:10,marginBottom:6}}>
                <div style={{fontSize:13,fontWeight:700,color:C.text}}>{m.name}</div>
                <div style={{fontSize:10,color:m.role==="admin"?"#F59E0B":C.muted,marginTop:2}}>{m.role==="admin"?"Admin":"Member"}</div>
              </div>
              <div style={{display:"flex",justifyContent:"center",gap:16,marginBottom:10}}>
                <div><div style={{fontSize:18,fontWeight:800,color:C.accent}}>{mt.length}</div><div style={{fontSize:10,color:C.muted}}>Tasks</div></div>
                <div><div style={{fontSize:18,fontWeight:800,color:"#22C97A"}}>{mdone}</div><div style={{fontSize:10,color:C.muted}}>Done</div></div>
              </div>
              {mprojs.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:4,justifyContent:"center"}}>
                {mprojs.map(p=><span key={p.id} style={{fontSize:9,padding:"2px 7px",borderRadius:10,background:p.color+"22",color:p.color,fontWeight:700}}>{p.name}</span>)}
              </div>}
            </div>;
          })}
          {isAdmin&&<div onClick={()=>setModal({type:"new-member"})} style={{background:"transparent",border:`2px dashed ${C.border2}`,borderRadius:14,padding:18,textAlign:"center",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8,minHeight:160}}>
            <div style={{fontSize:24,color:C.muted}}>+</div><div style={{fontSize:12,color:C.muted2}}>Add Member</div>
          </div>}
        </div>
      </div>}
    </div>

    {/* MODALS */}
    {modal?.type==="new-project"  &&<Modal title="New Project"     onClose={()=>setModal(null)} width={500}><ProjectForm allMembers={members} onSave={f=>upsertProj(f,null)} onClose={()=>setModal(null)}/></Modal>}
    {modal?.type==="edit-project" &&<Modal title="Edit Project"    onClose={()=>setModal(null)} width={500}><ProjectForm project={modal.payload} allMembers={members} onSave={f=>upsertProj(f,modal.payload.id)} onClose={()=>setModal(null)}/></Modal>}
    {modal?.type==="new-task"     &&<Modal title="New Task"        onClose={()=>setModal(null)}><TaskForm task={modal.payload} projects={visProjs} members={members} onSave={f=>upsertTask(f,null)} onClose={()=>setModal(null)}/></Modal>}
    {modal?.type==="edit-task"    &&<Modal title="Edit Task"       onClose={()=>setModal(null)}><TaskForm task={modal.payload} projects={visProjs} members={members} onSave={f=>upsertTask(f,modal.payload.id)} onClose={()=>setModal(null)}/></Modal>}
    {modal?.type==="new-member"   &&<Modal title="Add Team Member" onClose={()=>setModal(null)} width={360}><MemberForm onSave={addMember} onClose={()=>setModal(null)}/></Modal>}

    {/* TASK DRAWER */}
    {openTask&&<TaskDrawer task={openTask} members={members} projects={visProjs} currentUser={user} onClose={()=>setOpen(null)} onUpdate={updateTask} isMobile={mobile}/>}

    {/* SHARED TASK VIEW */}
    {sharedTask&&<SharedTaskView data={sharedTask} onClose={()=>{setSharedTask(null);history.replaceState(null,"",window.location.pathname);}}/>}

    {/* TOAST */}
    {toast&&<div style={{position:"fixed",bottom:mobile?80:24,right:20,zIndex:2000,background:toast.type==="info"?C.card:"#1A2E1A",border:`1px solid ${toast.type==="info"?C.border2:"rgba(34,201,122,.3)"}`,color:toast.type==="info"?C.muted2:"#22C97A",padding:"10px 18px",borderRadius:12,fontSize:13,fontWeight:600,boxShadow:"0 8px 32px rgba(0,0,0,.4)",animation:"toastIn .25s ease",fontFamily:F}}>{toast.msg}</div>}
  </div>;
}
