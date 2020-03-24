import { Router } from 'express';

import { login, logout, createUser, getLoginUser } from "../controllers/userController";
import { isLoggedIn } from '../controllers/authController'

class UserRouter {
    public router: Router;

    constructor() {
        this.router = Router();
        this.routes();
    }

    routes(): void {
        this.router.get('/', isLoggedIn, getLoginUser);
        this.router.post('/create', createUser);
        this.router.post('/login', login);
        this.router.get('/logout', isLoggedIn, logout);
    }
}

const userRouter = new UserRouter();

export default userRouter.router;