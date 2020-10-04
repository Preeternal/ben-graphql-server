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
  @Mutation(() => Boolean)
  async register(
    @Arg('options') options: UsernamePasswordInput,
    @Ctx() { em }: MyContext
  ): Promise<boolean> {
    const hashedPassword = await argon2.hash(options.password);
    const user = em.create(User, {
      username: options.username,
      password: hashedPassword,
    });
    try {
      await em.persistAndFlush(user);
    } catch {
      return false;
    }
    return true;
  }
}
