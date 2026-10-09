"use strict";

/* =====================================================
   GymOs · Panel de administración de gimnasio
   Los datos se guardan en el navegador (localStorage).
   ===================================================== */

/* ---------- 1. Utilidades ---------- */
const $ = (s, el = document) => el.querySelector(s);
const KEY = "gymos-data-v1";
const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const iso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const today = () => iso(new Date());
const addDays = (s, n) => { const d = new Date(s + "T00:00:00"); d.setDate(d.getDate() + n); return iso(d); };
const money = (n) => "$" + Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ---------- 2. Datos ---------- */
function seed() {
  const ago = (m, day = 10) => {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - m); d.setDate(day); return iso(d);
  };
  const memberships = [
    { id: "p1", name: "Mensual", price: 30, days: 30 },
    { id: "p2", name: "Trimestral", price: 80, days: 90 },
    { id: "p3", name: "Anual", price: 280, days: 365 },
  ];
  const names = ["Ana Gómez", "Luis Pérez", "María Torres", "Carlos Ruiz", "Sofía Díaz"];
  const members = names.map((name, i) => {
    const start = ago(i % 3, 5 + i);
    return { id: uid(), name, phone: "300 000 00" + i + i, membershipId: memberships[i % 3].id, start, end: addDays(start, memberships[i % 3].days) };
  });
  const transactions = [];
  for (let i = 0; i < 8; i++) {
    transactions.push({ id: uid(), date: ago(i, 12), concept: "Ventas del mes", amount: 2500 + ((i * 1373) % 4000) });
  }
  const t1 = { id: uid(), name: "Ana", specialty: "Funcional", phone: "311 111 11 11" };
  const t2 = { id: uid(), name: "Pedro", specialty: "Pesas", phone: "322 222 22 22" };
  return {
    settings: { gym: "Downtown Fitness", target: 20000 },
    memberships, members, transactions,
    trainers: [t1, t2],
    classes: [
      { id: uid(), name: "Spinning", trainerId: t1.id, day: "Lunes", time: "07:00", capacity: 20 },
      { id: uid(), name: "Crossfit", trainerId: t2.id, day: "Miércoles", time: "18:30", capacity: 15 },
    ],
    inventory: [
      { id: uid(), name: "Botella de agua", price: 2, stock: 40 },
      { id: uid(), name: "Proteína (porción)", price: 4.5, stock: 25 },
      { id: uid(), name: "Toalla", price: 8, stock: 10 },
    ],
    attendance: [],
  };
}

let db = JSON.parse(localStorage.getItem(KEY) || "null");
if (!db) { db = seed(); save(); }
function save() { localStorage.setItem(KEY, JSON.stringify(db)); }

const byId = (list, id) => db[list].find((x) => x.id === id);
const isActive = (m) => m.end >= today();
const sumSales = (filterFn) => db.transactions.filter(filterFn).reduce((a, t) => a + Number(t.amount), 0);

