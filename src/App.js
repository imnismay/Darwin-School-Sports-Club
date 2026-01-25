import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';

// --- FIREBASE IMPORTS ---
import { db, auth } from './firebase'; 
import { collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc, query } from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';

// --- ICONS ---
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faTableTennisPaddleBall, faBaseballBatBall, faPersonSwimming, faBasketball, faTrophy, 
  faVolleyball, faPersonRunning, faUsers, 
  faPrint, faTrash, faReceipt, faIndianRupeeSign, faCalendarCheck, 
  faPlus, faToggleOn, faToggleOff, faPenToSquare, faSave, faGear, faList 
} from '@fortawesome/free-solid-svg-icons'; 
import { faWhatsapp as faWhatsappBrand } from '@fortawesome/free-brands-svg-icons';

// --- CONFIGURATION ---
const MAP_LINK = "https://www.google.com/maps/search/?api=1&query=Darwin+Higher+Primary+School+Devadurga+Road";
const DEVELOPER_LINK = "https://portfolio-67p.pages.dev/"; 
// REPLACE WITH ADMIN'S WHATSAPP NUMBER
const ADMIN_PHONE = ""; 

const ICON_MAP = {
  "Table Tennis": faTableTennisPaddleBall,
  "Box Cricket": faBaseballBatBall,
  "Swimming": faPersonSwimming,
  "Volleyball": faVolleyball,   
  "Kabaddi": faUsers,           
  "Kho Kho": faPersonRunning,   
  "Basketball": faBasketball,
  "Other": faTrophy
};

