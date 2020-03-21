import { Router } from 'express';

import { applyVacation, cancelVacation, getVacationHistroy } from '../controllers/applyController';
import { isLoggedIn } from "../controllers/authController";

class ApplyRouter {
    public router: Router;

    constructor() {
        this.router = Router();
        this.routes();
    }

    routes(): void {
        this.router.get('/list', isLoggedIn, getVacationHistroy);
        this.router.post('/', isLoggedIn, applyVacation);
        this.router.delete('/:id', isLoggedIn, cancelVacation);
    }
}

const applyRouter = new ApplyRouter();

export default applyRouter.router;