/* ---------- 3. Módulos con tabla (miembros, clases, etc.) ---------- */
const MODULES = {
  members: {
    title: "Miembros", single: "miembro", requires: "memberships",
    fields: [
      { key: "name", label: "Nombre completo", type: "text" },
      { key: "phone", label: "Teléfono", type: "text" },
      { key: "membershipId", label: "Membresía", type: "select", options: () => db.memberships.map((m) => ({ value: m.id, label: `${m.name} (${money(m.price)})` })) },
    ],
    cols: [
      ["Nombre", (r) => esc(r.name)],
      ["Teléfono", (r) => esc(r.phone)],
      ["Membresía", (r) => esc(byId("memberships", r.membershipId)?.name || "—")],
      ["Vence", (r) => r.end],
      ["Estado", (r) => (isActive(r) ? '<span class="badge ok">Activo</span>' : '<span class="badge off">Vencido</span>')],
    ],
    extra: [{ id: "renew", label: "Renovar" }],
    beforeSave(o) {
      const m = byId("memberships", o.membershipId);
      o.start = today(); o.end = addDays(o.start, m.days);
    },
    afterSave(o) {
      const m = byId("memberships", o.membershipId);
      db.transactions.push({ id: uid(), date: today(), concept: `Membresía ${m.name} · ${o.name}`, amount: m.price });
    },
  },
  memberships: {
    title: "Membresías", single: "membresía",
    fields: [
      { key: "name", label: "Nombre", type: "text" },
      { key: "price", label: "Precio", type: "number" },
      { key: "days", label: "Duración (días)", type: "number" },
    ],
    cols: [["Nombre", (r) => esc(r.name)], ["Precio", (r) => money(r.price)], ["Duración", (r) => r.days + " días"]],
  },
  trainers: {
    title: "Entrenadores", single: "entrenador",
    fields: [
      { key: "name", label: "Nombre", type: "text" },
      { key: "specialty", label: "Especialidad", type: "text" },
      { key: "phone", label: "Teléfono", type: "text" },
    ],
    cols: [["Nombre", (r) => esc(r.name)], ["Especialidad", (r) => esc(r.specialty)], ["Teléfono", (r) => esc(r.phone)]],
  },
  classes: {
    title: "Clases", single: "clase", requires: "trainers",
    fields: [
      { key: "name", label: "Nombre de la clase", type: "text" },
      { key: "trainerId", label: "Entrenador", type: "select", options: () => db.trainers.map((t) => ({ value: t.id, label: t.name })) },
      { key: "day", label: "Día", type: "select", options: () => DAYS.map((d) => ({ value: d, label: d })) },
      { key: "time", label: "Hora", type: "time" },
      { key: "capacity", label: "Cupo", type: "number" },
    ],
    cols: [
      ["Clase", (r) => esc(r.name)],
      ["Entrenador", (r) => esc(byId("trainers", r.trainerId)?.name || "—")],
      ["Día", (r) => r.day], ["Hora", (r) => r.time], ["Cupo", (r) => r.capacity],
    ],
  },
  inventory: {
    title: "Inventario", single: "producto",
    fields: [
      { key: "name", label: "Producto", type: "text" },
      { key: "price", label: "Precio", type: "number" },
      { key: "stock", label: "Cantidad en stock", type: "number" },
    ],
    cols: [
      ["Producto", (r) => esc(r.name)],
      ["Precio", (r) => money(r.price)],
      ["Stock", (r) => (r.stock < 5 ? `<span class="badge warn">${r.stock} · bajo</span>` : r.stock)],
    ],
  },
  transactions: {
    title: "Transacciones", single: "transacción",
    fields: [
      { key: "concept", label: "Concepto", type: "text" },
      { key: "amount", label: "Monto", type: "number" },
    ],
    cols: [["Fecha", (r) => r.date], ["Concepto", (r) => esc(r.concept)], ["Monto", (r) => money(r.amount)]],
    beforeSave(o) { o.date = today(); },
  },
};

function tablePage(key) {
  const m = MODULES[key];
  const rows = [...db[key]];
  if (key === "transactions") rows.sort((a, b) => b.date.localeCompare(a.date));
  const head = m.cols.map((c) => `<th>${c[0]}</th>`).join("");
  const body = rows.length
    ? rows.map((r) => `<tr>${m.cols.map((c) => `<td>${c[1](r)}</td>`).join("")}
        <td class="actions">
          ${(m.extra || []).map((a) => `<button class="btn ghost sm" data-act="${a.id}" data-key="${key}" data-id="${r.id}">${a.label}</button>`).join("")}
          <button class="btn danger sm" data-del="${key}" data-id="${r.id}">Eliminar</button>
        </td></tr>`).join("")
    : `<tr><td colspan="${m.cols.length + 1}" class="empty">Aún no hay registros. Usa el botón “Agregar”.</td></tr>`;
  return `
    <div class="page-head"><h1>${m.title}</h1><button class="btn" data-new="${key}">+ Agregar ${m.single}</button></div>
    <div class="card table-wrap"><table><thead><tr>${head}<th></th></tr></thead><tbody>${body}</tbody></table></div>`;
}