// --- DATE HELPERS ---
const getTodayString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getMaxDateString = () => {
  const d = new Date();
  d.setDate(d.getDate() + 2); 
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// --- TIME LOGIC ---
const getAvailableSlots = (dateString) => {
  const date = new Date(dateString);
  const day = date.getDay(); 
  let slots = [];
  
  const addRange = (start, end) => {
    for (let i = start; i < end; i++) {
      const time = i < 10 ? `0${i}:00` : `${i}:00`;
      slots.push(time);
    }
  };

  // Sunday: 6am-12pm & 5pm-9pm, Others: 6am-9am & 5pm-9pm
  if (day === 0) { addRange(6, 12); addRange(17, 21); } 
  else { addRange(6, 9); addRange(17, 21); }
  return slots;
};

const getValidEndTimes = (startTime, allSlots) => {
  if (!startTime || allSlots.length === 0) return [];
  const startHour = parseInt(startTime.split(":")[0]);
  const validEnds = [];
  for (let h = startHour + 1; h <= 24; h++) {
    const timeStr = h < 10 ? `0${h}:00` : `${h}:00`;
    const isStartSlot = allSlots.includes(timeStr);
    const prevHourStr = (h - 1) < 10 ? `0${h-1}:00` : `${h-1}:00`;
    const isPrevSlotValid = allSlots.includes(prevHourStr);
    if (isStartSlot) validEnds.push(timeStr);
    else if (isPrevSlotValid) { validEnds.push(timeStr); break; } 
    else break;
  }
  return validEnds;
};

// --- USER HOME PAGE ---
function UserHome() {
  const [sportsList, setSportsList] = useState([]);
  const [selectedSport, setSelectedSport] = useState(null);
  const [date, setDate] = useState(getTodayString());
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [count, setCount] = useState(""); 
  const [cloudBookings, setCloudBookings] = useState([]);

  useEffect(() => {
    const unsubSports = onSnapshot(query(collection(db, "sports")), (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const active = data.filter(s => s.isActive);
      setSportsList(active);
      if (active.length > 0 && !selectedSport) setSelectedSport(active[0]);
    });
    const unsubBookings = onSnapshot(query(collection(db, "bookings")), (snap) => {
      setCloudBookings(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => { unsubSports(); unsubBookings(); };
    // eslint-disable-next-line
  }, []);

  const availableStartSlots = getAvailableSlots(date);
  const validEndSlots = getValidEndTimes(startTime, availableStartSlots);

  useEffect(() => {
    if (availableStartSlots.length > 0) setStartTime(availableStartSlots[0]);
    else { setStartTime(""); setEndTime(""); }
    // eslint-disable-next-line
  }, [date]);

  useEffect(() => {
    const ends = getValidEndTimes(startTime, availableStartSlots);
    if (ends.length > 0) setEndTime(ends[0]);
    else setEndTime("");
    // eslint-disable-next-line
  }, [startTime]);

  const calculateTotal = () => {
    if (!startTime || !endTime || !selectedSport) return 0;
    const startHour = parseInt(startTime.split(":")[0]);
    const endHour = parseInt(endTime.split(":")[0]);
    let duration = endHour - startHour;
    return duration > 0 ? duration * selectedSport.price : 0;
  };
  const totalAmount = calculateTotal();

  const handleBook = async (e) => {
    e.preventDefault();
    if (!startTime || !endTime) return alert("Invalid time selection");
    if (startTime >= endTime) return alert("End time must be after start time");
    if (!count) return alert("Please enter number of players");

    const isOverlapped = cloudBookings.some(b => {
      if (b.date !== date || b.sport !== selectedSport.name) return false;
      return (startTime < b.endTime && endTime > b.startTime);
    });

    if (isOverlapped) return alert("❌ This slot is already booked! Please choose another time.");

    try {
      await addDoc(collection(db, "bookings"), {
        sport: selectedSport.name,
        date, startTime, endTime, totalAmount,
        paymentMode: 'PAY AT VENUE',
        customer: { name, phone, count: `${count} Players` }, 
        timestamp: new Date().toLocaleString(),
        createdAt: Date.now()
      });

      // --- WHATSAPP CONFIRMATION (With Player Count) ---
      const msg = `Hello, I confirmed a booking at Darwin School Sports Club!%0A%0A*Sport:* ${selectedSport.name}%0A*Date:* ${date}%0A*Time:* ${startTime} - ${endTime}%0A*Name:* ${name}%0A*Players:* ${count}%0A%0ASee you there!`;
      const waUrl = `https://wa.me/${ADMIN_PHONE}?text=${msg}`;
      
      alert(`✅ Booking Confirmed! Opening WhatsApp...`);
      window.open(waUrl, '_blank');

      setName(""); setPhone(""); setCount("");
    } catch (error) {
      console.error(error);
      alert("Error saving booking.");
    }
  };

  const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });

  return (
    <div className="user-container">
      <header className="hero-section">
        <div className="logo-icon"><FontAwesomeIcon icon={faTrophy} /></div>
        <h1>Darwin School Sports Club</h1>
        <p className="tagline">For the Love of Sport</p>
      </header>

      <div className="content-wrapper">
        <div className="booking-card">
          <div className="sport-grid-selector">
            {sportsList.map(sport => (
              <button key={sport.id} className={selectedSport?.id === sport.id ? "active" : ""} onClick={() => setSelectedSport(sport)}>
                <FontAwesomeIcon icon={ICON_MAP[sport.name] || faTrophy} />
                <span>{sport.name}</span>
                <span className="mini-price">₹{sport.price}/hr</span>
              </button>
            ))}
          </div>

          <form onSubmit={handleBook}>
            <div className="form-section"><label>📅 Select Date</label><div className="input-wrapper"><input type="date" required value={date} min={getTodayString()} max={getMaxDateString()} onChange={e => setDate(e.target.value)} /><span className="day-badge">{dayName}</span></div></div>

            <div className="time-row">
              <div className="form-section">
                <label>🟢 Start</label>
                <select value={startTime} onChange={e => setStartTime(e.target.value)}>
                  {availableStartSlots.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="arrow">➜</div>
              <div className="form-section">
                <label>🔴 End</label>
                <select value={endTime} onChange={e => setEndTime(e.target.value)}>
                  {validEndSlots.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className="total-display"><span>Total Price:</span><span className="price-value">₹{totalAmount}</span></div>

            <div className="user-details-section">
              <div className="input-group"><span className="icon">👤</span><input type="text" placeholder="Your Name" required value={name} onChange={e => setName(e.target.value)} /></div>
              <div className="input-group"><span className="icon">📞</span><input type="tel" placeholder="Mobile Number" required value={phone} onChange={e => setPhone(e.target.value)} /></div>
              <div className="input-group"><span className="icon">👥</span><input type="number" placeholder="Number of Players" required min="1" value={count} onChange={e => setCount(e.target.value)} /></div>
            </div>
            
            <button type="submit" className="book-btn">
              <span>Confirm & WhatsApp</span>
              <span className="btn-arrow"><FontAwesomeIcon icon={faWhatsappBrand} /></span>
            </button>
          </form>
        </div>

        <div className="info-card location-card">
          <div className="section-title">📍 Location</div>
          <div className="address-box">
            <p className="venue-name">Darwin School Sports Club</p>
            <p className="venue-address">Near Darwin Higher Primary School,<br/>Devadurga Road</p>
            <a href={MAP_LINK} target="_blank" rel="noopener noreferrer" className="map-btn">🗺️ Open in Google Maps</a>
          </div>
        </div>
        
        <div className="simple-footer">
          <p>© Darwin School Sports Club</p>
          <a href={DEVELOPER_LINK} target="_blank" rel="noopener noreferrer" className="developer-tag">Developed by <span className="dev-name">Mayur Dammannanavar</span></a>
        </div>
      </div>
      <div style={{height: "30px"}}></div> 
    </div>
  );
}

// --- ADMIN PORTAL (SECURE) ---
function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('bookings'); 
  const [filterDate, setFilterDate] = useState(getTodayString());
  const [bookings, setBookings] = useState([]);
  const [sports, setSports] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [newSportName, setNewSportName] = useState("Volleyball");
  const [newSportPrice, setNewSportPrice] = useState("300");
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return; 
    
    const bQ = query(collection(db, "bookings"));
    const unsubB = onSnapshot(bQ, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.date > a.date ? 1 : -1) || (a.startTime > b.startTime ? 1 : -1));
      setBookings(data);
    });

    const sQ = query(collection(db, "sports"));
    const unsubS = onSnapshot(sQ, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setSports(data);
    });

    return () => { unsubB(); unsubS(); };
  }, [user]);

  const handleLogout = async () => { await signOut(auth); };
  const handleDeleteBooking = async (id) => { if(window.confirm("Delete booking?")) await deleteDoc(doc(db, "bookings", id)); };
  const handleToggleSport = async (sport) => { await updateDoc(doc(db, "sports", sport.id), { isActive: !sport.isActive }); };
  const handleUpdatePrice = async (sport) => {
    const price = prompt(`Enter new price:`, sport.price);
    if (price) await updateDoc(doc(db, "sports", sport.id), { price: Number(price) });
  };
  const handleDeleteSport = async (id) => { if(window.confirm("Delete sport?")) await deleteDoc(doc(db, "sports", id)); };
  const handleAddSport = async () => {
    if (!newSportName || !newSportPrice) return;
    await addDoc(collection(db, "sports"), { name: newSportName, price: Number(newSportPrice), isActive: true });
    setIsAdding(false);
  };

  if (!user) return <AdminLogin />;

  const filteredBookings = bookings.filter(b => b.date === filterDate);
  const revenue = filteredBookings.reduce((sum, b) => sum + Number(b.totalAmount), 0);
  const visitors = filteredBookings.reduce((sum, b) => sum + (parseInt(b.customer.count)||0), 0);

  return (
    <div className="admin-container">
      {selectedInvoice && <InvoiceModal booking={selectedInvoice} onClose={() => setSelectedInvoice(null)} />}

      <header className="hero-section no-print" style={{ borderRadius: '0 0 40px 40px', marginBottom: '30px', position: 'relative' }}>
        <div style={{position: 'absolute', top: '20px', right: '20px', zIndex: 100}}>
           <button className="logout-btn" style={{background: 'rgba(255,255,255,0.2)'}} onClick={handleLogout}>Logout</button>
        </div>
        <div className="logo-icon"><FontAwesomeIcon icon={faTrophy} /></div>
        <h1>Darwin School Sports Club</h1>
        <p className="tagline">For the Love of Sport</p>
        <p style={{fontSize: '13px', color: '#cbd5e1', marginTop: '8px'}}>Admin Portal</p>
      </header>

      <div className="admin-tabs no-print">
        <button className={activeTab === 'bookings' ? 'active' : ''} onClick={() => setActiveTab('bookings')}><FontAwesomeIcon icon={faList} /> Bookings</button>
        <button className={activeTab === 'sports' ? 'active' : ''} onClick={() => setActiveTab('sports')}><FontAwesomeIcon icon={faGear} /> Manage Sports</button>
      </div>

      {activeTab === 'bookings' && (
        <>
          <div className="stats-grid no-print">
            <div className="stat-card"><div className="stat-icon revenue-icon"><FontAwesomeIcon icon={faIndianRupeeSign} /></div><div className="stat-info"><span className="stat-label">Revenue</span><span className="stat-value">₹{revenue}</span></div></div>
            <div className="stat-card"><div className="stat-icon players-icon"><FontAwesomeIcon icon={faUsers} /></div><div className="stat-info"><span className="stat-label">Visitors</span><span className="stat-value">{visitors}</span></div></div>
            <div className="stat-card"><div className="stat-icon bookings-icon"><FontAwesomeIcon icon={faCalendarCheck} /></div><div className="stat-info"><span className="stat-label">Bookings</span><span className="stat-value">{filteredBookings.length}</span></div></div>
          </div>
          <div className="action-bar no-print">
            <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="date-picker-pro" />
            <div className="action-buttons"><button onClick={() => window.print()} className="action-btn print"><FontAwesomeIcon icon={faPrint} /> Print</button></div>
          </div>
          <div className="table-container">
            <table className="pro-table">
              <thead><tr><th>Time</th><th>Sport</th><th>Customer</th><th>Paid</th><th className="no-print">Action</th></tr></thead>
              <tbody>
                {filteredBookings.map(b => (
                  <tr key={b.id}>
                    <td><span className="time-badge">{b.startTime}-{b.endTime}</span></td><td>{b.sport}</td><td><strong>{b.customer.name}</strong><br/><small>{b.customer.phone}</small></td><td className="amount-cell">₹{b.totalAmount}</td>
                    <td className="no-print">
                       <button onClick={() => setSelectedInvoice(b)} className="icon-btn invoice-btn"><FontAwesomeIcon icon={faReceipt} /></button>
                       <button onClick={() => handleDeleteBooking(b.id)} className="icon-btn delete-btn"><FontAwesomeIcon icon={faTrash} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'sports' && (
        <div className="sports-manager">
          <div className="manager-header"><h3>Sports & Pricing</h3><button className="add-btn" onClick={() => setIsAdding(!isAdding)}><FontAwesomeIcon icon={faPlus} /> Add Sport</button></div>
          {isAdding && (
            <div className="add-sport-form">
              <select value={newSportName} onChange={e => setNewSportName(e.target.value)}>{Object.keys(ICON_MAP).map(k => <option key={k} value={k}>{k}</option>)}</select>
              <input type="number" placeholder="Price/Hour" value={newSportPrice} onChange={e => setNewSportPrice(e.target.value)} />
              <button className="save-btn" onClick={handleAddSport}><FontAwesomeIcon icon={faSave} /> Save</button>
            </div>
          )}
          <div className="sports-list">
            {sports.map(s => (
              <div key={s.id} className={`sport-card-admin ${s.isActive ? 'active' : 'inactive'}`}>
                <div className="sc-icon"><FontAwesomeIcon icon={ICON_MAP[s.name] || faTrophy} /></div>
                <div className="sc-info"><h4>{s.name}</h4><p>Price: <strong>₹{s.price}</strong> / hr</p><span className={`status-badge ${s.isActive ? 'open' : 'closed'}`}>{s.isActive ? 'OPEN' : 'CLOSED'}</span></div>
                <div className="sc-actions">
                  <button onClick={() => handleToggleSport(s)} className="toggle-btn"><FontAwesomeIcon icon={s.isActive ? faToggleOn : faToggleOff} /></button>
                  <button onClick={() => handleUpdatePrice(s)} className="edit-btn"><FontAwesomeIcon icon={faPenToSquare} /></button>
                  <button onClick={() => handleDeleteSport(s.id)} className="del-btn"><FontAwesomeIcon icon={faTrash} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="simple-footer no-print"><p>© Darwin School Sports Club</p><a href={DEVELOPER_LINK} target="_blank" rel="noopener noreferrer" className="developer-tag">Developed by <span className="dev-name">Mayur Dammannanavar</span></a></div>
    </div>
  );
}

function AdminLogin() {
  const [email, setEmail] = useState(""); 
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err) {
      setError("Invalid Email or Password");
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="logo-icon" style={{fontSize: '30px', marginBottom: '10px'}}><FontAwesomeIcon icon={faTrophy} /></div>
        <h2 style={{margin: '0 0 5px 0', color: '#0F172A', fontSize: '18px'}}>Darwin School Sports Club</h2>
        <p style={{margin: '0 0 20px 0', fontSize: '12px', color: '#94A3B8', fontStyle: 'italic'}}>For the Love of Sport</p>
        <h2 style={{fontSize: '16px', marginBottom: '15px'}}>🔒 Admin Login</h2>
        <form onSubmit={handleLogin}>
          <input type="email" placeholder="Admin Email" value={email} onChange={e => setEmail(e.target.value)} required />
          <input type="password" placeholder="Password" value={pass} onChange={e => setPass(e.target.value)} required />
          <button type="submit" className="login-btn">Login</button>
        </form>
        {error && <p className="error-msg" style={{color: 'red', fontSize: '12px', marginTop: '10px'}}>{error}</p>}
        <div className="simple-footer" style={{marginTop: '20px', borderTop: 'none', padding: '0'}}>
          <a href={DEVELOPER_LINK} target="_blank" rel="noopener noreferrer" className="developer-tag">Developed by <span className="dev-name">Mayur Dammannanavar</span></a>
        </div>
      </div>
    </div>
  );
}

function InvoiceModal({ booking, onClose }) {
  const componentRef = useRef();
  return (
    <div className="modal-overlay">
      <div className="invoice-container" ref={componentRef}>
        <div className="invoice-header"><h2>INVOICE</h2><div className="club-branding"><h3>Darwin School Sports Club</h3></div></div>
        <div className="invoice-meta"><div><strong>Bill To:</strong><p>{booking.customer.name}</p></div><div style={{textAlign:'right'}}><strong>Date:</strong> {booking.date}</div></div>
        <table className="invoice-table"><thead><tr><th>Desc</th><th style={{textAlign:'right'}}>Amt</th></tr></thead><tbody><tr><td>{booking.sport} ({booking.startTime}-{booking.endTime})<br/>Players: {booking.customer.count}</td><td style={{textAlign:'right'}}>₹{booking.totalAmount}</td></tr></tbody></table>
        <div className="invoice-total"><span>Total</span><span>₹{booking.totalAmount}</span></div>
        <div className="invoice-actions no-print"><button onClick={() => window.print()} className="print-btn">Print</button><button onClick={onClose} className="close-btn">Close</button></div>
      </div>
    </div>
  );
}

function App() { return (<Router><Routes><Route path="/" element={<UserHome />} /><Route path="/admin" element={<AdminDashboard />} /></Routes></Router>); }
export default App;
