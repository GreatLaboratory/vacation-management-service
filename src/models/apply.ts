import { Schema, model, Document } from 'mongoose';
import moment, { Moment } from "moment";

const { Types : { ObjectId } } = Schema;

export type ApplyDocument = Document & {
    days: number;
    startDate: Date;
    endDate?: Date;
    comment?: string;
    createdAt: Date;

    validateRequestDate: validateRequestDateFunction;
};

type validateRequestDateFunction = (days: number, startDate?: Date, endDate?: Date) => [boolean, string];

const applySchema = new Schema({
    applier: {
        type: ObjectId,
        required: true,
        ref: 'User'
    },
  
    days: {
        type: Number,
        required: true
    },
    
    startDate: {
        type: Date,
        required: true,
    },

    endDate: {
        type: Date,
        required: false,
    },

    comment: {
        type: String,
        required: false,
    },

    createdAt: {
        type: Date,
        default: Date.now,
    }
})

const validateRequestDate: validateRequestDateFunction = function (this: ApplyDocument, days, startDate, endDate?) {
    let result: [boolean, string] = [true, '휴가가 성공적으로 신청되었습니다.']

    let start: Moment = moment(startDate);
    const now: Moment = moment();

    // 시작날짜는 현재 날짜 이후여야 한다.
    if (start > now) {
        if (Number.isInteger(days)) {
            // 연차일 경우 휴가종료날짜는 존재해야 한다.
            if (endDate === undefined) {
                result[0] = false;
                result[1] = '휴가 종료 날짜를 입력해야 합니다.'
                return result;
            }
            let end: Moment = moment(endDate);
            const diff: number = moment(end,'YYYY-MM-DD').diff(moment(start,'YYYY-MM-DD')) / (1000 * 60 * 60 * 24) + 1;
            let weekend: number = 0;
            while(start <= end) {
                if (start.day() === 0 || start.day() === 6) {
                    weekend++;
                }
                start.add(1, 'days')
            }
            let realDays: number = diff - weekend;

            if (weekend !== 0) {  // 주말이 포함되어 있는 경우
                if (days !== realDays) {  // 입력한 신청일수가 날짜토대 실제일수와 다를 경우
                    if (days !== diff) {  // 입력한 신청일수와 날짜토대 차이일수가 다를 경우
                        result[0] = false;
                        result[1] = '휴가 시작과 종료날짜가 휴가신청일수와 일치하지 않습니다. 다시 입력해주세요.'
                        return result;
                    }
                    result[0] = true;
                    result[1] = `신청한 날짜에서 주말을 제외한 총 ${ realDays }일로 변경되어 신청되었습니다.`
                    this.days = realDays;
                    return result;
                }
                return result;
            } 
            if (days !== diff) {  // 입력한 신청일수와 날짜토대 차이일수가 다를 경우
                result[0] = false;
                result[1] = '휴가 시작과 종료날짜가 휴가신청일수와 일치하지 않습니다. 다시 입력해주세요.'
                return result;
            }
            return result;
        } else {
            if (start.day() === 0 || start.day() === 6) {
                result[0] = false;
                result[1] = '주말에 휴가를 사용할 수 없습니다.'
                return result;
            }
            // 반차나 반반차는 종료날짜가 존재하지않게끔 설정한다.
            this.endDate = undefined;
        }
    } else {
        result[0] = false;
        result[1] = '휴가 시작은 내일부터 신청 가능합니다.'
        return result;
    }
    return result;
};

applySchema.methods.validateRequestDate = validateRequestDate;

export const Apply = model<ApplyDocument>('Apply', applySchema);