function fieldHTML(f) {
  const input = f.type === "select"
    ? `<select name="${f.key}" required>${f.options().map((o) => `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join("")}</select>`
    : `<input name="${f.key}" type="${f.type}" required ${f.type === "number" ? 'min="0" step="any"' : ""}>`;
  return `<label>${f.label}${input}</label>`;
}

function openForm(key) {
  const m = MODULES[key];
  if (m.requires && !db[m.requires].length) {
    alert(`Primero agrega al menos un registro en "${MODULES[m.requires].title}".`);
    return;
  }
  const dlg = $("#modal");
  dlg.innerHTML = `
    <form id="f"><h2>Agregar ${m.single}</h2>
      ${m.fields.map(fieldHTML).join("")}
      <div class="form-actions">
        <button type="button" class="btn ghost" data-close>Cancelar</button>
        <button class="btn">Guardar</button>
      </div>
    </form>`;
  $("#f").onsubmit = (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    const o = { id: uid() };
    m.fields.forEach((f) => { const v = data.get(f.key); o[f.key] = f.type === "number" ? Number(v) : v; });
    m.beforeSave?.(o);
    db[key].push(o);
    m.afterSave?.(o);
    save(); dlg.close(); render();
  };
  dlg.showModal();
}

/* ---------- 4. Panel principal (dashboard) ---------- */
function dashboardPage() {
  const now = new Date();
  const ym = today().slice(0, 7);
  const monthSales = sumSales((t) => t.date.slice(0, 7) === ym);
  const todaySales = sumSales((t) => t.date === today());
  const target = Number(db.settings.target) || 1;
  const pct = Math.min(100, (monthSales / target) * 100);
  const todayName = DAYS[now.getDay()];

  const stats = [
    ["👥", "Miembros totales", db.members.length],
    ["✅", "Suscripciones activas", db.members.filter(isActive).length],
    ["🏋️", "Entrenadores", db.trainers.length],
    ["📅", "Clases hoy", db.classes.filter((c) => c.day === todayName).length],
    ["💲", "Ventas del mes", money(monthSales)],
  ].map(([i, l, v]) => `<div class="stat"><div class="ico">${i}</div><small>${l}</small><strong>${v}</strong></div>`).join("");

  // Ventas por mes del año actual
  const year = String(now.getFullYear());
  const vals = MONTHS.map((_, i) => sumSales((t) => t.date.slice(0, 7) === `${year}-${String(i + 1).padStart(2, "0")}`));
  const max = Math.max(...vals, 1);
  const bars = vals.map((v, i) => `
    <div class="bar-col">
      <div class="bar-area"><div class="bar" style="height:${(v / max) * 100}%" title="${MONTHS[i]}: ${money(v)}"></div></div>
      <span>${MONTHS[i]}</span>
    </div>`).join("");

  return `
    <h1 style="margin-bottom:24px">Panel de administración</h1>
    <div class="stats">${stats}</div>
    <div class="charts">
      <div class="card">
        <h3>Meta mensual</h3><small>Meta que definiste para este mes</small>
        <svg viewBox="0 0 220 125" class="gauge" role="img" aria-label="Avance de la meta mensual">
          <path class="g-bg" d="M20 110 A90 90 0 0 1 200 110" pathLength="100"/>
          <path class="g-fg" d="M20 110 A90 90 0 0 1 200 110" pathLength="100" stroke-dasharray="${pct} 100"/>
          <text x="110" y="100">${pct.toFixed(2)}%</text>
        </svg>
        <p class="gauge-msg">Hoy ingresaste ${money(todaySales)}.</p>
        <div class="gauge-foot">
          <div><small>Meta</small><strong>${money(target)}</strong></div>
          <div><small>Ingresos del mes</small><strong>${money(monthSales)}</strong></div>
          <div><small>Hoy</small><strong>${money(todaySales)}</strong></div>
        </div>
      </div>
      <div class="card">
        <h3>Ventas mensuales (${year})</h3>
        <div class="bars">${bars}</div>
      </div>
    </div>
    <div class="card">
      <h3>Miembros y suscripciones</h3><small>Tendencia de los últimos 6 meses</small>
      ${membersChart(now)}
    </div>`;
}

function membersChart(now) {
  const series = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    const end = i === 0 ? today() : iso(d);
    series.push({
      label: MONTHS[d.getMonth()],
      total: db.members.filter((m) => m.start <= end).length,
      active: db.members.filter((m) => m.start <= end && m.end >= end).length,
    });
  }
  const max = Math.max(...series.map((s) => s.total), 1);
  const x = (i) => 40 + i * 104;
  const y = (v) => 160 - (v / max) * 130;
  const line = (k, color) => {
    const pts = series.map((s, i) => `${x(i)},${y(s[k])}`).join(" ");
    const dots = series.map((s, i) => `<circle cx="${x(i)}" cy="${y(s[k])}" r="4" fill="${color}"><title>${s.label}: ${s[k]}</title></circle>`).join("");
    return `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2.5"/>${dots}`;
  };
  const labels = series.map((s, i) => `<text x="${x(i)}" y="190">${s.label}</text>`).join("");
  return `
    <div class="legend"><span><i style="background:#ffc20e"></i>Miembros totales</span><span><i style="background:#8bf04a"></i>Suscripciones activas</span></div>
    <svg viewBox="0 0 600 200" class="line-chart" role="img" aria-label="Miembros y suscripciones por mes">
      <line x1="20" y1="160" x2="580" y2="160" stroke="#262628"/>
      ${line("total", "#ffc20e")}${line("active", "#8bf04a")}${labels}
    </svg>`;
}

