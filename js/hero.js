/* Hero card strip. Cards are photos (Unsplash) labelled with real marketplace categories;
 * rates and counts are read live from Supabase and fall back to the static text if offline. */
(function () {
    "use strict";
    // Unsplash photo ids (each verified to return an image; see tools/unsplash_verified.txt)
    const P = {
        hr: "photo-1573496359142-b8d87734a5a2", sales: "photo-1600880292203-757bb62b4baf", edu: "photo-1531482615713-2afd69097998",
        code: "photo-1461749280684-dccba630e2f6", design: "photo-1516534775068-ba3e7458af70", ai: "photo-1677442136019-21780ecad995",
        eng: "photo-1581091226825-a6a2a5aee158", pm: "photo-1590402494587-44b71d7772f6", support: "photo-1556742049-0cfed4f6a45d",
        mkt: "photo-1460925895917-afdab827c52f", video: "photo-1516035069371-29a1b244cc32", research: "photo-1542744173-8e7e53415bb0",
        biz: "photo-1507679799987-c73779587ccf", va: "photo-1590650153855-d9e808231d41", team: "photo-1522071820081-009f0129c71c"
    };
    const img = (id, w, h) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&h=${h}&q=70`;

    // Columns: either one tall photo, or a stat tile stacked with a photo.
    // `cat` is a marketplace category id; `h` is the card height in px.
    const COLS = [
        [{ k: "photo", cat: "hr", p: P.hr, tint: "#0f766e", h: 330 }],
        [{ k: "stat", id: "tasks", bg: "linear-gradient(135deg,#3b82f6,#60a5fa)", h: 118 }, { k: "photo", cat: "software", p: P.code, tint: "#4c1d95", h: 196 }],
        [{ k: "photo", cat: "sales", p: P.sales, tint: "#9a3412", h: 330 }],
        [{ k: "photo", cat: "design", p: P.design, tint: "#be185d", h: 196 }, { k: "stat", id: "range", bg: "linear-gradient(135deg,#f97316,#fb923c)", h: 118 }],
        [{ k: "photo", cat: "ai-ml", p: P.ai, tint: "#1e3a8a", h: 330 }],
        [{ k: "stat", id: "cats", bg: "linear-gradient(135deg,#10b981,#34d399)", h: 118 }, { k: "photo", cat: "engineering", p: P.eng, tint: "#334155", h: 196 }],
        [{ k: "photo", cat: "project-management", p: P.pm, tint: "#6d28d9", h: 330 }],
        [{ k: "photo", cat: "customer-support", p: P.support, tint: "#0369a1", h: 196 }, { k: "stat", id: "remote", bg: "linear-gradient(135deg,#8b5cf6,#a78bfa)", h: 118 }],
        [{ k: "photo", cat: "education", p: P.edu, tint: "#b45309", h: 330 }],
        [{ k: "stat", id: "paid", bg: "linear-gradient(135deg,#ec4899,#f472b6)", h: 118 }, { k: "photo", cat: "marketing", p: P.mkt, tint: "#0e7490", h: 196 }],
        [{ k: "photo", cat: "video-photo", p: P.video, tint: "#111827", h: 330 }],
        [{ k: "photo", cat: "research-consulting", p: P.research, tint: "#166534", h: 196 }, { k: "stat", id: "usd", bg: "linear-gradient(135deg,#0ea5e9,#38bdf8)", h: 118 }]
    ];
    const NAMES = { "hr": "Human Resources & Recruitment", "software": "Software Development", "sales": "Sales & Business Development", "design": "Graphic Design & Branding", "ai-ml": "AI & Machine Learning", "engineering": "Engineering & Technical Services", "project-management": "Project Management", "customer-support": "Customer Support", "education": "Education & Online Tutoring", "marketing": "Digital Marketing & SEO", "video-photo": "Video Editing & Photography", "research-consulting": "Research & Business Consulting" };

    const STATS = {   // static fallbacks; overwritten with live numbers when the database answers
        tasks: { big: "140+", small: "open tasks" }, range: { big: "$10–$200", small: "per hour" }, cats: { big: "20", small: "categories" },
        remote: { big: "100%", small: "remote work" }, paid: { big: "Paid", small: "once your work is approved" }, usd: { big: "USD", small: "hourly, agreed up front" }
    };
    const live = { rates: {} };   // category id -> lowest hourly rate

    const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

    function photoCard(c) {
        const f = el("figure", "card photo"); f.style.setProperty("--tint", c.tint); f.style.setProperty("--h", c.h + "px");
        const im = document.createElement("img");
        im.src = img(c.p, 520, Math.round(c.h * 2)); im.alt = ""; im.loading = "lazy"; im.decoding = "async"; im.width = 520; im.height = c.h * 2;
        im.onerror = () => { im.remove(); f.classList.add("noimg"); };
        f.append(im);
        const cap = el("figcaption"); cap.append(el("strong", "", NAMES[c.cat] || c.cat), el("span", "", live.rates[c.cat] ? `from $${live.rates[c.cat]}/hr` : "Remote tasks"));
        f.append(cap); return f;
    }
    function statCard(c) {
        const s = STATS[c.id], d = el("div", "card stat"); d.style.setProperty("--bg", c.bg); d.style.setProperty("--h", c.h + "px");
        d.append(el("strong", "", s.big), el("span", "", s.small)); return d;
    }
    function build() {
        const track = document.getElementById("track"); track.replaceChildren();
        // Two identical halves so the -50% glide loops seamlessly
        for (let half = 0; half < 2; half++) {
            COLS.forEach((cards, i) => {
                const col = el("div", "col"); col.style.setProperty("--i", i);
                if (half) { col.setAttribute("aria-hidden", "true"); }
                cards.forEach(c => col.append(c.k === "photo" ? photoCard(c) : statCard(c)));
                track.append(col);
            });
        }
        // Stagger the entrance of each column
        track.querySelectorAll(".col").forEach((col, i) => col.animate([{ opacity: 0, translate: "0 40px" }, { opacity: 1, translate: "0 0" }], { duration: 700, delay: 500 + (i % COLS.length) * 70, fill: "backwards", easing: "cubic-bezier(.2,.8,.2,1)" }));
    }

    async function loadLive() {
        const cfg = window.OUTLIER_CONFIG;
        if (!window.supabase || !cfg) return;
        const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
        const [t, u] = await Promise.all([sb.from("tasks").select("category_id, hourly_rate, deadline").eq("status", "published"), sb.auth.getSession()]);
        if (!t.error && t.data.length) {
            const today = new Date().toISOString().slice(0, 10), open = t.data.filter(r => !r.deadline || r.deadline >= today);
            if (open.length) {
                const rates = open.map(r => Number(r.hourly_rate));
                STATS.tasks.big = open.length + "+"; STATS.cats.big = String(new Set(open.map(r => r.category_id)).size);
                STATS.range.big = `$${Math.min(...rates)}–$${Math.max(...rates)}`;
                open.forEach(r => { const v = Number(r.hourly_rate); if (!live.rates[r.category_id] || v < live.rates[r.category_id]) live.rates[r.category_id] = v; });
                document.querySelector('[data-stat="tasks"]').textContent = STATS.tasks.big;
                document.querySelector('[data-stat="cats"]').textContent = STATS.cats.big;
                document.querySelector('[data-stat="range"]').textContent = STATS.range.big;
                build();
            }
        }
        if (u.data && u.data.session) { const a = document.getElementById("auth-link"); a.textContent = "Dashboard"; a.href = "dashboard.html"; }
    }

    document.addEventListener("DOMContentLoaded", () => { build(); loadLive().catch(() => { /* keep the static fallback */ }); });
})();
