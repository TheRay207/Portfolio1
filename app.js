import express from 'express';
// import mysql2 from 'mysql2';
import mysql from 'mysql';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import path from 'path';

// import { use } from 'passport';

const port = process.env.PORT // || 3000;
const app = express();

// Convert import.meta.url to a file path
const currentFilePath = fileURLToPath(import.meta.url);
const currentDirName = dirname(currentFilePath);
const publicDirPath = path.join(currentDirName, 'public');

// console.log('Current directory:', currentDirName); 

// MySQL database connection configuration
/* export const appDbConnection = mysql2.createConnection({
  host: 'localhost',
  user: 'Kaygeea',
  password: 'gammaray8',
  database: 'banking_app'
}); */

const deployedAppDbConnection = mysql.createConnection({
    host     : process.env.MYSQL_ADDON_HOST,
    database : process.env.MYSQL_ADDON_DB,
    user     : process.env.MYSQL_ADDON_USER,
    password : process.env.MYSQL_ADDON_PASSWORD
});

// Connect to the MySQL database
deployedAppDbConnection.connect((error) => {
  if (error) {
    console.error('Error encountered while attempting to connect to Database: ' + error.message);
    return;
  }
  console.log('Connected to MySQL database');
});

app.use(session({
	secret: 'secret',
	resave: false,
	saveUninitialized: false
}));

// app.use(express.static(currentDirName + 'public', { index: 'index.ejs' }));
app.use(express.static(publicDirPath, { index: 'index.ejs' }));
app.use(logger('dev'));
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

app.post('/auth', function (request, response) {
    const username = request.body.userId;
    const password = request.body.password;

    if (username && password) {
         const authQuery = `
            SELECT customer_id, first_name, last_name, username
            FROM users
            WHERE username = ?
            AND password = ?
        `;

        // Query MySQL database to confirm user credentials
        deployedAppDbConnection.query(authQuery, [username, password], function (error, results) {
            // If error occurs during the query
            if (error) {
              response.send('An error occurred while processing your request.');
              return response.end();
            }
    
            if (results.length > 0) {
              request.session.loggedin = true;
              request.session.username = username;
              request.session.sessionTimeout = Date.now() + (15 * 60000);

              response.redirect('/dashboard');
            } else {
                // Render an error page or send an error response
                response.status(401).send('Authentication failed');
            }
        })
    }
})

app.get('/dashboard', function (request, response) {
    // Retrieve username
    const username = request.session.username;

    // Query MySQL database to retrieve user information
    const transactionsQuery = `
        SELECT t.serial_number, t.date_of_transaction, t.transaction_description, t.amount, t.user_id, u.first_name, u.last_name
        FROM user_1_transaction AS t
            JOIN users AS u ON t.user_id = u.customer_id
        WHERE u.username = ?
        ORDER BY t.serial_number;
    `;

    deployedAppDbConnection.query(transactionsQuery, [username], function (error, results) {
        if (error) {
            console.error('Error querying the database: ', error);
            return results.status(500).send('Internal Server Error');
        }
        if (results.length > 0) {
            const firstRow = results[0]; // Access the first row
            // const userTableId = firstRow.user_id;
            const firstName = firstRow.first_name;
            const lastName = firstRow.last_name;

            // Generate random user uuid
            const userId = 8765432109; // uuidv4().substring(0, 8);
            const showOverlay = true;

            // Render the user dashboard
            response.render('userDashboard', { results, userId, firstName, lastName, showOverlay });
        }
    });
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

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