/* ---------- 5. Asistencia ---------- */
function attendancePage() {
  const list = db.attendance.filter((a) => a.date === today()).reverse();
  const options = db.members.map((m) => `<option value="${m.id}">${esc(m.name)}</option>`).join("");
  const rows = list.length
    ? list.map((a) => `<tr><td>${esc(byId("members", a.memberId)?.name || "Miembro eliminado")}</td><td>${a.time}</td></tr>`).join("")
    : `<tr><td colspan="2" class="empty">Nadie ha entrado hoy.</td></tr>`;
  return `
    <div class="page-head"><h1>Asistencia</h1></div>
    <div class="card">
      ${db.members.length
        ? `<form id="checkin" class="inline"><select name="member" required>${options}</select><button class="btn">Registrar entrada</button></form>`
        : '<p class="empty">Agrega miembros para registrar su asistencia.</p>'}
    </div>
    <div class="card table-wrap">
      <h3>Entradas de hoy (${list.length})</h3>
      <table><thead><tr><th>Miembro</th><th>Hora</th></tr></thead><tbody>${rows}</tbody></table>
    </div>`;
}

/* ---------- 6. Punto de venta (POS) ---------- */
let cart = [];

function posPage() {
  const total = cart.reduce((a, c) => a + c.price * c.qty, 0);
  const products = db.inventory.length
    ? db.inventory.map((p) => `
        <button class="product" data-add="${p.id}" ${p.stock < 1 ? "disabled" : ""}>
          <strong>${esc(p.name)}</strong><span>${money(p.price)}</span><small>Stock: ${p.stock}</small>
        </button>`).join("")
    : '<p class="empty">Agrega productos en Inventario para venderlos aquí.</p>';
  const items = cart.length
    ? cart.map((c) => `
        <div class="cart-row"><span>${esc(c.name)} × ${c.qty}</span><span>${money(c.price * c.qty)}</span>
        <button class="btn danger sm" data-rm="${c.id}" aria-label="Quitar ${esc(c.name)}">✕</button></div>`).join("")
    : '<p class="empty">Selecciona productos para vender.</p>';
  return `
    <div class="page-head"><h1>Punto de venta</h1></div>
    <div class="pos">
      <div class="products">${products}</div>
      <div class="card cart">
        <h3>Carrito</h3>${items}
        <div class="cart-total"><span>Total</span><strong>${money(total)}</strong></div>
        <button class="btn" data-pay ${cart.length ? "" : "disabled"}>Cobrar</button>
      </div>
    </div>`;
}

