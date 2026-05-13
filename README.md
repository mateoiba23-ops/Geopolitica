# 🌍 GEOPOLÍTICA — Colombia
## Simulador Geopolítico Persistente Multijugador

---

## ⚡ INSTALACIÓN EN TERMUX (Android)

### PASO 1: Instalar Termux
Descarga Termux desde F-Droid (NO desde Play Store — está desactualizado):
https://f-droid.org/en/packages/com.termux/

---

### PASO 2: Actualizar paquetes e instalar Node.js
```bash
pkg update && pkg upgrade -y
pkg install nodejs -y
pkg install git -y
```

Verificar instalación:
```bash
node --version
npm --version
```

---

### PASO 3: Copiar el proyecto
Opción A — Copiar archivos manualmente a Termux:
```bash
mkdir -p ~/geopolitica
cd ~/geopolitica
```
Luego copia todos los archivos del proyecto en esta carpeta.

Opción B — Usar git si tienes el repositorio:
```bash
git clone <URL_DEL_REPO> ~/geopolitica
cd ~/geopolitica
```

---

### PASO 4: Instalar dependencias
```bash
cd ~/geopolitica
npm install
```

Esto instala automáticamente:
- express (servidor web)
- bcryptjs (encriptación de contraseñas)
- cors (peticiones entre orígenes)
- uuid (IDs únicos)

---

### PASO 5: Iniciar el servidor
```bash
node backend/server.js
```

Deberías ver:
```
🌍 GEOPOLITICA SERVER RUNNING
📡 http://localhost:3000
🎮 Game is live!
```

---

### PASO 6: Acceder al juego
Abre el navegador en tu Android y ve a:
```
http://localhost:3000
```

**Cuenta admin por defecto:**
- Email: `admin@geopolitica.game`
- Contraseña: `admin2024!`

---

## 🌐 EXPONER EL SERVIDOR A INTERNET (Para que otros jueguen)

### Opción A: ngrok (Recomendado)
```bash
# Instalar ngrok
pkg install wget -y
wget https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-arm64.tgz
tar xf ngrok-v3-stable-linux-arm64.tgz
mv ngrok ~/bin/

# Autenticar (necesitas cuenta en ngrok.com - es gratis)
ngrok authtoken TU_TOKEN_AQUI

# Exponer el servidor
ngrok http 3000
```
ngrok te dará una URL pública como: `https://xxxx.ngrok.io`
Comparte esa URL con otros jugadores.

### Opción B: Cloudflare Tunnel (Sin cuenta ngrok)
```bash
pkg install cloudflared -y
cloudflared tunnel --url http://localhost:3000
```

### Opción C: LocalTunnel
```bash
npm install -g localtunnel
lt --port 3000
```

---

## 📁 ESTRUCTURA DEL PROYECTO

```
geopolitica/
├── backend/
│   ├── server.js              ← Servidor principal
│   ├── routes/
│   │   ├── auth.js            ← Login, registro, sesión
│   │   ├── player.js          ← Perfil, habilidades, notificaciones
│   │   ├── work.js            ← Sistema de trabajo y energía
│   │   ├── factory.js         ← Crear, mejorar, gestionar fábricas
│   │   ├── region.js          ← Departamentos de Colombia
│   │   ├── market.js          ← Mercado de recursos
│   │   ├── chat.js            ← Chat por canales
│   │   ├── economy.js         ← Estadísticas económicas globales
│   │   └── admin.js           ← Panel administrativo
│   ├── systems/
│   │   ├── scheduler.js       ← Tareas automáticas programadas
│   │   ├── energy_system.js   ← Regeneración de energía (cada 10min)
│   │   └── economy_engine.js  ← Distribución de oro (12PM diario)
│   ├── utils/
│   │   ├── db.js              ← Capa de persistencia JSON
│   │   ├── auth.js            ← Middleware de autenticación
│   │   ├── constants.js       ← Constantes del juego
│   │   ├── regions_data.js    ← Los 33 departamentos de Colombia
│   │   └── admin_init.js      ← Creación de cuenta admin
│   └── data/                  ← Archivos JSON (generados automáticamente)
│       ├── players.json
│       ├── factories.json
│       ├── regions.json
│       ├── market.json
│       ├── chats.json
│       ├── economy.json
│       └── sessions.json
├── frontend/
│   ├── index.html             ← Página principal (SPA)
│   ├── css/
│   │   ├── main.css           ← Estilos base y variables
│   │   ├── components.css     ← Componentes reutilizables
│   │   └── panels.css         ← Estilos específicos por panel
│   └── js/
│       ├── api.js             ← Cliente API (todas las llamadas)
│       ├── state.js           ← Estado global y formatters
│       ├── ui.js              ← Toast, modal, navegación
│       ├── app.js             ← Bootstrap y autenticación
│       └── panels/
│           ├── home.js        ← Panel inicio
│           ├── map.js         ← Mapa de Colombia
│           ├── profile.js     ← Perfil del jugador
│           ├── factories.js   ← Gestión de fábricas
│           ├── work.js        ← Panel de trabajo
│           ├── market.js      ← Mercado
│           ├── chat.js        ← Chat multicanal
│           └── economy.js     ← Economía global + almacén + notifs
└── package.json
```

