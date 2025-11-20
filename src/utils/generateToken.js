const jwt = require('jsonwebtoken');

const generateToken = (storeId) => {
    return jwt.sign(
        { id: storeId },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
};

module.exports = generateToken;