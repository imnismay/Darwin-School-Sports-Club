import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import './App.css';

// --- FIREBASE IMPORTS ---
import { db } from './firebase'; 
import { collection, addDoc, onSnapshot, deleteDoc, doc, query } from 'firebase/firestore';

// --- ICONS ---
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTableTennisPaddleBall, faBaseballBatBall, faPrint, faFileCsv, faTrash, faReceipt, faUsers, faIndianRupeeSign, faCalendarCheck } from '@fortawesome/free-solid-svg-icons'; 

// --- CONFIGURATION ---
const ADMIN_CREDENTIALS = {
  username: "",
  password: "" 
};

const PRICE_PER_HOUR = 300;
const MAP_LINK = "https://www.google.com/maps/search/?api=1&query=Darwin+Higher+Primary+School+Devadurga+Road";
const DEVELOPER_LINK = "https://portfolio-67p.pages.dev/"; 

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

  if (day === 0) { 
    addRange(6, 12); 
    addRange(17, 21);
  } else {
    addRange(6, 9);  
    addRange(17, 21);
  }
  return slots;
};

// --- PREVENT BRIDGE ACROSS BREAKS ---
const getValidEndTimes = (startTime, allSlots) => {
  if (!startTime || allSlots.length === 0) return [];
  const startHour = parseInt(startTime.split(":")[0]);
  const validEnds = [];
  
  for (let h = startHour + 1; h <= 24; h++) {
    const timeStr = h < 10 ? `0${h}:00` : `${h}:00`;
    const isStartSlot = allSlots.includes(timeStr);
    const prevHourStr = (h - 1) < 10 ? `0${h-1}:00` : `${h-1}:00`;
    const isPrevSlotValid = allSlots.includes(prevHourStr);

    if (isStartSlot) {
      validEnds.push(timeStr);
    } else if (isPrevSlotValid) {
      validEnds.push(timeStr);
      break; 
    } else {
      break;
    }
  }
  return validEnds;
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

// --- USER HOME PAGE ---
function UserHome() {
  const [sport, setSport] = useState("Table Tennis");
  const [date, setDate] = useState(getTodayString());
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [count, setCount] = useState("2 Players");

  const [cloudBookings, setCloudBookings] = useState([]);

  useEffect(() => {
    const q = query(collection(db, "bookings"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCloudBookings(data);
    });
    return () => unsubscribe();
  }, []);

  const checkOverlap = (newStart, newEnd) => {
    return cloudBookings.some(b => {
      if (b.date !== date || b.sport !== sport) return false;
      return (newStart < b.endTime && newEnd > b.startTime);
    });
  };

  const minDate = getTodayString();
  const maxDate = getMaxDateString();
  const availableStartSlots = getAvailableSlots(date);
  const validEndSlots = getValidEndTimes(startTime, availableStartSlots);

  useEffect(() => {
    if (availableStartSlots.length > 0) {
      setStartTime(availableStartSlots[0]);
    } else {
      setStartTime("");
      setEndTime("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  useEffect(() => {
    const ends = getValidEndTimes(startTime, availableStartSlots);
    if (ends.length > 0) {
      setEndTime(ends[0]);
    } else {
      setEndTime("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startTime, date]);

  const calculateTotal = () => {
    if (!startTime || !endTime) return 0;
    const startHour = parseInt(startTime.split(":")[0]);
    const endHour = parseInt(endTime.split(":")[0]);
    let duration = endHour - startHour;
    return duration > 0 ? duration * PRICE_PER_HOUR : 0;
  };
  const totalAmount = calculateTotal();

  const handleBook = async (e) => {
    e.preventDefault();
    if (!startTime || !endTime) return alert("Please select valid times");
    if (startTime >= endTime) return alert("⚠️ End time must be after start time!");
    
    if (checkOverlap(startTime, endTime)) {
      alert("❌ This slot is already booked! Please choose another time.");
      return;
    }

    try {
      await addDoc(collection(db, "bookings"), {
        sport, 
        date, 
        startTime, 
        endTime,
        totalAmount,
        paymentMode: 'PAY AT VENUE',
        customer: { name, phone, count },
        timestamp: new Date().toLocaleString(),
        createdAt: Date.now() // For sorting
      });

      alert(`✅ Booking Confirmed! Please pay ₹${totalAmount} at the venue.`);
      setName("");
      setPhone("");
    } catch (error) {
      console.error("Error adding document: ", error);
      alert("Error saving booking. Please check your internet.");
    }
  };

  const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });

  return (
    <div className="user-container">
      <header className="hero-section">
        <div className="logo-icon">
          <FontAwesomeIcon icon={faTableTennisPaddleBall} />
          <span style={{margin: "0 10px"}}></span>
          <FontAwesomeIcon icon={faBaseballBatBall} />
        </div>
        <h1>Darwin School Sports Club</h1>
        <p className="tagline">For the Love of Sport</p>
        <div className="price-badge"><span>🪙</span><span>₹{PRICE_PER_HOUR} / Hour</span></div>
        <p className="price-subtext">Play as many as you want!</p>
      </header>

      <div className="content-wrapper">
        <div className="booking-card">
          <div className="sport-toggle">
            <button className={sport === "Table Tennis" ? "active" : ""} onClick={() => setSport("Table Tennis")}>
              <FontAwesomeIcon icon={faTableTennisPaddleBall} /> Table Tennis
            </button>
            <button className={sport === "Box Cricket" ? "active" : ""} onClick={() => setSport("Box Cricket")}>
              <FontAwesomeIcon icon={faBaseballBatBall} /> Box Cricket
            </button>
          </div>

          <form onSubmit={handleBook}>
            <div className="form-section">
              <label>📅 Select Date</label>
              <div className="input-wrapper">
                <input type="date" required value={date} min={minDate} max={maxDate} onChange={e => setDate(e.target.value)} />
                <span className="day-badge">{dayName}</span>
              </div>
            </div>

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
              <div className="input-group"><span className="icon">👥</span>
                <select value={count} onChange={e => setCount(e.target.value)} className="clean-select">
                  <option value="2 Players">2 Players</option>
                  <option value="4 Players">4 Players</option>
                  <option value="6 Players">6 Players</option>
                  <option value="8 Players">8+ Players</option>
                </select>
              </div>
            </div>
            
            <div className="payment-options">
               <label className="pay-option selected" style={{cursor: 'default'}}>
                  <span>💵 Pay at Venue</span>
               </label>
            </div>

            <button type="submit" className="book-btn">
              <span>Confirm Booking</span>
              <span className="btn-arrow">→</span>
            </button>
          </form>
        </div>

        <div className="info-card">
          <div className="section-title">🏆 About the Club</div>
          <p className="about-text">Welcome to Darwin School Sports Club! We provide a safe, high-energy environment for students and sports enthusiasts to practice, play, and compete.</p>
        </div>

        <div className="info-card">
          <div className="section-title">⚡ Our Sports</div>
          <div className="sport-detail-box">
            <h4><FontAwesomeIcon icon={faBaseballBatBall} /> Box Cricket</h4>
            <p>Experience the thrill of cricket in a compact, fast-paced format! Our Box Cricket turf is enclosed with high-quality netting.</p>
          </div>
          <div className="sport-detail-box">
            <h4><FontAwesomeIcon icon={faTableTennisPaddleBall} /> Table Tennis</h4>
            <p>Sharpen your reflexes on our professional-grade ITTF standard tables. We provide high-quality rackets and balls.</p>
          </div>
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
          <a href={DEVELOPER_LINK} target="_blank" rel="noopener noreferrer" className="developer-tag">
            Developed and Maintained by <span className="dev-name">Mayur Dammannanavar</span>
          </a>
        </div>
      </div>
      <div style={{height: "30px"}}></div> 
    </div>
  );
}

// --- INVOICE MODAL ---
function InvoiceModal({ booking, onClose }) {
  const componentRef = useRef();

  const handlePrint = () => {
    window.print();
  };

  if (!booking) return null;

  return (
    <div className="modal-overlay">
      <div className="invoice-container" ref={componentRef}>
        <div className="invoice-header">
          <h2>INVOICE</h2>
          <div className="club-branding">
             <h3>Darwin School Sports Club</h3>
             <p>Devadurga Road, Near Darwin School</p>
          </div>
        </div>
        
        <div className="invoice-meta">
          <div>
            <strong>Bill To:</strong>
            <p>{booking.customer.name}</p>
            <p>{booking.customer.phone}</p>
          </div>
          <div style={{textAlign: 'right'}}>
            <strong>Invoice #:</strong> {booking.id.slice(-6).toUpperCase()}<br/>
            <strong>Date:</strong> {booking.date}<br/>
            <strong>Time:</strong> {booking.timestamp}
          </div>
        </div>

        <table className="invoice-table">
          <thead>
            <tr>
              <th>Description</th>
              <th style={{textAlign:'right'}}>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                {booking.sport} Booking<br/>
                <small>{booking.date} | {booking.startTime} - {booking.endTime} ({booking.customer.count})</small>
              </td>
              <td style={{textAlign:'right'}}>₹{booking.totalAmount}</td>
            </tr>
          </tbody>
        </table>

        <div className="invoice-total">
          <span>Total</span>
          <span>₹{booking.totalAmount}</span>
        </div>

        <div className="invoice-footer">
          <p>Thank you for playing with us!</p>
          <p className="admin-sign">Authorized Signature: _________________</p>
        </div>
        
        {/* BUTTONS (Hidden when printing) */}
        <div className="invoice-actions no-print">
          <button onClick={handlePrint} className="print-btn"><FontAwesomeIcon icon={faPrint} /> Print Invoice</button>
          <button onClick={onClose} className="close-btn">Close</button>
        </div>
      </div>
    </div>
  );
}

// --- ADMIN COMPONENTS ---
function AdminLogin({ onLogin }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const handleSubmit = (e) => { e.preventDefault(); if (user === ADMIN_CREDENTIALS.username && pass === ADMIN_CREDENTIALS.password) onLogin(); else setError("Invalid Credentials"); };
  return (<div className="login-container"><div className="login-box"><h2>🔒 Admin Access</h2><form onSubmit={handleSubmit}><input type="text" placeholder="User" value={user} onChange={e => setUser(e.target.value)} /><input type="password" placeholder="Pass" value={pass} onChange={e => setPass(e.target.value)} /><button type="submit" className="login-btn">Login</button></form>{error && <p className="error-msg">{error}</p>}</div></div>);
}

function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [filterDate, setFilterDate] = useState(getTodayString());
  const [bookings, setBookings] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  useEffect(() => {
    const auth = sessionStorage.getItem("isAdmin");
    if (auth === "true") setIsAuthenticated(true);
    
    // FETCH ALL BOOKINGS
    const q = query(collection(db, "bookings"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort: Date Descending, then Time Ascending
      data.sort((a, b) => (b.date > a.date ? 1 : -1) || (a.startTime > b.startTime ? 1 : -1));
      setBookings(data);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = () => { sessionStorage.setItem("isAdmin", "true"); setIsAuthenticated(true); };
  
  const handleDelete = async (id) => { 
    if(window.confirm("Delete booking? This cannot be undone.")) { 
      try { await deleteDoc(doc(db, "bookings", id)); } catch (err) { alert("Error deleting: " + err.message); }
    } 
  };

  const downloadCSV = () => {
    const filtered = bookings.filter(b => b.date === filterDate);
    if(filtered.length === 0) return alert("No data to export for this date.");

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Booking ID,Customer Name,Phone,Sport,Date,Start Time,End Time,Amount,Status\n";

    filtered.forEach(row => {
      csvContent += `${row.id},${row.customer.name},${row.customer.phone},${row.sport},${row.date},${row.startTime},${row.endTime},${row.totalAmount},${row.paymentMode}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `bookings_${filterDate}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  // --- STATS CALCULATION ---
  const filteredBookings = bookings.filter(b => b.date === filterDate);
  const totalRevenue = filteredBookings.reduce((sum, b) => sum + Number(b.totalAmount), 0);
  const totalBookings = filteredBookings.length;
  const totalPlayers = filteredBookings.reduce((sum, b) => {
    // Parse "4 Players" -> 4
    const count = parseInt(b.customer.count) || 0; 
    return sum + count;
  }, 0);

  if (!isAuthenticated) return <AdminLogin onLogin={handleLogin} />;
  
  return (
    <div className="admin-container">
      {selectedInvoice && <InvoiceModal booking={selectedInvoice} onClose={() => setSelectedInvoice(null)} />}

      <div className="admin-header no-print">
        <div className="admin-brand">
          <h2>Admin Portal</h2>
          <p>Darwin School Sports Club</p>
        </div>
        <div className="admin-controls-top">
           <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="date-picker-pro" />
           <button onClick={() => {sessionStorage.removeItem("isAdmin"); window.location.reload();}} className="logout-btn">Logout</button>
        </div>
      </div>

      {/* --- STATS CARDS --- */}
      <div className="stats-grid no-print">
        <div className="stat-card">
          <div className="stat-icon revenue-icon"><FontAwesomeIcon icon={faIndianRupeeSign} /></div>
          <div className="stat-info">
             <span className="stat-label">Revenue (Today)</span>
             <span className="stat-value">₹{totalRevenue}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon players-icon"><FontAwesomeIcon icon={faUsers} /></div>
          <div className="stat-info">
             <span className="stat-label">Visitors</span>
             <span className="stat-value">{totalPlayers}</span>
          </div>
        </div>
        <div className="stat-card">
           <div className="stat-icon bookings-icon"><FontAwesomeIcon icon={faCalendarCheck} /></div>
           <div className="stat-info">
             <span className="stat-label">Bookings</span>
             <span className="stat-value">{totalBookings}</span>
           </div>
        </div>
      </div>

      <div className="action-bar no-print">
        <h3>Booking List ({filterDate})</h3>
        <div className="action-buttons">
          <button onClick={() => window.print()} className="action-btn print"><FontAwesomeIcon icon={faPrint} /> Print Report</button>
          <button onClick={downloadCSV} className="action-btn csv"><FontAwesomeIcon icon={faFileCsv} /> Export CSV</button>
        </div>
      </div>

      <div className="table-container">
        <table className="pro-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Sport</th>
              <th>Customer</th>
              <th>Players</th>
              <th>Amount</th>
              <th className="no-print">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredBookings.length === 0 ? (
              <tr><td colSpan="6" style={{textAlign:'center', padding:'20px'}}>No bookings for this date</td></tr>
            ) : (
              filteredBookings.map(b => (
                <tr key={b.id}>
                  <td><span className="time-badge">{b.startTime} - {b.endTime}</span></td>
                  <td>{b.sport}</td>
                  <td>
                    <strong>{b.customer.name}</strong><br/>
                    <small>{b.customer.phone}</small>
                  </td>
                  <td>{b.customer.count}</td>
                  <td className="amount-cell">₹{b.totalAmount}</td>
                  <td className="actions-cell no-print">
                    <button onClick={() => setSelectedInvoice(b)} className="icon-btn invoice-btn" title="Generate Invoice"><FontAwesomeIcon icon={faReceipt} /></button>
                    <button onClick={() => handleDelete(b.id)} className="icon-btn delete-btn" title="Delete"><FontAwesomeIcon icon={faTrash} /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function App() { return (<Router><Routes><Route path="/" element={<UserHome />} /><Route path="/admin" element={<AdminDashboard />} /></Routes></Router>); }
export default App;
