/* Outlier marketplace: data layer + pages (browse, details, applications, admin).
 * Records live in localStorage (key outlier.market.v1), seeded from data/tasks.json
 * on first visit. This stands in for a database until a backend exists; every
 * function in `Market` is async-friendly so it can be swapped for API calls. */
(function () {
    "use strict";
    const O = window.Outlier;
    const put = (el, ...k) => { k.flat().forEach(c => { if (c != null && c !== false) el.append(c); }); return el; };
    const { h, icon, openModal, confirmBox, toast, money, fmtDate, uid, empty, pageHeader, linkBtn } = O;
    const DIFFS = ["Easy", "Intermediate", "Hard", "Expert"];
    const STATUS = { submitted: "Submitted", reviewing: "Under review", accepted: "Accepted", rejected: "Not selected", withdrawn: "Withdrawn" };
    const SUB_STATUS = { submitted: "Awaiting review", approved: "Work approved", revision: "Revision requested", rejected: "Rejected" };
    const PAY_STATUS = { pending: "Awaiting approval", approved: "Approved – to be paid", paid: "Paid", rejected: "Not approved" };
    const AVAIL = ["Under 10 hours/week", "10–20 hours/week", "20–40 hours/week", "Full-time (40+ hours/week)"];
    const todayISO = () => new Date().toISOString().slice(0, 10);

    /* ---------- Supabase client + auth ---------- */
    const cfg = window.OUTLIER_CONFIG || {};
    let sb = null;
    function client() {
        if (sb) return sb;
        if (!window.supabase || !cfg.supabaseUrl || !cfg.supabaseAnonKey) throw new Error("Could not reach the Supabase client library. Check your connection and js/config.js.");
        sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
        return sb;
    }
    const check = (error, what) => { if (error) throw Object.assign(new Error(`${what}: ${error.message}`), { code: error.code }); };

    let readyP = null;
    const auth = {
        user: null,
        isAdmin: () => !!(auth.user && auth.user.role === "admin"),
        ready() {
            return readyP || (readyP = (async () => {
                try { const { data } = await client().auth.getSession(); await loadUser(data.session); }
                catch (e) { console.error(e); }
            })());
        },
        async signIn(email, password) {
            const { data, error } = await client().auth.signInWithPassword({ email, password }); check(error, "Sign in failed");
            await loadUser(data.session);
        },
        async signUp(email, password, name) {
            const { data, error } = await client().auth.signUp({ email, password, options: { data: { display_name: name } } }); check(error, "Sign up failed");
            if (data.session) await loadUser(data.session);
            return { needsConfirm: !data.session };
        },
        async signOut() { await client().auth.signOut(); auth.user = null; cache = null; },
        async updateName(name) {
            const { error } = await client().from("profiles").update({ display_name: name }).eq("id", auth.user.id); check(error, "Could not update name");
            auth.user.name = name;
        }
    };
    async function loadUser(session) {
        auth.user = null;
        if (!session || !session.user) return;
        const { data } = await client().from("profiles").select("display_name, role").eq("id", session.user.id).maybeSingle();
        auth.user = { id: session.user.id, email: session.user.email, name: (data && data.display_name) || session.user.email.split("@")[0], role: (data && data.role) || "user" };
    }

    /* ---------- Row mapping ---------- */
    const taskFromRow = r => ({
        id: r.id, title: r.title, category: r.category_id, image: r.image, difficulty: r.difficulty, hourlyRate: Number(r.hourly_rate), currency: r.currency,
        rateType: r.rate_type, estimatedHours: r.estimated_hours, experience: r.experience, skills: r.skills, summary: r.summary, description: r.description,
        responsibilities: r.responsibilities, deliverables: r.deliverables, qualifications: r.qualifications, applyInstructions: r.apply_instructions,
        postedAt: r.posted_at, deadline: r.deadline, status: r.status
    });
    const taskToRow = t => ({
        id: t.id, title: t.title, category_id: t.category, image: t.image, difficulty: t.difficulty, hourly_rate: t.hourlyRate, currency: "USD",
        rate_type: t.rateType, estimated_hours: t.estimatedHours, experience: t.experience, skills: t.skills, summary: t.summary, description: t.description,
        responsibilities: t.responsibilities, deliverables: t.deliverables, qualifications: t.qualifications, apply_instructions: t.applyInstructions,
        posted_at: t.postedAt, deadline: t.deadline || null, status: t.status
    });
    const appFromRow = r => ({ taskTitle: (r.tasks && r.tasks.title) || "Task no longer listed", id: r.id, taskId: r.task_id, userId: r.user_id, status: r.status, note: r.note, availability: r.availability, proposedRate: r.proposed_rate == null ? null : Number(r.proposed_rate), reviewerNote: r.reviewer_note, agreedRate: r.agreed_rate == null ? null : Number(r.agreed_rate), createdAt: r.created_at, updatedAt: r.updated_at });
    const subFromRow = r => ({ id: r.id, applicationId: r.application_id, userId: r.user_id, hours: Number(r.hours_worked), summary: r.summary, link: r.link, status: r.status, reviewerNote: r.reviewer_note, createdAt: r.created_at, reviewedAt: r.reviewed_at });
    const payFromRow = r => ({ id: r.id, submissionId: r.submission_id, userId: r.user_id, hours: Number(r.hours), rate: Number(r.hourly_rate), amount: Number(r.amount), status: r.status, reference: r.reference, note: r.note, approvedAt: r.approved_at, paidAt: r.paid_at, createdAt: r.created_at });

    /* ---------- Data layer (in-memory cache backed by Supabase) ---------- */
    let cache = null;
    function setBadge() {
        const n = Market.pendingCount(), el = document.querySelector('[data-badge="applications"]');
        if (el) { el.textContent = n; el.hidden = !n; }
    }
    async function init() {
        await auth.ready();
        if (cache) return cache;
        const c = client();
        const [cats, tasks, apps, subs, pays] = await Promise.all([
            c.from("categories").select("*").order("name"),
            c.from("tasks").select("*").order("posted_at", { ascending: false }).order("title"),
            auth.user ? c.from("applications").select("*, tasks(title)").order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
            auth.user ? c.from("work_submissions").select("*").order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
            auth.user ? c.from("payments").select("*").order("created_at", { ascending: false }) : Promise.resolve({ data: [] })
        ]);
        // Tolerate a database that hasn't had supabase/002_work_and_payments.sql applied yet.
        const missing = e => e && (e.code === "PGRST205" || /schema cache/i.test(e.message || ""));
        if (missing(subs.error)) subs.data = []; else check(subs.error, "Could not load work submissions");
        if (missing(pays.error)) pays.data = []; else check(pays.error, "Could not load payments");
        check(cats.error, "Could not load categories"); check(tasks.error, "Could not load tasks"); check(apps.error, "Could not load applications");
        const names = {};
        if (auth.isAdmin()) {
            const p = await c.from("profiles").select("id, display_name"); check(p.error, "Could not load applicants");
            p.data.forEach(x => { names[x.id] = x.display_name; });
        }
        cache = { categories: cats.data, tasks: tasks.data.map(taskFromRow), applications: apps.data.map(appFromRow), submissions: subs.data.map(subFromRow), payments: pays.data.map(payFromRow), names };
        setBadge();
        return cache;
    }
    const mine = () => (cache && auth.user ? cache.applications.filter(a => a.userId === auth.user.id) : []);
    const Market = {
        auth, init,
        pendingCount: () => mine().filter(a => a.status === "submitted" || a.status === "reviewing").length,
        categories: () => cache.categories,
        category: id => cache.categories.find(c => c.id === id),
        task: id => cache.tasks.find(t => t.id === id),
        allTasks: () => cache.tasks,
        published: () => cache.tasks.filter(isOpenListing),
        skills: () => [...new Set(cache.tasks.filter(isOpenListing).flatMap(t => t.skills))].sort((a, b) => a.localeCompare(b)),
        async saveTask(t) {
            const { data, error } = await client().from("tasks").upsert(taskToRow(t)).select().single(); check(error, "Could not save task");
            const nt = taskFromRow(data), i = cache.tasks.findIndex(x => x.id === nt.id);
            if (i >= 0) cache.tasks[i] = nt; else cache.tasks.unshift(nt);
        },
        async deleteTask(id) {
            const { error } = await client().from("tasks").delete().eq("id", id); check(error, "Could not delete task");
            cache.tasks = cache.tasks.filter(t => t.id !== id); cache.applications = cache.applications.filter(a => a.taskId !== id);
        },
        async saveCategory(c) {
            const { data, error } = await client().from("categories").upsert(c).select().single(); check(error, "Could not save category");
            const i = cache.categories.findIndex(x => x.id === data.id);
            if (i >= 0) cache.categories[i] = data; else cache.categories.push(data);
        },
        async deleteCategory(id) {
            const { error } = await client().from("categories").delete().eq("id", id); check(error, "Could not delete category");
            cache.categories = cache.categories.filter(c => c.id !== id);
        },
        myApplications: mine,
        allApplications: () => cache.applications,
        applicantName: a => cache.names[a.userId] || "Applicant",
        applicationFor: taskId => mine().find(a => a.taskId === taskId && a.status !== "withdrawn"),
        async apply(a) {
            if (!auth.user) throw new Error("Please sign in to apply.");
            const { data, error } = await client().from("applications").insert({ task_id: a.taskId, note: a.note, availability: a.availability, proposed_rate: a.proposedRate }).select().single();
            if (error && error.code === "23505") throw new Error("You have already applied to this task.");
            check(error, "Could not submit application");
            const na = appFromRow(data); const tt = Market.task(a.taskId); if (tt) na.taskTitle = tt.title; cache.applications.unshift(na); setBadge();
        },
        async updateApplication(id, patch) {
            const row = {}; if (patch.status) row.status = patch.status; if (patch.reviewerNote != null) row.reviewer_note = patch.reviewerNote; if (patch.agreedRate != null) row.agreed_rate = patch.agreedRate;
            const { data, error } = await client().from("applications").update(row).eq("id", id).select().single(); check(error, "Could not update application");
            const i = cache.applications.findIndex(x => x.id === id); const na = appFromRow(data); na.taskTitle = cache.applications[i].taskTitle; cache.applications[i] = na; setBadge();
        },
        mySubmissions: () => (cache && auth.user ? cache.submissions.filter(x => x.userId === auth.user.id) : []),
        allSubmissions: () => cache.submissions,
        myPayments: () => (cache && auth.user ? cache.payments.filter(x => x.userId === auth.user.id) : []),
        allPayments: () => cache.payments,
        paidTotal: () => Market.myPayments().filter(p => p.status === "paid").reduce((t, p) => t + p.amount, 0),
        userName: id => cache.names[id] || (auth.user && id === auth.user.id ? auth.user.name : "Worker"),
        async submitWork(applicationId, w) {
            const { data, error } = await client().from("work_submissions").insert({ application_id: applicationId, hours_worked: w.hours, summary: w.summary, link: w.link || null }).select().single();
            if (error && error.code === "23505") throw new Error("You already have work awaiting review or approved for this task.");
            check(error, "Could not submit work");
            cache.submissions.unshift(subFromRow(data));
        },
        async reviewSubmission(id, status, note) {
            const { data, error } = await client().from("work_submissions").update({ status, reviewer_note: note }).eq("id", id).select().single(); check(error, "Could not review work");
            const i = cache.submissions.findIndex(x => x.id === id); cache.submissions[i] = subFromRow(data);
            await Market.reloadPayments();
        },
        async reloadPayments() {
            const { data, error } = await client().from("payments").select("*").order("created_at", { ascending: false }); check(error, "Could not load payments");
            cache.payments = data.map(payFromRow);
        },
        async reviewPayment(id, patch) {
            const row = { status: patch.status, note: patch.note || "" }; if (patch.reference != null) row.reference = patch.reference;
            const { data, error } = await client().from("payments").update(row).eq("id", id).select().single(); check(error, "Could not update payment");
            const i = cache.payments.findIndex(x => x.id === id); cache.payments[i] = payFromRow(data);
        },
        async importSeed() {
            const res = await fetch("data/tasks.json"); if (!res.ok) throw new Error("Could not load data/tasks.json");
            const seed = await res.json(), c = client();
            let r = await c.from("categories").upsert(seed.categories); check(r.error, "Category import failed");
            const rows = seed.tasks.map(taskToRow);
            for (let i = 0; i < rows.length; i += 50) { r = await c.from("tasks").upsert(rows.slice(i, i + 50)); check(r.error, "Task import failed"); }
            cache = null; await init();
            return seed.tasks.length;
        }
    };
    window.Market = Market;

    /* ---------- Helpers ---------- */
    const isOpenListing = t => t.status === "published" && (!t.deadline || t.deadline >= todayISO());
    const total = (rate, hrs) => rate * hrs;
    const rateText = t => `${money(t.hourlyRate)}/hr`;
    const tier = r => r < 25 ? "Beginner" : r < 50 ? "Intermediate" : r < 90 ? "Advanced" : r < 140 ? "Expert" : "Specialist";
    const hrsText = n => `${n} ${n === 1 ? "hour" : "hours"}`;

    function imgSrc(image, w, hgt) {
        if (!image) return "";
        if (image.startsWith("data:")) return image;
        const id = image.startsWith("photo-") ? image : "";
        return id ? `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&h=${hgt}&q=70` : "";
    }
    function photo(task, w, hgt, sizes) {
        const cat = Market.category(task.category);
        const wrap = h("div", { class: "photo" }, h("div", { class: "photo-fallback" }, icon(cat ? cat.icon : "fa-briefcase")));
        const src = imgSrc(task.image, w, hgt);
        if (src) {
            const img = h("img", { src, alt: `${cat ? cat.name : "Task"} – ${task.title}`, loading: "lazy", decoding: "async", width: w, height: hgt });
            if (!src.startsWith("data:")) { img.srcset = `${imgSrc(task.image, Math.round(w / 2), Math.round(hgt / 2))} ${Math.round(w / 2)}w, ${src} ${w}w, ${imgSrc(task.image, w * 2, hgt * 2)} ${w * 2}w`; img.sizes = sizes || `${w}px`; }
            img.onerror = () => img.remove();
            wrap.append(img);
        }
        return wrap;
    }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const diffBadge = d => h("span", { class: `diff diff-${d.toLowerCase()}` }, d);
    const rateBadge = t => h("span", { class: "pill " + (t.rateType === "negotiable" ? "neg" : "fix") }, t.rateType === "negotiable" ? "Negotiable" : "Fixed rate");
    const statusPill = s => h("span", { class: `status status-${s}` }, STATUS[s] || s);

    function payBox(t) {
        return h("div", { class: "pay-box" },
            h("div", { class: "pay-rate" }, h("strong", {}, rateText(t)), h("small", {}, `${t.currency} · ${tier(t.hourlyRate)} tier`)),
            h("dl", {},
                h("div", {}, h("dt", {}, "Estimated hours"), h("dd", {}, hrsText(t.estimatedHours))),
                h("div", {}, h("dt", {}, "Estimated total"), h("dd", {}, money(total(t.hourlyRate, t.estimatedHours)))),
                h("div", {}, h("dt", {}, "Rate"), h("dd", {}, t.rateType === "negotiable" ? "Negotiable" : "Fixed"))));
    }

    function taskCard(t) {
        const cat = Market.category(t.category);
        const href = "task.html?id=" + encodeURIComponent(t.id);
        return h("article", { class: "task-card" },
            h("a", { href, class: "card-img", tabindex: "-1", "aria-hidden": "true" }, photo(t, 480, 300, "(max-width: 600px) 100vw, 320px")),
            h("div", { class: "card-body" },
                h("div", { class: "card-top" }, h("span", { class: "cat-label" }, cat ? cat.name : "Uncategorised"), diffBadge(t.difficulty)),
                h("h3", {}, h("a", { href }, t.title)),
                h("div", { class: "card-pay" }, h("strong", {}, rateText(t)), h("span", {}, `≈ ${hrsText(t.estimatedHours)} · ${money(total(t.hourlyRate, t.estimatedHours))}`), rateBadge(t)),
                h("p", { class: "clamp" }, t.summary),
                h("div", { class: "chips" }, t.skills.slice(0, 3).map(s => h("span", { class: "chip" }, s)), t.skills.length > 3 ? h("span", { class: "chip more" }, `+${t.skills.length - 3}`) : null),
                h("a", { href, class: "btn card-cta" }, "View Details")));
    }

    /* ---------- Browse ---------- */
    O.pages.market = async function (main) {
        await init();
        const params = new URLSearchParams(location.search);
        const f = { q: params.get("q") || "", cat: params.get("cat") || "", diff: new Set((params.get("diff") || "").split(",").filter(Boolean)), min: params.get("min") || "", max: params.get("max") || "", skill: params.get("skill") || "", sort: params.get("sort") || "new" };
        let shown = 24;
        const all = Market.published();
        main.append(pageHeader("Task Marketplace", `${all.length} open tasks across ${Market.categories().length} categories. Find work that matches your skills and apply.`));

        const q = h("input", { type: "search", id: "q", placeholder: "Search tasks, skills or keywords…", value: f.q, "aria-label": "Search tasks" });
        const cat = h("select", { id: "cat", "aria-label": "Category" }, h("option", { value: "" }, "All categories"), Market.categories().map(c => h("option", { value: c.id }, c.name)));
        cat.value = f.cat;
        const skillList = h("datalist", { id: "skills" }, Market.skills().map(s => h("option", { value: s })));
        const skill = h("input", { type: "text", list: "skills", placeholder: "Any skill", value: f.skill, "aria-label": "Required skill" });
        const min = h("input", { type: "number", min: 10, max: 200, placeholder: "Min $/hr", value: f.min, "aria-label": "Minimum hourly rate" });
        const max = h("input", { type: "number", min: 10, max: 200, placeholder: "Max $/hr", value: f.max, "aria-label": "Maximum hourly rate" });
        const sort = h("select", { "aria-label": "Sort" }, [["new", "Newest"], ["high", "Highest paying"], ["low", "Lowest paying"], ["total", "Highest total earnings"]].map(([v, l]) => h("option", { value: v }, l)));
        sort.value = f.sort;
        const diffBox = h("div", { class: "diff-filter", role: "group", "aria-label": "Difficulty" }, DIFFS.map(d => {
            const b = h("button", { type: "button", class: "diff-chip diff-" + d.toLowerCase(), "aria-pressed": String(f.diff.has(d)) }, d);
            b.onclick = () => { f.diff.has(d) ? f.diff.delete(d) : f.diff.add(d); b.setAttribute("aria-pressed", String(f.diff.has(d))); shown = 24; paint(); };
            return b;
        }));
        const clear = h("button", { type: "button", class: "btn secondary" }, "Clear filters");
        const count = h("p", { class: "muted", "aria-live": "polite" });
        const grid = h("div", { class: "task-grid" });
        const more = h("button", { class: "btn secondary more-btn" }, "Load more");

        main.append(h("section", { class: "filters" },
            h("div", { class: "filter-row" }, q, cat, sort),
            h("div", { class: "filter-row" }, skill, skillList, min, max, clear),
            diffBox), count, grid, h("div", { class: "center" }, more),
            h("p", { class: "credit muted" }, "Photography via ", h("a", { href: "https://unsplash.com/?utm_source=outlier&utm_medium=referral", target: "_blank", rel: "noopener" }, "Unsplash"), "."));

        function apply() {
            const text = f.q.toLowerCase().split(/\s+/).filter(Boolean);
            const lo = f.min === "" ? 0 : Number(f.min), hi = f.max === "" ? Infinity : Number(f.max);
            const sk = f.skill.toLowerCase();
            let r = all.filter(t => {
                const hay = (t.title + " " + t.summary + " " + t.skills.join(" ") + " " + (Market.category(t.category) || {}).name).toLowerCase();
                return text.every(w => hay.includes(w)) && (!f.cat || t.category === f.cat) && (!f.diff.size || f.diff.has(t.difficulty))
                    && t.hourlyRate >= lo && t.hourlyRate <= hi && (!sk || t.skills.some(s => s.toLowerCase().includes(sk)));
            });
            const by = { new: (a, b) => b.postedAt.localeCompare(a.postedAt) || a.title.localeCompare(b.title), high: (a, b) => b.hourlyRate - a.hourlyRate, low: (a, b) => a.hourlyRate - b.hourlyRate, total: (a, b) => total(b.hourlyRate, b.estimatedHours) - total(a.hourlyRate, a.estimatedHours) };
            return r.sort(by[f.sort]);
        }
        function paint() {
            const r = apply();
            const p = new URLSearchParams();
            if (f.q) p.set("q", f.q); if (f.cat) p.set("cat", f.cat); if (f.diff.size) p.set("diff", [...f.diff].join(","));
            if (f.min) p.set("min", f.min); if (f.max) p.set("max", f.max); if (f.skill) p.set("skill", f.skill); if (f.sort !== "new") p.set("sort", f.sort);
            history.replaceState(null, "", p.toString() ? "?" + p : location.pathname);
            count.textContent = r.length ? `Showing ${Math.min(shown, r.length)} of ${r.length} tasks` : "";
            grid.replaceChildren(...(r.length ? r.slice(0, shown).map(taskCard) : [empty("fa-magnifying-glass", "No tasks match your filters", "Try removing a filter or searching for something broader.", h("button", { class: "btn", onclick: reset }, "Clear filters"))]));
            more.hidden = r.length <= shown;
        }
        function reset() { Object.assign(f, { q: "", cat: "", min: "", max: "", skill: "", sort: "new" }); f.diff.clear(); q.value = ""; cat.value = ""; min.value = ""; max.value = ""; skill.value = ""; sort.value = "new"; diffBox.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", "false")); shown = 24; paint(); }
        let timer;
        q.oninput = () => { clearTimeout(timer); timer = setTimeout(() => { f.q = q.value.trim(); shown = 24; paint(); }, 200); };
        cat.onchange = () => { f.cat = cat.value; shown = 24; paint(); };
        sort.onchange = () => { f.sort = sort.value; paint(); };
        skill.oninput = () => { f.skill = skill.value.trim(); shown = 24; paint(); };
        min.oninput = () => { f.min = min.value; shown = 24; paint(); };
        max.oninput = () => { f.max = max.value; shown = 24; paint(); };
        clear.onclick = reset;
        more.onclick = () => { shown += 24; paint(); };
        paint();
    };

    /* ---------- Details + apply ---------- */
    const ul = items => h("ul", { class: "bullets" }, items.map(i => h("li", {}, i)));
    O.pages.task = async function (main) {
        await init();
        const id = new URLSearchParams(location.search).get("id");
        const t = id && Market.task(id);
        if (!t || (t.status !== "published" && !Market.auth.isAdmin())) {
            main.append(empty("fa-circle-question", "Task not found", "This task doesn't exist or is no longer listed.", linkBtn("marketplace.html", "Browse tasks")));
            return;
        }
        document.title = `${t.title} - Outlier`;
        const cat = Market.category(t.category);
        const open = isOpenListing(t);
        const existing = Market.applicationFor(t.id);
        const action = h("div", { class: "apply-panel" });
        if (existing) {
            put(action, h("h3", {}, "Your application"), statusPill(existing.status), h("p", { class: "muted" }, `Applied ${fmtDate(existing.createdAt)}`),
                existing.proposedRate ? h("p", {}, `Proposed rate: ${money(existing.proposedRate)}/hr`) : null,
                existing.reviewerNote ? h("p", { class: "note" }, "Reviewer: " + existing.reviewerNote) : null,
                existing.status === "submitted" || existing.status === "reviewing" ? h("button", { class: "btn secondary", onclick: () => confirmBox("Withdraw application?", "You can apply again later while the task is open.", "Withdraw", async () => { await Market.updateApplication(existing.id, { status: "withdrawn" }); toast("Application withdrawn."); O.render(); }) }, "Withdraw") : null,
                linkBtn("applications.html", "All my applications", "secondary"));
        } else if (!open) {
            put(action, h("h3", {}, "Applications closed"), h("p", { class: "muted" }, t.status !== "published" ? "This task is not currently published." : "The application deadline has passed."));
        } else if (!Market.auth.user) {
            put(action, h("h3", {}, "Interested?"), h("p", {}, "Sign in or create an account to apply."), h("a", { class: "btn big", href: "login.html?next=" + encodeURIComponent(location.pathname.split("/").pop() + location.search) }, "Sign in to apply"));
        } else {
            put(action, h("h3", {}, "Interested?"), h("p", { class: "muted" }, t.applyInstructions), h("button", { class: "btn big", onclick: () => applyModal(t) }, "Apply for this task"));
        }
        const related = Market.published().filter(x => x.category === t.category && x.id !== t.id).slice(0, 3);
        put(main,
            h("nav", { class: "crumbs", "aria-label": "Breadcrumb" }, h("a", { href: "marketplace.html" }, "Marketplace"), " / ", h("a", { href: "marketplace.html?cat=" + t.category }, cat ? cat.name : "Task"), " / ", t.title),
            h("div", { class: "detail-hero" }, photo(t, 960, 420, "(max-width: 900px) 100vw, 700px")),
            h("div", { class: "detail-layout" },
                h("div", { class: "detail-main" },
                    h("div", { class: "card-top" }, h("span", { class: "cat-label" }, cat ? cat.name : ""), diffBadge(t.difficulty), t.status !== "published" ? h("span", { class: "pill" }, t.status) : null),
                    h("h1", {}, t.title),
                    h("p", { class: "lead" }, t.description),
                    h("h2", {}, "Responsibilities"), ul(t.responsibilities),
                    h("h2", {}, "Deliverables"), ul(t.deliverables),
                    h("h2", {}, "Required qualifications"), ul(t.qualifications),
                    h("h2", {}, "Required skills"), h("div", { class: "chips" }, t.skills.map(s => h("span", { class: "chip" }, s))),
                    h("h2", {}, "How to apply"), h("p", {}, t.applyInstructions)),
                h("aside", { class: "detail-side" }, payBox(t),
                    h("dl", { class: "facts" },
                        h("div", {}, h("dt", {}, "Difficulty"), h("dd", {}, t.difficulty)),
                        h("div", {}, h("dt", {}, "Experience"), h("dd", {}, t.experience)),
                        h("div", {}, h("dt", {}, "Posted"), h("dd", {}, fmtDate(t.postedAt + "T00:00:00"))),
                        h("div", {}, h("dt", {}, "Deadline"), h("dd", {}, t.deadline ? fmtDate(t.deadline + "T00:00:00") : "Ongoing – no deadline"))),
                    action)),
            related.length ? h("section", {}, h("h2", {}, "More in " + (cat ? cat.name : "this category")), h("div", { class: "task-grid" }, related.map(taskCard))) : null,
            h("p", { class: "credit muted" }, "Photography via ", h("a", { href: "https://unsplash.com/?utm_source=outlier&utm_medium=referral", target: "_blank", rel: "noopener" }, "Unsplash"), "."));
    };

    function applyModal(t) {
        const neg = t.rateType === "negotiable";
        openModal({
            title: `Apply: ${t.title}`,
            intro: `${rateText(t)} · ${hrsText(t.estimatedHours)} · est. ${money(total(t.hourlyRate, t.estimatedHours))}`,
            fields: [
                { name: "note", label: "Why are you a good fit?", type: "textarea", required: true, maxlength: 1000, hint: "30–1000 characters. Mention relevant experience." },
                { name: "availability", label: "Availability", type: "select", options: AVAIL },
                neg ? { name: "rate", label: "Proposed hourly rate (USD, optional)", type: "number", min: 10, max: 200, step: 1, inputmode: "numeric", hint: `Listed rate is ${rateText(t)}. Leave blank to accept it.` } : null,
                { name: "ok", label: "I confirm my details are accurate.", type: "checkbox", required: true, requiredMsg: "Please confirm before submitting." }
            ].filter(Boolean),
            validate: d => ({
                ...(d.note.length < 30 ? { note: `Please write at least 30 characters (${d.note.length} so far).` } : {}),
                ...(neg && d.rate !== "" && !(Number.isInteger(Number(d.rate)) && Number(d.rate) >= 10 && Number(d.rate) <= 200) ? { rate: "Enter a whole number from 10 to 200." } : {})
            }),
            confirm: "Submit application",
            onSubmit: async d => {
                await Market.apply({ taskId: t.id, note: d.note, availability: d.availability, proposedRate: neg && d.rate !== "" ? Number(d.rate) : null });
                O.notify(`Application submitted for “${t.title}”.`);
                O.save(); toast("Application submitted."); O.render();
            }
        });
    }

    /* ---------- My applications ---------- */
    O.pages.applications = async function (main) {
        await init();
        if (!Market.auth.user) { main.append(pageHeader("My Applications", "Track the status of tasks you've applied for."), empty("fa-lock", "Sign in required", "Sign in to see and track your applications.", linkBtn("login.html?next=applications.html", "Sign in"))); return; }
        const apps = Market.myApplications();
        main.append(pageHeader("My Applications", "Track the status of tasks you've applied for."));
        if (!apps.length) { main.append(empty("fa-paper-plane", "No applications yet", "Browse the marketplace and apply to a task.", linkBtn("marketplace.html", "Browse tasks"))); return; }
        const counts = Object.keys(STATUS).map(s => [s, apps.filter(a => a.status === s).length]);
        let filter = "all";
        const tabs = h("div", { class: "tabs wrap" });
        const list = h("div", {});
        function paint() {
            tabs.replaceChildren(h("button", { class: "tab-link" + (filter === "all" ? " active" : ""), onclick: () => { filter = "all"; paint(); } }, `All (${apps.length})`),
                ...counts.filter(([, n]) => n).map(([s, n]) => h("button", { class: "tab-link" + (filter === s ? " active" : ""), onclick: () => { filter = s; paint(); } }, `${STATUS[s]} (${n})`)));
            const rows = apps.filter(a => filter === "all" || a.status === filter);
            list.replaceChildren(...rows.map(a => {
                const t = Market.task(a.taskId);
                return h("div", { class: "row-card app-row" },
                    t ? h("div", { class: "thumb" }, photo(t, 160, 100)) : null,
                    h("div", { class: "grow" },
                        h("h3", {}, t ? h("a", { href: "task.html?id=" + t.id }, a.taskTitle) : a.taskTitle),
                        h("p", {}, `Applied ${fmtDate(a.createdAt)} · ${a.availability}` + (t ? ` · ${rateText(t)}${a.proposedRate ? ` (proposed ${money(a.proposedRate)}/hr)` : ""}` : "")),
                        a.reviewerNote ? h("p", { class: "note" }, "Reviewer: " + a.reviewerNote) : null,
                        a.status === "accepted" ? workBlock(a) : null),
                    statusPill(a.status),
                    a.status === "submitted" || a.status === "reviewing" ? h("button", { class: "btn secondary", onclick: () => confirmBox("Withdraw application?", "You can apply again later while the task is open.", "Withdraw", async () => { await Market.updateApplication(a.id, { status: "withdrawn" }); toast("Application withdrawn."); O.render(); }) }, "Withdraw") : null);
            }));
        }
        main.append(tabs, list); paint();
    };

    function workBlock(a) {
        const subs = Market.mySubmissions().filter(x => x.applicationId === a.id);
        const open = subs.find(x => x.status === "submitted" || x.status === "approved");
        const rate = a.agreedRate || a.proposedRate || (Market.task(a.taskId) || {}).hourlyRate;
        return h("div", { class: "work-block" },
            h("p", {}, h("strong", {}, `Agreed rate: ${money(rate)}/hr`)),
            ...subs.map(x => {
                const pay = Market.myPayments().find(p => p.submissionId === x.id);
                return h("p", { class: "sub-line" }, `${fmtDate(x.createdAt)} · ${x.hours} h · `, h("span", { class: `status status-${x.status}` }, SUB_STATUS[x.status]),
                    pay ? [" → ", h("span", { class: `status pay-${pay.status}` }, `${money(pay.amount)} ${PAY_STATUS[pay.status]}`)] : null,
                    x.reviewerNote ? h("em", {}, " – " + x.reviewerNote) : null);
            }),
            open ? null : h("button", { class: "btn", onclick: () => submitWorkModal(a, rate) }, subs.length ? "Submit revised work" : "Submit work"));
    }
    function submitWorkModal(a, rate) {
        openModal({
            title: `Submit work: ${a.taskTitle}`, intro: `Payment = hours × your agreed rate of ${money(rate)}/hr, after the work and payment are approved.`,
            fields: [
                { name: "hours", label: "Hours worked", type: "number", min: 0.5, max: 500, step: 0.5, required: true, inputmode: "decimal" },
                { name: "summary", label: "What did you complete?", type: "textarea", required: true, maxlength: 2000, hint: "20–2000 characters." },
                { name: "link", label: "Link to deliverables (optional)", type: "url", placeholder: "https://…" }
            ],
            validate: d => ({
                ...(!(Number(d.hours) > 0 && Number(d.hours) <= 500 && Math.round(Number(d.hours) * 2) === Number(d.hours) * 2) ? { hours: "Enter hours in steps of 0.5, up to 500." } : {}),
                ...(d.summary.length < 20 ? { summary: `Please write at least 20 characters (${d.summary.length} so far).` } : {}),
                ...(d.link && !/^https?:\/\/\S+$/i.test(d.link) ? { link: "Enter a link starting with http:// or https://." } : {})
            }),
            confirm: "Submit for review",
            onSubmit: async d => { await Market.submitWork(a.id, { hours: Number(d.hours), summary: d.summary, link: d.link }); O.notify(`Work submitted for “${a.taskTitle}”.`); O.save(); toast("Work submitted for review."); O.render(); }
        });
    }

    /* ---------- Earnings (real payments) ---------- */
    O.pages.earnings = async function (main) {
        await init();
        if (!Market.auth.user) {
            main.append(pageHeader("Your Earnings", "Track your earnings and payouts."), h("div", { class: "banner info" }, "Sign in to see payments for approved work. ", h("a", { href: "login.html?next=earnings.html" }, "Sign in")));
            return;
        }
        const pays = Market.myPayments(), sum = st => pays.filter(p => p.status === st).reduce((t, p) => t + p.amount, 0);
        main.append(pageHeader("Your Earnings", "Payments are created when your work is approved, then approved and paid by an admin."),
            h("section", { class: "stats" },
                h("div", { class: "stat-card" }, icon("fa-circle-check"), h("span", {}, "Paid"), h("div", { class: "value" }, money(sum("paid")))),
                h("div", { class: "stat-card" }, icon("fa-hourglass-half"), h("span", {}, "Approved, awaiting payout"), h("div", { class: "value" }, money(sum("approved")))),
                h("div", { class: "stat-card" }, icon("fa-clock"), h("span", {}, "Awaiting approval"), h("div", { class: "value" }, money(sum("pending"))))),
            h("section", {}, h("h2", {}, "Payments"), pays.length ? h("div", { class: "table-wrap" }, h("table", {},
                h("thead", {}, h("tr", {}, ["Date", "Task", "Hours", "Rate", "Amount", "Status", "Reference"].map(t => h("th", { scope: "col" }, t)))),
                h("tbody", {}, pays.map(p => {
                    const sub = Market.mySubmissions().find(x => x.id === p.submissionId), app = sub && Market.myApplications().find(a => a.id === sub.applicationId);
                    return h("tr", {}, h("td", {}, fmtDate(p.createdAt)), h("td", {}, app ? app.taskTitle : "—"), h("td", {}, p.hours), h("td", {}, money(p.rate) + "/hr"), h("td", {}, h("strong", {}, money(p.amount))),
                        h("td", {}, h("span", { class: `status pay-${p.status}` }, PAY_STATUS[p.status])), h("td", {}, p.reference || "—"));
                })))) : empty("fa-receipt", "No payments yet", "Once an admin approves work you've submitted, the payment shows up here.", linkBtn("applications.html", "Go to My Applications"))));
    };

    /* ---------- Sign in / sign up ---------- */
    O.pages.login = async function (main) {
        const next = new URLSearchParams(location.search).get("next");
        const dest = next && /^[A-Za-z0-9_.\-]+\.html(\?[^\s]*)?$/.test(next) ? next : "marketplace.html";
        await Market.auth.ready();
        if (Market.auth.user) { location.replace(dest); return; }
        let mode = "in";
        const box = h("div", {});
        function paint() {
            const up = mode === "up";
            const err = h("div", { class: "field-error", role: "alert" });
            const field = (id, label, type, extra) => h("div", { class: "field" }, h("label", { for: id }, label), h("input", Object.assign({ id, name: id, type }, extra)));
            const form = h("form", { class: "gate", novalidate: true },
                up ? field("name", "Display name", "text", { autocomplete: "name", maxlength: 60 }) : null,
                field("email", "Email", "email", { autocomplete: "email" }),
                field("password", up ? "Password (8+ characters)" : "Password", "password", { autocomplete: up ? "new-password" : "current-password" }),
                err, h("button", { class: "btn big", type: "submit" }, up ? "Create account" : "Sign in"));
            form.onsubmit = async e => {
                e.preventDefault(); err.textContent = "";
                const email = form.email.value.trim(), pw = form.password.value, name = up ? form.name.value.trim() : "";
                if (!emailRe.test(email)) { err.textContent = "Enter a valid email address."; return; }
                if (up && name.length < 2) { err.textContent = "Enter your name (2+ characters)."; return; }
                if (pw.length < (up ? 8 : 1)) { err.textContent = up ? "Use at least 8 characters." : "Enter your password."; return; }
                const btn = form.querySelector("button"); btn.disabled = true;
                try {
                    if (up) {
                        const r = await Market.auth.signUp(email, pw, name);
                        if (r.needsConfirm) { box.replaceChildren(h("div", { class: "banner info" }, `Account created. Check ${email} for a confirmation link, then sign in.`), h("button", { class: "btn", onclick: () => { mode = "in"; paint(); } }, "Go to sign in")); return; }
                    } else await Market.auth.signIn(email, pw);
                    location.replace(dest);
                } catch (ex) { err.textContent = ex.message; btn.disabled = false; }
            };
            box.replaceChildren(h("div", { class: "tabs" }, ["in", "up"].map(m => h("button", { class: "tab-link" + (mode === m ? " active" : ""), type: "button", onclick: () => { mode = m; paint(); } }, m === "in" ? "Sign in" : "Create account"))), form);
        }
        main.append(pageHeader("Welcome to Outlier", "Sign in to apply for tasks and track your applications."), box);
        paint();
    };

    /* ---------- Admin ---------- */
    function noAccess(main) {
        const u = Market.auth.user;
        document.title = "Page not found - Outlier";
        main.append(u
            ? empty("fa-circle-question", "Page not found", "We couldn't find the page you were looking for.", linkBtn("index.html", "Back to Home"))
            : empty("fa-circle-question", "Page not found", "We couldn't find that page. If you're an administrator, sign in first.", h("div", { class: "actions-row" }, linkBtn("login.html?next=admin.html", "Sign in"), linkBtn("index.html", "Home", "secondary"))));
    }

    O.pages.admin = async function (main) {
        await init();
        if (!Market.auth.isAdmin()) return noAccess(main);
        main.append(h("div", { class: "page-header between" }, h("div", {}, h("h1", {}, "Marketplace Admin"), h("p", {}, "Create and manage tasks, categories and applications.")),
            h("span", { class: "pill st-published" }, "Admin")));
        let tab = sessionStorage.getItem("outlier.admin.tab") || "tasks";
        const tabs = h("div", { class: "tabs wrap" });
        const body = h("div", {});
        main.append(tabs, body);
        const views = { tasks: adminTasks, categories: adminCategories, applications: adminApplications, work: adminWork, payments: adminPayments };
        function paint() {
            tabs.replaceChildren(...[["tasks", "Tasks"], ["categories", "Categories"], ["applications", "Applications"], ["work", "Work review" + countOf(Market.allSubmissions(), "submitted")], ["payments", "Payments" + countOf(Market.allPayments(), "pending", "approved")]].map(([k, l]) =>
                h("button", { class: "tab-link" + (k === tab ? " active" : ""), onclick: () => { tab = k; sessionStorage.setItem("outlier.admin.tab", k); paint(); } }, l)));
            body.replaceChildren(); views[tab](body, paint);
        }
        paint();
    };

    const act = fn => Promise.resolve().then(fn).catch(e => toast(e.message, "error"));

    function adminTasks(body, repaint) {
        let q = "", st = "all", cat = "";
        const search = h("input", { type: "search", placeholder: "Search tasks…", "aria-label": "Search tasks", oninput: e => { q = e.target.value.toLowerCase(); draw(); } });
        const stSel = h("select", { "aria-label": "Status", onchange: e => { st = e.target.value; draw(); } }, ["all", "published", "draft", "archived"].map(s => h("option", { value: s }, s === "all" ? "All statuses" : s[0].toUpperCase() + s.slice(1))));
        const catSel = h("select", { "aria-label": "Category", onchange: e => { cat = e.target.value; draw(); } }, h("option", { value: "" }, "All categories"), Market.categories().map(c => h("option", { value: c.id }, c.name)));
        const wrap = h("div", {});
        body.append(h("div", { class: "toolbar" }, search, stSel, catSel, h("button", { class: "btn", onclick: () => taskForm(null, repaint) }, icon("fa-plus"), " New task")), wrap,
            h("p", {}, h("button", { class: "link-btn", onclick: () => confirmBox("Import the seed library?", "Adds or overwrites the 140 starter tasks and 20 categories (matched by id). Tasks you created yourself are not touched.", "Import", async () => { const n = await Market.importSeed(); toast(`Imported ${n} tasks.`); repaint(); }) }, "Import the 140-task seed library")));
        function draw() {
            const rows = Market.allTasks().filter(t => (st === "all" || t.status === st) && (!cat || t.category === cat) && (t.title + " " + t.skills.join(" ")).toLowerCase().includes(q));
            wrap.replaceChildren(...[h("p", { class: "muted" }, `${rows.length} tasks`), rows.length ? h("div", { class: "table-wrap" }, h("table", {},
                h("thead", {}, h("tr", {}, ["Task", "Category", "Difficulty", "Rate", "Status", "Actions"].map(c => h("th", { scope: "col" }, c)))),
                h("tbody", {}, rows.slice(0, 100).map(t => h("tr", {},
                    h("td", {}, h("a", { href: "task.html?id=" + t.id }, t.title)), h("td", {}, (Market.category(t.category) || {}).name || "—"), h("td", {}, diffBadge(t.difficulty)),
                    h("td", {}, rateText(t)), h("td", {}, h("span", { class: "pill st-" + t.status }, t.status)),
                    h("td", { class: "acts" },
                        h("button", { class: "link-btn", onclick: () => taskForm(t, repaint) }, "Edit"),
                        h("button", { class: "link-btn", onclick: () => act(async () => { await Market.saveTask({ ...t, status: t.status === "published" ? "draft" : "published" }); toast(t.status === "published" ? "Task unpublished." : "Task published."); repaint(); }) }, t.status === "published" ? "Unpublish" : "Publish"),
                        t.status !== "archived" ? h("button", { class: "link-btn", onclick: () => act(async () => { await Market.saveTask({ ...t, status: "archived" }); toast("Task archived."); repaint(); }) }, "Archive") : null,
                        h("button", { class: "link-btn danger-text", onclick: () => confirmBox("Delete task?", `“${t.title}” and its applications will be permanently deleted.`, "Delete", async () => { await Market.deleteTask(t.id); toast("Task deleted."); repaint(); }) }, "Delete"))))))) : empty("fa-folder-open", "No tasks found", "Adjust the filters or create a new task."),
                rows.length > 100 ? h("p", { class: "muted" }, "Showing the first 100. Narrow the filters to see more.") : null].filter(Boolean));
        }
        draw();
    }

    const UNSPLASH_RE = /^https:\/\/images\.unsplash\.com\/(photo-[A-Za-z0-9_-]+)(?:\?.*)?$/;
    function loadable(url) { return new Promise(res => { const i = new Image(); i.onload = () => res(true); i.onerror = () => res(false); i.src = url; }); }
    function fileToDataUrl(file) {
        return new Promise((res, rej) => {
            if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return rej({ field: "file", message: "Use a JPEG, PNG or WebP image." });
            if (file.size > 8e6) return rej({ field: "file", message: "Image is larger than 8 MB." });
            const url = URL.createObjectURL(file), img = new Image();
            img.onload = () => {
                const w = 960, hgt = 600, c = document.createElement("canvas"); c.width = w; c.height = hgt;
                const r = Math.max(w / img.width, hgt / img.height), sw = w / r, sh = hgt / r;
                c.getContext("2d").drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 0, 0, w, hgt);
                URL.revokeObjectURL(url); res(c.toDataURL("image/jpeg", 0.8));
            };
            img.onerror = () => rej({ field: "file", message: "That file could not be read as an image." });
            img.src = url;
        });
    }

    function taskForm(t, repaint) {
        const cats = Market.categories();
        const isNew = !t;
        const lines = a => (a || []).join("\n");
        const imgOpts = ["Keep current / category default", "Category photo 1", "Category photo 2", "Category photo 3"];
        openModal({
            title: isNew ? "New task" : "Edit task", wide: true, confirm: isNew ? "Create task" : "Save changes",
            fields: [
                { name: "title", label: "Title", required: true, maxlength: 120, value: t && t.title },
                { name: "category", label: "Category", type: "select", options: cats.map(c => c.id), value: t ? t.category : cats[0].id },
                { name: "difficulty", label: "Difficulty", type: "select", options: DIFFS, value: t ? t.difficulty : "Easy" },
                { name: "rate", label: "Hourly rate (USD, 10–200)", type: "number", min: 10, max: 200, step: 1, required: true, value: t && t.hourlyRate },
                { name: "hours", label: "Estimated hours", type: "number", min: 1, max: 500, step: 1, required: true, value: t && t.estimatedHours },
                { name: "rateType", label: "Rate type", type: "select", options: ["fixed", "negotiable"], value: t ? t.rateType : "fixed" },
                { name: "summary", label: "Short summary (card text)", type: "textarea", required: true, maxlength: 200, value: t && t.summary },
                { name: "description", label: "Full description", type: "textarea", required: true, maxlength: 1500, value: t && t.description },
                { name: "skills", label: "Required skills (comma separated)", required: true, value: t && t.skills.join(", ") },
                { name: "experience", label: "Experience level", required: true, value: t ? t.experience : "1–2 years of practical experience" },
                { name: "responsibilities", label: "Responsibilities (one per line)", type: "textarea", required: true, maxlength: 1500, value: t ? lines(t.responsibilities) : "" },
                { name: "deliverables", label: "Deliverables (one per line)", type: "textarea", required: true, maxlength: 1000, value: t ? lines(t.deliverables) : "" },
                { name: "qualifications", label: "Qualifications (one per line)", type: "textarea", required: true, maxlength: 1000, value: t ? lines(t.qualifications) : "" },
                { name: "apply", label: "Application instructions", type: "textarea", required: true, maxlength: 500, value: t ? t.applyInstructions : "Submit a short note describing relevant experience and your availability." },
                { name: "deadline", label: "Deadline (leave empty for ongoing)", type: "date", value: t && t.deadline },
                { name: "status", label: "Status", type: "select", options: ["published", "draft", "archived"], value: t ? t.status : "draft" },
                { name: "imagePick", label: "Image", type: "select", options: isNew ? imgOpts.slice(1) : imgOpts },
                { name: "imageUrl", label: "…or an Unsplash image URL", placeholder: "https://images.unsplash.com/photo-…", hint: "Must be an images.unsplash.com photo URL; it is checked before saving." },
                { name: "file", label: "…or upload an image", type: "file", accept: "image/jpeg,image/png,image/webp" }
            ],
            validate: d => {
                const e = {};
                const r = Number(d.rate), hr = Number(d.hours);
                if (!Number.isInteger(r) || r < 10 || r > 200) e.rate = "Enter a whole number from 10 to 200.";
                else {
                    const [lo, hi] = { Easy: [10, 25], Intermediate: [25, 50], Hard: [50, 90], Expert: [90, 200] }[d.difficulty];
                    if (r < lo || r > hi) e.rate = `${d.difficulty} tasks pay $${lo}–$${hi}/hr.`;
                }
                if (!Number.isInteger(hr) || hr < 1 || hr > 500) e.hours = "Enter a whole number from 1 to 500.";
                if (d.title.length < 5) e.title = "Title needs at least 5 characters.";
                if (!d.skills.split(",").some(s => s.trim())) e.skills = "Add at least one skill.";
                if (d.imageUrl && !UNSPLASH_RE.test(d.imageUrl)) e.imageUrl = "Use a https://images.unsplash.com/photo-… URL.";
                return e;
            },
            onSubmit: async d => {
                let image = t ? t.image : null;
                const cat = Market.category(d.category);
                const idx = imgOpts.indexOf(d.imagePick);
                if (d.file) image = await fileToDataUrl(d.file);
                else if (d.imageUrl) {
                    const m = d.imageUrl.match(UNSPLASH_RE);
                    if (!(await loadable(`https://images.unsplash.com/${m[1]}?auto=format&fit=crop&w=200&h=125&q=60`))) throw { field: "imageUrl", message: "That image could not be loaded. Check the URL." };
                    image = m[1];
                } else if (idx > 0) image = cat.images[(idx - 1) % cat.images.length];
                else if (!image) image = cat.images[0];
                const list = s => s.split("\n").map(x => x.trim()).filter(Boolean);
                const task = {
                    ...(t || { id: "t" + uid(), postedAt: todayISO(), currency: "USD" }),
                    title: d.title, category: d.category, difficulty: d.difficulty, hourlyRate: Number(d.rate), estimatedHours: Number(d.hours), rateType: d.rateType,
                    summary: d.summary, description: d.description, skills: d.skills.split(",").map(s => s.trim()).filter((s, i, a) => s && a.findIndex(x => x.toLowerCase() === s.toLowerCase()) === i), experience: d.experience,
                    responsibilities: list(d.responsibilities), deliverables: list(d.deliverables), qualifications: list(d.qualifications), applyInstructions: d.apply,
                    deadline: d.deadline || null, status: d.status, image
                };
                await Market.saveTask(task);
                toast(isNew ? "Task created." : "Task updated."); repaint();
            }
        });
    }

    function adminCategories(body, repaint) {
        body.append(h("div", { class: "toolbar" }, h("button", { class: "btn", onclick: () => catForm(null, repaint) }, icon("fa-plus"), " New category")));
        const used = id => Market.allTasks().filter(t => t.category === id).length;
        body.append(...Market.categories().map(c => h("div", { class: "row-card" },
            h("div", { class: "thumb" }, h("div", { class: "photo" }, h("img", { src: imgSrc(c.images[0], 160, 100), alt: "", width: 160, height: 100, loading: "lazy" }))),
            h("div", { class: "grow" }, h("h3", {}, icon(c.icon), " ", c.name), h("p", {}, `${used(c.id)} tasks · ${c.images.length} photo${c.images.length === 1 ? "" : "s"}`)),
            h("button", { class: "btn secondary", onclick: () => catForm(c, repaint) }, "Edit"),
            h("button", { class: "btn secondary danger-text", onclick: () => used(c.id) ? toast("Move or delete this category's tasks first.", "error") : confirmBox("Delete category?", `“${c.name}” will be removed.`, "Delete", async () => { await Market.deleteCategory(c.id); toast("Category deleted."); repaint(); }) }, "Delete"))));
    }
    function catForm(c, repaint) {
        openModal({
            title: c ? "Edit category" : "New category", confirm: "Save",
            fields: [
                { name: "name", label: "Name", required: true, maxlength: 60, value: c && c.name },
                { name: "icon", label: "Font Awesome icon class", value: c ? c.icon : "fa-briefcase", hint: "e.g. fa-briefcase, fa-code. Any free solid icon." },
                { name: "images", label: "Unsplash photo URLs (one per line)", type: "textarea", required: true, maxlength: 800, value: c ? c.images.map(i => `https://images.unsplash.com/${i}`).join("\n") : "", hint: "At least one https://images.unsplash.com/photo-… URL; each is checked before saving." }
            ],
            validate: d => {
                const e = {};
                if (d.name.length < 2) e.name = "Enter a name.";
                if (!/^fa-[a-z0-9-]+$/.test(d.icon)) e.icon = "Use a class like fa-briefcase.";
                if (d.images.split("\n").map(s => s.trim()).filter(Boolean).some(u => !UNSPLASH_RE.test(u))) e.images = "Every line must be an images.unsplash.com/photo-… URL.";
                else if (Market.categories().some(x => x.name.toLowerCase() === d.name.toLowerCase() && (!c || x.id !== c.id))) e.name = "A category with this name already exists.";
                return e;
            },
            onSubmit: async d => {
                const ids = d.images.split("\n").map(s => s.trim()).filter(Boolean).map(u => u.match(UNSPLASH_RE)[1]);
                for (const id of ids) if (!(await loadable(`https://images.unsplash.com/${id}?auto=format&fit=crop&w=200&h=125&q=60`))) throw { field: "images", message: `Could not load ${id}.` };
                const id = c ? c.id : d.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
                await Market.saveCategory({ id, name: d.name, icon: d.icon, images: [...new Set(ids)] });
                toast("Category saved."); repaint();
            }
        });
    }

    const countOf = (rows, ...st) => { const n = rows.filter(r => st.includes(r.status)).length; return n ? ` (${n})` : ""; };

    function adminWork(body, repaint) {
        let filter = "submitted";
        const sel = h("select", { "aria-label": "Filter", onchange: e => { filter = e.target.value; draw(); } }, [["submitted", "Awaiting review"], ["all", "All"], ["approved", "Approved"], ["revision", "Revision requested"], ["rejected", "Rejected"]].map(([v, l]) => h("option", { value: v }, l)));
        const wrap = h("div", {}); body.append(h("div", { class: "toolbar" }, sel), wrap);
        function draw() {
            const rows = Market.allSubmissions().filter(x => filter === "all" || x.status === filter);
            wrap.replaceChildren(...(rows.length ? rows.map(x => {
                const a = Market.allApplications().find(y => y.id === x.applicationId);
                const rate = a && (a.agreedRate || a.proposedRate || (Market.task(a.taskId) || {}).hourlyRate);
                return h("div", { class: "row-card app-row" },
                    h("div", { class: "grow" }, h("h3", {}, a ? a.taskTitle : "Task"), h("p", {}, `${Market.userName(x.userId)} · ${fmtDate(x.createdAt)} · ${x.hours} h × ${money(rate || 0)}/hr = ${money(x.hours * (rate || 0))}`),
                        h("p", { class: "note" }, x.summary), x.link ? h("p", {}, h("a", { href: x.link, target: "_blank", rel: "noopener noreferrer" }, "Open deliverables")) : null, x.reviewerNote ? h("p", { class: "note" }, "Your note: " + x.reviewerNote) : null),
                    h("span", { class: `status status-${x.status}` }, SUB_STATUS[x.status]),
                    x.status === "submitted" ? h("button", { class: "btn", onclick: () => reviewWork(x) }, "Review") : null);
            }) : [empty("fa-inbox", "Nothing here", "No submissions match this filter.")]));
        }
        function reviewWork(x) {
            openModal({
                title: "Review submitted work", intro: "Approving creates a payment for you to approve in the Payments tab.",
                fields: [{ name: "status", label: "Decision", type: "select", options: ["approved", "revision", "rejected"] }, { name: "note", label: "Note to worker (optional)", type: "textarea", maxlength: 300 }],
                validate: d => d.status !== "approved" && !d.note ? { note: "Add a note explaining what needs to change." } : {},
                onSubmit: async d => { await Market.reviewSubmission(x.id, d.status, d.note); toast(d.status === "approved" ? "Work approved. A payment is awaiting your approval." : "Review saved."); repaint(); }
            });
        }
        draw();
    }

    function adminPayments(body, repaint) {
        let filter = "action";
        const sel = h("select", { "aria-label": "Filter", onchange: e => { filter = e.target.value; draw(); } }, [["action", "Needs action"], ["all", "All"], ...Object.entries(PAY_STATUS)].map(([v, l]) => h("option", { value: v }, l)));
        const wrap = h("div", {}); body.append(h("div", { class: "toolbar" }, sel), wrap);
        const total = rows => rows.reduce((t, p) => t + p.amount, 0);
        function draw() {
            const all = Market.allPayments();
            const rows = all.filter(p => filter === "all" || (filter === "action" ? p.status === "pending" || p.status === "approved" : p.status === filter));
            wrap.replaceChildren(h("p", { class: "muted" }, `Pending approval ${money(total(all.filter(p => p.status === "pending")))} · Approved, unpaid ${money(total(all.filter(p => p.status === "approved")))} · Paid ${money(total(all.filter(p => p.status === "paid")))}`),
                ...(rows.length ? rows.map(p => {
                    const sub = Market.allSubmissions().find(x => x.id === p.submissionId), a = sub && Market.allApplications().find(y => y.id === sub.applicationId);
                    return h("div", { class: "row-card app-row" },
                        h("div", { class: "grow" }, h("h3", {}, `${money(p.amount)} · ${Market.userName(p.userId)}`), h("p", {}, `${a ? a.taskTitle : "Task"} · ${p.hours} h × ${money(p.rate)}/hr · ${fmtDate(p.createdAt)}`),
                            p.reference ? h("p", { class: "note" }, "Reference: " + p.reference) : null),
                        h("span", { class: `status pay-${p.status}` }, PAY_STATUS[p.status]),
                        p.status === "pending" ? [h("button", { class: "btn", onclick: () => decide(p, "approved") }, "Approve payment"), h("button", { class: "btn secondary danger-text", onclick: () => decide(p, "rejected") }, "Reject")] : null,
                        p.status === "approved" ? h("button", { class: "btn", onclick: () => markPaid(p) }, "Mark as paid") : null);
                }) : [empty("fa-money-bill-wave", "Nothing here", "No payments match this filter.")]));
        }
        function decide(p, status) {
            openModal({ title: status === "approved" ? `Approve payment of ${money(p.amount)}?` : "Reject payment?", intro: status === "approved" ? "This authorises the payout. You'll record the transfer afterwards with “Mark as paid”." : "The worker will see this payment as not approved.",
                danger: status === "rejected", confirm: status === "approved" ? "Approve" : "Reject",
                fields: [{ name: "note", label: status === "rejected" ? "Reason" : "Note (optional)", type: "textarea", maxlength: 300, required: status === "rejected" }],
                onSubmit: async d => { await Market.reviewPayment(p.id, { status, note: d.note }); toast(status === "approved" ? "Payment approved." : "Payment rejected."); repaint(); } });
        }
        function markPaid(p) {
            openModal({ title: `Mark ${money(p.amount)} as paid`, intro: "Only do this after the money has actually been sent (bank, PayPal, AirTM). This app does not send money.",
                fields: [{ name: "reference", label: "Payment reference / transaction ID", required: true, maxlength: 120 }],
                validate: d => d.reference.length < 3 ? { reference: "Enter the transaction reference (3+ characters)." } : {}, confirm: "Mark as paid",
                onSubmit: async d => { await Market.reviewPayment(p.id, { status: "paid", reference: d.reference, note: p.note }); toast("Payment marked as paid."); repaint(); } });
        }
        draw();
    }

    function adminApplications(body, repaint) {
        const apps = Market.allApplications();
        if (!apps.length) { body.append(empty("fa-inbox", "No applications yet", "Applications from the marketplace will appear here for review.")); return; }
        let filter = "open";
        const sel = h("select", { "aria-label": "Filter", onchange: e => { filter = e.target.value; draw(); } }, [["open", "Needs review"], ["all", "All"], ...Object.entries(STATUS)].map(([v, l]) => h("option", { value: v }, l)));
        const wrap = h("div", {});
        body.append(h("div", { class: "toolbar" }, sel), wrap);
        function draw() {
            const rows = apps.filter(a => filter === "all" || (filter === "open" ? a.status === "submitted" || a.status === "reviewing" : a.status === filter));
            wrap.replaceChildren(...(rows.length ? rows.map(a => {
                const t = Market.task(a.taskId);
                return h("div", { class: "row-card app-row" },
                    h("div", { class: "grow" }, h("h3", {}, a.taskTitle), h("p", {}, `${Market.applicantName(a)} · ${fmtDate(a.createdAt)} · ${a.availability}` + (a.proposedRate ? ` · proposes ${money(a.proposedRate)}/hr${t ? ` (listed ${rateText(t)})` : ""}` : "")), h("p", { class: "note" }, a.note), a.reviewerNote ? h("p", { class: "note" }, "Your note: " + a.reviewerNote) : null),
                    statusPill(a.status),
                    a.status !== "withdrawn" ? h("button", { class: "btn", onclick: () => review(a) }, "Review") : null);
            }) : [empty("fa-inbox", "Nothing here", "No applications match this filter.")]));
        }
        function review(a) {
            const t = Market.task(a.taskId);
            openModal({
                title: "Review application", intro: `${a.taskTitle}: “${a.note}”`,
                fields: [{ name: "status", label: "Decision", type: "select", options: ["reviewing", "accepted", "rejected"], value: a.status === "submitted" ? "reviewing" : a.status },
                         { name: "rate", label: "Agreed hourly rate (USD) – used when accepting", type: "number", min: 10, max: 200, step: 1, value: a.agreedRate || a.proposedRate || (t && t.hourlyRate), hint: "Payments are hours worked × this rate." },
                         { name: "note", label: "Note to applicant (optional)", type: "textarea", maxlength: 300, value: a.reviewerNote }],
                validate: d => d.status === "accepted" && !(Number.isInteger(Number(d.rate)) && Number(d.rate) >= 10 && Number(d.rate) <= 200) ? { rate: "Enter a whole number from 10 to 200." } : {},
                onSubmit: async d => { await Market.updateApplication(a.id, { status: d.status, reviewerNote: d.note, agreedRate: d.status === "accepted" ? Number(d.rate) : null }); toast("Application updated."); repaint(); }
            });
        }
        draw();
    }
})();
