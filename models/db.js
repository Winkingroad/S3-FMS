const bcrypt = require('bcrypt');
const client = require('./db_init');
const jwt = require('jsonwebtoken');

async function registerUser(username, email, password, role = 'user') {
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const query = 'INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4)';
      const values = [username, email, hashedPassword, role];
  
      await client.query(query, values);
      return { success: true };
    } catch (error) {
      if (error.code === '23505' && error.constraint === 'users_username_key') {
        // Duplicate key violation (username already exists)
        return { success: false, message: 'Username already exists' };
      }
  
      console.error('Error registering user:', error.message);
      return { success: false, message: 'Internal server error' };
    }
}
  

async function loginUser(username, password) {
    try {
      // Fetch the user from the database by username
      const query = 'SELECT * FROM users WHERE username = $1';
      const result = await client.query(query, [username]);
  
      if (result.rowCount === 0) {
        return { success: false, message: 'User not found' };
      }
  
      // Compare the provided password with the stored hashed password
      const user = result.rows[0];
      const passwordMatch = await bcrypt.compare(password, user.password_hash);
  
      if (!passwordMatch) {
        return { success: false, message: 'Incorrect password' };
      }
      return { success: true, user: user };
    } catch (error) {
      console.error('Error logging in:', error.message);
      return { success: false, message: 'Login failed' };
    }
}

async function showUsers() {
    try {
      const query = 'SELECT * FROM users';
      const { rows } = await client.query(query);
      return { success: true, users: rows };
    } catch (error) {
      console.error('Some error occurred: ', error.message);
      return { success: false, message: "Can't fetch from users db" };
    }
}


async function deleteUserByName(username){
    try {
      const query = 'DELETE FROM users WHERE username = $1';
      const result = await client.query(query, [username]);
  
      if (result.rowCount === 0) { // If any rows were affected ?
        return { success: false, message: 'User not found' };
      }
      return { success: true, message: 'User deleted successfully' };
    } catch (error) {
      console.error('Some error occured: ', error.message);
      return {success: false, message: `Can't delete ${username} from db`}
    }
}

async function updateUserPassword(username, newPassword){
    try {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const query = 'UPDATE users SET password_hash = $1 WHERE username = $2';
      const result = await client.query(query, [hashedPassword, username]);
  
      if (result.rowCount === 0) { // If any rows were affected ?
        return { success: false, message: 'User not found' };
      }
      return { success: true, message: 'Password updated successfully' };
    } catch (error) {
      console.error('Some error occured: ', error.message);
      return {success: false, message: `Can't update ${username}'s password`}
    }
}

function generateToken(user) {
    const payload = { username: user.username, email: user.email, role: user.role };
    const token = jwt.sign(payload, 'your_secret_key', { expiresIn: '1h' }); 
    return token;
}

module.exports = {
    registerUser,
    loginUser,
    showUsers,
    deleteUserByName,
    updateUserPassword,
    generateToken
}

process.on('exit', () => {
    client.end();
});