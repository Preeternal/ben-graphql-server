import 'reflect-metadata';
import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import { buildSchema } from 'type-graphql';
import Redis from 'ioredis';
import session from 'express-session';
import connectRedis from 'connect-redis';
import cors from 'cors';
import { createConnection } from 'typeorm';

// import { Post } from './entities/Post';
import { HelloResolver } from './resolvers/hello';
import { PostResolver } from './resolvers/post';
import { UserResolver } from './resolvers/user';
import { COOKIE_NAME, __prod__ } from './constants';
import { MyContext } from './types';
import { Post } from './entities/Post';
import { User } from './entities/User';
// import { User } from './entities/User';

const main = async () => {
  const conn = await createConnection({
    type: 'postgres',
    database: 'lireddit2',
    username: 'postgres',
    password: 'myPassword',
    logging: true,
    synchronize: true,
    entities: [Post, User],
  });

  const app = express();
  const RedisStore = connectRedis(session);
  const redis = new Redis();
  // app.set('trust proxy', 1);
  app.use(
    // '/',
    cors({
      origin: 'http://localhost:3000',
      credentials: true,
    })
  );
  app.use(
    // '/',
    session({
      name: COOKIE_NAME,
      store: new RedisStore({
        client: redis,
        // disableTTL: true,
        disableTouch: true,
        prefix: 'myApp:',
      }),
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 365 * 10, // 10 years
        httpOnly: true,
        sameSite: 'lax', // csrf
        secure: __prod__, // cookie only works in https
      },
      secret: 'session secret43555',
      saveUninitialized: false,
      resave: false,
    })
  );
  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [HelloResolver, PostResolver, UserResolver],
      validate: false,
    }),
    context: ({ req, res }): MyContext => ({ req, res, redis }),
  });

  apolloServer.applyMiddleware({
    app,
    cors: false,
  });

  app.listen(4000, () => {
    console.log('server started on localhost:4000');
  });
};

main().catch(err => console.error(err));
