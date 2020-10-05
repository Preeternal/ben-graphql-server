import { Arg, Ctx, Field, InputType, Mutation, Resolver } from 'type-graphql';
import argon2 from 'argon2';

import { User } from '../entities/User';
import { MyContext } from 'src/types';

@InputType()
class UsernamePasswordInput {
  @Field()
  username: string;
  @Field()
  password: string;
}

@Resolver()
export class UserResolver {
  @Mutation(() => User, { nullable: true })
  async register(
    @Arg('options') options: UsernamePasswordInput,
    @Ctx() { em }: MyContext
  ): Promise<User | null> {
    const hashedPassword = await argon2.hash(options.password);
    try {
      const user = em.create(User, {
        username: options.username,
        password: hashedPassword,
      });
      await em.persistAndFlush(user);
      return user;
    } catch (e) {
      console.error(e);
      em.clear();
      return null;
    }
  }
}
