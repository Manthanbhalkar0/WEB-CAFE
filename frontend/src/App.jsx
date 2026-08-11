import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Coffee, BookOpen, MapPin, Phone, Clock, ShoppingBag, Plus, Minus, X,
  Menu as MenuIcon, Instagram, Facebook, Mail, Star, Send, Check, ChevronRight
} from "lucide-react";
import { fetchMenu, placeOrderApi } from "./api";

/* ---------------------------------------------------------
   RAR — Read & Roast, Kopargaon
   Palette: espresso #3D2418, coffee #6F4E37, latte #C89F76,
   cream #F6EEE1, parchment #EFE2C9, gold #B8862E, ink #2A1B10
--------------------------------------------------------- */

// Used only if the backend API is unreachable, so the site still works standalone.
const FALLBACK_MENU = [
  { id: 1, category: "Brewed With Love", name: "Kopargaon Cold Brew", description: "18-hour steeped, served over ice", price: 140 },
  { id: 2, category: "Brewed With Love", name: "Classic Cappuccino", description: "Double shot, hand-frothed milk", price: 130 },
  { id: 3, category: "Brewed With Love", name: "Hazelnut Latte", description: "Espresso, steamed milk, roasted hazelnut", price: 160 },
  { id: 4, category: "Brewed With Love", name: "Filter Kaapi", description: "South-Indian style, brass tumbler", price: 90 },
  { id: 5, category: "Tea Leaves & Time", name: "Masala Chai", description: "Slow-simmered, hand-ground spices", price: 70 },
  { id: 6, category: "Tea Leaves & Time", name: "Chamomile Bloom", description: "Whole flower infusion, honey on the side", price: 110 },
  { id: 7, category: "Tea Leaves & Time", name: "Earl Grey Reader's Blend", description: "Bergamot, served with shortbread", price: 120 },
  { id: 8, category: "Between The Pages", name: "Cheese Chilli Toast", description: "Grilled sourdough, jalapeño, cheddar", price: 150 },
  { id: 9, category: "Between The Pages", name: "Peri Peri Fries", description: "Crisp fries, house peri seasoning", price: 120 },
  { id: 10, category: "Between The Pages", name: "Veg Club Sandwich", description: "Triple-layered, herbed mayo", price: 170 },
  { id: 11, category: "Between The Pages", name: "Paneer Tikki Wrap", description: "Grilled paneer, mint chutney, rolled fresh", price: 160 },
  { id: 12, category: "Chapter Endings", name: "Molten Chocolate Cake", description: "Warm centre, vanilla bean scoop", price: 180 },
  { id: 13, category: "Chapter Endings", name: "Biscoff Cheesecake", description: "No-bake, biscoff crumble top", price: 190 },
  { id: 14, category: "Chapter Endings", name: "Classic Tiramisu", description: "Espresso-soaked, cocoa dusted", price: 200 },
  { id: 15, category: "Reader's Specials", name: "The Bookworm's Mocha", description: "Signature — dark chocolate, espresso, sea salt", price: 175 },
  { id: 16, category: "Reader's Specials", name: "Page-Turner Affogato", description: "Signature — vanilla gelato drowned in espresso", price: 165 },
];

const GALLERY = [
  { title: "The Reading Loft", tag: "Upstairs seating" },
  { title: "Roast of the Day", tag: "Fresh grind, every morning" },
  { title: "Window Nook", tag: "Best seat for golden hour" },
  { title: "The Shared Shelf", tag: "Bring a book, take a book" },
  { title: "Quiet Corner", tag: "Plug points at every table" },
  { title: "The Roastery Bar", tag: "Watch it brew" },
];

