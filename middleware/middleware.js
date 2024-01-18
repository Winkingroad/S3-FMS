const jwt = require('jsonwebtoken');

function verifyUser(req, res, next) {
    let token = req.headers.authorization;
    token = token.split(' ')[1];

    if (!token) {
        return res.status(403).json({ message: 'Token not provided' });
    }

    jwt.verify(token, 'your_secret_key', (err, user) => {
        if (err) {
            return res.status(401).json({ message: 'Invalid token' });
        }

        req.user = user;
        req.session.username = user.username;
        next();
    });
}



module.exports = verifyUser;
