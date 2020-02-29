import { Request, Response, NextFunction } from 'express';
import { check, sanitize, validationResult } from 'express-validator';
import { IVerifyOptions } from 'passport-local';
import passport from 'passport';
import moment, { Moment } from 'moment';

import { User, UserDocument } from '../models/user';

// 로그인
export const login = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await check('email', 'Email is not valid').isEmail().run(req);
        await check('password', 'Password cannot be blank').isLength({min: 1}).run(req);
        await sanitize('email').normalizeEmail({ gmail_remove_dots: false }).run(req);
    
        const errors = validationResult(req);
    
        if (!errors.isEmpty()) {
            req.flash('errors', `${ errors.array() }`);
            return res.status(400).json({ message: errors });
        }
    
        passport.authenticate('local', (err: Error, user: UserDocument, info: IVerifyOptions) => {
            if (err) {
                console.error(err);
                return next(err); 
            }
            if (!user) {
                req.flash('errors', info.message);
                return res.status(400).json({ message: `${ info.message }` });
            }
            req.logIn(user, async (err) => {
                if (err) {
                    console.error(err);
                    return next(err); 
                }
                // 문제점 : 입사 n주년인 날에 로그인을 안하면 연차가 부여안됨....
                const loginUser: UserDocument = req.user as UserDocument;  // 로그인된 사용자 객체
                let now: Moment = moment(); // 현재 날짜
                let createdAt: Moment = moment(loginUser.createdAt);  // 입사 날짜
                let loginDate: Moment = moment(loginUser.loginDate);  // 가장 최근 로그인 날짜
                const isAnnual: boolean = createdAt.format('MM-DD') === now.format('MM-DD');  // 입사 n주년인지
                const isFirstLogin: boolean = now.format('MM-DD') !== loginDate.format('MM-DD');  // 오늘 첫로그인인지
                
                // 오늘 첫 로그인일 때
                if (isFirstLogin) {
                    // 입사날짜와 오늘날짜가 딱 n년으로 떨어질 때
                    if (isAnnual) {
                        console.log('축하합니다. 15일의 연차가 부여되었습니다.');
                        await User.findByIdAndUpdate(loginUser.id, {
                            vacationDays : loginUser.vacationDays + 15
                        });
                    }
                }
                await User.findByIdAndUpdate(loginUser.id, {
                    loginDate : now.format()
                });
                req.flash('success', info.message);
                res.status(200).json({ message: `${ info.message }` });
            });
        })(req, res, next);
    } catch (err) {
        console.error(err);
        next(err);
    }
};

// 로그아웃
export const logout = (req: Request, res: Response, next: NextFunction) => {
    req.logout();
    req.session?.destroy((err)=>{
        if (err) {
            console.error(err);
            next(err);
        }
    });
    res.status(204).json({ message : 'Success! You are logged out.' });
};

// 사용자 등록
export const createUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { email, password } = req.body;
    try {
        const newUser = new User({ email, password });
        const result = await newUser.save();
        res.status(201).json(result);
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// 로그인된 사용자 정보 조회
export const getLoginUser = (req: Request, res: Response, next: NextFunction) => {
    const user: UserDocument = req.user as UserDocument;
    res.status(200).json(user);
}