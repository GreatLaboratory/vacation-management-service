import { Request, Response, NextFunction } from 'express';
import moment, { Moment } from 'moment';

import { Apply, ApplyDocument } from '../models/apply';
import { User, UserDocument } from '../models/user';


// 휴가 신청하기
export const applyVacation = async (req: Request, res: Response, next: NextFunction) => {
    // 신청 시 입력 내용 -> 시작일, 종료일, 사용일수, 코멘트
    const { days, startDate, endDate, comment } = req.body;

    const user: UserDocument = req.user as UserDocument;
    const vacationDays: number = user.vacationDays;
    const remainedDays: number = vacationDays - days;
    const newApply: ApplyDocument = new Apply({
        applier: user.id,
        days,
        startDate,
        endDate,
        comment
    });
    const isValidatedDays: boolean = user.validateRequestDays(days);
    const isValidatedDate: [boolean, string] = newApply.validateRequestDate(days, startDate, endDate);
    try {
        // 신청 시 신청 일수와 시작날짜는 반드시 입력
        if (days === undefined || startDate === undefined) {
            return res.status(400).json({ message: '신청 일수와 시작날짜는 반드시 입력해야합니다.' })
        }

        // 신청 시 신청 일수를 연차 / 반차 / 반반차로 제한
        if (!isValidatedDays) {
            return res.status(400).json({ message: '휴가 신청일수는 0.25 또는 0.5 또는 남아있는 연차 이내의 숫자여야합니다.' })
        }

        // 신청 시 신청 일수와 입력날짜, 주말 포함 여부까지 검증하기
        if (!isValidatedDate[0]) {
            return res.status(400).json({ message: `${ isValidatedDate[1] }` })
        }

        // 신청 시 남은 일수가 0이하면 신청 불가
        if(vacationDays <= 0) {
            return res.status(400).json({ message: '남은 휴가가 존재하지 않습니다.' })
        }

        const result = await newApply.save();
        await Apply.populate(result, { path: 'applier' })
        
        // 신청 시 남은 일수 차감
        await User.findByIdAndUpdate(user.id, {
            vacationDays: remainedDays
        });

        res.status(201).json({ message: `${ isValidatedDate[1] }` });
    } catch (error) {
        console.log(error);
        next(error);
    }
};

//휴가 취소하기
export const cancelVacation = async (req: Request, res: Response, next: NextFunction) => {
    const user: UserDocument = req.user as UserDocument;
    const id: string = req.params.id;
    try {
        const selectedApply: any = await Apply.findById(id);
        
        if (selectedApply.applier != user.id) {
            return res.status(400).json({ message: '휴가신청을 취소할 권한이 없습니다.' })
        }
        
        const start: Moment = moment(selectedApply.startDate, 'YYYY-MM-DD');
        const now: Moment = moment();
        if (start <= now) {
            return res.status(400).json({ message: '이미 시작된 휴가는 취소할 수 없습니다.' })
        }
        
        await Apply.deleteOne({
            _id: id
        });
        
        const updatedDays: number = user.vacationDays + selectedApply.days;
        await User.findByIdAndUpdate(user.id, {
            vacationDays: updatedDays
        });

        res.status(201).json({ message: '휴가가 성공적으로 취소되었습니다.' });
    } catch (error) {
        console.log(error);
        next(error);
    }
};

// 휴가 사용 내역 조회하기
export const getVacationHistroy = async (req: Request, res: Response, next: NextFunction) => {
    const user: UserDocument = req.user as UserDocument;
    try {
        const vacationHistory = await Apply.find({
            applier: user.id
        });
        res.status(200).json(vacationHistory);
    } catch (error) {
        console.error(error);
        next(error);
    }
};