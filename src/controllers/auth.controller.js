const Store = require('../models/Store.model');
const generateToken = require('../utils/generateToken');

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
          address: store.address
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
          address: store.address
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

    res.json({
      success: true,
      data: store
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
    const { storeName, ownerName, phone, address } = req.body;

    const store = await Store.findById(req.store.id);

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Almacén no encontrado'
      });
    }

    // Actualizar campos
    if (storeName) store.storeName = storeName;
    if (ownerName) store.ownerName = ownerName;
    if (phone) store.phone = phone;
    if (address !== undefined) store.address = address;

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
          address: store.address
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
          address: store.address
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

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  googleAuth
}