const REVIEWS = [
  { name: "Aarav", age: 22, text: "Did my entire thesis here. Wifi's solid, chai never gets cold, nobody rushes you out.", rating: 5 },
  { name: "Sanika", age: 20, text: "The Bookworm's Mocha lives up to the name. Also love that I can swap a book on my way out.", rating: 5 },
  { name: "Yash", age: 24, text: "Found my new Sunday spot. Reading loft upstairs is criminally underrated.", rating: 4 },
  { name: "Meher", age: 21, text: "Ordered ahead from the site, walked in, it was ready. Genuinely convenient.", rating: 5 },
];

function useReveal() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.unobserve(node);
        }
      },
      { threshold: 0.15 }
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

function Reveal({ children, className = "", delay = 0 }) {
  const [ref, visible] = useReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(28px)",
        transition: `opacity .7s ease ${delay}s, transform .7s ease ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

export default function App() {
  const [navOpen, setNavOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(FALLBACK_MENU);
  const [usingFallback, setUsingFallback] = useState(true);
  const [activeCat, setActiveCat] = useState(FALLBACK_MENU[0].category);
  const [cart, setCart] = useState({});
  const [cartOpen, setCartOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [orderPlaced, setOrderPlaced] = useState(null);
  const [placing, setPlacing] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const categories = [...new Set(menu.map((m) => m.category))];

  // Load menu from the Spring Boot backend; keep local fallback if it's not running.
  useEffect(() => {
    fetchMenu()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const normalized = data.map((m) => ({
            id: m.id,
            category: m.category,
            name: m.name,
            description: m.description,
            price: m.price,
          }));
          setMenu(normalized);
          setActiveCat(normalized[0].category);
          setUsingFallback(false);
        }
      })
      .catch(() => setUsingFallback(true));
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const showToast = useCallback((msg) => {
    setToast(msg);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), 1800);
  }, []);

  const addToCart = (item) => {
    setCart((c) => ({ ...c, [item.id]: (c[item.id] || 0) + 1 }));
    showToast(`Added "${item.name}" to your order`);
  };
  const changeQty = (id, delta) => {
    setCart((c) => {
      const next = { ...c, [id]: (c[id] || 0) + delta };
      if (next[id] <= 0) delete next[id];
      return next;
    });
  };

  const cartItems = Object.entries(cart)
    .map(([id, qty]) => ({ ...menu.find((m) => String(m.id) === id), qty }))
    .filter((i) => i && i.id !== undefined);
  const cartCount = cartItems.reduce((s, i) => s + i.qty, 0);
  const cartTotal = cartItems.reduce((s, i) => s + i.qty * i.price, 0);

  const placeOrder = async () => {
    if (cartItems.length === 0) return;
    setPlacing(true);
    try {
      if (usingFallback) throw new Error("no backend");
      const saved = await placeOrderApi({
        customerName: customerName || "Guest Reader",
        customerPhone,
        items: cartItems,
      });
      setOrderPlaced({
        orderNo: saved.orderNumber,
        items: cartItems,
        total: saved.totalAmount,
        name: saved.customerName,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      });
    } catch {
      // Backend not running — still confirm the order locally so the site stays fully usable.
      const orderNo = "RAR-" + Math.floor(1000 + Math.random() * 9000);
      setOrderPlaced({
        orderNo,
        items: cartItems,
        total: cartTotal,
        name: customerName || "Guest Reader",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      });
    } finally {
      setPlacing(false);
      setCart({});
    }
  };

  const scrollTo = (id) => {
    setNavOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div style={{ position: "relative", overflowX: "hidden" }}>
      {/* floating beans background */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        {Array.from({ length: 10 }).map((_, i) => (
          <Coffee
            key={i}
            className="bean"
            size={18 + (i % 3) * 10}
            color="#3D2418"
            style={{
              left: `${(i * 9.7) % 100}%`,
              animationDuration: `${14 + (i % 5) * 3}s`,
              animationDelay: `${i * 1.3}s`,
            }}
          />
        ))}
      </div>

      {/* NAVBAR */}
      <nav
        style={{
          position: "sticky", top: 0, zIndex: 40,
          background: scrolled ? "rgba(246,238,225,.92)" : "transparent",
          backdropFilter: scrolled ? "blur(10px)" : "none",
          boxShadow: scrolled ? "0 4px 18px rgba(61,36,24,.08)" : "none",
          transition: "all .3s ease",
        }}
      >
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--espresso)", display: "grid", placeItems: "center" }}>
              <BookOpen size={20} color="var(--cream)" />
            </div>
            <div>
              <div className="serif" style={{ fontSize: 20, fontWeight: 800, lineHeight: 1 }}>Read &amp; Roast</div>
              <div className="mono" style={{ fontSize: 10, letterSpacing: ".12em", color: "var(--coffee)" }}>KOPARGAON</div>
            </div>
          </div>

          <div className="nav-links" style={{ display: "flex", alignItems: "center", gap: 30 }}>
            {["Home", "Story", "Menu", "Gallery", "Reviews", "Visit"].map((label) => (
              <span
                key={label}
                onClick={() => scrollTo(label.toLowerCase())}
                className="ribbon nav-item"
                style={{ cursor: "pointer", fontWeight: 700, fontSize: 14.5 }}
              >
                {label}
              </span>
            ))}
            <button className="btn btn-gold" onClick={() => setCartOpen(true)} style={{ position: "relative", padding: "10px 18px" }}>
              <ShoppingBag size={17} /> Order
              {cartCount > 0 && (
                <span style={{ position: "absolute", top: -6, right: -6, background: "var(--espresso)", color: "var(--cream)", fontSize: 11, fontWeight: 800, borderRadius: "50%", width: 20, height: 20, display: "grid", placeItems: "center" }}>
                  {cartCount}
                </span>
              )}
            </button>
            <button className="nav-toggle" onClick={() => setNavOpen((o) => !o)} style={{ background: "none", border: "none", cursor: "pointer" }}>
              <MenuIcon size={24} />
            </button>
          </div>
        </div>
        {navOpen && (
          <div style={{ padding: "8px 24px 20px", display: "flex", flexDirection: "column", gap: 14, background: "var(--cream)" }}>
            {["Home", "Story", "Menu", "Gallery", "Reviews", "Visit"].map((label) => (
              <span key={label} onClick={() => scrollTo(label.toLowerCase())} style={{ fontWeight: 700, cursor: "pointer" }}>{label}</span>
            ))}
          </div>
        )}
      </nav>

      {/* HERO */}
      <section id="home" style={{ position: "relative", minHeight: "88vh", display: "flex", alignItems: "center", background: "radial-gradient(circle at 80% 20%, var(--parchment), var(--cream) 60%)" }}>
        <div className="hero-grid" style={{ maxWidth: 1180, margin: "0 auto", padding: "60px 24px", display: "grid", gap: 50, alignItems: "center", width: "100%" }}>
          <Reveal>
            <div className="mono" style={{ fontSize: 12, letterSpacing: ".2em", color: "var(--gold)", marginBottom: 14 }}>A CAFE FOR SLOW MORNINGS &amp; LONG CHAPTERS</div>
            <h1 className="serif" style={{ fontSize: "clamp(38px, 6vw, 64px)", fontWeight: 800, lineHeight: 1.05, margin: "0 0 20px" }}>
              Where your coffee <span style={{ color: "var(--gold)" }}>steeps</span><br /> and your story <span style={{ color: "var(--coffee)" }}>unfolds</span>.
            </h1>
            <p style={{ fontSize: 17, lineHeight: 1.7, color: "#5b4433", maxWidth: 480, marginBottom: 30 }}>
              Read &amp; Roast is Kopargaon's reading-room cafe — fresh-roasted coffee, quiet corners, and a shelf you're always welcome to borrow from.
            </p>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <button className="btn btn-primary" onClick={() => scrollTo("menu")}>View Menu <ChevronRight size={16} /></button>
              <button className="btn btn-outline" onClick={() => scrollTo("visit")}>Find Us</button>
            </div>
          </Reveal>

          <Reveal delay={0.15}>
            <div style={{ position: "relative", display: "grid", placeItems: "center" }}>
              <div style={{ width: 300, height: 300, borderRadius: "50%", background: "linear-gradient(135deg, var(--latte), var(--parchment))", display: "grid", placeItems: "center", position: "relative", boxShadow: "0 30px 60px rgba(61,36,24,.2)" }}>
                <svg width="170" height="170" viewBox="0 0 100 100">
                  <path d="M20 40 h50 a6 6 0 0 1 6 6 v6 a18 18 0 0 1 -18 18 h-26 a18 18 0 0 1 -18 -18 v-12 a6 6 0 0 1 6 -6z" fill="var(--espresso)" />
                  <path d="M76 46 q14 0 14 12 q0 12 -14 12" fill="none" stroke="var(--espresso)" strokeWidth="5" />
                  <rect x="14" y="70" width="66" height="6" rx="3" fill="var(--espresso)" />
                </svg>
                <div style={{ position: "absolute", top: 44, left: "48%" }}>
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="steam" style={{ width: 8, height: 8, left: i * 14 - 10, animationDelay: `${i * .5}s` }} />
                  ))}
                </div>
              </div>
              <div className="serif" style={{ position: "absolute", bottom: -6, background: "var(--espresso)", color: "var(--cream)", padding: "10px 22px", borderRadius: 999, fontSize: 14, fontWeight: 700, boxShadow: "0 10px 20px rgba(0,0,0,.2)" }}>
                Freshly Roasted, Daily
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <Divider flip />

      {/* STORY */}
      <section id="story" style={{ background: "var(--parchment)", padding: "90px 24px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", textAlign: "center" }}>
          <Reveal>
            <div className="mono" style={{ fontSize: 12, letterSpacing: ".2em", color: "var(--coffee)", marginBottom: 10 }}>OUR STORY</div>
            <h2 className="serif" style={{ fontSize: "clamp(28px,4vw,42px)", fontWeight: 700, marginBottom: 22 }}>Two things we never rush: brewing, and reading.</h2>
            <p style={{ fontSize: 16.5, lineHeight: 1.85, color: "#5b4433", maxWidth: 720, margin: "0 auto" }}>
              Read &amp; Roast opened in Kopargaon with one idea — a cafe should be a place you're allowed to stay. Every table has room for a book and a cup.
              Our shelf is a shared one: leave one, take one. Our beans are roasted in small batches so every pour actually tastes like something.
            </p>
          </Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))", gap: 24, marginTop: 50 }}>
            {[
              { icon: <Coffee size={26} />, label: "Small-batch roasted" },
              { icon: <BookOpen size={26} />, label: "1200+ shared books" },
              { icon: <Clock size={26} />, label: "Open till late" },
              { icon: <MapPin size={26} />, label: "Heart of Kopargaon" },
            ].map((f, i) => (
              <Reveal key={f.label} delay={i * 0.08}>
                <div className="card" style={{ background: "var(--cream)", borderRadius: 18, padding: "26px 16px", textAlign: "center" }}>
                  <div style={{ color: "var(--gold)", marginBottom: 10, display: "flex", justifyContent: "center" }}>{f.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: 14.5 }}>{f.label}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* MENU */}
      <section id="menu" style={{ padding: "90px 24px", background: "var(--cream)" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <div className="mono" style={{ fontSize: 12, letterSpacing: ".2em", color: "var(--coffee)", marginBottom: 10 }}>THE MENU</div>
              <h2 className="serif" style={{ fontSize: "clamp(28px,4vw,42px)", fontWeight: 700 }}>Pick a chapter to order from</h2>
              {usingFallback && (
                <p style={{ fontSize: 12.5, color: "#8a715c", marginTop: 8 }}>
                  Showing built-in menu — start the backend to load it live from the API.
                </p>
              )}
            </div>
          </Reveal>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", marginBottom: 40 }}>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCat(cat)}
                className="btn"
                style={{
                  padding: "9px 18px", borderRadius: 999, fontSize: 13.5,
                  background: activeCat === cat ? "var(--espresso)" : "transparent",
                  color: activeCat === cat ? "var(--cream)" : "var(--espresso)",
                  border: "1.5px solid var(--espresso)",
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px,1fr))", gap: 22 }}>
            {menu.filter((m) => m.category === activeCat).map((item, i) => (
              <Reveal key={item.id} delay={(i % 4) * 0.06}>
                <div className="card" style={{ background: "var(--parchment)", borderRadius: 18, padding: 22, display: "flex", flexDirection: "column", gap: 12, height: "100%" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--espresso)", display: "grid", placeItems: "center" }}>
                    <Coffee size={20} color="var(--cream)" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                      <h3 className="serif" style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{item.name}</h3>
                      <span className="mono" style={{ fontWeight: 700, color: "var(--gold)", whiteSpace: "nowrap" }}>₹{item.price}</span>
                    </div>
                    <p style={{ fontSize: 13.5, color: "#6b5340", marginTop: 6 }}>{item.description}</p>
                  </div>
                  <button className="btn btn-primary" style={{ padding: "9px 16px", fontSize: 13.5, alignSelf: "flex-start" }} onClick={() => addToCart(item)}>
                    <Plus size={15} /> Add
                  </button>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <Divider />

      {/* GALLERY */}
      <section id="gallery" style={{ background: "var(--espresso)", padding: "90px 24px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 44 }}>
              <div className="mono" style={{ fontSize: 12, letterSpacing: ".2em", color: "var(--latte)", marginBottom: 10 }}>INSIDE THE CAFE</div>
              <h2 className="serif" style={{ fontSize: "clamp(28px,4vw,42px)", fontWeight: 700, color: "var(--cream)" }}>A look around</h2>
            </div>
          </Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px,1fr))", gap: 20 }}>
            {GALLERY.map((g, i) => (
              <Reveal key={g.title} delay={(i % 3) * 0.08}>
                <div
                  className="card"
                  style={{
                    borderRadius: 18, padding: 24, minHeight: 190, display: "flex", flexDirection: "column", justifyContent: "flex-end",
                    background: `linear-gradient(160deg, hsl(${28 + i * 12} 45% ${30 + (i % 3) * 6}%), hsl(${28 + i * 12} 40% ${16 + (i % 3) * 4}%))`,
                  }}
                >
                  <BookOpen size={22} color="rgba(255,255,255,.7)" style={{ marginBottom: 30 }} />
                  <div className="serif" style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>{g.title}</div>
                  <div style={{ color: "rgba(255,255,255,.65)", fontSize: 12.5, marginTop: 4 }}>{g.tag}</div>
                </div>
              </Reveal>
            ))}
          </div>
          <p style={{ textAlign: "center", color: "rgba(246,238,225,.5)", fontSize: 12, marginTop: 30 }}>
            Swap these placeholder tiles for your own cafe photos in src/App.jsx (GALLERY section).
          </p>
        </div>
      </section>

      {/* REVIEWS */}
      <section id="reviews" style={{ padding: "90px 24px", background: "var(--cream)" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 44 }}>
              <div className="mono" style={{ fontSize: 12, letterSpacing: ".2em", color: "var(--coffee)", marginBottom: 10 }}>FROM OUR REGULARS</div>
              <h2 className="serif" style={{ fontSize: "clamp(28px,4vw,42px)", fontWeight: 700 }}>What Kopargaon's readers say</h2>
            </div>
          </Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px,1fr))", gap: 22 }}>
            {REVIEWS.map((r, i) => (
              <Reveal key={r.name} delay={i * 0.07}>
                <div className="card" style={{ background: "var(--parchment)", borderRadius: 18, padding: 24, height: "100%" }}>
                  <div style={{ display: "flex", gap: 3, marginBottom: 12 }}>
                    {Array.from({ length: 5 }).map((_, s) => (
                      <Star key={s} size={15} fill={s < r.rating ? "var(--gold)" : "none"} color="var(--gold)" />
                    ))}
                  </div>
                  <p style={{ fontSize: 14.5, lineHeight: 1.7, color: "#5b4433", marginBottom: 16 }}>"{r.text}"</p>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>{r.name}, {r.age}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <Divider flip />

      {/* VISIT / LOCATION */}
      <section id="visit" style={{ background: "var(--parchment)", padding: "90px 24px" }}>
        <div className="visit-grid" style={{ maxWidth: 1180, margin: "0 auto", display: "grid", gap: 40 }}>
          <Reveal>
            <div className="mono" style={{ fontSize: 12, letterSpacing: ".2em", color: "var(--coffee)", marginBottom: 10 }}>VISIT US</div>
            <h2 className="serif" style={{ fontSize: "clamp(28px,4vw,38px)", fontWeight: 700, marginBottom: 22 }}>Find your table</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <InfoRow icon={<MapPin size={19} />} title="Address" text="Read & Roast, Near Bus Stand Road, Kopargaon, Maharashtra 423601" />
              <InfoRow icon={<Clock size={19} />} title="Hours" text="Everyday · 8:00 AM – 11:00 PM" />
              <InfoRow icon={<Phone size={19} />} title="Call" text="+91 98765 43210" />
              <InfoRow icon={<Mail size={19} />} title="Email" text="hello@readandroast.cafe" />
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 26 }}>
              <SocialIcon icon={<Instagram size={18} />} />
              <SocialIcon icon={<Facebook size={18} />} />
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div style={{ borderRadius: 20, overflow: "hidden", boxShadow: "0 20px 40px rgba(61,36,24,.18)", minHeight: 340 }}>
              <iframe
                title="Read & Roast Kopargaon location"
                width="100%"
                height="100%"
                style={{ border: 0, minHeight: 340, display: "block" }}
                src="https://www.openstreetmap.org/export/embed.html?bbox=74.4563%2C19.8614%2C74.4963%2C19.9014&layer=mapnik&marker=19.8814%2C74.4763"
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: "var(--espresso)", color: "var(--cream)", padding: "50px 24px 26px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 30 }}>
          <div style={{ maxWidth: 300 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <BookOpen size={20} />
              <span className="serif" style={{ fontSize: 19, fontWeight: 800 }}>Read &amp; Roast</span>
            </div>
            <p style={{ fontSize: 13.5, color: "rgba(246,238,225,.7)", lineHeight: 1.7 }}>Kopargaon's cafe for coffee, quiet, and one more chapter.</p>
          </div>
          <div style={{ display: "flex", gap: 60, flexWrap: "wrap" }}>
            <div>
              <div className="mono" style={{ fontSize: 11, letterSpacing: ".14em", color: "var(--latte)", marginBottom: 12 }}>EXPLORE</div>
              {["Home", "Story", "Menu", "Visit"].map((l) => (
                <div key={l} onClick={() => scrollTo(l.toLowerCase())} style={{ fontSize: 13.5, marginBottom: 8, cursor: "pointer", color: "rgba(246,238,225,.85)" }}>{l}</div>
              ))}
            </div>
            <div>
              <div className="mono" style={{ fontSize: 11, letterSpacing: ".14em", color: "var(--latte)", marginBottom: 12 }}>CONTACT</div>
              <div style={{ fontSize: 13.5, marginBottom: 8, color: "rgba(246,238,225,.85)" }}>Kopargaon, Maharashtra</div>
              <div style={{ fontSize: 13.5, marginBottom: 8, color: "rgba(246,238,225,.85)" }}>+91 98765 43210</div>
            </div>
          </div>
        </div>
        <div style={{ textAlign: "center", fontSize: 12, color: "rgba(246,238,225,.5)", marginTop: 40 }}>
          © {new Date().getFullYear()} Read &amp; Roast, Kopargaon. Brewed with care.
        </div>
      </footer>

      {/* FLOATING CART BUTTON */}
      <button
        onClick={() => setCartOpen(true)}
        className="btn"
        style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 50, background: "var(--espresso)", color: "var(--cream)",
          width: 60, height: 60, borderRadius: "50%", display: "grid", placeItems: "center", boxShadow: "0 12px 26px rgba(0,0,0,.3)",
        }}
      >
        <ShoppingBag size={22} />
        {cartCount > 0 && (
          <span style={{ position: "absolute", top: -4, right: -4, background: "var(--gold)", color: "var(--espresso)", fontSize: 11, fontWeight: 800, borderRadius: "50%", width: 22, height: 22, display: "grid", placeItems: "center" }}>
            {cartCount}
          </span>
        )}
      </button>

      {/* CART DRAWER */}
      <div style={{ position: "fixed", inset: 0, zIndex: 60, pointerEvents: cartOpen ? "auto" : "none" }}>
        <div
          onClick={() => setCartOpen(false)}
          style={{ position: "absolute", inset: 0, background: "rgba(42,27,16,.5)", opacity: cartOpen ? 1 : 0, transition: "opacity .3s ease" }}
        />
        <div
          className="cart-drawer"
          style={{
            position: "absolute", top: 0, right: 0, height: "100%", width: "min(420px, 100%)",
            background: "var(--cream)", boxShadow: "-10px 0 30px rgba(0,0,0,.25)",
            transform: cartOpen ? "translateX(0)" : "translateX(100%)",
            display: "flex", flexDirection: "column",
          }}
        >
          <div style={{ padding: "22px 22px 16px", borderBottom: "1px solid var(--parchment)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="serif" style={{ fontSize: 20, fontWeight: 800 }}>Your Order</div>
            <button onClick={() => setCartOpen(false)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={22} /></button>
          </div>

          {orderPlaced ? (
            <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 14 }}>
              <div style={{ width: 60, height: 60, borderRadius: "50%", background: "var(--gold)", display: "grid", placeItems: "center" }}>
                <Check size={30} color="var(--espresso)" />
              </div>
              <h3 className="serif" style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Order placed!</h3>
              <p style={{ fontSize: 14, color: "#6b5340" }}>Thanks, {orderPlaced.name}. Show this at the counter.</p>
              <div className="mono" style={{ background: "var(--parchment)", borderRadius: 14, padding: "18px 20px", width: "100%", textAlign: "left" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}><span>Order No.</span><b>{orderPlaced.orderNo}</b></div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 12 }}><span>Time</span><b>{orderPlaced.time}</b></div>
                <div style={{ borderTop: "1px dashed var(--coffee)", paddingTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                  {orderPlaced.items.map((it) => (
                    <div key={it.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                      <span>{it.qty} × {it.name}</span><span>₹{it.qty * it.price}</span>
                    </div>
                  ))}
                </div>
                <div style={{ borderTop: "1px dashed var(--coffee)", marginTop: 10, paddingTop: 10, display: "flex", justifyContent: "space-between", fontWeight: 800 }}>
                  <span>Total</span><span>₹{orderPlaced.total}</span>
                </div>
              </div>
              <p style={{ fontSize: 12, color: "#8a715c" }}>Payment will be collected at the counter.</p>
              <button className="btn btn-outline" onClick={() => { setOrderPlaced(null); setCartOpen(false); }}>Back to browsing</button>
            </div>
          ) : (
            <>
              <div style={{ flex: 1, overflowY: "auto", padding: 18 }}>
                {cartItems.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "60px 20px", color: "#8a715c" }}>
                    <ShoppingBag size={38} style={{ marginBottom: 12, opacity: .5 }} />
                    <p style={{ fontSize: 14 }}>Your order is empty. Add something from the menu.</p>
                  </div>
                ) : (
                  cartItems.map((it) => (
                    <div key={it.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid var(--parchment)" }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14.5 }}>{it.name}</div>
                        <div style={{ fontSize: 12.5, color: "var(--gold)", fontWeight: 700 }}>₹{it.price} each</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <button onClick={() => changeQty(it.id, -1)} style={{ width: 26, height: 26, borderRadius: "50%", border: "1px solid var(--coffee)", background: "none", cursor: "pointer", display: "grid", placeItems: "center" }}><Minus size={13} /></button>
                        <span style={{ minWidth: 16, textAlign: "center", fontWeight: 700 }}>{it.qty}</span>
                        <button onClick={() => changeQty(it.id, 1)} style={{ width: 26, height: 26, borderRadius: "50%", border: "1px solid var(--coffee)", background: "none", cursor: "pointer", display: "grid", placeItems: "center" }}><Plus size={13} /></button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {cartItems.length > 0 && (
                <div style={{ padding: 20, borderTop: "1px solid var(--parchment)" }}>
                  <input
                    placeholder="Your name (for the order)"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: "1px solid var(--latte)", marginBottom: 10, fontSize: 14, fontFamily: "inherit" }}
                  />
                  <input
                    placeholder="Phone number (optional)"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: "1px solid var(--latte)", marginBottom: 14, fontSize: 14, fontFamily: "inherit" }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 17, marginBottom: 14 }}>
                    <span>Total</span><span>₹{cartTotal}</span>
                  </div>
                  <button className="btn btn-gold" style={{ width: "100%", justifyContent: "center", padding: "14px" }} onClick={placeOrder} disabled={placing}>
                    <Send size={17} /> {placing ? "Placing order…" : "Place Order"}
                  </button>
                  <p style={{ fontSize: 11, color: "#8a715c", textAlign: "center", marginTop: 10 }}>No payment required now — pay at the counter.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* TOAST */}
      {toast && (
        <div style={{ position: "fixed", bottom: 100, left: "50%", transform: "translateX(-50%)", background: "var(--espresso)", color: "var(--cream)", padding: "11px 20px", borderRadius: 999, fontSize: 13.5, fontWeight: 600, zIndex: 70, boxShadow: "0 10px 24px rgba(0,0,0,.3)" }}>
          {toast}
        </div>
      )}

      <style>{`
        .hero-grid { grid-template-columns: 1fr; }
        .visit-grid { grid-template-columns: 1fr; }
        .nav-item { display: none; }
        .nav-toggle { display: grid; }
        @media (min-width: 860px) {
          .hero-grid { grid-template-columns: 1.1fr .9fr; }
          .visit-grid { grid-template-columns: 1fr 1fr; }
          .nav-item { display: inline-block; }
          .nav-toggle { display: none; }
        }
      `}</style>
    </div>
  );
}

function InfoRow({ icon, title, text }) {
  return (
    <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, background: "var(--espresso)", color: "var(--cream)", display: "grid", placeItems: "center", flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontWeight: 800, fontSize: 14 }}>{title}</div>
        <div style={{ fontSize: 13.5, color: "#5b4433" }}>{text}</div>
      </div>
    </div>
  );
}

function SocialIcon({ icon }) {
  return (
    <div className="btn" style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--espresso)", color: "var(--cream)", display: "grid", placeItems: "center" }}>
      {icon}
    </div>
  );
}

function Divider({ flip }) {
  return (
    <svg className="wave" viewBox="0 0 1200 60" preserveAspectRatio="none" style={{ transform: flip ? "scaleY(-1)" : "none" }}>
      <path d="M0,30 C300,70 900,-10 1200,30 L1200,60 L0,60 Z" fill="var(--parchment)" />
    </svg>
  );
}
