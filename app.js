const express = require('express');
const app = express();
require('dotenv').config()
const s3routes = require('./routes/s3routes');
const userRoutes = require('./routes/userRoutes');
const session = require('express-session');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true
}));

const swaggerDocument = YAML.load('./swagger.yaml');
app.use(express.json());
app.use(express.urlencoded({extended: false}));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use('/api/user',userRoutes);
app.use('/api/s3', s3routes);


app.listen(3000, () => {
    console.log("Server listening on port 3000");
});