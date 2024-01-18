const express = require('express');
const router = express.Router();
const { registerUser, loginUser, showUsers, deleteUserByName, updateUserPassword } = require('../controllers/authController');
const jwt = require('jsonwebtoken');

function checkRole(role) {
    return (req, res, next) => {
        let token = req.headers.authorization;

        if (!token) {
            return res.status(401).json({ error: 'Unauthorized - Missing token' });
        }

        try {
            const secretKey = 'your_secret_key'; 
            const decoded = jwt.verify(token.split(' ')[1], secretKey);
            const userRole = decoded.role;

            if (userRole === role) {
                req.user = decoded; 
                next();
            } else {
                res.status(403).json({ error: 'Unauthorized - Insufficient role' });
            }
        } catch (error) {
            console.log(error);
            res.status(401).json({ error: 'Unauthorized - Invalid token' });
        }
    };
}



// Route to register a user
router.post('/register', registerUser);

// Route to login a user (accessible by any role)
router.post('/login', loginUser);

// Route to show all users (accessible by any role)
router.get('/users', checkRole('admin'), showUsers);

// Route to delete a user (accessible only by admin)
router.delete('/users/:username', checkRole('admin'), deleteUserByName);

// Route to update a user's password (accessible by any role)
router.put('/users/:username', checkRole('admin'), updateUserPassword);

module.exports = router;

