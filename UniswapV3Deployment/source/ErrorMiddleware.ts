import { Response, NextFunction } from "express";
import HttpException from "../scripts/models/HttpException";

function errorMiddleware(error: HttpException, request: Request, response: Response, next: NextFunction) {
    const status = error.status || 500;
    const message = error.message || 'Something went wrong';
    response
        .status(status)
        .send({
            status,
            message,
        })
}

export default errorMiddleware