import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { UserModel } from "../models/user.model";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL!,
    },
    async (accessToken: any, refreshToken: any, profile: any, done: any) => {
      try {
        // Check if user already exists
        let user = await UserModel.findOne({ email: profile.emails?.[0].value });

        if (user) {
          // If user exists, return user
          return done(null, user);
        } else {
          // If user doesn't exist, create new user
          user = await UserModel.create({
            name: profile.displayName,
            email: profile.emails?.[0].value,
            googleId: profile.id,
            profilePicture: profile.photos?.[0].value,
            role: "user",
          });
          return done(null, user);
        }
      } catch (error) {
        return done(error as Error, undefined);
      }
    }
  )
);

passport.serializeUser((user: any, done: any) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done: any) => {
  try {
    const user = await UserModel.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
