const Store = require('../models/Store.model');
const generateToken = require('../utils/generateToken');
const { sendPasswordResetEmail } = require('../services/emailService');
const crypto = require('crypto');

// @desc    Registrar nuevo almacén
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { storeName, ownerName, email, password, phone, address } = req.body;

    // Verificar si el email ya existe
    const storeExists = await Store.findOne({ email });
    if (storeExists) {
      return res.status(400).json({
        success: false,
        message: 'El email ya está registrado'
      });
    }

    // Crear almacén
    const store = await Store.create({
      storeName,
      ownerName,
      email,
      password,
      phone,
      address
    });

    // Generar token
    const token = generateToken(store._id);

    res.status(201).json({
      success: true,
      message: 'Almacén registrado exitosamente',
      data: {
        store: {
          id: store._id,
          storeName: store.storeName,
          ownerName: store.ownerName,
          email: store.email,
          phone: store.phone,
          address: store.address,
          settings: store.settings || {
            currency: 'ARS',
            notifications: {
              lowStock: true,
              newSales: true
            }
          }
        },
        token
      }
    });

  } catch (error) {
    console.error('Error en register:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar almacén',
      error: error.message
    });
  }
};

// @desc    Login de almacén
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validar que vengan los datos
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Por favor proporciona email y contraseña'
      });
    }

    // Buscar almacén y traer password (que por defecto no viene)
    const store = await Store.findOne({ email }).select('+password');

    if (!store) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // Verificar password
    const isPasswordCorrect = await store.comparePassword(password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // Verificar que el almacén esté activo
    if (!store.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Almacén desactivado. Contacta al administrador'
      });
    }

    // Generar token
    const token = generateToken(store._id);

    res.json({
      success: true,
      message: 'Login exitoso',
      data: {
        store: {
          id: store._id,
          storeName: store.storeName,
          ownerName: store.ownerName,
          email: store.email,
          phone: store.phone,
          address: store.address,
          settings: store.settings || {
            currency: 'ARS',
            notifications: {
              lowStock: true,
              newSales: true
            }
          }
        },
        token
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      success: false,
      message: 'Error al iniciar sesión',
      error: error.message
    });
  }
};

// @desc    Obtener perfil del almacén autenticado
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const store = await Store.findById(req.store.id);

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Almacén no encontrado'
      });
    }

    res.json({
      success: true,
      data: {
        id: store._id,
        storeName: store.storeName,
        ownerName: store.ownerName,
        email: store.email,
        phone: store.phone,
        address: store.address,
        settings: store.settings || {
          currency: 'ARS',
          notifications: {
            lowStock: true,
            newSales: true
          }
        }
      }
    });
  } catch (error) {
    console.error('Error en getMe:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener perfil',
      error: error.message
    });
  }
};

// @desc    Actualizar perfil del almacén
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const { storeName, ownerName, phone, address, settings } = req.body;

    // Obtener el almacén actual
    const store = await Store.findById(req.store.id);

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Almacén no encontrado'
      });
    }

    // Actualizar campos básicos
    if (storeName) store.storeName = storeName;
    if (ownerName) store.ownerName = ownerName;
    if (phone !== undefined) store.phone = phone;
    if (address !== undefined) store.address = address;

    // Actualizar settings (notificaciones)
    if (settings) {
      if (!store.settings) {
        store.settings = {};
      }
      if (settings.notifications) {
        if (!store.settings.notifications) {
          store.settings.notifications = {};
        }
        if (settings.notifications.lowStock !== undefined) {
          store.settings.notifications.lowStock = settings.notifications.lowStock;
        }
        if (settings.notifications.newSales !== undefined) {
          store.settings.notifications.newSales = settings.notifications.newSales;
        }
      }
      if (settings.currency) {
        store.settings.currency = settings.currency;
      }
    }

    // Guardar cambios
    await store.save();

    res.json({
      success: true,
      message: 'Perfil actualizado exitosamente',
      data: {
        store: {
          id: store._id,
          storeName: store.storeName,
          ownerName: store.ownerName,
          email: store.email,
          phone: store.phone,
          address: store.address,
          settings: store.settings
        }
      }
    });

  } catch (error) {
    console.error('Error en updateProfile:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar perfil',
      error: error.message
    });
  }
};

