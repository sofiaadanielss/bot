// server.js
import express from "express";
import fetch from "node-fetch"; // si usas Node >=18 puedes usar global fetch y eliminar esta dependencia
import fs from "fs/promises";
import path from "path";
import dotenv from "dotenv";

dotenv.config();
 
const PORT = process.env.PORT || 3000;
const DIRECT_LINE_SECRET = process.env.4nN1hSC0YEYTXNxqZfhbOqMPfqpv3k6TaRskl4NbyCl55Pk6mVSpJQQJ99BJAC4f1cMAArohAAABAZBS2MtI; // <-- guarda aquí tu secreto

if (!DIRECT_LINE_SECRET) {
  console.error("ERROR: define DIRECT_LINE_SECRET en tus variables de entorno.");
  process.exit(1);
}

const app = express();

// Servimos otros assets estáticos (css, imgs, js) directamente desde /public
app.use("/static", express.static(path.join(process.cwd(), "public")));

// Ruta que entrega tu HTML original reemplazando el placeholder por token temporal
app.get("/", async (req, res) => {
  try {
    // 1) Generar token desde Direct Line
    const tokenResp = await fetch("https://directline.botframework.com/v3/directline/tokens/generate", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${DIRECT_LINE_SECRET}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({}) // el endpoint acepta POST vacío
    });

    if (!tokenResp.ok) {
      const txt = await tokenResp.text();
      console.error("Error generando token Direct Line:", tokenResp.status, txt);
      return res.status(502).send("Error al generar token de Direct Line.");
    }

    const tokenJson = await tokenResp.json();
    const token = tokenJson.token;
    if (!token) {
      console.error("No se recibió token en la respuesta:", tokenJson);
      return res.status(502).send("Respuesta inválida del servicio Direct Line.");
    }

    // 2) Leer el HTML original (tu archivo) desde /public/index.html
    const htmlPath = path.join(process.cwd(), "public", "index.html");
    let html = await fs.readFile(htmlPath, "utf8");

    // 3) Reemplazar el placeholder s=YOUR_SECRET_HERE por s=<TOKEN>
    //    Buscamos exactamente la cadena YOUR_SECRET_HERE para no tocar otra cosa.
    const placeholder = "4nN1hSC0YEYTXNxqZfhbOqMPfqpv3k6TaRskl4NbyCl55Pk6mVSpJQQJ99BJAC4f1cMAArohAAABAZBS2MtI";
    if (html.includes(placeholder)) {
      // Reemplazo seguro (escape token no necesario aquí porque es parte de URL)
      const newSrc = `s=${token}`;
      html = html.replaceAll(placeholder, newSrc);
    } else {
      // Si no existe placeholder, intentamos buscar "s=YOUR_SECRET_HERE" dentro de iframe con comillas simples o dobles
      // Puedes ajustar según tu HTML real.
      console.warn("<iframe src='https://webchat.botframework.com/embed/MineBot-bot?s=4nN1hSC0YEYTXNxqZfhbOqMPfqpv3k6TaRskl4NbyCl55Pk6mVSpJQQJ99BJAC4f1cMAArohAAABAZBS2MtI'  style='min-width: 400px; width: 100%; min-height: 500px;'></iframe>");
    }

    // 4) Devolver HTML modificado al cliente (no se modifica el archivo en disco)
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);

  } catch (err) {
    console.error("Error en servidor:", err);
    res.status(500).send("Error interno del servidor.");
  }
});

// (Opcional) Endpoint que solo devuelve el token JSON si lo prefieres
app.get("/token", async (req, res) => {
  try {
    const tokenResp = await fetch("https://directline.botframework.com/v3/directline/tokens/generate", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${DIRECT_LINE_SECRET}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({})
    });
    const tokenJson = await tokenResp.json();
    res.json(tokenJson);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "no se pudo generar token" });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT} — Sirviendo HTML con token temporal.`);
});
