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
    required: function() {
      return !this.googleId; // Solo requerido si no hay googleId
    },
    validate: {
      validator: function(v) {
        // Si hay googleId, password es opcional
        if (this.googleId) return true;
        // Si no hay googleId, password debe tener al menos 6 caracteres
        return !v || v.length >= 6;
      },
      message: 'La contraseña debe tener al menos 6 caracteres'
    },
    select: false
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true, // Permite múltiples nulls
    trim: true
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

// Encriptar password antes de guardar (solo si hay password)
storeSchema.pre('save', async function(next) {
  // Si no hay password o no se modificó, continuar
  if (!this.password || !this.isModified('password')) {
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

// Validar que tenga password o googleId (solo en creación o cuando se modifica password)
storeSchema.pre('save', async function(next) {
  // Solo validar si es un documento nuevo o si se está modificando el password
  if (this.isNew || this.isModified('password')) {
    if (!this.password && !this.googleId) {
      return next(new Error('Debe proporcionar una contraseña o autenticarse con Google'));
    }
  }
  next();
});

// Método para comparar passwords
storeSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) {
    return false;
  }
  return await bcrypt.compare(candidatePassword, this.password);
};

// Método para obtener datos sin password
storeSchema.methods.toJSON = function() {
  const store = this.toObject();
  delete store.password;
  return store;
};

module.exports = mongoose.model('Store', storeSchema);