const { sign } = require('jsonwebtoken');

const createAccessToken = id => {
    return sign({ id }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: 600,
    })
}

const createRefreshToken = id => {
    return sign({ id }, process.env.REFRESH_TOKEN_SECRET, {
        expiresIn: 2000,
    })
}

const sendAccessToken = (req, res, token) =>{
    res.send({
        token,
        email: req.body.email,
    })
}

const sendRefreshToken = (res, refreshtoken) =>{
    res.cookie('Rtoken', refreshtoken, {
        httpOnly: true,
        path: '/refresh_token',
    })
}

module.exports = {
    createAccessToken,
    createRefreshToken,
    sendAccessToken,
    sendRefreshToken,
}