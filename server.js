import dotenv from 'dotenv';
import { MongoClient, ServerApiVersion } from 'mongodb';
import { app } from './app.js';

dotenv.config({path: './config.env'});
const port = process.env.PORT || 3000;

 const connectToMongo = async () => {
    const client = new MongoClient(process.env.MONGODB_CONN_URI, {
        serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
        }
    });

    try {
        await client.connect();
        console.log('Connection to MongoDB server established successfully');
        app.locals.mongoClient = client
        } catch (error) {
        console.error('Error connecting to MongoDB: ', error);        
    }
}

const startServer = async () => {
    try {
        await connectToMongo();
        // Start Express server after connecting to MongoDB
        app.listen(port, () => {
          console.log(`Server has started and is listening on PORT ${port}`);
        });
    } catch (error) {
        console.error('Error starting server:', error);
    }
};

startServer();
