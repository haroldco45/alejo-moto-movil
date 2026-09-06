/* ============================================================
   ALEJO MOTO-MÃ“VIL â€” API de pedidos
   Vibras Positivas HM â€” Derechos de Autor Reservados
   Node + Express, almacenamiento en archivo JSON.
   Sin dependencias nativas: corre en cualquier Windows.
   ============================================================ */

const express = require('express');
const fs      = require('fs');
const path    = require('path');
const crypto  = require('crypto');

const CFG = require('./config.json');

const app  = express();
const DATA = path.join(__dirname, 'data', 'pedidos.json');
const LOG  = path.join(__dirname, 'data', 'acceso.log');

app.set('trust proxy', true);
app.disable('x-powered-by');
app.use(express.json({ limit: '64kb' }));

/* ---------- Almacenamiento ---------- */
function leer() {
  try { return JSON.parse(fs.readFileSync(DATA, 'utf8')); }
  catch { return { pedidos: [] }; }
}
function escribir(db) {
  const tmp = DATA + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DATA);          // escritura atÃ³mica: no se corrompe si se va la luz
}
function respaldoDiario() {
  const hoy = fechaCol();
  const dst = path.join(__dirname, 'data', `respaldo-${hoy}.json`);
  if (!fs.existsSync(dst) && fs.existsSync(DATA)) fs.copyFileSync(DATA, dst);
  // conservar solo los Ãºltimos 30 respaldos
  const viejos = fs.readdirSync(path.join(__dirname, 'data'))
    .filter(f => f.startsWith('respaldo-')).sort();
  while (viejos.length > 30) fs.unlinkSync(path.join(__dirname, 'data', viejos.shift()));
}

/* ---------- Fecha real de Colombia ---------- */
function fechaCol() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
}
function horaCol() {
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', hour12: true
  }).format(new Date());
}

