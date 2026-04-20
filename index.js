require('dotenv').config();
const express = require("express");
const path = require("path");
const morgan = require("morgan");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { body, validationResult } = require("express-validator");
const session = require("express-session");
const flash = require("connect-flash");
const bcrypt = require("bcryptjs");
const sequelize = require("./db");
const Person = require("./models/Person");

const app = express();
const PORT = process.env.PORT || 3005;
const ENV = process.env.NODE_ENV || 'development';

// ─── SEGURIDAD: Cabeceras HTTP ───────────────────────────────────────────────
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "https://fonts.googleapis.com", "'unsafe-inline'"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            scriptSrcAttr: ["'unsafe-inline'"], // Permite onchange, onclick en atributos HTML
            imgSrc: ["'self'"]
        }
    }
}));
app.disable("x-powered-by");

// ─── RATE LIMITING ────────────────────────────────────────────────────────────
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Demasiadas peticiones. Inténtalo más tarde." }
});
const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 60,
    message: { error: "Límite de peticiones a la API superado." }
});
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10, // solo 10 intentos de login por IP cada 15 minutos
    message: "Demasiados intentos de inicio de sesión. Espera 15 minutos."
});

app.use(limiter);

// ─── MIDDLEWARE GENERAL ──────────────────────────────────────────────────────
app.use(morgan(ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false }));

// ─── SESIONES ────────────────────────────────────────────────────────────────
app.use(session({
    secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,       // No accesible desde JS del cliente
        secure: ENV === 'production', // Solo HTTPS en producción
        maxAge: 8 * 60 * 60 * 1000  // 8 horas
    }
}));
app.use(flash());

// ─── CONF. DE VISTAS ─────────────────────────────────────────────────────────
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ─── MIDDLEWARE DE AUTENTICACIÓN ─────────────────────────────────────────────
function requireAuth(req, res, next) {
    if (req.session.authenticated) return next();
    res.redirect("/lista/login");
}

// ─── ROUTER /lista ────────────────────────────────────────────────────────────
const listaRouter = express.Router();
listaRouter.use(express.static(path.join(__dirname, "public")));

// GET Login
listaRouter.get("/login", (req, res) => {
    if (req.session.authenticated) return res.redirect("/lista");
    res.render("login", { error: req.flash("error") });
});

// POST Login
listaRouter.post("/login", loginLimiter, async (req, res) => {
    const { username, password } = req.body;

    // Validación básica
    if (!username || !password) {
        req.flash("error", "Usuario y contraseña son obligatorios.");
        return res.redirect("/lista/login");
    }

    // Cargamos usuarios del .env
    const users = loadUsersFromEnv();
    console.log("Usuarios cargados:", users.map(u => u.username));
    const user = users.find(u => u.username === username.trim());
    console.log(`Intentando login para: "${username}"`);
    if (!user) {
        console.log("Usuario no encontrado en .env");
        req.flash("error", "Usuario o contraseña incorrectos.");
        return res.redirect("/lista/login");
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    console.log("¿Coincide la contraseña?:", isMatch);

    if (!isMatch) {
        req.flash("error", "Usuario o contraseña incorrectos.");
        return res.redirect("/lista/login");
    }

    req.session.authenticated = true;
    req.session.username = user.username;
    res.redirect("/lista");
});

// POST Logout
listaRouter.post("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/lista/login");
    });
});

// GET Lista (protegida)
listaRouter.get("/", requireAuth, async (req, res) => {
    try {
        const people = await Person.findAll({ order: [['name', 'ASC']] });
        const attendeesCount = people.filter(p => p.present).length;
        res.render("index", { people, attendeesCount, username: req.session.username, error: null, success: req.flash("success") });
    } catch (error) {
        console.error("Error al obtener personas:", error.message);
        if (ENV === 'development') {
            const fallbackPeople = [
                { id: 999, name: "MODO DESARROLLO (Sin DB)", present: false },
                { id: 1000, name: "Ejemplo Estático 1", present: true },
            ];
            return res.render("index", { people: fallbackPeople, attendeesCount: 1, username: req.session.username, error: "Sin DB", success: [] });
        }
        res.status(500).send("Error del servidor");
    }
});