// @desc    Autenticación/Registro con Google
// @route   POST /api/auth/google
// @access  Public
const googleAuth = async (req, res) => {
  try {
    const { googleId, email, name, picture } = req.body;

    // Validar datos requeridos
    if (!googleId || !email || !name) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos requeridos de Google'
      });
    }

    // Buscar si ya existe un almacén con este email o googleId
    let store = await Store.findOne({ 
      $or: [
        { email },
        { googleId }
      ]
    });

    if (store) {
      // Si existe pero no tiene googleId, actualizarlo
      if (!store.googleId) {
        store.googleId = googleId;
        await store.save();
      }

      // Verificar que esté activo
      if (!store.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Almacén desactivado. Contacta al administrador'
        });
      }

      // Generar token
      const token = generateToken(store._id);

      return res.json({
        success: true,
        message: 'Login exitoso con Google',
        data: {
          store: {
            id: store._id,
            storeName: store.storeName,
            ownerName: store.ownerName,
            email: store.email,
            phone: store.phone,
            address: store.address
          },
          token
        }
      });
    }

    // Si no existe, crear nuevo almacén
    // Dividir el nombre en storeName y ownerName
    const nameParts = name.split(' ');
    const storeName = nameParts[0] || 'Mi Almacén';
    const ownerName = name;

    store = await Store.create({
      storeName,
      ownerName,
      email,
      googleId,
      // password no es requerido si hay googleId
    });

    // Generar token
    const token = generateToken(store._id);

    res.status(201).json({
      success: true,
      message: 'Cuenta creada exitosamente con Google',
      data: {
        store: {
          id: store._id,
          storeName: store.storeName,
          ownerName: store.ownerName,
          email: store.email,
          phone: store.phone,
          address: store.address,
          settings: store.settings || {
            currency: 'ARS',
            notifications: {
              lowStock: true,
              newSales: true
            }
          }
        },
        token
      }
    });

  } catch (error) {
    console.error('Error en googleAuth:', error);
    
    // Si es error de duplicado
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Este email o cuenta de Google ya está registrado'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error en autenticación con Google',
      error: error.message
    });
  }
};

// @desc    Solicitar recuperación de contraseña
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    console.log('📧 Solicitud de recuperación de contraseña para:', email);

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Por favor proporciona un email'
      });
    }

    // Buscar almacén por email (incluyendo password para verificar)
    const store = await Store.findOne({ email }).select('+password');

    // Por seguridad, siempre devolver éxito aunque el email no exista
    // Esto previene que atacantes descubran qué emails están registrados
    if (!store) {
      console.log('⚠️  Email no encontrado en la base de datos:', email);
      return res.json({
        success: true,
        message: 'Si el email existe, recibirás un correo con las instrucciones para recuperar tu contraseña'
      });
    }

    console.log('✅ Almacén encontrado:', store.storeName);

    // Verificar que el almacén tenga contraseña (no solo Google)
    if (!store.password) {
      console.log('⚠️  El almacén no tiene contraseña (solo Google):', email);
      return res.json({
        success: true,
        message: 'Si el email existe, recibirás un correo con las instrucciones para recuperar tu contraseña'
      });
    }

    // Generar token de recuperación
    console.log('🔑 Generando token de recuperación...');
    const resetToken = store.getResetPasswordToken();
    await store.save({ validateBeforeSave: false });
    console.log('✅ Token generado y guardado');

    // Crear URL de reset
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;
    console.log('🔗 URL de reset generada:', resetUrl);

    try {
      // Enviar email
      console.log('📤 Enviando email a:', store.email);
      const emailResult = await sendPasswordResetEmail(store.email, store.storeName, resetUrl);
      console.log('✅ Email enviado exitosamente. MessageId:', emailResult.messageId);

      res.json({
        success: true,
        message: 'Si el email existe, recibirás un correo con las instrucciones para recuperar tu contraseña'
      });
    } catch (error) {
      console.error('❌ Error al enviar email:', error);
      console.error('❌ Detalles del error:', {
        message: error.message,
        stack: error.stack
      });
      
      // Si falla el envío, limpiar el token
      store.resetPasswordToken = undefined;
      store.resetPasswordExpire = undefined;
      await store.save({ validateBeforeSave: false });
      console.log('🧹 Token limpiado debido al error');

      return res.status(500).json({
        success: false,
        message: 'Error al enviar el email. Por favor intenta más tarde',
        ...(process.env.NODE_ENV === 'development' && { error: error.message })
      });
    }

  } catch (error) {
    console.error('❌ Error en forgotPassword:', error);
    console.error('❌ Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error al procesar la solicitud',
      error: error.message
    });
  }
};

// @desc    Resetear contraseña
// @route   POST /api/auth/reset-password/:token
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña debe tener al menos 6 caracteres'
      });
    }

    // Hash del token recibido para compararlo con el de la BD
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Buscar almacén con el token y que no haya expirado
    const store = await Store.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }
    }).select('+password +resetPasswordToken +resetPasswordExpire');

    if (!store) {
      return res.status(400).json({
        success: false,
        message: 'Token inválido o expirado'
      });
    }

    // Establecer nueva contraseña
    store.password = password;
    store.resetPasswordToken = undefined;
    store.resetPasswordExpire = undefined;
    await store.save();

    res.json({
      success: true,
      message: 'Contraseña actualizada exitosamente'
    });

  } catch (error) {
    console.error('Error en resetPassword:', error);
    res.status(500).json({
      success: false,
      message: 'Error al resetear la contraseña',
      error: error.message
    });
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  googleAuth,
  forgotPassword,
  resetPassword
}