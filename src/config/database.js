const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Verificar que la URI esté disponible
    const uri = process.env.MONGODB_URI;
    
    if (!uri) {
      throw new Error('MONGODB_URI no está definida en las variables de entorno');
    }

    const conn = await mongoose.connect(uri);
    
    console.log(`✅ MongoDB conectado: ${conn.connection.host}`);
    
    mongoose.connection.on('error', (err) => {
      console.error('❌ Error de MongoDB:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️  MongoDB desconectado');
    });

  } catch (error) {
    console.error('❌ Error al conectar MongoDB:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;