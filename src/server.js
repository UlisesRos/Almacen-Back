const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/database');
const authRoutes = require('./routes/auth.routes');
const productsRoutes = require('./routes/product.routes');
const saleRoutes = require('./routes/sale.routes');

// Cargar variables de entorno
dotenv.config({ path: path.join(process.cwd(), '.env') });

// Conectar a MongoDB
connectDB();

// Inicializar Express
const app = express();

// Middlewares globales
app.use(cors({
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ruta de prueba
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'API Almacen - Sistema de Gestion',
        version: '1.0.0',
        endpoints: {
            auth: '/api/auth',
            stores: '/api/stores',
            products: '/api/products',
            sales: '/api/sales'
        }
    });
});

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/sales', saleRoutes);

// Middleware de manejo de errores
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Error interno del servidor',
        ...(process.env.NODE_ENV === 'development' && {stack: err.stack })
    });
});

// Ruta 404
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Ruta no encontrada'
    });
});

// Iniciar el servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`
    🚀 Servidor corriendo en puerto ${PORT}
    📝 Modo: ${process.env.NODE_ENV || 'development'}
    🔗 URL: http://localhost:${PORT}
    `);
});    