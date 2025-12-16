const jwt = require('jsonwebtoken');
const Store = require('../models/Store.model');

exports.protect = async (req, res, next) => {
  try {
    let token;

    // Verificar si viene el token en el header Authorization
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Verificar que el token existe
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No autorizado. No se proporcionó token'
      });
    }

    // Verificar el token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Buscar el almacén
    const store = await Store.findById(decoded.id);

    if (!store) {
      return res.status(401).json({
        success: false,
        message: 'Almacén no encontrado'
      });
    }

    if (!store.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Almacén desactivado'
      });
    }

    // Agregar almacén al request
    req.store = store;
    next();

  } catch (error) {
    console.error('Error en middleware protect:', error);
    
    // Verificar si el error es por expiración (aunque ahora no debería haber expiración)
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expirado. Por favor, inicia sesión nuevamente.'
      });
    }
    
    // Para otros errores (token inválido, etc.)
    return res.status(401).json({
      success: false,
      message: 'Token inválido'
    });
  }
};