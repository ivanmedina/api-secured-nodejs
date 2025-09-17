const antiSmuggling = (req, res, next) => {
    const contentLength = req.headers['content-length'];
    const transferEncoding = req.headers['transfer-encoding'];
    
    if (contentLength && transferEncoding) {
        return res.status(400).json({
            error: 'Conflicting headers detected',
            code: 'HEADER_CONFLICT'
        });
    }
    
    next();
};

module.exports = antiSmuggling;