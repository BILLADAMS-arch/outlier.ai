/* Outlier – shared front-end logic.
 * No backend exists yet, so all state lives in localStorage (see Store).
 * Every page is a thin HTML shell: <body data-page="home|tasks|...">. */
(function () {
    "use strict";

    /* ---------- Catalog (static project listings) ---------- */
    const CATALOG = [
        { id: "stem", name: "STEM Evaluation", icon: "fa-flask", minutes: 5, tasks: 10800 },
        { id: "code", name: "Code Generation", icon: "fa-code", minutes: 60, tasks: 360 },
        { id: "math", name: "Math Generation", icon: "fa-calculator", minutes: 12, tasks: 505 },
        { id: "spanish", name: "Chatbot Spanish", icon: "fa-comments", minutes: 8, tasks: 1700 },
        { id: "bulba", name: "Project Bulba", icon: "fa-leaf", minutes: null, tasks: null, onboarding: true }
    ];
    const byId = id => CATALOG.find(p => p.id === id);

    /* ---------- Store ---------- */
    const KEY = "outlier.state.v1";
    const defaults = () => ({
        v: 1,
        user: { name: "Steve Stelly" },
        joined: ["stem", "code"],
        completed: [],
        payments: [],
        tax: { w9: null, general: null },
        notifications: []
    });
    let state = defaults();
    let storageOk = true;

    function load() {
        try {
            const raw = localStorage.getItem(KEY);
            if (raw) state = Object.assign(defaults(), JSON.parse(raw));
        } catch (e) { storageOk = false; }
    }
    function save() {
        try { localStorage.setItem(KEY, JSON.stringify(state)); }
        catch (e) { storageOk = false; toast("Could not save – browser storage is unavailable.", "error"); }
    }
    const userName = () => (window.Market && window.Market.auth.user ? window.Market.auth.user.name : state.user.name);
    const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    function notify(text) {
        state.notifications.unshift({ id: uid(), text, at: new Date().toISOString(), read: false });
        state.notifications = state.notifications.slice(0, 30);
    }

    /* ---------- Derived data ---------- */
    const doneCount = id => state.completed.filter(c => c.projectId === id).length;
    const tasksLeft = p => (p.tasks == null ? null : Math.max(0, p.tasks - doneCount(p.id)));
    const isJoined = id => state.joined.includes(id);
    const totalEarnings = () => state.completed.reduce((s, c) => s + (c.reward || 0), 0);
    function avgPerWeek() {
        if (!state.completed.length) return 0;
        const first = Math.min(...state.completed.map(c => +new Date(c.completedAt)));
        const weeks = Math.max(1, (Date.now() - first) / 6048e5);
        return Math.round((state.completed.length / weeks) * 10) / 10;
    }
    const money = n => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
    const fmtDate = iso => new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    const fmtTime = iso => new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    const compact = n => n >= 1000 ? (Math.round(n / 100) / 10) + "k" : String(n);
    const estimateText = p => {
        if (p.minutes == null) return "Onboarding required before tasks are assigned";
        return `Estimate: ${p.minutes}m per task | ${compact(tasksLeft(p))} tasks left`;
    };

    /* ---------- DOM helpers (all text goes through textContent) ---------- */
    function h(tag, attrs, ...kids) {
        const el = document.createElement(tag);
        for (const [k, v] of Object.entries(attrs || {})) {
            if (v == null || v === false) continue;
            if (k === "class") el.className = v;
            else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
            else if (k === "dataset") Object.assign(el.dataset, v);
            else el.setAttribute(k, v === true ? "" : v);
        }
        kids.flat().forEach(c => { if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(c)); });
        return el;
    }
    const icon = (cls, extra) => h("i", { class: `${cls.includes("fa-brands") ? "" : "fa-solid "}${cls} ${extra || ""}`, "aria-hidden": "true" });

    function toast(msg, type) {
        let box = document.getElementById("toasts");
        if (!box) { box = h("div", { id: "toasts", "aria-live": "polite" }); document.body.append(box); }
        const t = h("div", { class: `toast ${type || "success"}`, role: type === "error" ? "alert" : "status" }, msg);
        box.append(t);
        setTimeout(() => t.remove(), 4000);
    }

    /* Modal: fields = [{name,label,type,hint,options,required,inputmode,autocomplete}] */
    function openModal({ title, intro, fields = [], confirm = "Save", danger, validate, onSubmit, wide }) {
        const opener = document.activeElement;
        const errs = {};
        const form = h("form", { novalidate: true });
        if (intro) form.append(h("p", { class: "modal-intro" }, intro));
        fields.forEach(f => {
            const id = "f-" + f.name;
            let input;
            if (f.type === "select") {
                input = h("select", { id, name: f.name }, f.options.map(o => h("option", { value: o }, o)));
            } else if (f.type === "textarea") {
                input = h("textarea", { id, name: f.name, rows: 3, maxlength: f.maxlength || 300 });
            } else if (f.type === "file") {
                input = h("input", { id, name: f.name, type: "file", accept: f.accept });
            } else if (f.type === "checkbox") {
                input = h("input", { id, name: f.name, type: "checkbox" });
            } else {
                input = h("input", { id, name: f.name, type: f.type || "text", inputmode: f.inputmode, autocomplete: f.autocomplete || "off", maxlength: f.maxlength, min: f.min, max: f.max, step: f.step, placeholder: f.placeholder });
            }
            if (f.value != null && f.type !== "file") { if (f.type === "checkbox") input.checked = !!f.value; else input.value = f.value; }
            const err = h("div", { class: "field-error", id: id + "-err" });
            errs[f.name] = err;
            input.setAttribute("aria-describedby", id + "-err");
            form.append(h("div", { class: "field" + (f.type === "checkbox" ? " check" : "") },
                f.type === "checkbox" ? [input, h("label", { for: id }, f.label)] : [h("label", { for: id }, f.label), input],
                f.hint ? h("small", {}, f.hint) : null, err));
        });
        const cancel = h("button", { type: "button", class: "btn secondary" }, "Cancel");
        const ok = h("button", { type: "submit", class: "btn" + (danger ? " danger" : "") }, confirm);
        form.append(h("div", { class: "modal-actions" }, cancel, ok));

        const overlay = h("div", { class: "overlay" },
            h("div", { class: "modal" + (wide ? " wide" : ""), role: "dialog", "aria-modal": "true", "aria-label": title },
                h("h2", {}, title), form));
        function close() { overlay.remove(); document.removeEventListener("keydown", onKey); opener && opener.focus && opener.focus(); }
        function onKey(e) { if (e.key === "Escape") close(); }
        cancel.onclick = close;
        overlay.addEventListener("mousedown", e => { if (e.target === overlay) close(); });
        document.addEventListener("keydown", onKey);

        form.addEventListener("submit", e => {
            e.preventDefault();
            const data = {};
            fields.forEach(f => {
                const el = form.elements[f.name];
                data[f.name] = f.type === "checkbox" ? el.checked : f.type === "file" ? (el.files[0] || null) : el.value.trim();
                errs[f.name].textContent = "";
                el.removeAttribute("aria-invalid");
            });
            const problems = {};
            fields.forEach(f => {
                if (f.required && !data[f.name]) problems[f.name] = f.requiredMsg || "This field is required.";
            });
            if (validate) Object.assign(problems, Object.fromEntries(Object.entries(validate(data) || {}).filter(([k]) => !problems[k])));
            const keys = Object.keys(problems);
            if (keys.length) {
                keys.forEach(k => { errs[k].textContent = problems[k]; form.elements[k].setAttribute("aria-invalid", "true"); });
                form.elements[keys[0]].focus();
                return;
            }
            ok.disabled = true;
            Promise.resolve().then(() => onSubmit(data)).then(r => { if (r !== false) close(); else ok.disabled = false; },
                err => { ok.disabled = false; if (err && err.field && errs[err.field]) errs[err.field].textContent = err.message; else toast(err && err.message || "Something went wrong.", "error"); });
        });
        document.body.append(overlay);
        const first = form.querySelector("input,select,textarea") || ok;
        first.focus();
    }

    function confirmBox(title, text, label, fn) {
        openModal({ title, intro: text, confirm: label, danger: true, onSubmit: () => fn() });
    }

    /* ---------- Validation ---------- */
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    function abaValid(r) {
        if (!/^\d{9}$/.test(r)) return false;
        const d = r.split("").map(Number);
        return (3 * (d[0] + d[3] + d[6]) + 7 * (d[1] + d[4] + d[7]) + (d[2] + d[5] + d[8])) % 10 === 0;
    }

    /* ---------- Layout ---------- */
    const NAV = [
        ["home", "dashboard.html", "fa-house", "Home"],
        ["market", "marketplace.html", "fa-store", "Marketplace"],
        ["applications", "applications.html", "fa-paper-plane", "My Applications"],
        ["tasks", "tasks.html", "fa-clipboard-list", "Projects"],
        ["completed", "completed-tasks.html", "fa-clipboard-check", "Completed Tasks"],
        ["earnings", "earnings.html", "fa-money-check-dollar", "Earnings"],
        ["learn", "learn-skills.html", "fa-chalkboard", "Learn Skills"],
        ["admin", "admin.html", "fa-user-shield", "Admin"]
    ];

    function navBadge(key) {
        if (key === "tasks") return state.joined.length;
        if (key === "completed") return state.completed.length;
        if (key === "applications") return 0;
        return null;
    }

    function buildShell(page) {
        const app = document.getElementById("app");
        const nav = h("ul", {}, NAV.filter(([key]) => key !== "admin" || (window.Market && window.Market.auth.isAdmin())).map(([key, href, ic, label]) => {
            const n = navBadge(key);
            return h("li", {}, h("a", { href, class: key === page ? "active" : "", "aria-current": key === page ? "page" : null },
                icon(ic), h("span", {}, label), n ? h("span", { class: "badge" }, n) : null,
                key === "applications" ? h("span", { class: "badge", hidden: true, dataset: { badge: "applications" } }) : null));
        }));
        const sidebar = h("aside", { class: "sidebar", id: "sidebar" },
            h("img", { src: "images/outlier.png", alt: "Outlier", class: "logo" }), h("nav", { "aria-label": "Main" }, nav));

        const bell = h("button", { class: "icon-btn", "aria-label": "Notifications", "aria-haspopup": "true" }, icon("fa-bell"));
        const unread = state.notifications.filter(n => !n.read).length;
        if (unread) bell.append(h("span", { class: "dot" }, unread));
        const menu = h("div", { class: "popover", hidden: true });
        function renderMenu() {
            menu.replaceChildren(
                h("div", { class: "popover-head" }, h("strong", {}, "Notifications"),
                    state.notifications.length ? h("button", { class: "link-btn", onclick: () => { state.notifications = []; save(); renderMenu(); bell.querySelector(".dot")?.remove(); } }, "Clear all") : null),
                state.notifications.length
                    ? h("ul", {}, state.notifications.map(n => h("li", {}, h("span", {}, n.text), h("small", {}, fmtTime(n.at)))))
                    : h("p", { class: "muted pad" }, "You're all caught up."));
        }
        bell.onclick = e => {
            e.stopPropagation();
            renderMenu();
            menu.hidden = !menu.hidden;
            if (!menu.hidden) { state.notifications.forEach(n => n.read = true); save(); bell.querySelector(".dot")?.remove(); }
        };
        document.addEventListener("click", e => { if (!menu.contains(e.target)) menu.hidden = true; });

        const au = window.Market && window.Market.auth.user;
        const nameBtn = h("button", { class: "user-btn", "aria-label": "Edit your display name", onclick: () => openModal({
            title: "Display name", fields: [{ name: "name", label: "Your name", value: userName(), required: true, maxlength: 60 }],
            validate: d => d.name.length < 2 ? { name: "Enter at least 2 characters." } : {},
            onSubmit: d => { if (au) return window.Market.auth.updateName(d.name).then(() => location.reload()); state.user.name = d.name; save(); location.reload(); }
        }) }, h("span", { class: "avatar" }, userName().trim().charAt(0).toUpperCase()), h("span", { class: "user-name" }, userName()));
        const authBtn = au
            ? h("button", { class: "btn secondary", onclick: () => window.Market.auth.signOut().then(() => { location.href = "index.html"; }) }, "Sign out")
            : window.Market ? h("a", { class: "btn", href: "login.html" }, "Sign in") : null;

        const burger = h("button", { class: "icon-btn burger", "aria-label": "Toggle menu", "aria-controls": "sidebar", onclick: () => document.body.classList.toggle("nav-open") }, icon("fa-bars"));
        const topbar = h("div", { class: "topbar" }, burger, h("div", { class: "topbar-right" }, h("div", { class: "pop-wrap" }, bell, menu), nameBtn, authBtn));
        const main = h("main", { class: "main-content", id: "main" });
        app.replaceChildren(h("div", { class: "container" }, sidebar, h("div", { class: "content-col" }, topbar, main)));
        if (!storageOk) main.append(h("div", { class: "banner warn" }, "Browser storage is unavailable, so your changes won't be saved after you leave this page."));
        return main;
    }

    const pageHeader = (title, sub) => h("header", { class: "page-header" }, h("h1", {}, title), sub ? h("p", {}, sub) : null);
    const empty = (ic, title, text, action) => h("div", { class: "empty" }, icon(ic), h("h3", {}, title), h("p", {}, text), action || null);
    const linkBtn = (href, label, cls) => h("a", { href, class: "btn " + (cls || "") }, label);

    /* ---------- Actions ---------- */
    function join(id) {
        const p = byId(id);
        if (isJoined(id)) return;
        state.joined.push(id);
        notify(`You joined ${p.name}.`);
        save(); toast(`Joined ${p.name}.`); render();
    }
    function leave(id) {
        const p = byId(id);
        confirmBox(`Leave ${p.name}?`, "Your completed tasks stay in your history. You can rejoin at any time.", "Leave project", () => {
            state.joined = state.joined.filter(j => j !== id);
            notify(`You left ${p.name}.`);
            save(); toast(`Left ${p.name}.`); render();
        });
    }
    function logTask(id) {
        const p = byId(id);
        openModal({
            title: `Log a completed task – ${p.name}`,
            intro: "Record a task you finished in this project.",
            fields: [
                { name: "minutes", label: "Time spent (minutes)", type: "number", value: p.minutes || 10, min: 1, max: 600, required: true, inputmode: "numeric" },
                { name: "note", label: "Note (optional)", type: "textarea" }
            ],
            validate: d => { const m = Number(d.minutes); return Number.isInteger(m) && m >= 1 && m <= 600 ? {} : { minutes: "Enter a whole number between 1 and 600." }; },
            confirm: "Log task",
            onSubmit: d => {
                if (tasksLeft(p) === 0) { toast("No tasks left in this project.", "error"); return false; }
                state.completed.unshift({ id: uid(), projectId: id, projectName: p.name, completedAt: new Date().toISOString(), minutes: Number(d.minutes), note: d.note, reward: 0 });
                notify(`Task logged in ${p.name}.`);
                save(); toast("Task logged."); render();
            }
        });
    }

    function removeEntry(id) {
        confirmBox("Delete this entry?", "It will be removed from your history and the project's task count.", "Delete", () => {
            state.completed = state.completed.filter(x => x.id !== id);
            save(); toast("Entry deleted."); render();
        });
    }

    function addPayment(type) {
        const labels = { bank: "Bank account", paypal: "PayPal", airtm: "AirTM" };
        const done = (label, last4) => {
            state.payments = state.payments.filter(p => p.type !== type);
            state.payments.push({ id: uid(), type, label, last4, addedAt: new Date().toISOString() });
            notify(`${labels[type]} added as a payment method.`);
            save(); toast(`${labels[type]} saved.`); render();
        };
        if (type === "bank") {
            openModal({
                title: "Add bank account",
                intro: "For your security only the last 4 digits of the account number are kept on this device.",
                fields: [
                    { name: "holder", label: "Account holder name", required: true, autocomplete: "name" },
                    { name: "routing", label: "Routing number (9 digits)", inputmode: "numeric", maxlength: 9, required: true },
                    { name: "account", label: "Account number", inputmode: "numeric", maxlength: 17, required: true },
                    { name: "account2", label: "Confirm account number", inputmode: "numeric", maxlength: 17, required: true }
                ],
                validate: d => ({
                    ...(d.holder.length < 2 ? { holder: "Enter the name on the account." } : {}),
                    ...(!abaValid(d.routing) ? { routing: "Enter a valid 9-digit routing number." } : {}),
                    ...(!/^\d{4,17}$/.test(d.account) ? { account: "Account numbers are 4–17 digits." } : {}),
                    ...(d.account !== d.account2 ? { account2: "Account numbers do not match." } : {})
                }),
                onSubmit: d => done(`Bank account ••••${d.account.slice(-4)}`, d.account.slice(-4))
            });
        } else {
            openModal({
                title: `Add ${labels[type]}`,
                fields: [{ name: "email", label: `${labels[type]} account email`, type: "email", required: true, autocomplete: "email" }],
                validate: d => emailRe.test(d.email) ? {} : { email: "Enter a valid email address." },
                onSubmit: d => done(`${labels[type]} (${d.email})`)
            });
        }
    }
    function removePayment(id) {
        confirmBox("Remove payment method?", "You won't be able to receive payouts until you add another one.", "Remove", () => {
            state.payments = state.payments.filter(p => p.id !== id);
            save(); toast("Payment method removed."); render();
        });
    }
    function submitTax(kind) {
        const w9 = kind === "w9";
        openModal({
            title: w9 ? "W-9 Form" : "General tax form",
            intro: "Your tax ID is not stored – only its last 4 digits are kept on this device.",
            fields: [
                { name: "name", label: "Legal name", required: true, autocomplete: "name" },
                w9 ? { name: "cls", label: "Federal tax classification", type: "select", options: ["Individual / sole proprietor", "C corporation", "S corporation", "Partnership", "LLC"] }
                   : { name: "country", label: "Country of tax residence", required: true, autocomplete: "country-name" },
                { name: "tin", label: w9 ? "SSN or EIN (9 digits)" : "Tax ID number", inputmode: "numeric", maxlength: w9 ? 9 : 20, required: true },
                { name: "cert", label: "I certify that the information provided is correct.", type: "checkbox", required: true, requiredMsg: "You must certify before submitting." }
            ],
            validate: d => ({
                ...(d.name.length < 2 ? { name: "Enter your legal name." } : {}),
                ...(w9 && !/^\d{9}$/.test(d.tin) ? { tin: "Enter exactly 9 digits." } : {}),
                ...(!w9 && !/^[A-Za-z0-9-]{4,20}$/.test(d.tin) ? { tin: "Enter 4–20 letters, digits or dashes." } : {})
            }),
            confirm: "Submit form",
            onSubmit: d => {
                state.tax[kind] = { name: d.name, last4: d.tin.slice(-4), submittedAt: new Date().toISOString() };
                notify(`${w9 ? "W-9" : "General tax form"} submitted.`);
                save(); toast("Tax form saved."); render();
            }
        });
    }

    /* ---------- Pages ---------- */
    const pages = {
        async home(main) {
            let earned = totalEarnings();
            if (window.Market && window.Market.auth.user) { await window.Market.init(); earned = window.Market.paidTotal(); }
            const hasPay = state.payments.length > 0;
            const hasTax = !!(state.tax.w9 || state.tax.general);
            main.append(
                pageHeader(`Welcome, ${userName()}!`, "Here are the latest updates for Outlier"),
                h("section", { class: "stats" },
                    stat("fa-dollar-sign", "Total Earnings", money(earned)),
                    stat("fa-list", "Tasks Completed", state.completed.length),
                    stat("fa-list-check", "Avg. Tasks per Week", avgPerWeek())));

            const open = CATALOG.filter(p => !isJoined(p.id));
            main.append(h("section", {}, h("h2", {}, "Projects"),
                open.length ? open.map(p => h("div", { class: "row-card" }, icon(p.icon, "tile"),
                    h("div", { class: "grow" }, h("h3", {}, p.name), h("p", {}, estimateText(p))),
                    h("button", { class: "btn", onclick: () => join(p.id) }, p.onboarding ? "Start Project Onboarding" : "Join project")))
                    : empty("fa-circle-check", "You've joined every project", "Check back later for new projects.")));

            const todos = [];
            if (!hasPay) todos.push(["fa-piggy-bank", "Setup Banking", "Connect a payment method to receive payments for completed projects.", "setup-banking.html", "Setup Banking"]);
            if (!hasTax) todos.push(["fa-file-invoice", "Submit tax documents", "A tax form is required before you can be paid.", "setup-banking.html#tax", "Submit form"]);
            if (!state.joined.length) todos.push(["fa-clipboard-list", "Join a project", "Pick a project to start earning.", "tasks.html", "Browse projects"]);
            main.append(h("section", {}, h("h2", {}, `Todos (${todos.length})`),
                todos.length ? todos.map(t => h("div", { class: "row-card" }, icon(t[0], "tile"),
                    h("div", { class: "grow" }, h("h3", {}, t[1]), h("p", {}, t[2])), linkBtn(t[3], t[4])))
                    : empty("fa-circle-check", "All done", "You have no outstanding todos.")));
        },

        tasks(main) {
            main.append(pageHeader("Your Projects", "Manage and track your ongoing and available projects"));
            const tabs = h("div", { class: "tabs", role: "tablist" });
            const body = h("div", {});
            let active = new URLSearchParams(location.search).get("tab") === "available" ? "available" : "current";
            function paint() {
                tabs.replaceChildren(...[["current", "Current Projects"], ["available", "Available Projects"]].map(([k, l]) =>
                    h("button", { class: "tab-link" + (k === active ? " active" : ""), role: "tab", "aria-selected": k === active, onclick: () => { active = k; paint(); } }, l)));
                const list = CATALOG.filter(p => (k => k ? isJoined(p.id) : !isJoined(p.id))(active === "current"));
                body.replaceChildren(list.length ? h("div", { class: "grid" }, list.map(p => h("article", { class: "project-item" },
                    icon(p.icon, "big"), h("h3", {}, p.name), h("p", {}, estimateText(p)),
                    h("div", { class: "actions" },
                        active === "current"
                            ? [h("button", { class: "btn", disabled: tasksLeft(p) === 0, onclick: () => logTask(p.id) }, "Log task"),
                               h("button", { class: "btn secondary", onclick: () => leave(p.id) }, "Leave")]
                            : h("button", { class: "btn", onclick: () => join(p.id) }, p.onboarding ? "Start onboarding" : "Join project")))))
                    : active === "current"
                        ? empty("fa-folder-open", "No current projects", "Join a project to start working.", h("button", { class: "btn", onclick: () => { active = "available"; paint(); } }, "Browse available projects"))
                        : empty("fa-circle-check", "No more projects available", "You've joined every project right now."));
            }
            paint();
            main.append(tabs, body);
        },

        completed(main) {
            main.append(pageHeader("Completed Tasks", "Review your completed tasks."));
            if (!state.completed.length) {
                main.append(empty("fa-clipboard", "No completed tasks yet", "Tasks you log in a project will appear here.", linkBtn("tasks.html", "Go to Tasks")));
                return;
            }
            let q = "", sort = "new";
            const search = h("input", { type: "search", placeholder: "Search by project or note…", "aria-label": "Search completed tasks", oninput: e => { q = e.target.value.toLowerCase(); paint(); } });
            const sel = h("select", { "aria-label": "Sort", onchange: e => { sort = e.target.value; paint(); } },
                [["new", "Newest first"], ["old", "Oldest first"], ["time", "Longest time"]].map(([v, l]) => h("option", { value: v }, l)));
            const wrap = h("div", {});
            function paint() {
                let rows = state.completed.filter(c => (c.projectName + " " + c.note).toLowerCase().includes(q));
                rows = rows.sort((a, b) => sort === "time" ? b.minutes - a.minutes : sort === "old" ? +new Date(a.completedAt) - +new Date(b.completedAt) : +new Date(b.completedAt) - +new Date(a.completedAt));
                wrap.replaceChildren(rows.length ? h("div", { class: "table-wrap" }, h("table", {},
                    h("thead", {}, h("tr", {}, ["Project", "Date completed", "Time spent", "Note", ""].map(t => h("th", { scope: "col" }, t)))),
                    h("tbody", {}, rows.map(c => h("tr", {},
                        h("td", {}, c.projectName), h("td", {}, fmtDate(c.completedAt)), h("td", {}, c.minutes + " min"), h("td", {}, c.note || "—"),
                        h("td", {}, h("button", { class: "link-btn danger-text", "aria-label": "Delete entry", onclick: () => removeEntry(c.id) }, icon("fa-trash"))))))))
                    : empty("fa-magnifying-glass", "No matches", "Try a different search."));
            }
            main.append(h("div", { class: "toolbar" }, search, sel), wrap);
            paint();
        },

        earnings(main) {
            const mins = state.completed.reduce((s, c) => s + c.minutes, 0);
            main.append(pageHeader("Your Earnings", "Track your earnings and payouts."),
                h("section", { class: "stats" },
                    stat("fa-dollar-sign", "Total Earnings", money(totalEarnings())),
                    stat("fa-list", "Tasks Completed", state.completed.length),
                    stat("fa-clock", "Time Logged", mins >= 60 ? `${(mins / 60).toFixed(1)} h` : `${mins} min`)),
                h("section", {}, h("h2", {}, "Payment method"),
                    state.payments.length
                        ? state.payments.map(p => h("div", { class: "row-card" }, icon(p.type === "bank" ? "fa-university" : p.type === "paypal" ? "fa-brands fa-paypal" : "fa-wallet", "tile"),
                            h("div", { class: "grow" }, h("h3", {}, p.label), h("p", {}, "Added " + fmtDate(p.addedAt))), linkBtn("setup-banking.html", "Manage", "secondary")))
                        : empty("fa-piggy-bank", "No payment method", "Add one to receive payouts.", linkBtn("setup-banking.html", "Setup Banking"))),
                h("section", {}, h("h2", {}, "Past Earnings"),
                    empty("fa-receipt", "No payouts yet", "Payouts are issued by Outlier once reviewed tasks are approved. They will be listed here.")));
        },

        learn(main) {
            main.append(pageHeader("Learn Skills", "How Outlier works."),
                h("section", { class: "content-box" }, h("h2", {}, "Navigation in Outlier"),
                    h("p", {}, "The sidebar lets you move between sections:"),
                    h("ul", {}, [["Home", "Overview of projects, earnings and todos."], ["Tasks", "Join projects and log work."], ["Completed Tasks", "Review finished assignments."], ["Earnings", "Track payments and payouts."], ["Learn Skills", "Guides on using Outlier."]]
                        .map(([a, b]) => h("li", {}, h("strong", {}, a + ": "), b)))),
                h("section", { class: "content-box" }, h("h2", {}, "How to work on Outlier"),
                    h("ol", {}, [["Browse available projects", "Open Tasks and join a project."], ["Complete assignments", "Follow the instructions carefully."], ["Log your work", "Record each finished task with the time it took."], ["Monitor completed tasks", "Check your history in Completed Tasks."], ["Set up payment", "Add a payment method and tax form in Setup Banking."]]
                        .map(([a, b]) => h("li", {}, h("strong", {}, a + ": "), b)))));
        },

        banking(main) {
            const A = (type, ic, name, desc) => {
                const cur = state.payments.find(p => p.type === type);
                return h("div", { class: "row-card" }, icon(ic, "tile"),
                    h("div", { class: "grow" }, h("h3", {}, name), h("p", {}, cur ? cur.label : desc), cur ? h("span", { class: "pill ok" }, "Connected") : null),
                    cur ? [h("button", { class: "btn secondary", onclick: () => addPayment(type) }, "Replace"), h("button", { class: "btn secondary danger-text", onclick: () => removePayment(cur.id) }, "Remove")]
                        : h("button", { class: "btn", onclick: () => addPayment(type) }, `Add ${name}`));
            };
            const T = (kind, ic, name, desc, btn) => {
                const cur = state.tax[kind];
                return h("div", { class: "row-card" }, icon(ic, "tile"),
                    h("div", { class: "grow" }, h("h3", {}, name), h("p", {}, cur ? `Submitted ${fmtDate(cur.submittedAt)} by ${cur.name} (ID ••••${cur.last4})` : desc), cur ? h("span", { class: "pill ok" }, "Submitted") : null),
                    h("button", { class: "btn" + (cur ? " secondary" : ""), onclick: () => submitTax(kind) }, cur ? "Update" : btn));
            };
            main.append(pageHeader("Setup Banking", "Select and add your preferred payment method to receive payments for completed projects."),
                h("div", { class: "banner info" }, "Heads up: this app has no server yet. Payment and tax details you enter are kept in this browser only (account and tax ID numbers are reduced to their last 4 digits)."),
                h("section", {}, h("h2", {}, "Payment methods"),
                    A("bank", "fa-university", "Bank Account", "Secure direct deposits to your bank account."),
                    A("paypal", "fa-brands fa-paypal", "PayPal", "Receive payments instantly via PayPal."),
                    A("airtm", "fa-wallet", "AirTM", "Flexible and global payment method.")),
                h("section", { id: "tax" }, h("h2", {}, "Tax Documents"),
                    h("p", { class: "muted" }, "To comply with tax regulations, all taskers must submit the required tax documents before receiving payments. Failure to submit these forms will result in non-payment."),
                    T("w9", "fa-file-invoice", "W-9 Form", "Required for U.S.-based freelancers.", "Submit W-9"),
                    T("general", "fa-file-contract", "General Tax Form", "Required for international freelancers.", "Submit Tax Form")));
        }
    };

    function stat(ic, label, value) {
        return h("div", { class: "stat-card" }, icon(ic), h("span", {}, label), h("div", { class: "value" }, String(value)));
    }

    async function render() {
        const page = document.body.dataset.page;
        if (window.Market) await window.Market.auth.ready();
        const main = buildShell(page === "banking" ? "home" : page);
        main.append(h("p", { class: "muted", id: "loading" }, "Loading…"));
        try {
            const scrollY = window.scrollY;
            const fresh = h("div", { class: "page-body" });
            await pages[page](fresh);
            main.querySelector("#loading")?.remove();
            main.append(fresh);
            window.scrollTo(0, scrollY);
        } catch (e) {
            console.error(e);
            main.querySelector("#loading")?.remove();
            main.append(empty("fa-triangle-exclamation", "Something went wrong", (e && e.message) || "The page could not be loaded.", h("button", { class: "btn", onclick: () => location.reload() }, "Reload")));
        }
        if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
    }

    window.Outlier = { userName, h, icon, openModal, confirmBox, toast, money, fmtDate, fmtTime, uid, notify, save, render, pages, empty, pageHeader, linkBtn, get state() { return state; } };

    document.addEventListener("DOMContentLoaded", () => { load(); render(); });
})();
