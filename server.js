const express = require("express");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const cors = require("cors");

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

const PORT = 3000;
const JWT_SECRET = "clave_super_secreta";

// --------------------
// Base de datos simulada
// --------------------

const users = [
  {
    id: 1,
    email: "nickyrosero159@gmail.com",
    password: "123456",
    role: "admin",
    refreshToken: null,
    codigo2FA: null
  },
  {
    id: 2,
    email: "vale.roserom23@gmail.com",
    password: "567890",
    role: "estudiante",
    refreshToken: null,
    codigo2FA: null
  }
];

// --------------------
// Configuración Gmail
// --------------------

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "nickyrosero159@gmail.com",
    pass: "qlzv nspy lalu njtb"
  }
});

// --------------------
// Generar código 2FA
// --------------------

function generarCodigo() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// --------------------
// LOGIN PASO 1
// --------------------

app.post("/login-paso1", async (req, res) => {

  if (!req.body) {
    return res.status(400).json({ message: "Body vacío" });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email y password requeridos" });
  }

  const user = users.find(
    (u) => u.email === email && u.password === password
  );

  if (!user) {
    return res.status(401).json({ message: "Credenciales incorrectas" });
  }

  const codigo = generarCodigo();
  user.codigo2FA = codigo;

  try {

    await transporter.sendMail({
      from: "Biblioteca",
      to: email,
      subject: "Código de verificación",
      text: `Tu código de acceso es: ${codigo}`
    });

    res.json({
      message: "Código enviado al correo"
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Error enviando correo"
    });

  }
});

// --------------------
// LOGIN PASO 2
// --------------------

app.post("/login-paso2", (req, res) => {

  if (!req.body) {
    return res.status(400).json({ message: "Body vacío" });
  }

  const { email, codigo } = req.body;

  if (!email || !codigo) {
    return res.status(400).json({
      message: "Email y código requeridos"
    });
  }

  const user = users.find((u) => u.email === email);

  if (!user || user.codigo2FA !== codigo) {
    return res.status(401).json({
      message: "Código inválido"
    });
  }

  const accessToken = jwt.sign(
    { id: user.id, role: user.role },
    JWT_SECRET,
    { expiresIn: "15s" }
  );

  const refreshToken = jwt.sign(
    { id: user.id },
    JWT_SECRET,
    { expiresIn: "1d" }
  );

  user.refreshToken = refreshToken;
  user.codigo2FA = null;

  res.json({
    accessToken,
    refreshToken
  });
});

// --------------------
// Middleware verificar token
// --------------------

function verificarToken(req, res, next) {

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      message: "Token requerido"
    });
  }

  const token = authHeader.split(" ")[1];

  try {

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;

    next();

  } catch (error) {

    return res.status(401).json({
      message: "Token inválido o expirado"
    });

  }
}

// --------------------
// Middleware verificar rol
// --------------------

function verificarRol(rol) {

  return (req, res, next) => {

    if (req.user.role !== rol) {

      return res.status(403).json({
        message: "Acceso denegado"
      });

    }

    next();
  };
}

// --------------------
// Ruta estudiante
// --------------------

app.get(
  "/mi-espacio",
  verificarToken,
  verificarRol("estudiante"),
  (req, res) => {

    res.json({
      librosPrestados: [
        "Clean Code",
        "Estructuras de Datos",
        "Algoritmos en JavaScript"
      ]
    });

  }
);

// --------------------
// Ruta admin
// --------------------

app.get(
  "/dashboard-admin",
  verificarToken,
  verificarRol("admin"),
  (req, res) => {

    res.json({
      inventario: [
        "Bases de Datos",
        "Redes",
        "Ingeniería de Software",
        "Inteligencia Artificial"
      ]
    });

  }
);

// --------------------
// Refresh Token
// --------------------

app.post("/refresh-token", (req, res) => {

  const { refreshToken } = req.body || {};

  if (!refreshToken) {
    return res.status(401).json({
      message: "Refresh token requerido"
    });
  }

  const user = users.find(
    (u) => u.refreshToken === refreshToken
  );

  if (!user) {
    return res.status(403).json({
      message: "Refresh token inválido"
    });
  }

  try {

    jwt.verify(refreshToken, JWT_SECRET);

    const newAccessToken = jwt.sign(
      { id: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: "15s" }
    );

    res.json({
      accessToken: newAccessToken
    });

  } catch (error) {

    res.status(403).json({
      message: "Refresh token expirado"
    });

  }

});

// --------------------

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});