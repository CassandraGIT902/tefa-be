const express = require('express');
const cors = require('cors');
const authcontroller = require('./controllers/authcontroller');
const middleware = require('./middlewares/middleware');

const app = express();
app.use(express.json());

// Enable CORS
app.use(cors({
    origin: 'http://localhost:3000', // Frontend URL
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true, // Allow cookies to be sent with requests
}));

app.use('/api/auth', authcontroller);

// A protected route example
app.get('/api/protected', middleware, (req, res) => {
    res.send('This is a protected route');
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
