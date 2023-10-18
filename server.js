import dotenv from 'dotenv';
import { MongoClient, ServerApiVersion } from 'mongodb';
import { app } from './app.js';

const startServer = async () => {
    dotenv.config({path: './config.env'});

    const port = process.env.PORT || 3000;
    const uri = process.env.MONGODB_CONN_URI || "mongodb+srv://TheRay:gammaray8@cluster0.tj2glrw.mongodb.net/?retryWrites=true&w=majority";

    const client = new MongoClient(uri, {
        serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
        }
    });

    try {
        await client.connect();
        console.log('Connection to MongoDB server established successfully');

        // Start Express server
        app.listen(port, () => {
            console.log(`Server has started and is listening on PORT ${port}`);
        });
    } catch (error) {
        console.error('Error connecting to MongoDB: ', error);        
    }
}

startServer();
