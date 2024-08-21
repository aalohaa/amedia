const express = require('express')
const router = express.Router()

router.get('/', (req, res) => {
    if (req.session.isAuth) {
        res.render('index', {
            first_name: req.session.first_name,
            isAuth: true
        }) 
    } else {
        res.render('index', {
            isAuth: false
        })        
    }
})

module.exports = router