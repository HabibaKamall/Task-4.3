import React,{useEffect,useMemo,useRef,useState} from 'react';

const STORAGE='acl-roomgrid-18rooms-v1';
const rooms=['A1-203', 'A2-106', 'A2-107', 'A3-208', 'A3-209', 'B1-205', 'B1-206', 'B1-207', 'B2-104', 'B2-105', 'B3-301', 'C1-102', 'C1-103', 'C2-201', 'C2-202', 'C3-101', 'C3-102', 'D1-101'];
// End dates are exclusive; all sample reservations use non-overlapping date ranges.
const sampleRows=[
 ['A1-203','2026-11-09','2026-11-11','Peer tutoring','other'],
 ['A1-203','2026-11-13','2026-11-15','Architecture workshop','other'],
 ['A1-203','2026-11-17','2026-11-19','Group assignment','you'],
 ['A2-106','2026-11-10','2026-11-13','Seminar preparation','other'],
 ['A2-106','2026-11-16','2026-11-19','Study circle','other'],
 ['A2-107','2026-11-09','2026-11-10','Student club planning','you'],
 ['A2-107','2026-11-12','2026-11-15','Project demo rehearsal','other'],
 ['A2-107','2026-11-16','2026-11-19','Study meeting','other'],
 ['A3-208','2026-11-11','2026-11-14','Presentation practice','other'],
 ['A3-208','2026-11-16','2026-11-18','Tutorial group','other'],
 ['A3-209','2026-11-10','2026-11-12','Study session','other'],
 ['B1-205','2026-11-09','2026-11-11','Meeting','other'],
 ['B1-205','2026-11-13','2026-11-15','Team discussion','other'],
 ['B1-205','2026-11-16','2026-11-18','Course project','other'],
 ['B1-206','2026-11-11','2026-11-13','Exam revision','other'],
 ['B1-206','2026-11-17','2026-11-20','Debate practice','you'],
 ['B1-207','2026-11-10','2026-11-12','Group study','you'],
 ['B1-207','2026-11-16','2026-11-19','Engineering project','other'],
 ['B2-104','2026-11-09','2026-11-11','Weekly study group','you'],
 ['B2-104','2026-11-13','2026-11-15','Team planning','other'],
 ['B2-104','2026-11-17','2026-11-19','Workshop preparation','other'],
 ['B2-105','2026-11-12','2026-11-15','Club meeting','other'],
 ['B2-105','2026-11-16','2026-11-18','Student committee','other'],
 ['B3-301','2026-11-09','2026-11-10','Debate practice','other'],
 ['B3-301','2026-11-11','2026-11-13','Group preparation','other'],
 ['B3-301','2026-11-18','2026-11-20','Portfolio review','other'],
 ['C1-102','2026-11-10','2026-11-14','Capstone meeting','other'],
 ['C1-102','2026-11-16','2026-11-19','Revision session','other'],
 ['C1-103','2026-11-09','2026-11-12','Group project','other'],
 ['C1-103','2026-11-14','2026-11-16','Student society','you'],
 ['C2-201','2026-11-12','2026-11-15','Project sprint','other'],
 ['C2-201','2026-11-16','2026-11-19','Robotics club','other'],
 ['C2-202','2026-11-09','2026-11-11','Lab preparation','other'],
 ['C2-202','2026-11-18','2026-11-20','Teaching assistant session','other'],
 ['C3-101','2026-11-12','2026-11-14','Presentation rehearsal','you'],
 ['C3-101','2026-11-14','2026-11-16','Design workshop','other'],
 ['C3-101','2026-11-18','2026-11-20','Study group','other'],
 ['C3-102','2026-11-11','2026-11-15','Research meeting','other'],
 ['D1-101','2026-11-10','2026-11-13','Team check-in','other'],
 ['D1-101','2026-11-16','2026-11-18','Group assignment','you'],
];
const buildings=[...new Set(rooms.map(r=>r[0]))];
const seed=sampleRows.map(([roomNumber,startDate,endDate,purpose,owner],index)=>({id:`demo-${index+1}`,roomNumber,startDate,endDate,purpose,owner}));
const formEmpty={roomNumber:'',startDate:'',endDate:'',purpose:''};
function read(){try{let a=JSON.parse(localStorage.getItem(STORAGE));return Array.isArray(a)?a:seed;}catch{return seed;}}
function addDays(iso,days){const t=new Date(`${iso}T12:00:00Z`);t.setUTCDate(t.getUTCDate()+days);return t.toISOString().slice(0,10);}
function human(iso){return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB',{timeZone:'UTC',day:'numeric',month:'short'});}
function weekDay(iso){return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB',{timeZone:'UTC',weekday:'short'});}
// Stored end dates stay exclusive; on screen we show the last day that is actually booked.
function dayCount(start,end){return Math.round((new Date(`${end}T12:00:00Z`)-new Date(`${start}T12:00:00Z`))/864e5);}
function rangeText(start,end){const last=addDays(end,-1);return last===start?human(start):`${human(start)} – ${human(last)}`;}
function span(start,end){const n=dayCount(start,end);return `${rangeText(start,end)} · ${n} day${n===1?'':'s'}`;}
function overlapping(bookings,room,start,end,id){const r=room.trim().toLowerCase();return bookings.filter(b=>b.id!==id&&b.roomNumber.toLowerCase()===r&&start<b.endDate&&end>b.startDate).sort((a,b)=>a.startDate.localeCompare(b.startDate));}
function nextFree(bookings,room,start,end,id){const len=dayCount(start,end);for(let i=1;i<=60;i++){const s=addDays(start,i),e=addDays(s,len);if(!overlapping(bookings,room,s,e,id).length)return {startDate:s,endDate:e};}return null;}
// Same rules as before, but each problem says which field it belongs to and how to fix it.
function findRoom(text){const t=text.trim().toLowerCase();return rooms.find(r=>r.toLowerCase()===t);}
function issue(form,bookings,id){
 if(!form.roomNumber.trim())return {field:'roomNumber',message:'Enter a room number, e.g. B2-104.'};
 if(!findRoom(form.roomNumber))return {field:'roomNumber',message:`"${form.roomNumber.trim()}" isn't a room in the directory. Pick one from the list, e.g. B2-104.`};
 if(!form.startDate)return {field:'startDate',message:'Choose a start date.'};
 if(!form.endDate)return {field:'endDate',message:'Choose an end date.'};
 if(form.endDate<=form.startDate)return {field:'endDate',message:'End date must be after the start date. The end date itself is not booked.'};
 const clash=overlapping(bookings,form.roomNumber,form.startDate,form.endDate,id)[0];
 if(clash){const fix=nextFree(bookings,form.roomNumber,form.startDate,form.endDate,id);return {field:'dates',fix,message:`${clash.roomNumber} is already booked ${rangeText(clash.startDate,clash.endDate)}${clash.owner==='you'?' (your own booking)':''}.${fix?` The same length is free from ${human(fix.startDate)}.`:''}`};}
 return null;
}
export default function App(){
 const [bookings,setBookings]=useState(read);
 const [week,setWeek]=useState('2026-11-09');
 const [building,setBuilding]=useState('All buildings');
 const [view,setView]=useState('All rooms');
 const [roomLeft,setRoomLeft]=useState(false);
 const [form,setForm]=useState({...formEmpty});
 const [editing,setEditing]=useState(null);
 const [error,setError]=useState(null);
 const [notice,setNotice]=useState('');
 const [anchor,setAnchor]=useState(null);
 const formRef=useRef(null);
 const fieldRefs={roomNumber:useRef(null),startDate:useRef(null),endDate:useRef(null)};
 useEffect(()=>localStorage.setItem(STORAGE,JSON.stringify(bookings)),[bookings]);
 const days=useMemo(()=>Array.from({length:7},(_,i)=>addDays(week,i)),[week]);
 const myBookings=bookings.filter(b=>b.owner==='you').sort((a,b)=>a.startDate.localeCompare(b.startDate));
 const buildingRooms=building==='All buildings'?rooms:rooms.filter(r=>r[0]===building);
 const roomList=view==='All rooms'?buildingRooms:buildingRooms.filter(r=>r===view);
 const occupied=(room,date)=>bookings.find(b=>b.roomNumber===room&&date>=b.startDate&&date<b.endDate);
 const editingRow=bookings.find(b=>b.id===editing);
 const validRange=form.startDate&&form.endDate&&form.endDate>form.startDate;
 // Once room and both dates are filled in, show conflicts while the user is still choosing.
 // An unknown room is flagged as soon as the user leaves the field, without waiting for dates.
 const roomIssue=roomLeft&&form.roomNumber.trim()&&!findRoom(form.roomNumber)?issue(form,bookings,editing):null;
 const live=roomIssue||(form.roomNumber.trim()&&form.startDate&&form.endDate?issue(form,bookings,editing):null);
 const shown=error||live;
 const selected=(room,day)=>validRange&&form.roomNumber.trim().toLowerCase()===room.toLowerCase()&&day>=form.startDate&&day<form.endDate;
 function update(key,value){setForm(f=>({...f,[key]:value}));setError(null);setNotice('');if(key==='roomNumber')setRoomLeft(false);}
 function chooseBuilding(value){setBuilding(value);if(value!=='All buildings'&&view!=='All rooms'&&view[0]!==value)setView('All rooms');}
 function focusField(field){fieldRefs[field==='dates'?'startDate':field].current?.focus();}
 function showForm(){requestAnimationFrame(()=>{formRef.current?.scrollIntoView({behavior:'smooth',block:'start'});fieldRefs.roomNumber.current?.focus({preventScroll:true});});}
 function cellClick(room,date){
  setError(null);setNotice('');
  if(anchor&&anchor.room===room&&date>=anchor.date){setForm(f=>({...f,endDate:addDays(date,1)}));setAnchor(null);formRef.current?.scrollIntoView({behavior:'smooth',block:'nearest'});return;}
  setForm(f=>({roomNumber:room,startDate:date,endDate:addDays(date,1),purpose:editing?f.purpose:''}));setAnchor({room,date});
 }
 function edit(row){if(row.owner!=='you')return;setEditing(row.id);setForm({roomNumber:row.roomNumber,startDate:row.startDate,endDate:row.endDate,purpose:row.purpose});setError(null);setNotice('');setAnchor(null);showForm();}
 function cancelEdit(){setEditing(null);setForm({...formEmpty});setError(null);setAnchor(null);}
 function submit(e){e.preventDefault();setNotice('');const err=issue(form,bookings,editing);if(err){setError(err);focusField(err.field);return;}const payload={roomNumber:findRoom(form.roomNumber),startDate:form.startDate,endDate:form.endDate,purpose:form.purpose.trim(),owner:'you'};const summary=`${payload.roomNumber}, ${span(payload.startDate,payload.endDate)}`;
  if(editing){setBookings(bookings.map(b=>b.id===editing?{...b,...payload}:b));setNotice(`Booking updated: ${summary}.`);}else{setBookings([...bookings,{...payload,id:'b-'+Date.now()}]);setNotice(`Room reserved: ${summary}.`);}setForm({...formEmpty});setEditing(null);setError(null);setAnchor(null);}
 function reset(){if(!window.confirm('Reset the demo? Your new and changed bookings will be removed and the example bookings restored.'))return;setBookings(seed);setForm({...formEmpty});setEditing(null);setWeek('2026-11-09');setNotice('Example bookings restored.');setError(null);setAnchor(null);setView('All rooms');setBuilding('All buildings');}
 function check(){setNotice('');setError(null);const err=issue(form,bookings,editing);if(err){setError(err);focusField(err.field);}else setNotice(`${findRoom(form.roomNumber)} is free for ${span(form.startDate,form.endDate)}.`);}
 function applyFix(fix){setForm(f=>({...f,...fix}));setError(null);setNotice('');}
 const invalid=key=>shown&&(shown.field===key||(shown.field==='dates'&&key!=='roomNumber'));
 const fieldError=key=>shown&&(key==='roomNumber'?shown.field==='roomNumber':shown.field!=='roomNumber')&&<p id={`${key}-error`} className="field-error" role={error?'alert':'status'}>{shown.message}{shown.fix&&<> <button type="button" className="fix" onClick={()=>applyFix(shown.fix)}>Use {span(shown.fix.startDate,shown.fix.endDate)}</button></>}</p>;
 const hint=anchor?`Start: ${anchor.room}, ${human(anchor.date)}. Click a later open day in the same row to set the last day, or edit the dates in the form.`:'Click an open day to start a booking, then click a later day to extend it. Click your own booking to change it.';
 return <div className="room-app"><header className="topbar"><div className="mark"><span className="mark-sq">R</span><span><strong>room<span>grid</span></strong><small>Campus spaces</small></span></div><nav><a href="#availability">Availability</a><a href="#my-reservations">My bookings</a></nav><div className="member"><button className="reset-button" onClick={reset}>Reset demo</button><span>Student dashboard</span><div className="profile">YOU</div></div></header>
  <main><section className="intro"><div><span className="eyebrow">SPACES / RESERVATIONS</span><h1>Find room availability</h1><p>Review campus rooms, dates and existing reservations in one view.</p></div><div className="intro-summary"><span>ROOMS IN DIRECTORY</span><strong>{rooms.length.toString().padStart(2,'0')}</strong><span>CURRENT RESERVATIONS</span><strong>{bookings.length.toString().padStart(2,'0')}</strong></div></section>
   <div className="pagegrid"><section className="calendar-pane" id="availability"><div className="calendar-head"><div><span className="eyebrow">AVAILABILITY CALENDAR</span><h2>Rooms by day</h2></div><div className="weeknav"><button aria-label="Previous week" onClick={()=>setWeek(addDays(week,-7))}>←</button><strong>{human(week)} – {human(addDays(week,6))}</strong><button aria-label="Next week" onClick={()=>setWeek(addDays(week,7))}>→</button></div></div>
    <div className="calendar-controls"><label>Building <select value={building} onChange={e=>chooseBuilding(e.target.value)}><option>All buildings</option>{buildings.map(b=><option key={b} value={b}>Building {b}</option>)}</select></label><label>Room <select value={view} onChange={e=>setView(e.target.value)}><option>All rooms</option>{buildingRooms.map(r=><option key={r}>{r}</option>)}</select></label><span className="legend"><i className="free"/> Available</span><span className="legend"><i className="mine"/> Your booking</span><span className="legend"><i className="booked"/> Reserved</span><span className="legend"><i className="sel"/> Selected</span><p className={'pick-hint'+(anchor?' active':'')} aria-live="polite">{hint}</p></div>
    <div className="calendar-scroll"><div className="room-cal"><div className="corner">ROOM / DATE</div>{days.map(d=><div className="dayhead" key={d}><strong>{weekDay(d)}</strong><span>{human(d)}</span></div>)}{roomList.map(room=><React.Fragment key={room}><div className="roomname"><strong>{room}</strong><small>Building {room[0]}</small></div>{days.map(day=>{const b=occupied(room,day);const sel=selected(room,day)?' selected':'';
     if(b&&b.owner!=='you')return <div key={room+day} className={'slot taken'+sel} title={`${room} is reserved ${rangeText(b.startDate,b.endDate)}`}><span>Reserved</span><small>Not available</small></div>;
     if(b)return <button key={room+day} className={'slot mine'+sel} title={`Your booking: ${room}, ${span(b.startDate,b.endDate)}. Click to change it.`} onClick={()=>edit(b)}><span>{b.id===editing?'Editing':'Yours'}</span><small>Click to change</small></button>;
     const isStart=anchor&&anchor.room===room&&anchor.date===day;
     return <button key={room+day} className={'slot available'+sel} aria-label={`${room}, ${weekDay(day)} ${human(day)}: available`} onClick={()=>cellClick(room,day)}><span>{isStart?'Start':'Open'}</span></button>;})}</React.Fragment>)}</div></div>
    <p className="calendar-note">Each cell is one day. A booking covers every day from its start date up to, but not including, its end date.</p>
    <section id="my-reservations" className="reservations"><div className="reservations-head"><h2>Your bookings</h2><span>{myBookings.length} current records</span></div><div className="reservations-list">{myBookings.map(b=><article key={b.id} className={'reservation'+(b.id===editing?' is-editing':'')}><div className="room-chip">{b.roomNumber}</div><div className="reservation-body"><strong>{rangeText(b.startDate,b.endDate)}</strong><small>{dayCount(b.startDate,b.endDate)} day{dayCount(b.startDate,b.endDate)===1?'':'s'} · {b.purpose||'No purpose entered'}</small></div><button onClick={()=>edit(b)} aria-label={`Change booking for ${b.roomNumber}, ${rangeText(b.startDate,b.endDate)}`}>{b.id===editing?'Editing':'Change'}</button></article>)}{myBookings.length===0&&<p>No reservations.</p>}</div></section></section>
    <aside className="booking-pane" id="booking-form" ref={formRef}><div className="panel-tag"><span>BOOK A ROOM</span><span>FORM 01</span></div><h2>{editing?'Change reservation':'Make a reservation'}</h2><p className="booking-description">Pick days on the calendar or fill in the fields below.</p>
     {editingRow&&<div className="editing-banner"><span>Editing <strong>{editingRow.roomNumber}</strong> · {span(editingRow.startDate,editingRow.endDate)}</span><button type="button" onClick={cancelEdit}>Cancel</button></div>}
     {notice&&<div className="success" role="status">{notice}</div>}
     <form onSubmit={submit} noValidate><label><span>Room number</span><input ref={fieldRefs.roomNumber} list="rooms" placeholder="e.g., B2-104" value={form.roomNumber} aria-invalid={invalid('roomNumber')||undefined} aria-describedby={invalid('roomNumber')?'roomNumber-error':undefined} onChange={e=>update('roomNumber',e.target.value)} onBlur={()=>setRoomLeft(true)}/><datalist id="rooms">{rooms.map(r=><option key={r} value={r}/>)}</datalist></label>{fieldError('roomNumber')}
      <div className="date-pair"><label><span>Start date</span><input ref={fieldRefs.startDate} type="date" value={form.startDate} aria-invalid={invalid('startDate')||undefined} aria-describedby={invalid('startDate')?'dates-error':undefined} onChange={e=>update('startDate',e.target.value)}/></label><label><span>End date <small>(not included)</small></span><input ref={fieldRefs.endDate} type="date" value={form.endDate} aria-invalid={invalid('endDate')||undefined} aria-describedby={invalid('endDate')?'dates-error':undefined} onChange={e=>update('endDate',e.target.value)}/></label></div>{fieldError('dates')}
      {validRange&&!shown&&<p className="coverage">Covers {span(form.startDate,form.endDate)}</p>}
      <label><span>Purpose / optional</span><textarea rows="4" placeholder="Meeting, group study..." value={form.purpose} onChange={e=>update('purpose',e.target.value)}/></label><p className="helper">Room and both dates are required. A booking can't overlap another booking for the same room.</p><button className="availability-check" type="button" onClick={check}>Check availability</button><button className="reserve-button" type="submit">{editing?'Save booking':'Confirm booking'}</button>{editing&&<button className="cancel-edit" type="button" onClick={cancelEdit}>Cancel editing</button>}</form><div className="right-foot"><span>✦</span> Need a room for a group? Find an open date and submit your request.</div></aside></div>
  </main><footer>ROOMGRID / Academic campus demo — local browser data only.</footer>
 </div>;
}