---

## 🎮 SISTEMAS IMPLEMENTADOS

### ✅ Completamente funcionales:
- **Autenticación**: Registro, login, sesiones con token
- **33 departamentos de Colombia**: Todos con datos reales
- **Sistema de energía**: Regeneración automática cada 10 min según medicina de región
- **5 tipos de fábricas**: Oro, Petróleo, Mineral, Uranio, Diamantes
- **Sistema de trabajo**: Gastar energía → ganar dinero + XP
- **Sistema de niveles**: XP general + XP laboral
- **3 habilidades**: Fuerza, Educación, Aguante
- **Mercado**: Compra/venta con comisión del 5%
- **Almacenes**: Personal (limitado por Aguante) + por fábrica (por nivel)
- **Minería global**: Pool de 1,000,000 ⚱️ distribuido diariamente
- **Chat**: 4 canales (Global, Política, Economía, Guerra)
- **Impuestos**: Por región, sobre renta y salida de fábrica
- **Admin**: Cuenta especial con fábricas en todos los departamentos
- **Persistencia**: Todo en JSON local automáticamente

### 🔜 Para expandir (arquitectura lista):
- Diplomacia y alianzas
- Sistema de guerra
- Elecciones regionales
- Comercio internacional
- Chat privado
- Premium / monetización

---

## 🔧 COMANDOS ÚTILES

```bash
# Iniciar servidor
cd ~/geopolitica && node backend/server.js

# Iniciar en segundo plano
nohup node backend/server.js > game.log 2>&1 &

# Ver logs en tiempo real
tail -f game.log

# Ver procesos Node activos
ps aux | grep node

# Detener servidor en segundo plano
kill $(pgrep -f "node backend/server.js")

# Ver datos de jugadores
cat ~/geopolitica/backend/data/players.json | head -100

# Backup de datos
cp -r ~/geopolitica/backend/data ~/geopolitica/backup_$(date +%Y%m%d)
```

---

## ⚙️ CONFIGURACIÓN

Edita `backend/utils/constants.js` para ajustar:
- `DAILY_GOLD_POOL`: Pool diario de oro (default: 1,000,000)
- `ENERGY_REGEN_INTERVAL`: Intervalo de regeneración (default: 10 min)
- `WORK_ENERGY_COST`: Energía mínima por trabajo (default: 10)
- `MARKET_FEE`: Comisión del mercado (default: 5%)
- `FACTORY_TYPES`: Costos y stats de cada tipo de fábrica

---

## 🔐 SEGURIDAD

Para producción real, considera:
- Cambiar la contraseña del admin en `backend/utils/admin_init.js`
- Usar HTTPS (ngrok lo hace automáticamente)
- Hacer backup diario de `/backend/data/`
- Agregar rate limiting para prevenir spam

---

*GEOPOLÍTICA Colombia — Construido con Node.js + Express + HTML/CSS/JS puro*
