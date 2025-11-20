const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: [true, 'El ID del almacén es requerido'],
    index: true
  },
  barcode: {
    type: String,
    required: [true, 'El código de barras es requerido'],
    trim: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'El nombre del producto es requerido'],
    trim: true,
    maxlength: [150, 'El nombre no puede exceder 150 caracteres']
  },
  price: {
    type: Number,
    required: [true, 'El precio es requerido'],
    min: [0, 'El precio no puede ser negativo']
  },
  stock: {
    type: Number,
    required: [true, 'El stock es requerido'],
    min: [0, 'El stock no puede ser negativo'],
    default: 0
  },
  minStock: {
    type: Number,
    required: [true, 'El stock mínimo es requerido'],
    min: [0, 'El stock mínimo no puede ser negativo'],
    default: 10
  },
  category: {
    type: String,
    required: [true, 'La categoría es requerida'],
    trim: true,
    enum: {
      values: ['Bebidas', 'Panadería', 'Almacén', 'Lácteos', 'Snacks', 'Limpieza', 'Otros'],
      message: 'Categoría inválida'
    }
  },
  image: {
    type: String,
    trim: true,
    maxlength: [10, 'El emoji/icono no puede exceder 10 caracteres']
  },
  expirationDate: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Índice compuesto para búsquedas eficientes
productSchema.index({ storeId: 1, barcode: 1 }, { unique: true });
productSchema.index({ storeId: 1, name: 'text' });
productSchema.index({ storeId: 1, expirationDate: 1 });

// Virtual para saber si está bajo de stock
productSchema.virtual('isLowStock').get(function() {
  return this.stock <= this.minStock;
});

// Virtual para saber si está próximo a vencer (20 días)
productSchema.virtual('isNearExpiration').get(function() {
  if (!this.expirationDate) return false;
  
  const today = new Date();
  const expirationDate = new Date(this.expirationDate);
  const daysUntilExpiration = Math.ceil((expirationDate - today) / (1000 * 60 * 60 * 24));
  
  return daysUntilExpiration <= 20 && daysUntilExpiration >= 0;
});

// Virtual para saber si ya venció
productSchema.virtual('isExpired').get(function() {
  if (!this.expirationDate) return false;
  
  const today = new Date();
  const expirationDate = new Date(this.expirationDate);
  
  return expirationDate < today;
});

// Virtual para días hasta vencimiento
productSchema.virtual('daysUntilExpiration').get(function() {
  if (!this.expirationDate) return null;
  
  const today = new Date();
  const expirationDate = new Date(this.expirationDate);
  const days = Math.ceil((expirationDate - today) / (1000 * 60 * 60 * 24));
  
  return days;
});

// Asegurar que los virtuals se incluyan en JSON
productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Product', productSchema);