class HttpException extends Error {
    status: number;
    message: any;

    constructor(status: number, message: any) {
        super(message);

        Object.setPrototypeOf(this, HttpException.prototype);

        this.status = status;
        this.message = message;
    }
}

export default HttpException