import { Document, Error, Schema, model } from 'mongoose'; 
import bcrypt from "bcrypt";

export type UserDocument = Document & {
    email: string;
    password: string;
    vacationDays: number;
    loginDate: Date;
    createdAt: Date;

    comparePassword: comparePasswordFunction;
    validateRequestDays: validateRequestDaysFunction;
};

type comparePasswordFunction = (candidatePassword: string, cb: (err: Error, isMatch: boolean) => void) => void;
type validateRequestDaysFunction = (days: number) => boolean;

const userSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
  
    password: {
        type: String,
        required: true
    },

    vacationDays: {
        type: Number,
        default: 15
    },

    loginDate: {
        type: Date,
        default: Date.now
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
})

userSchema.pre('save', function save(next) {
    const user = this as UserDocument;
    if (!user.isModified('password')) { return next(); }
    bcrypt.genSalt(10, (err, salt) => {
        if (err) { return next(err); }
        bcrypt.hash(user.password, salt, (err: Error, hash) => {
            if (err) { return next(err); }
            user.password = hash;
            next();
        });
    });
});

const comparePassword: comparePasswordFunction = function (this: UserDocument, candidatePassword, cb) {
    bcrypt.compare(candidatePassword, this.password, (err: Error, isMatch: boolean) => {
        cb(err, isMatch);
    });
};

const validateRequestDays: validateRequestDaysFunction = function (this: UserDocument, days) {
    let daysCategory: number[] = [0.25, 0.5];
    for (let i = 0; i < this.vacationDays; i++) {
        daysCategory.push(i+1);
    }

    if (!daysCategory.includes(days)) {
        return false;
    }

    return true;
}


userSchema.methods.comparePassword = comparePassword;
userSchema.methods.validateRequestDays = validateRequestDays;
export const User = model<UserDocument>('User', userSchema);