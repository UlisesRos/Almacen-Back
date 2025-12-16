# 🏪 Almacen Manager - Backend API

Sistema de gestión de almacén completo con funcionalidades de inventario, ventas, sincronización offline y exportación de datos.

## 📋 Descripción

Backend API RESTful desarrollado en Node.js y Express para gestionar un sistema completo de almacén. Incluye autenticación JWT, gestión de productos, control de ventas, sincronización de datos y notificaciones por email.

## ✨ Características Principales

### 🔐 Autenticación y Seguridad
- Autenticación JWT (JSON Web Tokens)
- Registro e inicio de sesión de almacenes
- Autenticación con Google OAuth
- Middleware de protección de rutas
- Encriptación de contraseñas con bcryptjs

### 📦 Gestión de Productos
- CRUD completo de productos
- Control de stock y stock mínimo
- Gestión de categorías
- Códigos de barras únicos
- Fechas de vencimiento
- Alertas de productos por vencer
- Alertas de stock bajo
- Importación masiva de productos
- Búsqueda y filtrado avanzado

### 💰 Gestión de Ventas
- Registro de ventas con múltiples productos
- Control de métodos de pago (efectivo, transferencia, tarjeta)
- Generación automática de números de ticket
- Envío de comprobantes por email
- Cancelación de ventas con restauración de stock
- Estadísticas y reportes de ventas
- Filtros por fecha, método de pago y estado

### 📊 Reportes y Estadísticas
- Estadísticas de ventas diarias, semanales y mensuales
- Resumen de productos más vendidos
- Análisis por método de pago
- Reportes de productos por vencer
- Alertas de stock bajo

### 🔄 Sincronización
- API para sincronización de datos offline
- Endpoints para datos pendientes
- Sincronización bidireccional
- Timestamps de última sincronización

### 📧 Notificaciones
- Envío de comprobantes por email
- Notificaciones de stock bajo
- Alertas de productos por vencer
- Integración con servicios de email (BREVO)

## 🛠️ Tecnologías

- **Node.js** - Entorno de ejecución
- **Express.js** - Framework web
- **MongoDB** - Base de datos NoSQL
- **Mongoose** - ODM para MongoDB
- **JWT** - Autenticación y autorización
- **bcryptjs** - Encriptación de contraseñas
- **express-validator** - Validación de datos
- **dotenv** - Variables de entorno

## 📁 Estructura del Proyecto

```
almacen-back/
├── src/
│   ├── config/
│   │   └── database.js          # Configuración de MongoDB
│   ├── controllers/
│   │   ├── auth.controller.js   # Controlador de autenticación
│   │   ├── product.controller.js # Controlador de productos
│   │   └── sale.controller.js   # Controlador de ventas
│   ├── middlewares/
│   │   └── auth.middleware.js    # Middleware de autenticación
│   ├── models/
│   │   ├── Product.model.js     # Modelo de Producto
│   │   ├── Sale.model.js         # Modelo de Venta
│   │   └── Store.model.js        # Modelo de Almacén
│   ├── routes/
│   │   ├── auth.routes.js        # Rutas de autenticación
│   │   ├── product.routes.js     # Rutas de productos
│   │   └── sale.routes.js        # Rutas de ventas
│   ├── services/
│   │   └── emailService.js       # Servicio de email
│   ├── utils/
│   │   └── generateToken.js     # Utilidades JWT
│   └── server.js                 # Punto de entrada
├── .env                          # Variables de entorno
├── package.json
└── README.md
```

## 🔌 API Endpoints

### Autenticación

- `POST /api/auth/register` - Registro de nuevo almacén
- `POST /api/auth/login` - Inicio de sesión
- `POST /api/auth/google` - Autenticación con Google
- `GET /api/auth/me` - Obtener información del almacén autenticado
- `PUT /api/auth/profile` - Actualizar perfil del almacén

### Productos

- `GET /api/products` - Obtener todos los productos
- `GET /api/products/:id` - Obtener producto por ID
- `GET /api/products/barcode/:barcode` - Obtener producto por código de barras
- `GET /api/products/low-stock` - Productos con stock bajo
- `GET /api/products/near-expiration` - Productos por vencer
- `GET /api/products/expired` - Productos vencidos
- `POST /api/products` - Crear nuevo producto
- `PUT /api/products/:id` - Actualizar producto
- `DELETE /api/products/:id` - Eliminar producto
- `PATCH /api/products/:id/stock` - Actualizar stock
- `POST /api/products/import` - Importar productos masivamente

### Ventas

- `GET /api/sales` - Obtener todas las ventas
- `GET /api/sales/:id` - Obtener venta por ID
- `GET /api/sales/today` - Ventas del día
- `GET /api/sales/stats/summary` - Estadísticas de ventas
- `POST /api/sales` - Crear nueva venta
- `DELETE /api/sales/:id` - Cancelar venta
- `POST /api/sales/:id/send-email` - Enviar comprobante por email

**Nota:** Todas las rutas (excepto autenticación) requieren token JWT válido.

## 🔒 Seguridad

- Autenticación JWT en todas las rutas protegidas
- Encriptación de contraseñas con bcryptjs
- Validación de datos de entrada con express-validator
- Protección contra inyección SQL/NoSQL
- CORS configurado para dominios específicos

## 📝 Modelos de Datos

### Store (Almacén)
```javascript
{
  storeName: String,
  ownerName: String,
  email: String (único),
  password: String (encriptado),
  phone: String,
  address: String
}
```

### Product (Producto)
```javascript
{
  storeId: ObjectId,
  barcode: String (único),
  name: String,
  price: Number,
  stock: Number,
  minStock: Number,
  category: String,
  expirationDate: Date,
  image: String
}
```

### Sale (Venta)
```javascript
{
  storeId: ObjectId,
  ticketNumber: String (único),
  products: [{
    productId: ObjectId,
    name: String,
    quantity: Number,
    price: Number,
    subtotal: Number
  }],
  total: Number,
  paymentMethod: String,
  customer: {
    email: String,
    phone: String
  },
  status: String
}
```

## 🚀 Uso

### Ejemplo de Petición

**Registro de Almacén:**
```bash
POST /api/auth/register
Content-Type: application/json

{
  "storeName": "Mi Almacén",
  "ownerName": "Juan Pérez",
  "email": "juan@example.com",
  "password": "password123",
  "phone": "+1234567890",
  "address": "Calle Principal 123"
}
```

**Crear Producto:**
```bash
POST /api/products
Authorization: Bearer <token>
Content-Type: application/json

{
  "barcode": "1234567890123",
  "name": "Producto Ejemplo",
  "price": 100.50,
  "stock": 50,
  "minStock": 10,
  "category": "Almacén",
  "expirationDate": "2024-12-31"
}
```

## 🧪 Testing

Para ejecutar tests (cuando estén implementados):
```bash
npm test
```

## 📄 Licencia

ISC

## 👨‍💻 Autor

Desarrollado por [Ulises Ros](https://ulisesros-desarrolloweb.vercel.app/)

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

