class apiResponse {
    constructor(statusCode,data,messasge = "success"){
        this.statusCode = statusCode
        this.data = data
        this.messasge = messasge
        this.success = statusCode < 400
    }
}

export {apiResponse}