import compression from 'compression';
import cookieParser from 'cookie-parser';
import { dirname } from 'path';
import dotenv from 'dotenv';
import express from 'express';
import flash from 'connect-flash';
import { MongoClient } from 'mongodb';
import MongoStore from 'connect-mongo';
import morgan from 'morgan';
import path from 'path';
import session from 'express-session';
import { URLSearchParams, fileURLToPath } from 'url';

dotenv.config({path: './.env'});
export const app = express();

// Convert import.meta.url to a file path
const currentFilePath = fileURLToPath(import.meta.url);
const currentDirName = dirname(currentFilePath);
const publicDirPath = path.join(currentDirName, 'public');

// Logger middleware (before session)
app.use(morgan('dev'));

// Static files middleware
app.use(express.static(publicDirPath, { index: 'index.ejs' }));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Compression middleware
app.use(compression());

// Cookie parsing middleware
app.use(cookieParser());

// Session middleware
app.use(
    session({
        name: 'user-sesh.sid',
        secret: 'secret',
        secure: true,
        maxAge: 1000 * 60 * 60 * 1,
        resave: false,
        saveUninitialized: true,
        store: MongoStore.create({ mongoUrl: process.env.MONGODB_CONN_URI })
    })
);

// Flash message middleware
app.use(flash());

// Setting wiev engine as EJS
app.set('view engine', 'ejs');

// Custom timeout middleware
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

// GET home & login page
app.get('/', function (request, response) {
    const errorMessage = request.flash('error');
    response.render('index', { errorMessage });
});

// POST username and password for authentication and login authorization
app.post('/auth', async function (request, response) {
    const username = request.body.userId;
    const password = request.body.password;

    if (username && password) {
        try {
            // Get MongoDB client connection
            const client =  await MongoClient.connect(process.env.MONGODB_CONN_URI);
            //const client =  app.locals.MongoClient;

            // Create transactions table object - which will return a cursor that points to result set
            const customersCollection = client.db('customer_data').collection('user_records');
            const customer = await customersCollection.find({ username: username, password: password}).project({
                '_id': 0,
                'password': 0,
                'registration_date': 0 
            }).toArray();

            // Process user 
            if (customer.length !== 1) {
                request.flash('error', 'Invalid username and password');
                response.redirect('/');
                await client.close();
            } else {
                request.session.loggedin = true;
                request.session.username = customer[0].username;
                request.session.sessionTimeout = Date.now() + (15 * 60000);

                // Create objetct of URL queries
                const URLQueries = {
                    username: customer[0].username,
                    firstname: customer[0].first_name,
                    lastname: customer[0].last_name,
                    customer_id: customer[0].customer_id
                };

                const queryString = new URLSearchParams(URLQueries).toString();
                
                response.redirect('/dashboard' + '?' + queryString);
            }
        } catch (error) {
            // Handle MongoDB connection error
            console.error('Error connecting to MongoDB:', error);
            response.status(500).send('Internal Server Error');
        }
    } else {
        // Where a user does not enter either a username or password
        response.status(400).send('Kindly enter both username and password');
    }
});

// GET user dashboard after login authorization
app.get('/dashboard', async function (request, response) {
    if (request.query.username) {
        // Assign customer variables
        const username = request.query.username;
        const firstName = request.query.firstname;
        const lastName = request.query.lastname;
        const customerId = parseInt(request.query.customer_id);

        try {
            // Get MongoDB client connection
            const client =  await MongoClient.connect(process.env.MONGODB_CONN_URI);
            // const client =  app.locals.MongoClient;

            // Create transactions table object - which will return a cursor that points to result set
            const transactionsCollection = client.db('customer_data').collection('user_1001_transactions');
            const transactions = await transactionsCollection.find(
                {'user_id': customerId}).project({
                    '_id': 0,
                    'user_id': 0
                }).sort({'serial_number': 1}).toArray();
        
            if (!transactions) {
              return response.status(404).send('User not found');
            }
            // Generate random customer acount number (if needed)
            const customerAcctNum = 8765432109; // REPLACE
        
            // Render the user dashboard
            response.render('userDashboard', { transactions, customerAcctNum, firstName, lastName, showOverlay: true });
        } catch (error) {
            console.error('Error querying MongoDB:', error);
            response.status(500).send('Internal Server Error');
        }
    } else {
        // Where a user does not enter either a username or password
        response.status(400).send('Kindly enter both username and password');
    }
});

app.get('/signoff', async (request, response) => {
    const client = request.app.locals.mongoClient;

    try {
        // Close the MongoDB connection
        await client.close();

        // Clear the session and log the user out
        request.session.destroy(function (err) {
            if (err) {
                console.error('Error destroying the session:', err);
            }

            // Redirect the user to the login page or any other appropriate page
            response.redirect('/'); // You can customize the redirect URL
        });
    } catch (error) {
        console.error('Error closing the MongoDB connection:', error);
        response.status(500).send('Internal Server Error');
    }
});

export default app;