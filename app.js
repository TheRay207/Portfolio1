import express from 'express';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import path from 'path';
import compression from 'compression';
import dotenv from 'dotenv';

dotenv.config({path: './config.env'});
export const app = express();

// Convert import.meta.url to a file path
const currentFilePath = fileURLToPath(import.meta.url);
const currentDirName = dirname(currentFilePath);
const publicDirPath = path.join(currentDirName, 'public');

// Setup connection to MongoDB
mongoose.connect(process.env.MONGODB_CONN_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

// Create database connection object
const dbConnection = mongoose.connection;

dbConnection.on('error', console.error.bind(console, 'MongoDB connection error: '));
dbConnection.once('open', () => {
    console.log('Connected to MongoDB successfully');
});

app.use(compression());

app.use(
    session({
	    secret: 'secret',
	    resave: false,
	    saveUninitialized: false,
    })
);

app.use(express.static(publicDirPath, { index: 'index.ejs' }));

if (process.env.NODE_ENV === 'development') {
    app.use(logger('dev'));
}
app.use(cookieParser());
app.use(express.json());
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(function (request, response, next) {
    const currentTime = Date.now();

    if (request.session.sessionTimeout && currentTime > request.session.sessionTimeout) {
        // Session has timed out
        // Clear the session and log the user out
        request.session.destroy(function (err) {
            if (err) {
                console.error('Error destroying the session:', err);
            }
            response.redirect('/');
        });
    }
    next();
});

app.get('/', function (request, response) {
    response.render('index');
});

app.post('/auth', async function (request, response) {
    const username = request.body.userId;
    const password = request.body.password;

    if (username && password) {
        try {
            const customer = mongoose.connection.collection('user_records')
                .find({ _id: 0, first_name: 1, last_name: 1 })
            if (customer) {
                request.session.loggedin = true;
                request.session.username = username;
                request.session.sessionTimeout = Date.now() + (15 * 60000);
  
                response.redirect('/dashboard');
            } else {
                  // Render an error page or send an error response
                  response.status(401).send('Authentication failed');
            }
        } catch (error) {
            
        }
    }
});

app.get('/dashboard', async function (request, response) {
    try {
        const username = request.session.username;
    
        // Use Mongoose to query the MongoDB collections
        const transactions = mongoose.connection.collection('user_1001_transactions')
            .find().sort({ serial_number: 1 }).toArray();
    
        // Fetch first_name and last_name from the 'user_records' collection
        const customer = await mongoose.connection.collection('user_records').findOne({ username });
    
        if (!customer) {
          return response.status(404).send('User not found');
        }
    
        const firstName = customer.first_name;
        const lastName = customer.last_name;
    
        // Generate random user uuid (if needed)
        const userId = 8765432109; // You can replace this with your logic
    
        // Render the user dashboard
        response.render('userDashboard', { transactions, userId, firstName, lastName, showOverlay: true });
    } catch (error) {
        console.error('Error querying MongoDB:', error);
        response.status(500).send('Internal Server Error');
    }
});

app.get('/signoff', function (request, response) {
    // Clear the session and log the user out
    request.session.destroy(function (err) {
        if (err) {
            console.error('Error destroying the session:', err);
        }

        // Redirect the user to the login page or any other appropriate page
        response.redirect('/'); // You can customize the redirect URL
    });
});

export default app;