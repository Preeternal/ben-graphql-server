/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
  Arg,
  Ctx,
  Field,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from 'type-graphql';
import argon2 from 'argon2';

import { User } from '../entities/User';
import { MyContext } from 'src/types';
import { COOKIE_NAME } from '../constants';
import { UsernamePasswordInput } from './UsernamePasswordInput';
import { validateRegister } from '../utils/validateRegister';

@ObjectType()
class FieldError {
  @Field()
  field: string;
  @Field()
  message: string;
}

@ObjectType()
class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => User, { nullable: true })
  user?: User;
}

@Resolver()
export class UserResolver {
  @Mutation(() => Boolean)
  async forgotPassword(): // @Arg('email') email: string,
  // @Ctx() { em }: MyContext
  Promise<boolean> {
    // const user = await em.findOne(User, {email})
    return true;
  }

  @Query(() => User, { nullable: true })
  async me(@Ctx() { req, em }: MyContext): Promise<User | null> {
    // you are not logged in

    console.log('TRY GET ME', req.sessionID, req.session);
    if (!req.session?.userId) {
      return null;
    }
    const user = await em.findOne(User, { id: req.session.userId });
    return user;
  }

  @Query(() => [User])
  async users(@Ctx() { em }: MyContext): Promise<User[]> {
    return await em.find(User, {});
  }

  @Mutation(() => UserResponse)
  async register(
    @Arg('options') options: UsernamePasswordInput,
    @Ctx() { em, req }: MyContext
  ): Promise<UserResponse> {
    const errors = validateRegister(options);
    if (errors) {
      return { errors };
    }

    const hashedPassword = await argon2.hash(options.password);
    const user = em.create(User, {
      username: options.username,
      email: options.email,
      password: hashedPassword,
    });
    // let user;
    try {
      await em.persistAndFlush(user);
      // const result = await (em as EntityManager)
      //   .createQueryBuilder(User)
      //   .getKnexQuery()
      //   .insert({
      //     username: options.username,
      //     password: hashedPassword,
      //     email: options.email,
      //     created_At: new Date(),
      //     updated_At: new Date(),
      //   })
      //   .returning('*');
      //   user = result[0]
    } catch (e) {
      console.error(e);
      em.clear();
      if (e.code === '23505') {
        return {
          errors: [
            {
              field: 'username',
              message: 'username already taken',
            },
          ],
        };
      }
      return {
        errors: [
          {
            field: e.code,
            message: e.detail,
          },
        ],
      };
    }

    // store user id session
    // this will set a cookie on the user
    // keep them logged in
    req.session!.userId = user.id;

    return { user };
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg('usernameOrEmail') usernameOrEmail: string,
    @Arg('password') password: string,
    @Ctx() { em, req }: MyContext
  ): Promise<UserResponse> {
    const user = await em.findOne(
      User,
      usernameOrEmail.includes('@')
        ? { email: usernameOrEmail }
        : { username: usernameOrEmail }
    );
    if (!user) {
      return {
        errors: [
          {
            field: 'usernameOrEmail',
            message: "that username doesn't exist",
          },
        ],
      };
    }
    const valid = await argon2.verify(user.password, password);
    if (!valid) {
      return {
        errors: [{ field: 'password', message: 'incorrect password' }],
      };
    }
    req.session!.userId = user.id;

    console.log('LOGIN SESSION', req.sessionID, req.session);

    return {
      user,
    };
  }

  @Mutation(() => Boolean)
  logout(@Ctx() { req, res }: MyContext): Promise<unknown> {
    return new Promise(resolve =>
      req.session?.destroy(err => {
        res.clearCookie(COOKIE_NAME);
        if (err) {
          console.log(err);
          resolve(false);
          return;
        }
        resolve(true);
      })
    );
  }
}
