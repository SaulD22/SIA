const express = require('express');
const app = express();
const morgan = require('morgan');
require('dotenv').config();

const cors = require('cors');

const allowedOrigins = [
	process.env.FRONTEND_URL,
	'http://localhost:5173'
];

const corsOptions = {
	origin: function (origin, callback) {
		// allow requests with no origin (like mobile apps or curl requests)
		if (!origin || allowedOrigins.includes(origin)) {
			callback(null, true);
		} else {
			callback(new Error('Not allowed by CORS'));
		}
	}
};

// settings
app.set('port', process.env.PORT || 3010);

// middlewares
app.use(morgan('dev'));
app.use(express.json());

app.use(cors(corsOptions));

// routes
require('./routes/userRoutes')(app);

app.listen(app.get('port'), () => {
	console.log('server on port 3010');
});