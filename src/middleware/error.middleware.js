const errorHandler = (err, req, res, next) => {
    logger.error(err);
    res.status(err.statusCode || 500).json({
        succes: false,
        message: err.message || "Internal Server Error"
    })
}

export default errorHandler