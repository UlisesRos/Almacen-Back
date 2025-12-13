const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/database');
const authRoutes = require('./routes/auth.routes');
const productsRoutes = require('./routes/product.routes');
const saleRoutes = require('./routes/sale.routes');
const { testConnection, sendReceiptEmail } = require('./services/emailService');
const Store = require('./models/Store.model');

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
            sales: '/api/sales',
            testEmail: '/api/test-email'
        }
    });
});

// Ruta de prueba para email (solo en desarrollo)
app.get('/api/test-email', async (req, res) => {
    try {
        console.log('🧪 Iniciando prueba de email...');
        
        // Verificar conexión
        const connectionTest = await testConnection();
        if (!connectionTest.success) {
            return res.status(500).json({
                success: false,
                message: 'Error al verificar conexión con Brevo',
                error: connectionTest.message,
                code: connectionTest.code
            });
        }

        // Obtener el primer almacén para la prueba
        const store = await Store.findOne();
        if (!store) {
            return res.status(404).json({
                success: false,
                message: 'No se encontró ningún almacén. Crea uno primero.'
            });
        }

        // Email de prueba
        const testEmail = req.query.email || process.env.BREVO_FROM_EMAIL || store.email;
        if (!testEmail) {
            return res.status(400).json({
                success: false,
                message: 'Debes proporcionar un email de prueba. Usa: /api/test-email?email=tu@email.com'
            });
        }

        // Crear una venta de prueba
        const testSale = {
            ticketNumber: 'TEST-001',
            products: [
                { name: 'Producto de Prueba', quantity: 1, price: 100, subtotal: 100 }
            ],
            total: 100,
            paymentMethod: 'efectivo',
            createdAt: new Date()
        };

        console.log(`📧 Enviando email de prueba a: ${testEmail}`);
        const result = await sendReceiptEmail(testSale, store, testEmail);

        res.json({
            success: true,
            message: 'Email de prueba enviado exitosamente',
            data: {
                to: testEmail,
                messageId: result.messageId
            }
        });
    } catch (error) {
        console.error('❌ Error en prueba de email:', error);
        res.status(500).json({
            success: false,
            message: 'Error al enviar email de prueba',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
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