/* ---------- CORS controlado ---------- */
app.use((req, res, next) => {
  const origen = req.headers.origin;
  if (!origen || CFG.origenesPermitidos.includes(origen)) {
    res.set('Access-Control-Allow-Origin', origen || '*');
  }
  res.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  res.set('Access-Control-Max-Age', '86400');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

/* ---------- Freno de abuso por IP ---------- */
const golpes = new Map();
function frenar(max, ventanaMs) {
  return (req, res, next) => {
    const ip = req.ip || 'x';
    const ahora = Date.now();
    const reg = golpes.get(ip) || { n: 0, desde: ahora };
    if (ahora - reg.desde > ventanaMs) { reg.n = 0; reg.desde = ahora; }
    reg.n++;
    golpes.set(ip, reg);
    if (reg.n > max) return res.status(429).json({ error: 'Demasiadas solicitudes. Espera un momento.' });
    next();
  };
}
setInterval(() => golpes.clear(), 30 * 60 * 1000);

/* ---------- Llave del panel ---------- */
function soloAlejo(req, res, next) {
  const k = req.headers['x-api-key'] || '';
  const a = Buffer.from(String(k));
  const b = Buffer.from(CFG.apiKey);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    fs.appendFileSync(LOG, `${new Date().toISOString()} RECHAZO ${req.ip} ${req.path}\n`);
    return res.status(401).json({ error: 'No autorizado' });
  }
  next();
}

/* ---------- Limpieza de texto ---------- */
const limpiar = (v, max = 200) => String(v == null ? '' : v).replace(/[\u0000-\u001F<>]/g, '').trim().slice(0, max);

/* ============================================================
   RUTAS
   ============================================================ */

// Salud del servicio
app.get('/api/estado', (req, res) => {
  res.json({ ok: true, servicio: 'alejo-api', fecha: fechaCol(), hora: horaCol() });
});

// El cliente manda su pedido  (pÃºblico, con freno)
app.post('/api/pedidos', frenar(12, 10 * 60 * 1000), (req, res) => {
  const b = req.body || {};
  if (!b.nombre || !b.telefono) return res.status(400).json({ error: 'Faltan nombre y telÃ©fono' });
  if (b.autoriza !== true)      return res.status(400).json({ error: 'Falta la autorizaciÃ³n de datos' });

  const pedido = {
    id: crypto.randomUUID(),
    fecha: fechaCol(),
    hora: horaCol(),
    recibido: new Date().toISOString(),
    nombre:    limpiar(b.nombre, 80),
    telefono:  limpiar(b.telefono, 20),
    direccion: limpiar(b.direccion, 160),
    moto:      limpiar(b.moto, 80),
    servicios: Array.isArray(b.servicios) ? b.servicios.slice(0, 12).map(s => limpiar(s, 60)) : [],
    estimado:  Number(b.estimado) || 0,
    notas:     limpiar(b.notas, 400),
    gps:       limpiar(b.gps, 200),
    estado:    'nuevo'
  };

  const db = leer();
  // evitar duplicados: mismo telÃ©fono en los Ãºltimos 3 minutos
  const repetido = db.pedidos.find(p =>
    p.telefono === pedido.telefono && (Date.now() - new Date(p.recibido)) < 180000);
  if (repetido) return res.json({ ok: true, id: repetido.id, duplicado: true });

  db.pedidos.unshift(pedido);
  if (db.pedidos.length > 2000) db.pedidos.length = 2000;
  escribir(db);
  respaldoDiario();

  console.log(`[${horaCol()}] PEDIDO de ${pedido.nombre} â€” ${pedido.servicios.join(', ')}`);
  res.json({ ok: true, id: pedido.id });
});

// Alejo consulta sus pedidos
app.get('/api/pedidos', soloAlejo, (req, res) => {
  const db = leer();
  const estado = req.query.estado;
  let lista = db.pedidos;
  if (estado) lista = lista.filter(p => p.estado === estado);
  res.json({ ok: true, total: lista.length, pedidos: lista.slice(0, 100) });
});

// Alejo marca el pedido como atendido o descartado
app.patch('/api/pedidos/:id', soloAlejo, (req, res) => {
  const nuevo = req.body && req.body.estado;
  if (!['nuevo', 'atendido', 'descartado'].includes(nuevo))
    return res.status(400).json({ error: 'Estado no vÃ¡lido' });

  const db = leer();
  const p = db.pedidos.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Pedido no encontrado' });
  p.estado = nuevo;
  p.actualizado = new Date().toISOString();
  escribir(db);
  res.json({ ok: true });
});

// SupresiÃ³n de datos personales (Ley 1581 de 2012)
app.post('/api/pedidos/:id/borrar', soloAlejo, (req, res) => {
  const db = leer();
  const antes = db.pedidos.length;
  db.pedidos = db.pedidos.filter(p => p.id !== req.params.id);
  escribir(db);
  res.json({ ok: true, borrados: antes - db.pedidos.length });
});

/* ============================================================
   LISTA DE PRECIOS  (una sola, en el servidor, para todos)
   ============================================================ */
const PRECIOS = path.join(__dirname, 'data', 'precios.json');
const PRECIOS_BASE = [
  { id: 's1',  n: 'Cambio de aceite',           v: 25000 },
  { id: 's2',  n: 'Engrasada general',          v: 30000 },
  { id: 's3',  n: 'Tensionada de cadena',       v: 15000 },
  { id: 's4',  n: 'Kit de arrastre',            v: 60000 },
  { id: 's5',  n: 'SincronizaciÃ³n',             v: 45000 },
  { id: 's6',  n: 'Frenos (pastillas/bandas)',  v: 35000 },
  { id: 's7',  n: 'Mantenimiento general',      v: 90000 },
  { id: 's8',  n: 'Varada o emergencia',        v: 40000 },
  { id: 's9',  n: 'RevisiÃ³n elÃ©ctrica',         v: 35000 },
  { id: 's10', n: 'Cambio de llanta',           v: 20000 }
];

function leerPrecios() {
  try { return JSON.parse(fs.readFileSync(PRECIOS, 'utf8')); }
  catch { return { servicios: PRECIOS_BASE, actualizado: null }; }
}
function escribirPrecios(d) {
  const tmp = PRECIOS + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(d, null, 2));
  fs.renameSync(tmp, PRECIOS);
}

// Cualquiera puede consultarlos: el cliente los ve en la app
app.get('/api/precios', (req, res) => {
  const d = leerPrecios();
  res.json({ ok: true, servicios: d.servicios, actualizado: d.actualizado });
});

// Solo Alejo los cambia
app.put('/api/precios', soloAlejo, (req, res) => {
  const lista = req.body && req.body.servicios;
  if (!Array.isArray(lista) || !lista.length)
    return res.status(400).json({ error: 'Lista de precios vacÃ­a o invÃ¡lida' });
  if (lista.length > 60)
    return res.status(400).json({ error: 'Demasiados servicios (mÃ¡ximo 60)' });

  const limpios = lista.map((s, i) => ({
    id: limpiar(s.id, 20) || ('s' + (i + 1)),
    n:  limpiar(s.n, 60)  || 'Servicio',
    v:  Math.max(0, Math.min(99999999, Number(s.v) || 0))
  }));

  escribirPrecios({ servicios: limpios, actualizado: new Date().toISOString() });
  console.log(`[${horaCol()}] PRECIOS actualizados (${limpios.length} servicios)`);
  res.json({ ok: true, total: limpios.length });
});

/* ---------- La app se sirve desde aquÃ­ tambiÃ©n ---------- */
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));
app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

app.listen(CFG.puerto, '0.0.0.0', () => {
  console.log(`
  ALEJO MOTO-MÃ“VIL â€” API de pedidos
  Escuchando en el puerto ${CFG.puerto}
  Datos en ${DATA}
  ${fechaCol()} ${horaCol()} (hora de Colombia)
  Vibras Positivas HM
  `);
});

