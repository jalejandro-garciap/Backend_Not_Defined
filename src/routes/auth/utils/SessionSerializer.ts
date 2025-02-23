import { Inject } from '@nestjs/common';
import { PassportSerializer } from '@nestjs/passport';
import { User } from '@prisma/client';
import { UserService } from 'src/routes/user/services/user.service';

type Done = (err: Error | null, user: User | null) => void;

export class SessionSerializer extends PassportSerializer {
  constructor(@Inject() private readonly userService: UserService) {
    super();
  }
  serializeUser(user: User, done: Done) {
    done(null, user);
  }

  async deserializeUser(user: User, done: Done) {
    try {
      const userDB = await this.userService.getUser(user.id);
      return userDB ? done(null, userDB) : done(null, null);
    } catch (err) {
      done(err, null);
    }
  }
}
