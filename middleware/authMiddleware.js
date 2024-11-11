import jwt from 'jsonwebtoken';

// Middleware to verify JWT
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1]; // Extract token from Bearer scheme
    if (!token) {
        return res.status(403).json({ message: 'Access denied. No token provided.' });
    }

    // Verify token
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid token.' });
        }

        // Attach decoded user info to request object
        req.user = decoded;  // This assumes decoded contains the user id and role
        next();
    });
};

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        return next(); // User is admin, proceed to the next middleware or route
    }
    return res.status(403).json({ message: 'Access denied. Admins only.' }); // User is not admin
};

// Middleware to check if user is a seller (you can add this as an additional check)
const isSeller = (req, res, next) => {
    if (req.user && req.user.role === 'seller') {
        return next(); // User is a seller, proceed
    }
    return res.status(403).json({ message: 'Access denied. Sellers only.' });
};

export { verifyToken, isAdmin, isSeller };
