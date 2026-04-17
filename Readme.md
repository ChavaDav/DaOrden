# 📋 DaOrden - Sistema de Gestión de Asistencia

Una aplicación web moderna, robusta y segura para el seguimiento de asistencia en tiempo real. Diseñada con un enfoque en la simplicidad del usuario y la seguridad administrativa.

---

## 🚀 Descripción General

**DaOrden** es una herramienta integral que permite gestionar listas de personas y registrar su presencia con un solo clic. Ideal para eventos, reuniones o control de acceso, ofrece una interfaz limpia y una arquitectura sólida que garantiza el rendimiento y la protección de datos.

### Características Principales:
- 🔐 **Seguridad Avanzada**: Autenticación protegida con hashing de contraseñas mediante `bcrypt`.
- 📊 **Panel de Control**: Visualización clara del conteo de asistentes y estado de presencia.
- 🛠️ **Gestión Dinámica**: Añade, actualiza y elimina registros en tiempo real.
- 🛡️ **Protección de Red**: Implementación de rate-limiting y cabeceras de seguridad Helmet.

---

## 🛠️ Stack Tecnológico

La aplicación utiliza tecnologías modernas para asegurar escalabilidad y facilidad de despliegue:

- **Entorno**: [Node.js](https://nodejs.org/) & [Express](https://expressjs.com/)
- **Base de Datos**: [SQLite](https://www.sqlite.org/) gestionado con [Sequelize ORM](https://sequelize.org/)
- **Interfaz**: [EJS](https://ejs.co/) (Plantillas dinámicas) y CSS Moderno
- **Seguridad**: `express-session`, `helmet`, `bcryptjs`, `express-rate-limit`
- **Contenedores**: [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/)

---

## ⚙️ Procesos Importantes del Sistema

> [!IMPORTANT]
> Los siguientes procesos son críticos para la configuración y el mantenimiento del sistema.

### 1. Inicialización de la Base de Datos
Para configurar el esquema inicial de la tabla `People`, se utiliza el siguiente estándar SQL:

```sql
CREATE TABLE IF NOT EXISTS `People` (
  `id` INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, 
  `name` VARCHAR(255) NOT NULL, 
  `present` TINYINT(1) DEFAULT 0, 
  `createdAt` DATETIME NOT NULL, 
  `updatedAt` DATETIME NOT NULL
);
```

### 2. Generación de Credenciales de Seguridad
Para generar un hash seguro de contraseña y añadirlo al archivo `.env`, ejecuta el siguiente comando en la terminal:

```bash
node -e "console.log(require('bcryptjs').hashSync('TuContraseñaAquí', 10))"
```

---

## 📦 Despliegue con Docker

Levanta el entorno completo en segundos:

```bash
docker-compose up -d --build
```

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo `LICENSE` para más detalles.
