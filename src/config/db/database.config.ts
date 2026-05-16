import mongoose from 'mongoose';
import { ENV } from '../env.config.ts';
import { logger } from '../../app/utils/logger.util.ts';


const connectDatabase = async () : Promise<void> =>{
    try {
        mongoose.set('strictQuery', true)

        await mongoose.connect(`${ENV.MONGO_URI}/mvc-template-test`,{
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });

        logger.info(`MongoDB connected: ${mongoose.connection.host}`);

        mongoose.connection.on('error', (err) => {
            logger.error('MongoDB connection error:', err);
          });
      
          mongoose.connection.on('disconnected', () => {
            logger.warn('MongoDB disconnected. Attempting reconnect...');
          });
          
    } catch (error) {
        logger.error('Failed to connect to MongoDB:', error);
        process.exit(1); // hard exit — don't run without a DB
    }
} 

export default connectDatabase;