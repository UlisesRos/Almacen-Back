const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: [true, 'El ID del almacén es requerido'],
    index: true
  },
  ticketNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  products: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    name: {
      type: String,
      required: true
    },
    barcode: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'La cantidad debe ser al menos 1']
    },
    price: {
      type: Number,
      required: true,
      min: [0, 'El precio no puede ser negativo']
    },
    subtotal: {
      type: Number,
      required: true
    }
  }],
  total: {
    type: Number,
    required: [true, 'El total es requerido'],
    min: [0, 'El total no puede ser negativo']
  },
  customer: {
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Email inválido']
    },
    phone: {
      type: String,
      trim: true
    }
  },
  paymentMethod: {
    type: String,
    enum: ['efectivo', 'transferencia', 'tarjeta'], // 👈 Actualizado
    required: true,
    default: 'efectivo'
  },
  receiptSent: {
    type: String,
    enum: ['email', 'whatsapp', 'none'], // 👈 Nuevo campo
    default: 'none'
  },
  status: {
    type: String,
    enum: ['completada', 'cancelada', 'pendiente'],
    default: 'completada'
  }
}, {
  timestamps: true
});

// Índice para búsquedas por fecha
saleSchema.index({ storeId: 1, createdAt: -1 });
saleSchema.index({ storeId: 1, paymentMethod: 1 }); // 👈 Nuevo índice

// Generar número de ticket antes de guardar
saleSchema.pre('save', async function(next) {
  if (this.isNew && !this.ticketNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    
    const count = await this.constructor.countDocuments({
      storeId: this.storeId,
      createdAt: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });
    
    this.ticketNumber = `${year}${month}${day}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// Calcular totales antes de guardar
saleSchema.pre('save', function(next) {
  this.products.forEach(product => {
    product.subtotal = product.quantity * product.price;
  });
  
  this.total = this.products.reduce((sum, product) => sum + product.subtotal, 0);
  next();
});

module.exports = mongoose.model('Sale', saleSchema);