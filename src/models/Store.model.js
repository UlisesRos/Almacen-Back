const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const storeSchema = new mongoose.Schema({
  storeName: {
    type: String,
    required: [true, 'El nombre del almacén es requerido'],
    trim: true,
    maxlength: [100, 'El nombre no puede exceder 100 caracteres']
  },
  ownerName: {
    type: String,
    required: [true, 'El nombre del propietario es requerido'],
    trim: true,
    maxlength: [100, 'El nombre no puede exceder 100 caracteres']
  },
  email: {
    type: String,
    required: [true, 'El email es requerido'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Email inválido']
  },
  password: {
    type: String,
    required: [true, 'La contraseña es requerida'],
    minlength: [6, 'La contraseña debe tener al menos 6 caracteres'],
    select: false
  },
  phone: {
    type: String,
    trim: true,
    match: [/^[\d\s\+\-\(\)]+$/, 'Teléfono inválido']
  },
  address: {
    type: String,
    trim: true,
    maxlength: [200, 'La dirección no puede exceder 200 caracteres']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  settings: {
    currency: {
      type: String,
      default: 'ARS'
    },
    notifications: {
      lowStock: {
        type: Boolean,
        default: true
      },
      newSales: {
        type: Boolean,
        default: true
      }
    }
  }
}, {
  timestamps: true
});

// Encriptar password antes de guardar
storeSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Método para comparar passwords
storeSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Método para obtener datos sin password
storeSchema.methods.toJSON = function() {
  const store = this.toObject();
  delete store.password;
  return store;
};

module.exports = mongoose.model('Store', storeSchema);