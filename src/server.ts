import express, { Express } from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import cors from 'cors';
import config from '../config.json';
import { getFilesWithKeyword } from './utils/getFilesWithKeyword';
import { createProxyMiddleware, Filter, Options, RequestHandler } from 'http-proxy-middleware';


let whitelist = ['http://localhost:3000']

const app: Express = express();

/************************************************************************************
 *                              Basic Express Middlewares
 ***********************************************************************************/

app.set('json spaces', 4);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Handle logs in console during development
if (process.env.NODE_ENV === 'development' || config.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use(cors());

app.use(cors({
  origin: function(origin, callback){
    // allow requests with no origin 
    if(!origin) return callback(null, true);
    if(whitelist.indexOf(origin) === -1){
      var message = "The CORS policy for this origin doesn't allow access from the particular origin.";
      return callback(new Error(message), false);
    }
    return callback(null, true);
  }
}));

// Handle security and origin in production
if (process.env.NODE_ENV === 'production' || config.NODE_ENV === 'production') {
  app.use(helmet());
}

const proxyOptions = {
  target: 'https://login.swiftkanban.com/restapi', // target host
  changeOrigin: true, // needed for virtual hosted sites
  ws: true, // proxy websockets
  pathRewrite: {
    '^/proxy': '/', // remove base path
  },
};

app.use('/proxy', createProxyMiddleware(proxyOptions));

// var proxy = require('express-http-proxy');
// app.use('/proxy', proxy('login.swiftkanban.com/restapi',{
//   https: true,
//   preserveHostHdr: true,
//   parseReqBody: false
// }));

/************************************************************************************
 *                               Register all routes
 ***********************************************************************************/

getFilesWithKeyword('router', 'src/app').forEach((file: string) => {
  const { router } = require(file.replace('src', '.'));
  app.use('/api', router);
})

/************************************************************************************
 *                               Express Error Handling
 ***********************************************************************************/

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  return res.status(500).json({
    errorName: err.name,
    message: err.message,
    stack: err.stack || 'no stack defined'
  });
});

export default app;