/* ---------- 7. Configuración ---------- */
function settingsPage() {
  return `
    <div class="page-head"><h1>Configuración</h1></div>
    <div class="card" style="max-width:480px">
      <form id="settings">
        <label>Nombre del gimnasio<input name="gym" value="${esc(db.settings.gym)}" required></label>
        <label>Meta de ventas mensual<input name="target" type="number" min="1" step="any" value="${db.settings.target}" required></label>
        <button class="btn">Guardar cambios</button>
      </form>
    </div>
    <div class="card" style="max-width:480px">
      <h3>Restablecer datos</h3>
      <small>Borra todo lo que agregaste y vuelve a los datos de ejemplo.</small><br><br>
      <button class="btn danger" data-reset>Restablecer</button>
    </div>`;
}

/* ---------- 8. Navegación ---------- */
const PAGES = { dashboard: dashboardPage, pos: posPage, attendance: attendancePage, settings: settingsPage };

function render() {
  const page = location.hash.slice(1) || "dashboard";
  const fn = PAGES[page] || (MODULES[page] ? () => tablePage(page) : dashboardPage);
  $("#view").innerHTML = fn();
  document.querySelectorAll("nav a").forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + page));
  $("#gymName").textContent = db.settings.gym;
}

/* ---------- 9. Eventos (clics y formularios) ---------- */
document.addEventListener("click", (e) => {
  const el = e.target.closest("button");
  if (!el) return;
  const d = el.dataset;

  if (d.new) return openForm(d.new);
  if (el.hasAttribute("data-close")) return $("#modal").close();

  if (d.del) {
    if (!confirm("¿Eliminar este registro?")) return;
    db[d.del] = db[d.del].filter((x) => x.id !== d.id);
    save(); return render();
  }

  if (d.act === "renew") {
    const mem = byId("members", d.id);
    const plan = byId("memberships", mem.membershipId);
    if (!plan) return alert("Esta membresía ya no existe. Edita al miembro con otra membresía.");
    mem.start = today(); mem.end = addDays(today(), plan.days);
    db.transactions.push({ id: uid(), date: today(), concept: `Renovación ${plan.name} · ${mem.name}`, amount: plan.price });
    save(); return render();
  }

  if (d.add) {
    const p = byId("inventory", d.add);
    const line = cart.find((c) => c.id === p.id);
    if ((line?.qty || 0) >= p.stock) return;
    line ? line.qty++ : cart.push({ id: p.id, name: p.name, price: p.price, qty: 1 });
    return render();
  }

  if (d.rm) { cart = cart.filter((c) => c.id !== d.rm); return render(); }

  if (el.hasAttribute("data-pay")) {
    cart.forEach((c) => { const p = byId("inventory", c.id); if (p) p.stock -= c.qty; });
    db.transactions.push({
      id: uid(), date: today(),
      concept: "Venta POS: " + cart.map((c) => `${c.name} ×${c.qty}`).join(", "),
      amount: cart.reduce((a, c) => a + c.price * c.qty, 0),
    });
    cart = []; save(); return render();
  }

  if (el.hasAttribute("data-reset")) {
    if (!confirm("¿Seguro? Se borrarán todos tus datos.")) return;
    localStorage.removeItem(KEY); location.hash = ""; location.reload();
  }
});

document.addEventListener("submit", (e) => {
  if (e.target.id === "checkin") {
    e.preventDefault();
    const member = byId("members", new FormData(e.target).get("member"));
    if (!isActive(member)) return alert(`La membresía de ${member.name} está vencida. Renuévala en Miembros.`);
    db.attendance.push({ id: uid(), memberId: member.id, date: today(), time: new Date().toTimeString().slice(0, 5) });
    save(); render();
  }
  if (e.target.id === "settings") {
    e.preventDefault();
    const data = new FormData(e.target);
    db.settings.gym = data.get("gym");
    db.settings.target = Number(data.get("target"));
    save(); render();
  }
});

window.addEventListener("hashchange", render);
render();
