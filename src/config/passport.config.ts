import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { ENV } from './env.config.ts';

if (ENV.GOOGLE_CLIENT_ID && ENV.GOOGLE_CLIENT_SECRET && ENV.GOOGLE_CALLBACK_URL) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: ENV.GOOGLE_CLIENT_ID,
        clientSecret: ENV.GOOGLE_CLIENT_SECRET,
        callbackURL: ENV.GOOGLE_CALLBACK_URL,
      },
      (_accessToken, _refreshToken, profile, done) => {
        const user = {
          googleId: profile.id,
          name: profile.displayName,
          email: profile.emails?.[0]?.value || '',
          avatar: profile.photos?.[0]?.value || '',
        };
        return done(null, user as unknown as Express.User);
      },
    ),
  );
}

export default passport;