// POST Añadir persona (protegida)
listaRouter.post(
    "/add-person",
    requireAuth,
    apiLimiter,
    body("name").trim().notEmpty().withMessage("El nombre no puede estar vacío").isLength({ max: 100 }).escape(),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            req.flash("error_add", errors.array()[0].msg);
            return res.redirect("/lista");
        }
        try {
            await Person.create({ name: req.body.name, present: false });
            req.flash("success", `"${req.body.name}" añadido correctamente.`);
        } catch (err) {
            console.error("Error añadiendo persona:", err.message);
            req.flash("error_add", "Error al guardar en la base de datos.");
        }
        res.redirect("/lista");
    }
);

// POST Actualizar presencia (protegida)
listaRouter.post(
    "/update-presence",
    requireAuth,
    apiLimiter,
    body("id").isInt({ min: 1 }).withMessage("ID inválido"),
    body("present").isBoolean().withMessage("'present' debe ser booleano"),
    async (req, res) => {
        console.log("--> RECIBIDO UPDATE-PRESENCE:", req.body);
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log("--> ERROR DE VALIDACIÓN:", errors.array());
            return res.status(400).json({ success: false, errors: errors.array() });
        }
        const { id, present } = req.body;
        try {
            const [updatedRows] = await Person.update({ present }, { where: { id } });
            console.log("--> DB UPDATED ROWS:", updatedRows);
            if (updatedRows === 0) {
                // Verificar si de verdad no existe o si simplemente no cambió el valor
                const exist = await Person.count({ where: { id } });
                if (exist === 0) return res.status(404).json({ success: false, error: "Persona no encontrada" });
            }
            res.json({ success: true });
        } catch (error) {
            console.error("Error al actualizar presencia:", error.message);
            res.status(500).json({ success: false });
        }
    }
);

// DELETE Eliminar persona (protegida)
listaRouter.delete(
    "/delete-person/:id",
    requireAuth,
    apiLimiter,
    async (req, res) => {
        const id = parseInt(req.params.id);
        if (!Number.isInteger(id) || id < 1) {
            return res.status(400).json({ success: false, error: "ID inválido" });
        }
        try {
            const deleted = await Person.destroy({ where: { id } });
            if (deleted === 0) return res.status(404).json({ success: false, error: "Persona no encontrada" });
            res.json({ success: true });
        } catch (error) {
            console.error("Error al eliminar persona:", error.message);
            res.status(500).json({ success: false });
        }
    }
);

app.use("/lista", listaRouter);
app.get("/", (req, res) => res.redirect("/lista"));

// ─── 404 & ERROR HANDLER ──────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ error: { code: 404, message: "Not Found" } });
});
app.use((err, req, res, next) => {
    console.error("Error no controlado:", err.message);
    res.status(500).json({ error: "Error interno del servidor" });
});

// ─── HELPER: Leer usuarios del .env ──────────────────────────────────────────
function loadUsersFromEnv() {
    const users = [];
    let i = 1;
    while (process.env[`AUTH_USER_${i}`] && process.env[`AUTH_PASS_${i}`]) {
        users.push({
            username: process.env[`AUTH_USER_${i}`],
            passwordHash: process.env[`AUTH_PASS_${i}`]
        });
        i++;
    }
    return users;
}

// ─── INICIO ───────────────────────────────────────────────────────────────────
async function start() {
    try {
        await sequelize.authenticate();
        console.log(`Conexión a la base de datos establecida (${ENV}).`);
        await sequelize.sync();
    } catch (error) {
        console.error("CRITICAL: Error de conexión a la base de datos:", error.message);
        if (ENV === 'production') process.exit(1);
    }

    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Servidor iniciado en puerto ${PORT} en modo ${ENV}`);
    });
}

start();