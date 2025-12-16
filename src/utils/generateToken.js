const jwt = require('jsonwebtoken');

const generateToken = (storeId) => {
    // Token sin expiración - la sesión solo se cerrará manualmente
    return jwt.sign(
        { id: storeId },
        process.env.JWT_SECRET
        // Sin expiresIn para que el token no expire automáticamente
    );
};

module.exports = generateToken;